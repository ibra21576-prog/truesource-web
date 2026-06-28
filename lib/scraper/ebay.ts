import { ScrapedItem, Search } from './types'
import { formatPrice, stripHtml } from './utils'
import { proxyFetch, hasProxy } from './proxy'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// eBay Finding API (free, 5000 calls/day, no IP restrictions)
// Register at https://developer.ebay.com → get App ID → set EBAY_APP_ID in Vercel env vars
const DOMAIN_TO_GLOBAL_ID: Record<string, string> = {
  'www.ebay.de':     'EBAY-DE',
  'www.ebay.at':     'EBAY-AT',
  'www.ebay.fr':     'EBAY-FR',
  'www.ebay.be':     'EBAY-FRBE',
  'www.ebay.nl':     'EBAY-NL',
  'www.ebay.es':     'EBAY-ES',
  'www.ebay.it':     'EBAY-IT',
  'www.ebay.pl':     'EBAY-PL',
  'www.ebay.co.uk':  'EBAY-GB',
  'www.ebay.ch':     'EBAY-CH',
  'www.ebay.com':    'EBAY-US',
  'www.ebay.ca':     'EBAY-ENCA',
  'www.ebay.com.au': 'EBAY-AU',
}

async function fetchFindingApi(search: Search): Promise<ScrapedItem[]> {
  const appId = process.env.EBAY_APP_ID
  if (!appId) return []

  const domain = search.domain || 'www.ebay.de'
  const globalId = DOMAIN_TO_GLOBAL_ID[domain] || 'EBAY-DE'
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findItemsByKeywords',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'GLOBAL-ID': globalId,
    'keywords': search.query,
    'paginationInput.entriesPerPage': '50',
    'sortOrder': 'StartTimeNewest',
  })

  // Price filters
  if (search.min_price) {
    params.set('itemFilter(0).name', 'MinPrice')
    params.set('itemFilter(0).value', String(search.min_price))
    params.set('itemFilter(0).paramName', 'Currency')
    params.set('itemFilter(0).paramValue', globalId === 'EBAY-GB' ? 'GBP' : globalId === 'EBAY-US' || globalId === 'EBAY-ENCA' ? 'USD' : 'EUR')
  }
  if (search.max_price) {
    const idx = search.min_price ? 1 : 0
    params.set(`itemFilter(${idx}).name`, 'MaxPrice')
    params.set(`itemFilter(${idx}).value`, String(search.max_price))
  }

  try {
    const res = await fetch(`https://svcs.ebay.com/services/search/FindingService/v1?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) { console.log(`[ebay] Finding API HTTP ${res.status}`); return [] }
    const data = await res.json()
    const response = data?.findItemsByKeywordsResponse?.[0]
    if (response?.ack?.[0] !== 'Success') {
      console.log('[ebay] Finding API error:', response?.errorMessage?.[0]?.error?.[0]?.message?.[0])
      return []
    }
    const rawItems = response?.searchResult?.[0]?.item ?? []
    const items: ScrapedItem[] = []
    for (const it of rawItems) {
      const id = it.itemId?.[0]
      const title = it.title?.[0]
      if (!id || !title) continue
      const url = it.viewItemURL?.[0] || `https://${domain}/itm/${id}`
      const priceVal = it.sellingStatus?.[0]?.currentPrice?.[0]?.['__value__']
      const currency = it.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'EUR'
      const price = priceVal ? formatPrice(priceVal, currency) : ''
      const image = it.galleryURL?.[0] || it.galleryPlusURL?.[0] || null
      // Upgrade thumbnail to full-size (eBay thumbs end in l140.jpg → l500.jpg or l1600.jpg)
      const fullImage = image ? image.replace(/l\d+\.(jpg|jpeg|png|webp)$/i, 'l500.$1') : null
      items.push({ id, title, price, url, image: fullImage, platform: 'ebay' })
    }
    console.log(`[ebay] Finding API got ${items.length} items (${globalId})`)
    return items
  } catch (e: any) {
    console.log(`[ebay] Finding API error: ${e.message}`)
    return []
  }
}

function isBotCheck(html: string) {
  return /captcha|Pardon Our Interruption|robot\.detected|Bitte entschuldigen Sie/i.test(html)
}

