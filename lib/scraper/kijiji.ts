import { ScrapedItem, Search } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-CA,en;q=0.9' },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return ''
    const t = await res.text()
    return t.length > 10000 ? t : ''
  } catch { return '' }
}

function isBlocked(html: string) {
  return /captcha|Just a moment|are you a robot/i.test(html)
}

export async function fetchKijiji(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.kijiji.ca'
  const q = encodeURIComponent(search.query)

  // Fetch 3 pages in parallel — Kijiji uses page= param
  const pages = await Promise.all([
    fetchPage(`https://${domain}/b-buy-sell/canada/${q}/k0c10l0?sortingOrder=dateDesc`),
    fetchPage(`https://${domain}/b-buy-sell/canada/${q}/k0c10l0?sortingOrder=dateDesc&page=2`),
    fetchPage(`https://${domain}/b-buy-sell/canada/${q}/k0c10l0?sortingOrder=dateDesc&page=3`),
  ])

  const allItems: ScrapedItem[] = []
  const seen = new Set<string>()

  for (const html of pages) {
    if (!html || isBlocked(html)) continue
    const items = parseJsonLd(html, domain)
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        allItems.push(item)
      }
    }
  }

  console.log(`[kijiji] ${allItems.length} items across 3 pages`)
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
        const priceStr = it.offers?.price ? `$${Number(it.offers.price).toFixed(2).replace('.00', '')}` : ''
        items.push({ id, title, price: priceStr, url: urlStr, image: it.image || null, platform: 'kijiji' })
      }
      if (items.length > 0) return items
    } catch {}
  }
  return items
}
