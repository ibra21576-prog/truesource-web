import { ScrapedItem, Search } from './types'
import { formatPrice, stripHtml } from './utils'

const UA_BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const UA_CRAWLER = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const BASE_HEADERS = { 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8', 'Cache-Control': 'no-cache' }

export async function fetchEbay(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.ebay.de'
  const params = new URLSearchParams({
    _nkw: search.query, _sop: '10', _ipg: '60',
    ...(search.min_price ? { _udlo: String(search.min_price) } : {}),
    ...(search.max_price ? { _udhi: String(search.max_price) } : {}),
  })

  // 1. Try RSS
  try {
    const rssParams = new URLSearchParams(params)
    rssParams.set('_rss', '1')
    const rssUrl = `https://${domain}/sch/i.html?${rssParams}`
    const rssRes = await fetch(rssUrl, {
      headers: { ...BASE_HEADERS, 'User-Agent': UA_BROWSER, Accept: 'application/rss+xml,text/xml,*/*' },
      signal: AbortSignal.timeout(12000),
    })
    if (rssRes.ok) {
      const text = await rssRes.text()
      if (text.includes('<channel')) {
        const items = parseRss(text, domain)
        if (items.length > 0) return items
      }
    }
  } catch (_) {}

  // 2. HTML fallback
  const htmlUrl = `https://${domain}/sch/i.html?${params}`
  let res = await fetch(htmlUrl, {
    headers: { ...BASE_HEADERS, 'User-Agent': UA_BROWSER, Accept: 'text/html,*/*' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`eBay HTTP ${res.status}`)
  let html = await res.text()

  // GDPR page → retry with Googlebot
  const isConsent = /cookieConsent|gdpr-consent|acceptCookies/i.test(html) && html.length < 80000
  if (isConsent) {
    res = await fetch(htmlUrl, {
      headers: { ...BASE_HEADERS, 'User-Agent': UA_CRAWLER, Accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`eBay HTTP ${res.status}`)
    html = await res.text()
  }

  if (/captcha|Pardon Our Interruption|robot\.detected/i.test(html))
    throw new Error('eBay bot check — try again later')

  // Try embedded JSON first
  const jsonItems = parseJson(html, domain)
  if (jsonItems.length > 0) return jsonItems

  const items = parseHtml(html, domain)
  if (items.length === 0) {
    const trulyEmpty = /0 Ergebnisse f|No exact matches found|0 results found/i.test(html)
    if (trulyEmpty) throw new Error('Keine eBay-Treffer für dieses Suchwort')
    throw new Error('eBay lieferte keine Artikel — öffne ebay.de einmal im Browser')
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
