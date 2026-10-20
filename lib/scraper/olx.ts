import { requestSignal } from './request-budget'
import { Search, ScrapedItem } from './types'
import { stripHtml } from './utils'
import { proxyFetch, scraperApiFetch } from './proxy'

const SEARCH_PATHS: Record<string, string> = {
  'www.olx.pl': '/oferty/q-',
  'www.olx.ro': '/oferte/q-',
  'www.olx.bg': '/ads/q-',
  'www.olx.pt': '/ads/q-',
  'www.olx.ua': '/uk/list/q-',
}

const COUNTRY_CODES: Record<string, string> = {
  'www.olx.pl': 'pl',
  'www.olx.ro': 'ro',
  'www.olx.bg': 'bg',
  'www.olx.pt': 'pt',
  'www.olx.ua': 'ua',
}

function decodeHtml(value: string): string {
  return stripHtml(value)
    .replace(/&#x2F;/g, '/')
    .replace(/&#x3D;/g, '=')
    .replace(/&#(d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

export async function fetchOlx(search: Search): Promise<ScrapedItem[]> {
  const domain = SEARCH_PATHS[search.domain] ? search.domain : 'www.olx.pl'
  const slug = encodeURIComponent(search.query.trim().replace(/\s+/g, '-'))
  const pageUrl = `https://${domain}${SEARCH_PATHS[domain]}${slug}/`

  try {
    const init: RequestInit = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.8',
      },
      signal: requestSignal(10000),
      cache: 'no-store',
    }
    let res = await proxyFetch(pageUrl, init)
    if (!res.ok) {
      const fallback = await scraperApiFetch(pageUrl, { headers: init.headers }, {
        country: COUNTRY_CODES[domain], timeoutMs: 10000,
      })
      if (fallback) res = fallback
    }
    if (!res.ok) throw new Error(`OLX HTTP ${res.status}`)

    const html = await res.text()
    const cards = html.split(/data-cy="l-card"/i).slice(1, 61)
    const seen = new Set<string>()
    const items: ScrapedItem[] = []

    for (const card of cards) {
      const href = card.match(/href="([^"]*\/d\/[^"?#]+(?:\?[^"#]*)?)"/i)?.[1]
      const title = card.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1]
      if (!href || !title) continue

      const cleanUrl = new URL(decodeHtml(href), `https://${domain}`).toString()
      const id = cleanUrl.match(/-ID([A-Za-z0-9]+)\.html/i)?.[1] || cleanUrl
      if (seen.has(id)) continue
      seen.add(id)

      const priceHtml = card.match(/data-testid="ad-price"[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ''
      const image = card.match(/<img[^>]+src="(https?:\/\/[^" ]*olxcdn[^" ]*)"/i)?.[1] || null
      items.push({
        id,
        title: decodeHtml(title).replace(/\s+/g, ' ').trim(),
        price: decodeHtml(priceHtml).replace(/\s+/g, ' ').trim(),
        url: cleanUrl,
        image: image ? decodeHtml(image) : null,
        platform: 'olx',
      })
    }
    return items
  } catch (e: any) {
    console.log(`[olx] error: ${e.message}`)
    throw e
  }
}
