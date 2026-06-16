import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchViaProxy(url: string, premium = false): Promise<Response> {
  const key = process.env.SCRAPERAPI_KEY
  if (key) {
    let proxyUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=ca`
    if (premium) proxyUrl += '&premium=true'
    return fetch(proxyUrl, { signal: AbortSignal.timeout(9000) })
  }
  return fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-CA,en;q=0.9' },
    signal: AbortSignal.timeout(9000),
  })
}

// "robot" appears in normal <meta name="robots"> — only catch real bot pages
function isBlocked(html: string) {
  return /captcha|Access Denied|challenge-platform|Just a moment|are you a robot/i.test(html)
}

export async function fetchKijiji(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.kijiji.ca'
  const q = encodeURIComponent(search.query)
  const searchUrl = `https://${domain}/b-buy-sell/canada/${q}/k0c10l0?sortingOrder=dateDesc`

  let html = ''
  try {
    // Try direct first (Vercel IPs are not always blocked)
    const direct = await fetch(searchUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-CA,en;q=0.9' },
      signal: AbortSignal.timeout(8000),
    })
    if (direct.ok) {
      const t = await direct.text()
      if (!isBlocked(t) && t.length > 10000) { html = t }
    }
  } catch (_) {}

  if (!html) {
    try {
      const res = await fetchViaProxy(searchUrl)
      if (res.ok) html = await res.text()
    } catch (e: any) {
      console.log('[kijiji] fetch error:', e.message)
      return []
    }
  }

  if (!html || isBlocked(html)) {
    console.log('[kijiji] blocked — skipping')
    return []
  }

  // Kijiji is Next.js — parse __NEXT_DATA__ first
  const nextM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextM) {
    try {
      const data = JSON.parse(nextM[1])
      const items = extractKijijiData(data, domain)
      if (items.length > 0) {
        console.log(`[kijiji] __NEXT_DATA__ got ${items.length} items`)
        return items
      }
    } catch (e: any) {
      console.log('[kijiji] __NEXT_DATA__ parse error:', e.message)
    }
  }

  // Fallback: parse URLs from HTML
  const items = parseHtml(html, domain)
  console.log(`[kijiji] HTML fallback got ${items.length} items`)
  return items
}

function extractKijijiData(obj: any, domain: string, items: ScrapedItem[] = [], seen = new Set<string>()): ScrapedItem[] {
  if (!obj || typeof obj !== 'object') return items

  // Kijiji listing objects have adId or id + title + price
  const adId = String(obj.adId || obj.id || '')
  if (adId && adId.match(/^\d{7,}$/) && !seen.has(adId)) {
    const title = obj.title || obj.heading || ''
    if (title && title.length > 2) {
      seen.add(adId)
      const priceAmount = obj.price?.amount || obj.price?.displayAmount || obj.price?.value || ''
      const price = priceAmount ? `$${priceAmount}` : obj.price?.priceLabel || ''
      const urlPath = obj.seoUrl || obj.url || ''
      const url = urlPath.startsWith('http') ? urlPath : `https://${domain}${urlPath || `/v-ad/${adId}`}`
      const image = obj.imageUrl || obj.images?.[0]?.url || obj.thumbnailUrl || null
      items.push({ id: adId, title, price, url, image, platform: 'kijiji' })
    }
  }

  for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
    if (v && typeof v === 'object' && items.length < 50) {
      extractKijijiData(v, domain, items, seen)
    }
  }
  return items
}

function parseHtml(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  const idRe = /href="(\/v-[^/]+\/[^/]+\/[^/]+\/(\d{7,14}))"/g
  let m: RegExpExecArray | null
  while ((m = idRe.exec(html)) !== null) {
    const id = m[2]
    if (seen.has(id)) continue
    const win = html.slice(Math.max(0, m.index - 300), Math.min(html.length, m.index + 2000))
    if (/\b(top-feature|top-ad|thirdparty)\b/i.test(win)) continue
    seen.add(id)
    const h3M = win.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || win.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)
    const title = h3M ? stripHtml(h3M[1]).replace(/\s+/g, ' ').trim() : ''
    if (!title || title.length < 2) continue
    const pm = win.match(/\$\s*[\d,]+(?:\.\d{2})?/)
    const imgM = win.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
    items.push({ id, title, price: pm ? pm[0].trim() : '', url: `https://${domain}${m[1]}`, image: imgM ? imgM[1] : null, platform: 'kijiji' })
  }
  return items
}
