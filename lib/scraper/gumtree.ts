import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'
import { proxyFetch, hasProxy } from './proxy'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

async function get(url: string, opts: { mobile?: boolean; timeout?: number; json?: boolean } = {}): Promise<{ ok: boolean; text: string; status: number }> {
  const { mobile = false, timeout = 7000 } = opts
  try {
    const headers: Record<string, string> = {
      'User-Agent': mobile ? UA_MOBILE : UA,
      Accept: opts.json ? 'application/json, */*' : 'text/html,application/json,*/*',
      'Accept-Language': 'en-GB,en;q=0.9',
      ...(opts.json ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
    }
    // proxyFetch tunnels through PROXY_URL (residential) when set, else direct.
    // Gumtree blocks datacenter IPs, so a residential proxy is what makes it work.
    const res = await proxyFetch(url, { headers, signal: AbortSignal.timeout(timeout) })
    const text = await res.text()
    return { ok: res.ok, text, status: res.status }
  } catch { return { ok: false, text: '', status: 0 } }
}

function isBlocked(html: string) {
  return html.length < 3000 || /captcha|Access Denied|challenge-platform|Just a moment|are you a robot/i.test(html)
}

export async function fetchGumtree(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.gumtree.com'
  const isAU = domain.endsWith('.com.au')
  const q = encodeURIComponent(search.query)

  if (isAU) return fetchGumtreeAU(search.query, domain)

  // UK: try multiple API approaches in order
  const items = await fetchGumtreeUK(search.query, domain)
  if (items.length > 0) return items

  console.log('[gumtree] all attempts failed — needs proxy for UK HTML scraping')
  return []
}

async function fetchGumtreeUK(query: string, domain: string): Promise<ScrapedItem[]> {
  const q = encodeURIComponent(query)

  // Approach 1: Gumtree internal JSON API (no location = UK-wide)
  const apiUrls = [
    // Their search endpoint used by frontend apps
    `https://${domain}/ajax/autos/search/residential-lettings?q=${q}&categoryId=1&sort=date&pageSize=30`,
    // Alternative: structured category search
    `https://${domain}/ajax/search/category/for-sale?q=${q}&sort=date&pageSize=30`,
    // REST v2 API
    `https://${domain}/rest/2/ads?q=${q}&sort=MOST_RECENT&categoryId=1&resultsPerPage=30`,
    // REST v2 search with no location (UK-wide)
    `https://${domain}/rest/2/search?q=${q}&sort=MOST_RECENT&resultsPerPage=30`,
  ]

  for (const url of apiUrls) {
    const r = await get(url, { json: true, timeout: 5000 })
    if (r.ok && (r.text.startsWith('{') || r.text.startsWith('['))) {
      try {
        const data = JSON.parse(r.text)
        const items = extractApiData(data, domain)
        if (items.length > 0) { console.log(`[gumtree] API got ${items.length} from ${url}`); return items }
      } catch {}
    }
  }

  // Approach 2: HTML scrape — UK-wide, sorted by date, no location filter
  // distance=-1 or no search_location means UK-wide on Gumtree UK
  const searchUrl = `https://${domain}/search?search_category=all&q=${q}&sort=date&search_location=uk`
  const r = await get(searchUrl, { timeout: 8000 })

  if (r.ok && !isBlocked(r.text)) {
    // Try __NEXT_DATA__ first
    const nextM = r.text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nextM) {
      try {
        const items = extractApiData(JSON.parse(nextM[1]), domain)
        if (items.length > 0) { console.log(`[gumtree] __NEXT_DATA__ got ${items.length} items`); return items }
      } catch {}
    }
    const items = parseHtmlFallback(r.text, domain)
    if (items.length > 0) { console.log(`[gumtree] HTML fallback got ${items.length} items`); return items }
  }

  return []
}

async function fetchGumtreeAU(query: string, domain: string): Promise<ScrapedItem[]> {
  const q = encodeURIComponent(query)
  const searchUrl = `https://${domain}/s-${q}/k0?sort=date`
  const r = await get(searchUrl, { timeout: 7000 })
  if (!r.ok || isBlocked(r.text)) return []
  const items = parseHtmlFallback(r.text, domain)
  console.log(`[gumtree AU] got ${items.length} items`)
  return items
}

function extractApiData(obj: any, domain: string, items: ScrapedItem[] = [], seen = new Set<string>()): ScrapedItem[] {
  if (!obj || typeof obj !== 'object') return items
  if (items.length >= 50) return items
  const id = String(obj.listingId || obj.adId || obj.id || '')
  if (id && /^\d{7,}$/.test(id) && !seen.has(id)) {
    const title = obj.title || obj.heading || obj.name || ''
    if (title && title.length > 2) {
      seen.add(id)
      const priceAmt = obj.price?.amount || obj.price?.value
      const priceCurr = obj.price?.currency || '£'
      const price = priceAmt
        ? `${priceCurr}${priceAmt}`
        : obj.priceLabel || obj.displayPrice || obj.price?.display || ''
      const urlPath = obj.url || obj.seoUrl || ''
      const url = urlPath.startsWith('http') ? urlPath : `https://${domain}${urlPath || `/p/${id}`}`
      const image = obj.mainImage?.url || obj.images?.[0]?.url || obj.imageUrl || null
      items.push({ id, title, price, url, image, platform: 'gumtree' })
    }
  }
  for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
    if (v && typeof v === 'object' && items.length < 50) extractApiData(v, domain, items, seen)
  }
  return items
}

function parseHtmlFallback(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
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
