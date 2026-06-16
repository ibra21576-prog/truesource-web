import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchViaProxy(url: string): Promise<Response> {
  const key = process.env.SCRAPERAPI_KEY
  if (key) {
    const proxyUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=gb`
    return fetch(proxyUrl, { signal: AbortSignal.timeout(30000) })
  }
  return fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-GB,en;q=0.9' },
    signal: AbortSignal.timeout(15000),
  })
}

export async function fetchGumtree(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.gumtree.com'
  const isAU   = domain.endsWith('.com.au')

  const searchUrl = isAU
    ? `https://${domain}/s-${encodeURIComponent(search.query)}/k0?sort=date`
    : `https://${domain}/search?search_category=all&q=${encodeURIComponent(search.query)}&sort=date`

  let html = ''
  try {
    const res = await fetchViaProxy(searchUrl)
    if (res.status === 429) {
      console.log('[gumtree] rate limited (429) — skipping this round')
      return []
    }
    if (!res.ok) {
      console.log(`[gumtree] HTTP ${res.status} — skipping`)
      return []
    }
    html = await res.text()
  } catch (e: any) {
    console.log('[gumtree] fetch error:', e.message)
    return []
  }

  if (/captcha|Access Denied|robot|Pardon Our Interruption/i.test(html)) {
    console.log('[gumtree] bot check — skipping this round')
    return []
  }

  const items = parseHtml(html, domain, isAU)
  if (items.length === 0) console.log('[gumtree] no items parsed from', domain)
  return items
}

function parseHtml(html: string, domain: string, isAU: boolean): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  // Match listing blocks — Gumtree wraps each ad in <article> or <li data-q="search-result">
  const blockRe = isAU
    ? /<(?:article|li)[^>]*\bdata-listing-id="(\d+)"[^>]*>([\s\S]*?)<\/(?:article|li)>/g
    : /<(?:article|li)[^>]*\bdata-q="search-result"[^>]*>([\s\S]*?)<\/(?:article|li)>/g

  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[0]

    // ID from data-listing-id or from the item URL
    let id = isAU ? m[1] : ''
    if (!id) {
      const idM = block.match(/\/(?:p|s-ad)\/[^/]+\/(\d{7,14})/)
      if (idM) id = idM[1]
    }
    if (!id || seen.has(id)) continue
    seen.add(id)

    // Skip promoted/sponsored listings
    if (/\b(is-top-ad|featured-ad|sponsored|top-ad)\b/i.test(block)) continue

    // URL
    let url = `https://${domain}`
    const urlM = block.match(/href="(\/(?:p|s-ad)\/[^"]+\/\d{7,14}[^"]*)"/)
    if (urlM) url += urlM[1]
    else url += isAU ? `/s-ad/${id}` : `/p/${id}`

    // Title
    let title = ''
    const titleM = block.match(/<h\d[^>]*class="[^"]*listing-title[^"]*"[^>]*>([\s\S]*?)<\/h\d>/i)
              || block.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i)
    if (titleM) title = stripHtml(titleM[1]).replace(/\s+/g, ' ').trim()
    if (!title || title.length < 2) continue

    // Price
    let price = ''
    const priceM = block.match(/<[^>]+class="[^"]*(?:listing-price|ad-price|price)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i)
    if (priceM) {
      price = stripHtml(priceM[1]).replace(/\s+/g, ' ').trim()
    } else {
      const pm = block.match(/(?:£|A\$|\$)\s*[\d,]+(?:\.\d{2})?/)
      if (pm) price = pm[0].trim()
    }

    // Image
    let image: string | null = null
    const imgM = block.match(/(?:src|data-src)="(https?:\/\/(?:i\.ebayimg\.com|[^"]+gumtree[^"]+|[^"]+\/images\/[^"]+))"/i)
              || block.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
    if (imgM) image = imgM[1]

    items.push({ id, title, price, url, image, platform: 'gumtree' })
  }

  // Fallback: parse from URL pattern if block regex found nothing
  if (items.length === 0) {
    const urlRe = /href="(\/(?:p|s-ad)\/[^"]+\/(\d{7,14})[^"]*)"/g
    let um: RegExpExecArray | null
    while ((um = urlRe.exec(html)) !== null) {
      const id = um[2]
      if (seen.has(id)) continue
      seen.add(id)

      const win = html.slice(Math.max(0, um.index - 500), Math.min(html.length, um.index + 2000))
      const titleM = win.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i)
      const title = titleM ? stripHtml(titleM[1]).replace(/\s+/g, ' ').trim() : ''
      if (!title || title.length < 2) continue

      const pm = win.match(/(?:£|A\$|\$)\s*[\d,]+(?:\.\d{2})?/)
      const price = pm ? pm[0].trim() : ''

      const imgM = win.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
      const image = imgM ? imgM[1] : null

      items.push({ id, title, price, url: `https://${domain}${um[1]}`, image, platform: 'gumtree' })
    }
  }

  return items
}
