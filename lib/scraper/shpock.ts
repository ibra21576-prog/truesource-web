import { ScrapedItem, Search } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Domain → Next.js locale path segment used in the /results route
function localePath(domain: string): string {
  if (domain.endsWith('.at')) return 'de-at'
  if (domain.endsWith('.co.uk')) return 'en-gb'
  if (domain.endsWith('.it')) return 'it-it'
  // shpock.com default serves de-de; en-gb has the widest catalogue
  return 'en-gb'
}

export async function fetchShpock(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.shpock.com'
  const loc = localePath(domain)
  const q = encodeURIComponent(search.query)

  // Shpock is a Next.js app; the /results route embeds an Apollo GraphQL cache
  // in __NEXT_DATA__ with all listings server-rendered.
  const pageUrl = `https://www.shpock.com/${loc}/results?q=${q}`
  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-GB,en;q=0.9,de;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) { console.log(`[shpock] HTTP ${res.status}`); return [] }
    const html = await res.text()
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!m) { console.log('[shpock] no __NEXT_DATA__'); return [] }
    const data = JSON.parse(m[1])
    const apollo = data?.props?.pageProps?.apolloState
    if (!apollo) { console.log('[shpock] no apolloState'); return [] }

    const items = parseApolloState(apollo)
    console.log(`[shpock] ${items.length} items`)
    return applyPriceFilter(items, search)
  } catch (e: any) {
    console.log(`[shpock] error: ${e.message}`)
    return []
  }
}

function parseApolloState(apollo: Record<string, any>): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  for (const [key, v] of Object.entries(apollo)) {
    if (!key.startsWith('ItemSummary:')) continue
    if (!v || typeof v !== 'object') continue
    if (v.isExpired || v.isSold) continue
    const id = String(v.id || key.split(':')[1] || '')
    if (!id || seen.has(id)) continue
    const title = v.title || ''
    if (!title || title.length < 2) continue
    seen.add(id)

    let price = ''
    if (v.isFree) price = 'Free'
    else if (typeof v.price === 'number' && v.price > 0) {
      const cur = String(v.currency || 'eur').toLowerCase()
      const sym = cur === 'gbp' ? '£' : cur === 'chf' ? 'CHF ' : '€'
      price = `${sym}${v.price % 1 === 0 ? v.price : v.price.toFixed(2)}`
    }

    const url = v.canonicalURL || (v.path ? `https://www.shpock.com${v.path}` : `https://www.shpock.com/i/${id}`)

    items.push({ id, title, price, url, image: null, platform: 'shpock' })
  }
  return items
}

function applyPriceFilter(items: ScrapedItem[], search: Search): ScrapedItem[] {
  if (!search.min_price && !search.max_price) return items
  return items.filter(it => {
    const n = parseFloat(it.price.replace(/[^0-9.,]/g, '').replace(',', '.'))
    if (isNaN(n)) return true
    if (search.min_price && n < search.min_price) return false
    if (search.max_price && n > search.max_price) return false
    return true
  })
}
