import { ScrapedItem, Search } from './types'
import { formatPrice, stripHtml } from './utils'

const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const UA_CRAWLER = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const BASE_HEADERS = { 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8', 'Cache-Control': 'no-cache' }

function isBotCheck(html: string) {
  return /captcha|Pardon Our Interruption|robot\.detected|Bitte entschuldigen Sie die St/i.test(html)
}

async function fetchViaProxy(url: string, premium = false): Promise<Response> {
  const key = process.env.SCRAPERAPI_KEY
  if (key) {
    let proxyUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=de`
    if (premium) proxyUrl += '&premium=true'
    return fetch(proxyUrl, { signal: AbortSignal.timeout(45000) })
  }
  return fetch(url, { headers: { ...BASE_HEADERS, 'User-Agent': UA_BROWSER }, signal: AbortSignal.timeout(8000) })
}

function parseHtml_all(html: string, domain: string): ScrapedItem[] {
  const j = parseJson(html, domain)
  if (j.length > 0) return j
  const n = parseHtmlNew(html, domain)
  if (n.length > 0) return n
  return parseHtml(html, domain)
}

export async function fetchEbay(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.ebay.de'
  const params = new URLSearchParams({
    _nkw: search.query, _sop: '10', _ipg: '60',
    ...(search.min_price ? { _udlo: String(search.min_price) } : {}),
    ...(search.max_price ? { _udhi: String(search.max_price) } : {}),
  })

  // 1. RSS — most reliable, rarely bot-blocked
  try {
    const rssParams = new URLSearchParams(params)
    rssParams.set('_rss', '1')
    const rssUrl = `https://${domain}/sch/i.html?${rssParams}`
    const rssRes = await fetchViaProxy(rssUrl)
    if (rssRes.ok) {
      const text = await rssRes.text()
      if (text.includes('<channel') && !isBotCheck(text)) {
        const items = parseRss(text, domain)
        if (items.length > 0) return items
      }
    }
  } catch (_) {}

  // 2. HTML scrape — regular proxy first, then premium on bot check
  const htmlUrl = `https://${domain}/sch/i.html?${params}`

  let html = ''
  try {
    const res = await fetchViaProxy(htmlUrl)
    if (res.ok) html = await res.text()
  } catch (_) {}

  // GDPR consent page → retry
  if (/cookieConsent|gdpr-consent|acceptCookies/i.test(html) && html.length < 80000) {
    try {
      const res = await fetchViaProxy(htmlUrl)
      if (res.ok) html = await res.text()
    } catch (_) {}
  }

  // Bot check on regular proxy → retry with premium residential proxy
  if (!html || isBotCheck(html)) {
    console.log('[ebay] bot check on regular proxy — retrying with premium')
    try {
      const res = await fetchViaProxy(htmlUrl, true)
      if (res.ok) html = await res.text()
    } catch (_) {}
  }

  // Still blocked → silently return empty so cron keeps running
  if (!html || isBotCheck(html)) {
    console.log('[ebay] bot check persists after premium retry — skipping this round')
    return []
  }

  const items = parseHtml_all(html, domain)
  if (items.length === 0) {
    const trulyEmpty = /0 Ergebnisse f|No exact matches found|0 results found/i.test(html)
    if (trulyEmpty) return []
    console.log('[ebay] no items parsed — HTML structure may have changed')
    return []
  }
  return items
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
    const pm = desc.match(/[\d.,]+\s*(?:EUR|€)/i) || desc.match(/(?:EUR|€)\s*[\d.,]+/i)
    if (pm) price = pm[0].trim()
    let image: string | null = null
    const im = desc.match(/src="(https?:\/\/i\.ebayimg\.com[^"]+)"/i)
    if (im) image = im[1]
    items.push({ id, title, price, url: `https://${domain}/itm/${id}`, image, platform: 'ebay' })
  }
  return items
}

function parseJson(html: string, domain: string): ScrapedItem[] {
  const scriptRe = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = scriptRe.exec(html)) !== null) {
    try {
      const found = extractFromJson(JSON.parse(m[1]), domain)
      if (found.length > 0) return found
    } catch (_) {}
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
  // Parser for eBay's 2025+ HTML with unquoted attributes and data-listingid
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  // Split on item boundaries by data-listingid
  const blockRe = /data-listingid=(\d{8,18})/g
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html)) !== null) {
    const id = m[1]
    if (seen.has(id)) continue

    // Window: 200 chars before (for context) and 9000 after (full card — price can be far)
    const win = html.slice(Math.max(0, m.index - 200), Math.min(html.length, m.index + 9000))

    // Skip to next item boundary to avoid spilling into next card
    const nextBoundary = win.indexOf('data-listingid=', 300)
    const card = nextBoundary > 0 ? win.slice(0, nextBoundary) : win

    // Title: image alt text (most reliable in this structure)
    let title = ''
    const altM = card.match(/alt="([^"]{3,150})"/)
    if (altM) {
      const t = altM[1].replace(/^\s*(Neues Angebot|New Listing)\s*/i, '').trim()
      if (t && !/^(Bild|Image|Photo|Icon|Logo)/i.test(t)) title = t
    }
    if (!title) {
      // Fallback: aria-label on watch button (prefixed with "beobachten ")
      const ariaM = card.match(/aria-label="beobachten ([^"]{3,150})"/)
      if (ariaM) title = ariaM[1].trim()
    }
    if (!title) continue // skip placeholder items with no title
    // Filter out generic eBay shop/ad titles
    if (/^(Shop on eBay|Visit store|eBay Shop|Jetzt shoppen)/i.test(title)) continue

    // Price: s-card__price span or generic EUR match
    let price = ''
    const priceSpan = card.match(/s-card__price[^>]*>([^<]+)</)
    if (priceSpan) {
      price = priceSpan[1].replace(/\s+/g, ' ').trim()
    } else {
      const pm = card.match(/(?:EUR|€)\s*[\d.,]+|[\d.,]+\s*(?:EUR|€)/)
      if (pm) price = pm[0].replace(/\s+/g, ' ').trim()
    }

    // URL: unquoted href=https://...
    const urlM = card.match(/href=(https?:\/\/(?:www\.)?ebay\.\w+\/itm\/\d+)/)
    const url = urlM ? urlM[1] : `https://${domain}/itm/${id}`

    // Image
    const imgM = card.match(/(https?:\/\/i\.ebayimg\.com[^\s"'<>]+)/)
    const image = imgM ? imgM[1] : null

    seen.add(id)
    items.push({ id, title, price, url, image, platform: 'ebay' })
  }
  return items
}

function parseHtml(html: string, domain: string): ScrapedItem[] {
  // Server-side: no DOMParser. Use regex approach.
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
      if (t && t.length >= 2 && !/^(EUR|US\$|\$|€|£|\d+[.,])/.test(t)) title = t
    }
    if (!title) title = '(no title)'

    let price = ''
    const pm = win.match(/(?:EUR|€)\s*[\d.,]+|[\d.,]+\s*(?:EUR|€)/)
    if (pm) price = pm[0].replace(/\s+/g, ' ').trim()

    const img = win.match(/(https?:\/\/i\.ebayimg\.com[^"'\s>]+)/i)
    const image = img ? img[1] : null

    items.push({ id, title, price, url: `https://${domain}/itm/${id}`, image, platform: 'ebay' })
  }
  return items
}
