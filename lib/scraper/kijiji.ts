import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchViaProxy(url: string): Promise<Response> {
  const key = process.env.SCRAPERAPI_KEY
  if (key) {
    const proxyUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=ca`
    return fetch(proxyUrl, { signal: AbortSignal.timeout(30000) })
  }
  return fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-CA,en;q=0.9' },
    signal: AbortSignal.timeout(15000),
  })
}

export async function fetchKijiji(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.kijiji.ca'
  const q = encodeURIComponent(search.query)

  // Kijiji Canada search URL — buy & sell category, sort by newest
  const searchUrl = `https://${domain}/b-buy-sell/canada/${q}/k0c10l0?sortingOrder=dateDesc`

  const res = await fetchViaProxy(searchUrl)
  if (!res.ok) throw new Error(`Kijiji HTTP ${res.status}`)
  const html = await res.text()

  if (/captcha|Access Denied|robot|challenge-platform/i.test(html))
    throw new Error('Kijiji bot check — try again later')

  const items = parseHtml(html, domain)
  if (items.length === 0) console.log('[kijiji] no items parsed from', domain)
  return items
}

function parseHtml(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  // Kijiji wraps each listing in <div data-listing-id="..."> or <li data-listing-id="...">
  const blockRe = /<(?:div|li|article)[^>]*\bdata-listing-id="(\d+)"[^>]*>([\s\S]*?)<\/(?:div|li|article)>/g
  let m: RegExpExecArray | null

  while ((m = blockRe.exec(html)) !== null) {
    const id = m[1]
    if (seen.has(id)) continue

    const block = m[0]
    // Skip top-ads and third-party ads
    if (/\b(top-feature|top-ad|third-party|thirdpartyad)\b/i.test(block)) continue

    seen.add(id)

    // URL — Kijiji items: /v-category/location/title/ID
    let url = `https://${domain}/v-buy-sell/canada/${id}`
    const urlM = block.match(/href="(\/v-[^"]+\/\d{7,14})"/)
    if (urlM) url = `https://${domain}${urlM[1]}`

    // Title
    let title = ''
    const titleM = block.match(/<[^>]+class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i)
              || block.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i)
    if (titleM) title = stripHtml(titleM[1]).replace(/\s+/g, ' ').trim()
    if (!title || title.length < 2) continue

    // Price
    let price = ''
    const priceM = block.match(/<[^>]+class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i)
    if (priceM) {
      price = stripHtml(priceM[1]).replace(/\s+/g, ' ').trim()
    } else {
      const pm = block.match(/\$\s*[\d,]+(?:\.\d{2})?/)
      if (pm) price = pm[0].trim()
    }

    // Image
    let image: string | null = null
    const imgM = block.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
              || block.match(/data-src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
    if (imgM) image = imgM[1]

    items.push({ id, title, price, url, image, platform: 'kijiji' })
  }

  // Fallback via URL pattern
  if (items.length === 0) {
    const urlRe = /href="(\/v-[^/]+\/[^/]+\/[^/]+\/(\d{7,14}))"/g
    let um: RegExpExecArray | null
    while ((um = urlRe.exec(html)) !== null) {
      const id = um[2]
      if (seen.has(id)) continue
      seen.add(id)

      const win = html.slice(Math.max(0, um.index - 500), Math.min(html.length, um.index + 2000))
      const titleM = win.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i)
      const title = titleM ? stripHtml(titleM[1]).replace(/\s+/g, ' ').trim() : ''
      if (!title || title.length < 2) continue

      const pm = win.match(/\$\s*[\d,]+(?:\.\d{2})?/)
      const imgM = win.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)

      items.push({
        id, title,
        price: pm ? pm[0].trim() : '',
        url: `https://${domain}${um[1]}`,
        image: imgM ? imgM[1] : null,
        platform: 'kijiji',
      })
    }
  }

  return items
}