async function fetchViaProxy(url: string): Promise<Response> {
  // ScraperAPI (legacy) takes priority if a key is set; otherwise tunnel the raw
  // request through the residential PROXY_URL (or direct if neither is set).
  const key = process.env.SCRAPERAPI_KEY
  if (key) {
    return fetch(`https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=de`, {
      signal: AbortSignal.timeout(30000),
    })
  }
  return proxyFetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) })
}

export async function fetchEbay(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.ebay.de'

  // 1. eBay Finding API (free, no proxy needed) — primary method
  if (process.env.EBAY_APP_ID) {
    const items = await fetchFindingApi(search)
    if (items.length > 0) return items
  }

  const params = new URLSearchParams({
    _nkw: search.query, _sop: '10', _ipg: '60',
    ...(search.min_price ? { _udlo: String(search.min_price) } : {}),
    ...(search.max_price ? { _udhi: String(search.max_price) } : {}),
  })

  // 2. RSS — through residential proxy if PROXY_URL is set (eBay blocks
  //    datacenter IPs), else direct (works occasionally).
  try {
    const rssParams = new URLSearchParams(params)
    rssParams.set('_rss', '1')
    const rssUrl = `https://${domain}/sch/i.html?${rssParams}`
    const rssRes = await proxyFetch(rssUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/rss+xml,application/xml,text/xml,*/*',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (rssRes.ok) {
      const text = await rssRes.text()
      if ((text.includes('<channel') || text.includes('<rss')) && !isBotCheck(text)) {
        const items = parseRss(text, domain)
        if (items.length > 0) { console.log(`[ebay] direct RSS got ${items.length} items`); return items }
      }
    }
  } catch (e: any) { console.log(`[ebay] direct RSS: ${e.message}`) }

  // 3. Proxy HTML (if proxy configured)
  if (hasProxy() || process.env.SCRAPERAPI_KEY) {
    try {
      const htmlUrl = `https://${domain}/sch/i.html?${params}`
      const res = await fetchViaProxy(htmlUrl)
      if (res.ok) {
        const html = await res.text()
        if (!isBotCheck(html)) {
          const items = parseHtml_all(html, domain)
          if (items.length > 0) return items
        }
      }
    } catch {}
  }

  console.log('[ebay] all methods failed — set EBAY_APP_ID env var for reliable scraping')
  return []
}

function parseRss(text: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  const blockRe = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let bm: RegExpExecArray | null
  while ((bm = blockRe.exec(text)) !== null) {
    const block = bm[1]
    const extractTag = (tag: string) => {
      const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
      if (cdata) return cdata[1]
      const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
      return plain ? plain[1] : ''
    }
    const rawTitle = extractTag('title')
    const title = rawTitle.replace(/^\s*(Neues Angebot|New Listing)\s*[-–]\s*/i, '').replace(/\s+/g, ' ').trim()
    const link = extractTag('link') || extractTag('guid')
    const desc = extractTag('description')
    const idMatch = link.match(/\/itm\/(\d{9,18})/)
    if (!idMatch || !title) continue
    const id = idMatch[1]
    if (seen.has(id)) continue
    seen.add(id)
    let price = ''
    const pm = desc.match(/[\d.,]+\s*(?:EUR|€|GBP|£|\$|USD)/i) || desc.match(/(?:EUR|€|GBP|£|\$)\s*[\d.,]+/i)
    if (pm) price = pm[0].trim()
    let image: string | null = null
    const im = desc.match(/src="(https?:\/\/i\.ebayimg\.com[^"]+)"/i)
    if (im) image = im[1].replace(/l\d+\.(jpg|jpeg|png|webp)$/i, 'l500.$1')
    items.push({ id, title, price, url: `https://${domain}/itm/${id}`, image, platform: 'ebay' })
  }
  return items
}

function parseHtml_all(html: string, domain: string): ScrapedItem[] {
  const j = parseJson(html, domain)
  if (j.length > 0) return j
  const n = parseHtmlNew(html, domain)
  if (n.length > 0) return n
  return parseHtml(html, domain)
}

function parseJson(html: string, domain: string): ScrapedItem[] {
  const scriptRe = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = scriptRe.exec(html)) !== null) {
    try {
      const found = extractFromJson(JSON.parse(m[1]), domain)
      if (found.length > 0) return found
    } catch {}
  }
  return []
}

