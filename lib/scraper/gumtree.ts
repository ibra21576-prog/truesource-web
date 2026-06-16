import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchViaProxy(url: string, premium = false): Promise<Response> {
  const key = process.env.SCRAPERAPI_KEY
  if (key) {
    let proxyUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=gb`
    if (premium) proxyUrl += '&premium=true'
    return fetch(proxyUrl, { signal: AbortSignal.timeout(45000) })
  }
  return fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-GB,en;q=0.9' },
    signal: AbortSignal.timeout(15000),
  })
}

function isBlocked(html: string) {
  return /captcha|Access Denied|robot|Pardon Our Interruption|Just a moment/i.test(html)
}

export async function fetchGumtree(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.gumtree.com'
  const isAU = domain.endsWith('.com.au')
  const q = encodeURIComponent(search.query)

  const searchUrl = isAU
    ? `https://${domain}/s-${q}/k0?sort=date`
    : `https://${domain}/search?search_category=all&q=${q}&sort=date`

  let html = await tryFetch(searchUrl, false)
  if (!html || isBlocked(html)) {
    console.log('[gumtree] blocked — retrying with premium proxy')
    html = await tryFetch(searchUrl, true)
  }
  if (!html || isBlocked(html)) {
    console.log('[gumtree] still blocked — skipping')
    return []
  }

  const items = parseHtml(html, domain)
  console.log(`[gumtree] got ${items.length} items from ${domain}`)
  return items
}

async function tryFetch(url: string, premium: boolean): Promise<string> {
  try {
    const res = await fetchViaProxy(url, premium)
    if (!res.ok) { console.log(`[gumtree] HTTP ${res.status}`); return '' }
    return await res.text()
  } catch (e: any) {
    console.log('[gumtree] fetch error:', e.message)
    return ''
  }
}

function parseHtml(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  // Extract listing ID from URL patterns: /p/.../ID or /s-ad/.../ID or /v-.../ID
  const idRe = /href="(\/(?:p|s-ad|v-[^/]+)\/[^"]*?\/(\d{7,14})[^"]*)"/g
  let m: RegExpExecArray | null

  while ((m = idRe.exec(html)) !== null) {
    const path = m[1]
    const id   = m[2]
    if (seen.has(id)) continue

    const win = html.slice(Math.max(0, m.index - 300), Math.min(html.length, m.index + 3000))

    // Skip promoted/sponsored
    if (/\b(top-ad|featured|sponsored|is-top)\b/i.test(win)) continue

    seen.add(id)

    const url = `https://${domain}${path}`

    // Title: h2/h3 content, or aria-label, or alt text
    let title = ''
    const h2M  = win.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i)
    if (h2M) title = stripHtml(h2M[1]).replace(/\s+/g, ' ').trim()
    if (!title || title.length < 2) {
      const altM = win.match(/alt="([^"]{3,120})"/)
      if (altM) title = altM[1].trim()
    }
    if (!title || title.length < 2) continue

    // Price
    let price = ''
    const priceM = win.match(/<[^>]+class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i)
    if (priceM) {
      price = stripHtml(priceM[1]).replace(/\s+/g, ' ').trim()
    } else {
      const pm = win.match(/(?:£|A\$|\$)\s*[\d,]+(?:\.\d{2})?/)
      if (pm) price = pm[0].trim()
    }

    // Image
    const imgM = win.match(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
    const image = imgM ? imgM[1] : null

    items.push({ id, title, price, url, image, platform: 'gumtree' })
  }

  return items
}
