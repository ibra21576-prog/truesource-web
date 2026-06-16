import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchViaProxy(url: string, premium = false): Promise<Response> {
  const key = process.env.SCRAPERAPI_KEY
  if (key) {
    let proxyUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=gb&render=true`
    if (premium) proxyUrl += '&premium=true'
    return fetch(proxyUrl, { signal: AbortSignal.timeout(60000) })
  }
  return fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-GB,en;q=0.9' },
    signal: AbortSignal.timeout(15000),
  })
}

function isBlocked(html: string) {
  return /captcha|Access Denied|robot|Just a moment|challenge-platform/i.test(html)
}

export async function fetchGumtree(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.gumtree.com'
  const isAU = domain.endsWith('.com.au')
  const q = encodeURIComponent(search.query)

  const searchUrl = isAU
    ? `https://${domain}/s-${q}/k0?sort=date`
    : `https://${domain}/search?search_category=all&q=${q}&sort=date`

  let html = ''
  try {
    const res = await fetchViaProxy(searchUrl)
    if (!res.ok) {
      console.log(`[gumtree] HTTP ${res.status} — retrying premium`)
      const res2 = await fetchViaProxy(searchUrl, true)
      if (!res2.ok) { console.log(`[gumtree] premium also failed ${res2.status}`); return [] }
      html = await res2.text()
    } else {
      html = await res.text()
    }
  } catch (e: any) {
    console.log('[gumtree] fetch error:', e.message)
    return []
  }

  if (isBlocked(html)) {
    console.log('[gumtree] bot check — skipping')
    return []
  }

  // Gumtree is a Next.js app — parse __NEXT_DATA__ JSON first
  const nextM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextM) {
    try {
      const data = JSON.parse(nextM[1])
      const items = extractGumtreeNextData(data, domain)
      if (items.length > 0) {
        console.log(`[gumtree] __NEXT_DATA__ got ${items.length} items`)
        return items
      }
    } catch (e: any) {
      console.log('[gumtree] __NEXT_DATA__ parse error:', e.message)
    }
  }

  // Fallback: look for JSON blobs with listing data
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/g
  let blob: RegExpExecArray | null
  while ((blob = scriptRe.exec(html)) !== null) {
    const src = blob![1]
    if (!src.includes('"listingId"') && !src.includes('"adId"')) continue
    try {
      const startIdx = src.indexOf('{')
      if (startIdx === -1) continue
      const data = JSON.parse(src.slice(startIdx))
      const items = extractGumtreeNextData(data, domain)
      if (items.length > 0) {
        console.log(`[gumtree] JSON blob got ${items.length} items`)
        return items
      }
    } catch {}
  }

  // Last resort: regex on rendered HTML
  const items = parseHtmlFallback(html, domain)
  console.log(`[gumtree] HTML fallback got ${items.length} items`)
  return items
}

function extractGumtreeNextData(obj: any, domain: string, items: ScrapedItem[] = [], seen = new Set<string>()): ScrapedItem[] {
  if (!obj || typeof obj !== 'object') return items
  // Look for listing/ad objects
  const id = String(obj.listingId || obj.adId || obj.id || '')
  if (id && id.match(/^\d{7,}$/) && !seen.has(id)) {
    const title = obj.title || obj.heading || obj.name || ''
    if (title && title.length > 2) {
      seen.add(id)
      const price = obj.price?.display || obj.price?.amount
        ? `${obj.price?.currency || '£'}${obj.price?.amount}`
        : obj.priceLabel || obj.displayPrice || ''
      const url = obj.url
        ? (obj.url.startsWith('http') ? obj.url : `https://${domain}${obj.url}`)
        : `https://${domain}/p/${id}`
      const image = obj.mainImage?.url || obj.images?.[0]?.url || obj.imageUrl || null
      items.push({ id, title, price, url, image, platform: 'gumtree' })
    }
  }
  for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
    if (v && typeof v === 'object') extractGumtreeNextData(v, domain, items, seen)
  }
  return items
}

function parseHtmlFallback(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  const idRe = /href="(\/(?:p|s-ad|v-[^/]+)\/[^"]*?\/(\d{7,14})[^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = idRe.exec(html)) !== null) {
    const id = m[2]
    if (seen.has(id)) continue
    const win = html.slice(Math.max(0, m.index - 200), Math.min(html.length, m.index + 2000))
    if (/\b(top-ad|featured|sponsored)\b/i.test(win)) continue
    seen.add(id)
    const titleM = win.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)
    const title = titleM ? stripHtml(titleM[1]).replace(/\s+/g, ' ').trim() : ''
    if (!title || title.length < 2) continue
    const pm = win.match(/(?:£|A\$|\$)\s*[\d,]+(?:\.\d{2})?/)
    const imgM = win.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
    items.push({
      id, title, price: pm ? pm[0].trim() : '',
      url: `https://${domain}${m[1]}`, image: imgM ? imgM[1] : null, platform: 'gumtree',
    })
  }
  return items
}
