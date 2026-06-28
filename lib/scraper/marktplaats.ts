import { ScrapedItem, Search } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function fetchMarktplaats(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.marktplaats.nl'
  // Minimal param set — extra category/distance params can trigger empty responses.
  // `query` (not `q`) is the correct keyword param for the lrp API.
  const params = new URLSearchParams({
    query: search.query,
    sortBy: 'SORT_INDEX',
    sortOrder: 'DECREASING',
    offset: '0',
    limit: '30',
  })
  if (search.min_price) params.set('PriceCentsFrom', String(search.min_price * 100))
  if (search.max_price) params.set('PriceCentsTo', String(search.max_price * 100))

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

      // Price lives in priceInfo.priceCents (in CENTS). priceType can be FIXED,
      // BIDDING, SEE_DESCRIPTION (priceCents 0), RESERVED, FAST_BID, etc.
      let price = ''
      const cents = l.priceInfo?.priceCents
      const ptype = l.priceInfo?.priceType
      if (typeof cents === 'number' && cents > 0) {
        const euros = cents / 100
        price = `€${euros % 1 === 0 ? euros : euros.toFixed(2)}`
      } else if (ptype === 'MIN_BID' || ptype === 'BIDDING' || ptype === 'FAST_BID') {
        price = 'Bieden'
      } else if (ptype === 'RESERVED') {
        price = 'Gereserveerd'
      } else if (ptype === 'FREE') {
        price = 'Gratis'
      }

      // Images are in imageUrls[] as protocol-relative strings (//images.marktplaats.com/...)
      const imageUrls: string[] = l.imageUrls || []
      let image: string | null = null
      if (imageUrls.length > 0) {
        image = imageUrls[0]
        if (image.startsWith('//')) image = 'https:' + image
      } else {
        const pictures: any[] = l.pictures || []
        image = pictures[0]?.extraExtraLargeUrl || pictures[0]?.largeUrl || pictures[0]?.mediumUrl || null
        if (image && image.startsWith('//')) image = 'https:' + image
      }

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
