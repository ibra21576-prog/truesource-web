import { requestSignal } from './request-budget'
import { Search, ScrapedItem } from './types'
import { formatPrice } from './utils'

const LOCATIONS: Record<string, { latitude: number; longitude: number }> = {
  'es.wallapop.com': { latitude: 40.4168, longitude: -3.7038 },
  'it.wallapop.com': { latitude: 41.9028, longitude: 12.4964 },
  'pt.wallapop.com': { latitude: 38.7223, longitude: -9.1393 },
}

export async function fetchWallapop(search: Search): Promise<ScrapedItem[]> {
  const location = LOCATIONS[search.domain] || LOCATIONS['es.wallapop.com']
  const params = new URLSearchParams({
    source: 'search_box',
    keywords: search.query,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
  })

  try {
    const res = await fetch(`https://api.wallapop.com/api/v3/search?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
        'X-DeviceOS': '0',
      },
      signal: requestSignal(8000),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Wallapop HTTP ${res.status}`)

    const data = await res.json() as any
    const items = data?.data?.section?.payload?.items || []
    return items.slice(0, 50).map((item: any) => ({
      id: String(item.id),
      title: item.title || '',
      price: formatPrice(item.price?.amount ?? '', item.price?.currency || 'EUR'),
      url: `https://es.wallapop.com/item/${item.web_slug || item.id}`,
      image: item.images?.[0]?.urls?.medium || item.images?.[0]?.urls?.small || null,
      platform: 'wallapop',
      postedAt: item.created_at ? new Date(item.created_at).toISOString() : null,
    }))
  } catch (e: any) {
    console.log(`[wallapop] error: ${e.message}`)
    throw e
  }
}
