import { Search, ScrapedItem } from './types'

function attrs(ad: any): Record<string, string> {
  return Object.fromEntries((ad.attributes?.attribute || []).map((a: any) => [a.name, a.values?.[0] || '']))
}

export async function fetchWillhaben(search: Search): Promise<ScrapedItem[]> {
  // `sort=1` is Willhaben's public "Aktualität" / published-descending order.
  // The default relevance order otherwise repeats the same popular inventory.
  const pageUrl = `https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword=${encodeURIComponent(search.query)}&sort=1`
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(8000), cache: 'no-store',
    })
    if (!res.ok) throw new Error('willhaben request failed: HTTP ' + res.status)
    const html = await res.text()
    const marker = html.indexOf('id="__NEXT_DATA__"')
    const start = html.indexOf('{', marker)
    const end = html.indexOf('</script>', start)
    if (marker < 0 || start < 0 || end < 0) return []
    const data = JSON.parse(html.slice(start, end))
    const ads = data?.props?.pageProps?.searchResult?.advertSummaryList?.advertSummary || []
    return ads.slice(0, 50).map((ad: any) => {
      const a = attrs(ad)
      const path = a.SEO_URL ? `/iad/${a.SEO_URL.replace(/^\//, '')}` : `/iad/object?adId=${ad.id}`
      return {
        id: String(ad.id),
        title: a.HEADING || ad.description || '',
        price: a.PRICE_FOR_DISPLAY || (a.PRICE ? `${a.PRICE} €` : ''),
        url: `https://www.willhaben.at${path}`,
        image: ad.advertImageList?.advertImage?.[0]?.mainImageUrl || null,
        platform: 'willhaben',
        postedAt: a.PUBLISHED_String || null,
      }
    })
  } catch (e: any) {
    console.log(`[willhaben] error: ${e.message}`)
    throw e
  }
}
