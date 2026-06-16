import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchViaProxy(url: string): Promise<Response> {
  const key = process.env.SCRAPERAPI_KEY
  if (key) {
    const proxyUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=us`
    return fetch(proxyUrl, { signal: AbortSignal.timeout(30000) })
  }
  return fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(15000),
  })
}

export async function fetchCraigslist(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'newyork.craigslist.org'
  const params = new URLSearchParams({ query: search.query, sort: 'date' })
  if (search.min_price) params.set('min_price', String(search.min_price))
  if (search.max_price) params.set('max_price', String(search.max_price))

  // 1. RSS feed — most reliable, never bot-checked
  try {
    const rssUrl = `https://${domain}/search/sss?${params}&format=rss`
    const res = await fetchViaProxy(rssUrl)
    if (res.ok) {
      const text = await res.text()
      if (text.includes('<channel>') || text.includes('<rss')) {
        const items = parseRss(text, domain)
        if (items.length > 0) {
          console.log(`[craigslist] RSS got ${items.length} items`)
          return items
        }
      }
    }
  } catch (_) {}

  // 2. HTML fallback via proxy
  let html = ''
  try {
    const htmlUrl = `https://${domain}/search/sss?${params}`
    const res = await fetchViaProxy(htmlUrl)
    if (!res.ok) { console.log(`[craigslist] HTTP ${res.status}`); return [] }
    html = await res.text()
  } catch (e: any) {
    console.log('[craigslist] fetch error:', e.message)
    return []
  }

  if (/captcha|blocked|Access Denied|Just a moment/i.test(html)) {
    console.log('[craigslist] bot check — skipping')
    return []
  }

  const items = parseHtml(html, domain)
  console.log(`[craigslist] HTML got ${items.length} items from ${domain}`)
  return items
}

function parseRss(xml: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  const blockRe = /<item>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[1]

    const linkM = block.match(/<link>([\s\S]*?)<\/link>/i) || block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)
    const link = linkM ? linkM[1].trim() : ''
    const idM = link.match(/\/(\d{7,14})\.html/)
    if (!idM) continue
    const id = idM[1]
    if (seen.has(id)) continue
    seen.add(id)

    const titleM = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
    const rawTitle = titleM ? titleM[1].trim() : ''
    const title = stripHtml(rawTitle).replace(/\s+/g, ' ').trim()
    if (!title || title.length < 2) continue

    const descM = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)
    const desc = descM ? descM[1] : ''
    const priceM = title.match(/\$[\d,]+/) || desc.match(/\$[\d,]+/)
    const price = priceM ? priceM[0] : ''

    const imgM = block.match(/<enclosure[^>]+url="([^"]+)"/i) || desc.match(/<img[^>]+src="([^"]+)"/i)
    const image = imgM ? imgM[1] : null

    const url = link || `https://${domain}/d/${id}.html`
    items.push({ id, title, price, url, image, platform: 'craigslist' })
  }
  return items
}

function parseHtml(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()

  // 2024+ Craigslist: <li class="cl-search-result" data-pid="...">
  const blockRe = /data-pid="(\d{7,14})"/g
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html)) !== null) {
    const id = m[1]
    if (seen.has(id)) continue
    seen.add(id)

    const win = html.slice(Math.max(0, m.index - 100), Math.min(html.length, m.index + 2000))
    const nextBound = win.indexOf('data-pid=', 200)
    const card = nextBound > 0 ? win.slice(0, nextBound) : win

    // URL
    const urlM = card.match(/href="(https?:\/\/[^"]+\.html)"/)
    const url = urlM ? urlM[1] : `https://${domain}/d/${id}.html`

    // Title: <span class="label">
    let title = ''
    const labelM = card.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    if (labelM) title = stripHtml(labelM[1]).replace(/\s+/g, ' ').trim()
    if (!title) {
      const aM = card.match(/class="[^"]*posting-title[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      if (aM) title = stripHtml(aM[1]).replace(/\s+/g, ' ').trim()
    }
    if (!title || title.length < 2) continue

    // Price: <span class="priceinfo"> or $NNN
    let price = ''
    const priceElM = card.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    if (priceElM) price = stripHtml(priceElM[1]).replace(/\s+/g, ' ').trim()
    if (!price) {
      const pm = card.match(/\$\s*[\d,]+(?:\.\d{2})?/)
      if (pm) price = pm[0].trim()
    }

    const imgM = card.match(/src="(https?:\/\/images\.craigslist\.org\/[^"]+)"/i)
    const image = imgM ? imgM[1] : null

    items.push({ id, title, price, url, image, platform: 'craigslist' })
  }

  return items
}