function extractFromJson(obj: any, domain: string, items: ScrapedItem[] = [], seen = new Set<string>()): ScrapedItem[] {
  if (!obj || typeof obj !== 'object') return items
  if (obj.itemId && (obj.title || obj.itemTitle) && !seen.has(String(obj.itemId))) {
    const id = String(obj.itemId)
    seen.add(id)
    const title = String(obj.title || obj.itemTitle)
    const price = obj.price?.value ? formatPrice(obj.price.value, obj.price.currency || 'EUR') : obj.displayPrice || ''
    const image = obj.image?.imageUrl || obj.galleryURL || null
    items.push({ id, title, price, url: `https://${domain}/itm/${id}`, image, platform: 'ebay' })
  }
  for (const v of (Array.isArray(obj) ? obj : Object.values(obj))) {
    if (v && typeof v === 'object') extractFromJson(v, domain, items, seen)
  }
  return items
}

function parseHtmlNew(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  const blockRe = /data-listingid=(\d{8,18})/g
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html)) !== null) {
    const id = m[1]
    if (seen.has(id)) continue
    const win = html.slice(Math.max(0, m.index - 200), Math.min(html.length, m.index + 9000))
    const nextBoundary = win.indexOf('data-listingid=', 300)
    const card = nextBoundary > 0 ? win.slice(0, nextBoundary) : win
    let title = ''
    const altM = card.match(/alt="([^"]{3,150})"/)
    if (altM) {
      const t = altM[1].replace(/^\s*(Neues Angebot|New Listing)\s*/i, '').trim()
      if (t && !/^(Bild|Image|Photo|Icon|Logo)/i.test(t)) title = t
    }
    if (!title) continue
    if (/^(Shop on eBay|Visit store|eBay Shop|Jetzt shoppen)/i.test(title)) continue
    let price = ''
    const priceSpan = card.match(/s-card__price[^>]*>([^<]+)</)
    if (priceSpan) price = priceSpan[1].replace(/\s+/g, ' ').trim()
    else {
      const pm = card.match(/(?:EUR|€|GBP|£|\$)\s*[\d.,]+|[\d.,]+\s*(?:EUR|€)/)
      if (pm) price = pm[0].replace(/\s+/g, ' ').trim()
    }
    const urlM = card.match(/href=(https?:\/\/(?:www\.)?ebay\.\w+\/itm\/\d+)/)
    const url = urlM ? urlM[1] : `https://${domain}/itm/${id}`
    const imgM = card.match(/(https?:\/\/i\.ebayimg\.com[^\s"'<>]+)/)
    const image = imgM ? imgM[1].replace(/l\d+\.(jpg|jpeg|png|webp)$/i, 'l500.$1') : null
    seen.add(id)
    items.push({ id, title, price, url, image, platform: 'ebay' })
  }
  return items
}

function parseHtml(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  const linkRe = /href="[^"]*\/itm\/[^"]*?(\d{9,18})[^"]*"/g
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html)) !== null) {
    const id = m[1]
    if (seen.has(id)) continue
    seen.add(id)
    const win = html.slice(Math.max(0, m.index - 1500), Math.min(html.length, m.index + 2500))
    if (/s-item--placeholder|s-item__shop-tile/i.test(win)) continue
    let title = ''
    const tm = win.match(/<(?:span|h3|div)[^>]*\brole="heading"[^>]*>([\s\S]*?)<\/(?:span|h3|div)>/)
           || win.match(/<(?:span|div|h3)[^>]*\bclass="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|h3)>/i)
    if (tm) {
      const t = stripHtml(tm[1]).replace(/^\s*(Neues Angebot|New Listing)\s*/i, '').replace(/\s+/g, ' ').trim()
      if (t && t.length >= 2) title = t
    }
    if (!title) title = '(no title)'
    let price = ''
    const pm = win.match(/(?:EUR|€|£|\$)\s*[\d.,]+|[\d.,]+\s*(?:EUR|€)/)
    if (pm) price = pm[0].replace(/\s+/g, ' ').trim()
    const img = win.match(/(https?:\/\/i\.ebayimg\.com[^"'\s>]+)/i)
    const image = img ? img[1].replace(/l\d+\.(jpg|jpeg|png|webp)$/i, 'l500.$1') : null
    items.push({ id, title, price, url: `https://${domain}/itm/${id}`, image, platform: 'ebay' })
  }
  return items
}
