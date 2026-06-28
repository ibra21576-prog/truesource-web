import { ScrapedItem, Search } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-CA,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) { console.log(`[kijiji] HTTP ${res.status}`); return '' }
    const t = await res.text()
    return t.length > 5000 ? t : ''
  } catch (e: any) {
    console.log(`[kijiji] fetch error: ${e.message}`)
    return ''
  }
}

function isBlocked(html: string) {
  return /captcha|Just a moment|are you a robot|Checking your browser/i.test(html)
}

export async function fetchKijiji(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.kijiji.ca'
  const q = encodeURIComponent(search.query)
  // All categories, all of Canada (l0 = Canada-wide, no category filter)
  const base = `https://${domain}/b-canada/${q}/k0l0?sortingOrder=dateDesc`

  // Fetch pages 1 and 2 in parallel for double the items
  const [html1, html2] = await Promise.all([
    fetchPage(base),
    fetchPage(`${base}&page=2`),
  ])

  const allItems: ScrapedItem[] = []
  const seen = new Set<string>()

  for (const html of [html1, html2]) {
    if (!html || isBlocked(html)) continue
    for (const item of parseJsonLd(html, domain)) {
      if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item) }
    }
  }

  console.log(`[kijiji] ${allItems.length} items from 2 pages`)
  return allItems
}

function parseJsonLd(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const list = data['@type'] === 'ItemList' ? data.itemListElement : null
      if (!Array.isArray(list)) continue
      for (const entry of list) {
        const it = entry.item || entry
        const urlStr: string = it.url || ''
        const idM = urlStr.match(/\/(\d{7,14})(?:\/|$)/)
        if (!idM) continue
        const id = idM[1]
        if (seen.has(id)) continue
        seen.add(id)
        const title: string = it.name || ''
        if (!title || title.length < 2) continue
        const priceRaw = it.offers?.price
        const priceNum = priceRaw ? Number(priceRaw) : NaN
        const priceStr = !isNaN(priceNum) && priceNum > 0
          ? `$${priceNum % 1 === 0 ? priceNum : priceNum.toFixed(2)}`
          : ''
        let image: string | null = it.image || null
        if (image) {
          image = image.includes('rule=')
            ? image.replace(/rule=[^&]+/, 'rule=galleryLargeV2')
            : image + (image.includes('?') ? '&' : '?') + 'rule=galleryLargeV2'
        }
        items.push({ id, title, price: priceStr, url: urlStr, image, platform: 'kijiji' })
      }
      if (items.length > 0) return items
    } catch {}
  }
  return items
}
