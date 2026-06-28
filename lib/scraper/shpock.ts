import { ScrapedItem, Search } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function fetchShpock(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.shpock.com'
  const locale = domain.endsWith('.at') ? 'de_AT' : domain.endsWith('.co.uk') ? 'en_GB' : 'de_DE'
  const q = encodeURIComponent(search.query)

  // 1. Internal listing API
  const apiUrl = `https://${domain}/i3-api/public/listings?q=${q}&locale=${locale}&page=0&pageSize=30&sortby=newestFirst`
  try {
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, */*',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        Referer: `https://${domain}/`,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json()
      const items = parseApiResponse(data, domain)
      if (items.length > 0) {
        console.log(`[shpock] API got ${items.length} items`)
        return applyPriceFilter(items, search)
      }
    }
  } catch {}

  // 2. Web search page — __NEXT_DATA__
  const pageUrl = `https://${domain}/de-de/w/searches?q=${q}&sortby=newestFirst`
  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,*/*',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const html = await res.text()
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
      if (m) {
        const data = JSON.parse(m[1])
        const items = extractFromNextData(data, domain)
        if (items.length > 0) {
          console.log(`[shpock] __NEXT_DATA__ got ${items.length} items`)
          return applyPriceFilter(items, search)
        }
      }
    }
  } catch {}

  console.log('[shpock] no items found')
  return []
}

function parseApiResponse(data: any, domain: string): ScrapedItem[] {
  const list: any[] = data.items || data.listings || data.results || []
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  for (const it of list) {
    const id = String(it.id || it.itemId || '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    const title = it.name || it.title || ''
    if (!title || title.length < 2) continue
    const price = it.price != null ? formatShpockPrice(it.price, it.currency || 'EUR') : ''
    const url = it.permalink || it.url || `https://${domain}/i/${id}`
    const image = it.media?.[0]?.photo?.url || it.photos?.[0]?.url || it.thumbnailUrl || null
    items.push({ id, title, price, url, image, platform: 'shpock' })
  }
  return items
}

function extractFromNextData(obj: any, domain: string, items: ScrapedItem[] = [], seen = new Set<string>()): ScrapedItem[] {
  if (!obj || typeof obj !== 'object' || items.length >= 60) return items
  const id = String(obj.id || obj.itemId || '')
  if (id && /^[a-zA-Z0-9_-]{6,}$/.test(id) && !seen.has(id)) {
    const title = obj.name || obj.title || ''
    if (title && title.length > 2) {
      seen.add(id)
      const price = obj.price != null ? formatShpockPrice(obj.price, obj.currency || 'EUR') : ''
      const url = obj.permalink || obj.url || `https://${domain}/i/${id}`
      const image = obj.media?.[0]?.photo?.url || obj.photos?.[0]?.url || obj.thumbnailUrl || null
      items.push({ id, title, price, url, image, platform: 'shpock' })
    }
  }
  for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
    if (v && typeof v === 'object') extractFromNextData(v, domain, items, seen)
  }
  return items
}

function formatShpockPrice(price: number | string, currency: string): string {
  const n = Number(price)
  if (isNaN(n) || n <= 0) return ''
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'CHF' ? 'CHF ' : '€'
  return `${symbol}${n % 1 === 0 ? n : n.toFixed(2)}`
}

function applyPriceFilter(items: ScrapedItem[], search: Search): ScrapedItem[] {
  return items.filter(it => {
    if (!search.min_price && !search.max_price) return true
    const n = parseFloat(it.price.replace(/[^0-9.,]/g, '').replace(',', '.'))
    if (isNaN(n)) return true
    if (search.min_price && n < search.min_price) return false
    if (search.max_price && n > search.max_price) return false
    return true
  })
}
