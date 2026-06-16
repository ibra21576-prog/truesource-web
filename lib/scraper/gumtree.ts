import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function get(url: string, opts: { proxy?: boolean; countryCode?: string; timeout?: number } = {}): Promise<{ ok: boolean; text: string; status: number }> {
  const { proxy = false, countryCode = 'gb', timeout = 7000 } = opts
  try {
    let fetchUrl = url
    let headers: Record<string, string> = {
      'User-Agent': UA,
      Accept: 'text/html,application/json,*/*',
      'Accept-Language': 'en-GB,en;q=0.9',
    }
    if (proxy) {
      const key = process.env.SCRAPERAPI_KEY
      if (!key) return { ok: false, text: '', status: 0 }
      fetchUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=${countryCode}`
      headers = {}
    }
    const res = await fetch(fetchUrl, { headers, signal: AbortSignal.timeout(timeout) })
    const text = await res.text()
    return { ok: res.ok, text, status: res.status }
  } catch { return { ok: false, text: '', status: 0 } }
}

function isBlocked(html: string) {
  return /captcha|Access Denied|challenge-platform|Just a moment|are you a robot/i.test(html)
}

export async function fetchGumtree(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.gumtree.com'
  const isAU = domain.endsWith('.com.au')
  const q = search.query

  // Gumtree has a JSON search API used by their frontend
  if (!isAU) {
    const apiItems = await fetchGumtreeApi(q, domain)
    if (apiItems.length > 0) return apiItems
  }

  // HTML fallback
  const searchUrl = isAU
    ? `https://${domain}/s-${encodeURIComponent(q)}/k0?sort=date`
    : `https://${domain}/search?search_category=all&q=${encodeURIComponent(q)}&sort=date`

  // Try direct first (sometimes Vercel IPs are fine)
  let r = await get(searchUrl, { timeout: 6000 })
  if (!r.ok || isBlocked(r.text) || r.text.length < 5000) {
    r = await get(searchUrl, { proxy: true, countryCode: 'gb', timeout: 7000 })
  }
  if (!r.ok || isBlocked(r.text)) {
    r = await get(searchUrl, { proxy: true, countryCode: 'gb', timeout: 7500 })
    // Note: using same params — proxy handles premium automatically if needed
  }
  if (!r.ok || isBlocked(r.text)) {
    console.log('[gumtree] all attempts blocked')
    return []
  }

  // Try __NEXT_DATA__ (for AU site which may be Next.js)
  const nextM = r.text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextM) {
    try {
      const data = JSON.parse(nextM[1])
      const items = extractGumtreeNextData(data, domain)
      if (items.length > 0) {
        console.log(`[gumtree] __NEXT_DATA__ got ${items.length} items`)
        return items
      }
    } catch {}
  }

  // Parse HTML
  const items = parseHtmlFallback(r.text, domain)
  console.log(`[gumtree] HTML fallback got ${items.length} items`)
  return items
}

async function fetchGumtreeApi(query: string, domain: string): Promise<ScrapedItem[]> {
  // Gumtree UK internal search API
  const apiUrl = `https://${domain}/ajax/search/category/for-sale/keywords/${encodeURIComponent(query)}?sort=date&pageSize=24`
  let r = await get(apiUrl, { timeout: 5000 })
  if (!r.ok) r = await get(apiUrl, { proxy: true, countryCode: 'gb', timeout: 7000 })

  if (r.ok && r.text.startsWith('{') || r.text.startsWith('[')) {
    try {
      const data = JSON.parse(r.text)
      return extractGumtreeApiData(data, domain)
    } catch {}
  }

  // Alternative API endpoint format
  const api2 = `https://${domain}/api/search?q=${encodeURIComponent(query)}&category=for-sale&sort=date`
  let r2 = await get(api2, { timeout: 5000 })
  if (!r2.ok) r2 = await get(api2, { proxy: true, countryCode: 'gb', timeout: 7000 })

  if (r2.ok && (r2.text.startsWith('{') || r2.text.startsWith('['))) {
    try {
      const data = JSON.parse(r2.text)
      return extractGumtreeApiData(data, domain)
    } catch {}
  }

  return []
}

function extractGumtreeApiData(data: any, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  function walk(obj: any) {
    if (!obj || typeof obj !== 'object') return
    const id = String(obj.listingId || obj.adId || obj.id || '')
    if (id && /^\d{7,}$/.test(id) && !seen.has(id)) {
      const title = obj.title || obj.heading || obj.name || ''
      if (title && title.length > 2) {
        seen.add(id)
        const price = obj.price?.display || obj.price?.amount
          ? `${obj.price?.currency || '£'}${obj.price?.amount}`
          : obj.priceLabel || obj.displayPrice || ''
        const urlPath = obj.url || obj.seoUrl || ''
        const url = urlPath.startsWith('http') ? urlPath : `https://${domain}${urlPath || `/p/${id}`}`
        const image = obj.mainImage?.url || obj.images?.[0]?.url || obj.imageUrl || null
        items.push({ id, title, price, url, image, platform: 'gumtree' })
      }
    }
    for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
      if (v && typeof v === 'object' && items.length < 50) walk(v)
    }
  }
  walk(data)
  return items
}

function extractGumtreeNextData(obj: any, domain: string, items: ScrapedItem[] = [], seen = new Set<string>()): ScrapedItem[] {
  if (!obj || typeof obj !== 'object') return items
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
  // Match Gumtree listing URLs: /ad/category-name/title/some-id or /p/some-id
  const idRe = /href="(\/(?:ad|p)\/[^"]*?\/(\d{7,14})[^"]*)"/g
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
