import { ScrapedItem, Search } from './types'
import { proxyFetch } from './proxy'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
// Public API key used by leboncoin's own web frontend
const API_KEY = 'ba0c2dad52b3ec'

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
    const requestInit: RequestInit = {
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
      signal: AbortSignal.timeout(15000),
    }
    let res = await proxyFetch('https://api.leboncoin.fr/finder/search', requestInit)

    if (!res.ok) {
      console.log(`[leboncoin] HTTP ${res.status}`)
      return fetchIndexedListings(search)
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
    return fetchIndexedListings(search)
  }
}

// Final fallback: DuckDuckGo's lightweight result page exposes fresh,
// canonical Leboncoin listing URLs and titles. This keeps the source useful
// even when DataDome temporarily blocks both the origin and proxy.
async function fetchIndexedListings(search: Search): Promise<ScrapedItem[]> {
  try {
    const query = `site:leboncoin.fr/ad/ ${search.query}`
    const readerItems = await fetchIndexedViaReader(query, search)
    if (readerItems.length > 0) return readerItems
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.7',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return [liveSearchItem(search)]
    const html = await res.text()
    const items: ScrapedItem[] = []
    const seen = new Set<string>()
    const resultPattern = /uddg=([^&"']+)[^>]*class=['"]result-link['"]>([\s\S]*?)<\/a>([\s\S]*?)(?=<a rel="nofollow"|$)/g
    let match: RegExpExecArray | null

    while ((match = resultPattern.exec(html))) {
      const listingUrl = decodeURIComponent(match[1])
      if (!listingUrl.startsWith('https://www.leboncoin.fr/ad/')) continue
      const id = listingUrl.match(/\/(\d+)(?:[?#]|$)/)?.[1] || listingUrl
      if (seen.has(id)) continue

      const title = decodeHtml(match[2].replace(/<[^>]+>/g, ''))
      const snippet = decodeHtml(match[3].replace(/<[^>]+>/g, ' '))
      const priceMatch = snippet.match(/(\d[\d\s.,]*)\s*€/)
      const price = priceMatch ? `${priceMatch[1].trim()} €` : ''
      const numericPrice = Number(price.replace(/[^0-9.,]/g, '').replace(',', '.'))
      if (search.min_price && numericPrice && numericPrice < search.min_price) continue
      if (search.max_price && numericPrice && numericPrice > search.max_price) continue

      seen.add(id)
      items.push({
        id,
        title,
        price,
        url: listingUrl,
        image: null,
        platform: 'leboncoin',
      })
      if (items.length >= 20) break
    }
    console.log(`[leboncoin] indexed fallback got ${items.length} items`)
    return items.length > 0 ? items : [liveSearchItem(search)]
  } catch (e: any) {
    console.log(`[leboncoin] indexed fallback error: ${e.message}`)
    return [liveSearchItem(search)]
  }
}

function liveSearchItem(search: Search): ScrapedItem {
  return {
    id: `live-search-${search.query.toLowerCase()}`,
    title: `Leboncoin Live-Ergebnisse: ${search.query}`,
    price: '',
    url: `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(search.query)}`,
    image: null,
    platform: 'leboncoin',
  }
}

async function fetchIndexedViaReader(query: string, search: Search): Promise<ScrapedItem[]> {
  try {
    const target = `http://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
    const res = await fetch(`https://r.jina.ai/${target}`, {
      headers: { Accept: 'text/plain', 'User-Agent': UA },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.log(`[leboncoin] reader fallback HTTP ${res.status}`)
      return []
    }
    const markdown = await res.text()
    const items: ScrapedItem[] = []
    const seen = new Set<string>()
    const resultPattern = /\d+\.\[([^\]]+)\]\(http:\/\/duckduckgo\.com\/l\/\?uddg=([^&\)]+)[^\)]*\)/g
    let match: RegExpExecArray | null
    while ((match = resultPattern.exec(markdown))) {
      const listingUrl = decodeURIComponent(match[2])
      if (!listingUrl.startsWith('https://www.leboncoin.fr/ad/')) continue
      const title = decodeHtml(match[1])
      if (!title.toLowerCase().includes(search.query.toLowerCase())) continue
      const id = listingUrl.match(/\/(\d+)(?:[?#]|$)/)?.[1] || listingUrl
      if (seen.has(id)) continue
      seen.add(id)
      items.push({ id, title, price: '', url: listingUrl, image: null, platform: 'leboncoin' })
      if (items.length >= 20) break
    }
    console.log(`[leboncoin] reader fallback got ${items.length} items`)
    return items
  } catch (e: any) {
    console.log(`[leboncoin] reader fallback error: ${e.message}`)
    return []
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim()
}
