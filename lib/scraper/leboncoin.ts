import { ScrapedItem, Search } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
// Public API key used by leboncoin's own web frontend
const API_KEY = 'ba0c2f24-c571-416b-b5b5-52851fe4a4c0'

export async function fetchLeboncoin(search: Search): Promise<ScrapedItem[]> {
  const domain = 'www.leboncoin.fr'

  const body: any = {
    limit: 35,
    offset: 0,
    filters: {
      category: { id: '0' },
      keywords: { text: search.query, type: 'all' },
      location: {},
    },
    sort_by: 'time',
    sort_order: 'desc',
  }
  if (search.min_price || search.max_price) {
    body.filters.price = {}
    if (search.min_price) body.filters.price.min = search.min_price
    if (search.max_price) body.filters.price.max = search.max_price
  }

  try {
    const res = await fetch('https://api.leboncoin.fr/finder/search', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        Origin: `https://${domain}`,
        Referer: `https://${domain}/`,
        api_key: API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(9000),
    })

    if (!res.ok) {
      console.log(`[leboncoin] HTTP ${res.status}`)
      return []
    }

    const data = await res.json()
    const ads: any[] = data.ads || []
    const items: ScrapedItem[] = []
    const seen = new Set<string>()

    for (const ad of ads) {
      const id = String(ad.list_id || ad.ad_id || '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      const title = ad.subject || ad.title || ''
      if (!title || title.length < 2) continue

      const priceArr: number[] = ad.price || []
      const priceNum = priceArr[0]
      const price = priceNum != null && priceNum > 0 ? `€${priceNum}` : ''

      const image = ad.images?.large_url || ad.images?.thumb_url || ad.images?.small_url || null

      const url = ad.url || `https://${domain}/annonce/${id}`

      items.push({ id, title, price, url, image, platform: 'leboncoin' })
    }

    console.log(`[leboncoin] ${items.length} items`)
    return items
  } catch (e: any) {
    console.log(`[leboncoin] error: ${e.message}`)
    return []
  }
}
