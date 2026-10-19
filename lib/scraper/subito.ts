import { Search, ScrapedItem } from './types'

export async function fetchSubito(search: Search): Promise<ScrapedItem[]> {
  // Subito uses `sort=datedesc` and `lim` (not `limit`). Without these the API
  // keeps returning a relevance-ranked set, so a monitor can run successfully
  // for hours while never seeing the newest listings.
  const url = `https://hades.subito.it/v1/search/items?q=${encodeURIComponent(search.query)}&t=s&sort=datedesc&lim=50&start=0`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000), cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json() as any
    return (data.ads || []).slice(0, 50).map((ad: any) => {
      const priceFeature = (ad.features || []).find((f: any) => f.uri === '/price')
      const imageBase = ad.images?.[0]?.cdn_base_url
      const id = String(ad.urn || ad.urls?.default || '').split(':').pop() || String(ad.urls?.default)
      return {
        id,
        title: ad.subject || '',
        price: priceFeature?.values?.[0]?.value || '',
        url: ad.urls?.default || 'https://www.subito.it/',
        image: imageBase ? `${imageBase}?rule=gallery-desktop-2x-auto` : null,
        platform: 'subito',
        postedAt: ad.dates?.display_iso8601 || null,
      }
    })
  } catch (e: any) {
    console.log(`[subito] error: ${e.message}`)
    return []
  }
}
