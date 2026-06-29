import { ScrapedItem, Search } from './types'
import { stripHtml } from './utils'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function tryDirect(url: string): Promise<{ ok: boolean; text: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return { ok: false, text: '' }
    const text = await res.text()
    return { ok: true, text }
  } catch { return { ok: false, text: '' } }
}

async function tryProxy(url: string): Promise<{ ok: boolean; text: string }> {
  const key = process.env.SCRAPERAPI_KEY
  if (!key) return { ok: false, text: '' }
  try {
    const proxyUrl = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=us`
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(7500) })
    if (!res.ok) return { ok: false, text: '' }
    const text = await res.text()
    return { ok: true, text }
  } catch { return { ok: false, text: '' } }
}

// Country-wide coverage: the biggest US + Canadian metros. Craigslist is
// city-based with no nationwide search, so we fan out across the major markets
// in parallel (fast JSON API) to approximate "the whole country".
const DEFAULT_CITIES = [
  // USA — major metros coast to coast
  'newyork.craigslist.org',
  'losangeles.craigslist.org',
  'chicago.craigslist.org',
  'sfbay.craigslist.org',
  'sandiego.craigslist.org',
  'seattle.craigslist.org',
  'boston.craigslist.org',
  'washingtondc.craigslist.org',
  'dallas.craigslist.org',
  'houston.craigslist.org',
  'atlanta.craigslist.org',
  'miami.craigslist.org',
  'philadelphia.craigslist.org',
  'phoenix.craigslist.org',
  'denver.craigslist.org',
  'portland.craigslist.org',
  'austin.craigslist.org',
  'minneapolis.craigslist.org',
  // Canada — major metros
  'toronto.craigslist.org',
  'vancouver.craigslist.org',
  'montreal.craigslist.org',
  'calgary.craigslist.org',
]

export async function fetchCraigslist(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'newyork.craigslist.org'
  const params = new URLSearchParams({ query: search.query, sort: 'date' })
  if (search.min_price) params.set('min_price', String(search.min_price))
  if (search.max_price) params.set('max_price', String(search.max_price))

  // If using default domain, scrape multiple cities in parallel for more results
  const domains = domain === 'newyork.craigslist.org' ? DEFAULT_CITIES : [domain]

  if (domains.length > 1) {
    const results = await Promise.all(domains.map(d => fetchSingleCity(d, params)))
    const seen = new Set<string>()
    const all: ScrapedItem[] = []
    for (const items of results) {
      for (const item of items) {
        if (!seen.has(item.id)) { seen.add(item.id); all.push(item) }
      }
    }
    console.log(`[craigslist] ${all.length} items across ${domains.length} cities`)
    return all
  }

  return fetchSingleCity(domain, params)
}

async function fetchSingleCity(domain: string, params: URLSearchParams): Promise<ScrapedItem[]> {
  // 1. Craigslist JSON API — returns structured data, often accessible without proxy
  const jsonUrl = `https://${domain}/jsonsearch/sss/?${params}`
  const jsonRes = await tryDirect(jsonUrl)
  if (jsonRes.ok && jsonRes.text.startsWith('[')) {
    try {
      const items = parseJson(jsonRes.text, domain)
      if (items.length > 0) {
        console.log(`[craigslist] JSON API got ${items.length} items from ${domain}`)
        return items
      }
    } catch {}
  }

  // 2. RSS direct
  const rssUrl = `https://${domain}/search/sss?${params}&format=rss`
  const direct = await tryDirect(rssUrl)
  if (direct.ok && (direct.text.includes('<channel>') || direct.text.includes('<rss'))) {
    const items = parseRss(direct.text, domain)
    if (items.length > 0) {
      console.log(`[craigslist] direct RSS got ${items.length} items from ${domain}`)
      return items
    }
  }

  // 3. RSS via proxy (needs ScraperAPI credits)
  const proxy = await tryProxy(rssUrl)
  if (proxy.ok && (proxy.text.includes('<channel>') || proxy.text.includes('<rss'))) {
    const items = parseRss(proxy.text, domain)
    if (items.length > 0) {
      console.log(`[craigslist] proxy RSS got ${items.length} items from ${domain}`)
      return items
    }
  }

  console.log(`[craigslist] all attempts failed for ${domain}`)
  return []
}

function isBlocked(html: string) {
  return /blocked|captcha|Access Denied|Just a moment/i.test(html)
}

function parseJson(json: string, domain: string): ScrapedItem[] {
  const raw = JSON.parse(json)
  // Response is [[listings...], metadata] — take first element
  const arr: any[] = Array.isArray(raw[0]) ? raw[0] : Array.isArray(raw) ? raw : []
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  for (const row of arr) {
    const id = String(row.PostingID || row.id || '')
    if (!id || seen.has(id)) continue
    // Skip cluster entries (no title)
    const title = row.PostingTitle || row.title || ''
    if (!title || title.length < 2) continue
    seen.add(id)
    const price = row.price != null && row.price > 0 ? `$${row.price}` : row.Ask ? `$${row.Ask}` : ''
    const url = row.PostingURL || row.url || `https://${domain}/d/${id}.html`
    // Upgrade thumbnail to 600x450 full size (CL stores multiple sizes with same hash)
    const rawThumb = row.ImageThumb || row.image || null
    const image = rawThumb
      ? rawThumb.replace(/_\d+x\d+c?(\.\w+)$/, '_600x450$1')
      : null
    // PostedDate is a Unix epoch (seconds) — the real listing time
    const epoch = Number(row.PostedDate)
    const postedAt = epoch > 0 ? new Date(epoch * 1000).toISOString() : null
    items.push({ id, title, price, url, image, platform: 'craigslist', postedAt })
  }
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
    const imgM = block.match(/<enclosure[^>]+url="([^"]+)"/i) || desc.match(/<img[^>]+src="([^"]+)"/i)

    items.push({
      id, title,
      price: priceM ? priceM[0] : '',
      url: link || `https://${domain}/d/${id}.html`,
      image: imgM ? imgM[1] : null,
      platform: 'craigslist',
    })
  }
  return items
}

function parseHtml(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  const idRe = /data-pid="(\d{7,14})"/g
  let m: RegExpExecArray | null
  while ((m = idRe.exec(html)) !== null) {
    const id = m[1]
    if (seen.has(id)) continue
    seen.add(id)
    const win = html.slice(Math.max(0, m.index - 100), Math.min(html.length, m.index + 2000))
    const nextBound = win.indexOf('data-pid=', 200)
    const card = nextBound > 0 ? win.slice(0, nextBound) : win

    const urlM = card.match(/href="(https?:\/\/[^"]+\.html)"/)
    const url = urlM ? urlM[1] : `https://${domain}/d/${id}.html`

    let title = ''
    const labelM = card.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    if (labelM) title = stripHtml(labelM[1]).replace(/\s+/g, ' ').trim()
    if (!title) {
      const aM = card.match(/posting-title[^>]*>([\s\S]*?)<\/a>/i)
      if (aM) title = stripHtml(aM[1]).replace(/\s+/g, ' ').trim()
    }
    if (!title || title.length < 2) continue

    const priceM = card.match(/<span[^>]*price[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    const pm = priceM ? stripHtml(priceM[1]).trim() : (card.match(/\$\s*[\d,]+/) || [''])[0]

    const imgM = card.match(/src="(https?:\/\/images\.craigslist\.org\/[^"]+)"/i)
    items.push({ id, title, price: pm, url, image: imgM ? imgM[1] : null, platform: 'craigslist' })
  }
  return items
}
