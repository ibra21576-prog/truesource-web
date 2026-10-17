import { Search, ScrapedItem } from './types'
import { stripHtml } from './utils'

export async function fetchTradera(search: Search): Promise<ScrapedItem[]> {
  const pageUrl = `https://www.tradera.com/search?q=${encodeURIComponent(search.query)}`
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(8000), cache: 'no-store',
    })
    if (!res.ok) return []
    const html = await res.text()
    const cards = html.split(/data-item-card-id="/i).slice(1, 61)
    const seen = new Set<string>()
    const items: ScrapedItem[] = []
    for (const card of cards) {
      const id = card.match(/^([^"\s]+)/)?.[1]
      const link = card.match(/href="(\/item\/[^"?]+)"/i)?.[1]
      const title = card.match(/data-testid="item-card-image"[^>]*aria-label="([^"]+)"/i)?.[1]
        || card.match(/title="([^"]+)"[^>]*data-testid="item-card-image"/i)?.[1]
      if (!id || !link || !title || seen.has(id)) continue
      seen.add(id)
      const price = stripHtml(card.match(/data-testid="price"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '')
        .replace(/\s+/g, ' ').replace(/,+$/, '').trim()
      const image = card.match(/<img[^>]+src="(https:\/\/img\.tradera\.net\/[^" ]+)"/i)?.[1] || null
      items.push({ id, title: stripHtml(title), price, url: `https://www.tradera.com${link}`, image, platform: 'tradera' })
    }
    return items
  } catch (e: any) {
    console.log(`[tradera] error: ${e.message}`)
    return []
  }
}
