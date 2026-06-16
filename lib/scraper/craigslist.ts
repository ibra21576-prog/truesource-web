import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function fetchCraigslist(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'newyork.craigslist.org'
  const params = new URLSearchParams({ query: search.query, sort: 'date' })
  if (search.min_price) params.set('min_price', String(search.min_price))
  if (search.max_price) params.set('max_price', String(search.max_price))

  const url = `https://${domain}/search/sss?${params}`

  let html = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(15000),
    })
    if (res.status === 429) { console.log('[craigslist] rate limited — skipping'); return [] }
    if (!res.ok) { console.log(`[craigslist] HTTP ${res.status} — skipping`); return [] }
    html = await res.text()
  } catch (e: any) {
    console.log('[craigslist] fetch error:', e.message)
    return []
  }

  if (/captcha|blocked|Access Denied/i.test(html)) {
    console.log('[craigslist] bot check — skipping')
    return []
  }

  const items = parseHtml(html, domain)
  if (items.length === 0) console.log('[craigslist] no items parsed from', domain)
  return items
}

function parseHtml(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  // Craigslist 2024+ structure: <li class="cl-search-result" data-pid="...">
  const blockRe = /<li[^>]*\bdata-pid="(\d+)"[^>]*>([\s\S]*?)<\/li>/g
  let m: RegExpExecArray | null

  while ((m = blockRe.exec(html)) !== null) {
    const id = m[1]
    if (seen.has(id)) continue
    seen.add(id)
    const block = m[0]

    // URL
    const urlM = block.match(/href="(https?:\/\/[^"]+\.html)"/)
    const url = urlM ? urlM[1] : `https://${domain}/d/${id}.html`

    // Title — in <span class="label"> or <a> text
    let title = ''
    const titleM = block.match(/<span[^>]*\bclass="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
              || block.match(/<a[^>]*\bcl-app-anchor[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
    if (titleM) title = stripHtml(titleM[1]).replace(/\s+/g, ' ').trim()
    if (!title || title.length < 2) continue

    // Price
    let price = ''
    const priceM = block.match(/<span[^>]*\bclass="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    if (priceM) {
      price = stripHtml(priceM[1]).replace(/\s+/g, ' ').trim()
    } else {
      const pm = block.match(/\$\s*[\d,]+(?:\.\d{2})?/)
      if (pm) price = pm[0].trim()
    }

    // Image
    const imgM = block.match(/src="(https?:\/\/images\.craigslist\.org\/[^"]+)"/i)
    const image = imgM ? imgM[1] : null

    items.push({ id, title, price, url, image, platform: 'craigslist' })
  }

  // Fallback: older Craigslist HTML structure
  if (items.length === 0) {
    const linkRe = /href="(https?:\/\/[^"]+\.craigslist\.org\/[^"]+\/(\d{7,14})\.html)"/g
    let um: RegExpExecArray | null
    while ((um = linkRe.exec(html)) !== null) {
      const id = um[2]
      if (seen.has(id)) continue
      seen.add(id)

      const win = html.slice(Math.max(0, um.index - 200), Math.min(html.length, um.index + 1500))
      const titleM = win.match(/class="[^"]*result-title[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
                  || win.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
      const title = titleM ? stripHtml(titleM[1]).replace(/\s+/g, ' ').trim() : ''
      if (!title || title.length < 2) continue

      const pm = win.match(/\$\s*[\d,]+(?:\.\d{2})?/)
      const imgM = win.match(/src="(https?:\/\/images\.craigslist\.org\/[^"]+)"/i)

      items.push({
        id, title,
        price: pm ? pm[0].trim() : '',
        url: um[1],
        image: imgM ? imgM[1] : null,
        platform: 'craigslist',
      })
    }
  }

  return items
}
