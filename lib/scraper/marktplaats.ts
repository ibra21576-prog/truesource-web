import { ScrapedItem, Search } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function fetchMarktplaats(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.marktplaats.nl'
  const params = new URLSearchParams({
    q: search.query,
    l1CategoryId: '0',
    l2CategoryId: '0',
    postcode: '',
    searchDistance: '0',
    sortBy: 'SORT_INDEX',
    sortOrder: 'DECREASING',
    offset: '0',
    limit: '30',
  })
  if (search.min_price) params.set('priceFrom', String(search.min_price * 100))
  if (search.max_price) params.set('priceTo', String(search.max_price * 100))

  const apiUrl = `https://${domain}/lrp/api/search?${params}`

  try {
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, */*',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        Referer: `https://${domain}/`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.log(`[marktplaats] HTTP ${res.status}`)
      return []
    }

    const data = await res.json()
    const listings: any[] = data.listings || data.items || []
    const items: ScrapedItem[] = []
    const seen = new Set<string>()

    for (const l of listings) {
      const id = String(l.itemId || l.id || '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      const title = l.title || ''
      if (!title || title.length < 2) continue

      // Price: priceValue is in cents or full euros depending on endpoint
      let price = ''
      if (l.price?.priceValue != null) {
        const n = Number(l.price.priceValue)
        // Marktplaats API returns price in euros (not cents)
        price = n > 0 ? `€${n % 1 === 0 ? n : n.toFixed(2)}` : ''
      }

      const pictures: any[] = l.pictures || l.media || []
      const image = pictures[0]?.mediumUrl || pictures[0]?.extraLargeUrl || pictures[0]?.largeUrl || null

      const url = l.vipUrl
        ? (l.vipUrl.startsWith('http') ? l.vipUrl : `https://${domain}${l.vipUrl}`)
        : `https://${domain}/v/${id}`

      items.push({ id, title, price, url, image, platform: 'marktplaats' })
    }

    console.log(`[marktplaats] ${items.length} items`)
    return items
  } catch (e: any) {
    console.log(`[marktplaats] error: ${e.message}`)
    return []
  }
}
