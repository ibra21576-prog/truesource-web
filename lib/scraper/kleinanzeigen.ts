import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

export async function fetchKleinanzeigen(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.kleinanzeigen.de'
  const params = new URLSearchParams({ keywords: search.query, sortingField: 'SORTING_DATE' })
  if (search.min_price || search.max_price) {
    params.set('priceType', 'FIXED')
    if (search.min_price) params.set('minPrice', String(search.min_price))
    if (search.max_price) params.set('maxPrice', String(search.max_price))
  }
  const url = `https://${domain}/s-suchanfrage.html?${params}`

  const res = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: `https://${domain}/`,
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Kleinanzeigen HTTP ${res.status}`)
  const html = await res.text()

  if (/cdn-cgi\/challenge-platform|Just a moment\.\.\./i.test(html))
    throw new Error('Kleinanzeigen bot check — try again later')

  return parseHtml(html, domain)
}

function parseHtml(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  // Regex over <article data-adid="..." data-href="..."> blocks
  const artRe = /<article[^>]*\bdata-adid="(\d+)"[^>]*>([\s\S]*?)<\/article>/g
  let am: RegExpExecArray | null
  while ((am = artRe.exec(html)) !== null) {
    const id = am[1]
    if (seen.has(id)) continue
    seen.add(id)
    const articleHtml = am[0]

    if (/\b(is-topad|aditem--topad|badge-topad|topad-hint)\b/i.test(articleHtml)) continue

    const hrefM = articleHtml.match(/data-href="([^"]+)"/)
    const path = hrefM ? hrefM[1].replace(/&amp;/g, '&') : `/s-anzeige/x/${id}`
    const url = path.startsWith('http') ? path : `https://${domain}${path}`

    let title = ''
    const titleElM = articleHtml.match(/<[^>]+class="[^"]*text-module-begin[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i)
    const titleJsonM = articleHtml.match(/"title":"((?:[^"\\]|\\.)*)"/i)
    if (titleElM) {
      title = stripHtml(titleElM[1]).replace(/\s+/g, ' ').trim()
    } else if (titleJsonM) {
      title = titleJsonM[1]
        .replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, ' ').trim()
    }
    if (!title) title = '(no title)'

    let price = ''
    const priceElM = articleHtml.match(/<(?:span|p|strong|b|div)[^>]*class="[^"]*(?:price|preis)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|p|strong|b|div)>/i)
    if (priceElM) {
      price = stripHtml(priceElM[1]).replace(/\s+/g, ' ').trim()
    } else {
      const pm = articleHtml.match(/(\d[\d.,]+)\s*€/) || articleHtml.match(/\bVB\b/) || articleHtml.match(/Zu verschenken/i)
      if (pm) price = pm[0].trim()
    }

    let image: string | null = null
    const imgSrc = articleHtml.match(/src="(https?:\/\/img\.kleinanzeigen\.de\/api\/v1\/prod-ads\/images\/[^"]+)"/i)
                || articleHtml.match(/src="(https?:\/\/(?:img|img2)\.kleinanzeigen\.de\/[^"]+)"/i)
    image = imgSrc ? imgSrc[1] : null

    items.push({ id, title, price, url, image, platform: 'kleinanzeigen' })
  }
  return items
}
