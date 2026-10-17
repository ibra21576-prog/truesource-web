import type { ScrapedItem } from '@/lib/scraper/types'
import { parseMarketplacePrice } from './price'

export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'
export const EMBEDDING_DIMENSIONS = 384

export function historyContentHash(title: string, platform: string) {
  const value = `${platform}\n${title.trim().toLowerCase()}`
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193) >>> 0
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

// History is intentionally best-effort. The live feed must keep working before
// the pgvector migration is installed, and it must never fail because an
// optional analytics write failed.
export async function recordMarketHistory(
  supabase: any,
  search: any,
  items: ScrapedItem[],
): Promise<void> {
  if (!items.length) return

  const now = new Date().toISOString()
  const rows = items.map(item => {
    const { amount, currency } = parseMarketplacePrice(item.price)
    return {
      platform: item.platform,
      domain: search.domain || '',
      item_id: item.id,
      title: item.title,
      price_text: item.price,
      price_amount: amount,
      currency,
      url: item.url,
      image: item.image,
      posted_at: item.postedAt || null,
      last_seen_at: now,
      content_hash: historyContentHash(item.title, item.platform),
    }
  })

  try {
    const { error } = await supabase
      .from('market_history')
      .upsert(rows, { onConflict: 'platform,domain,item_id' })

    // PGRST205 / 42P01 mean the optional migration has not been applied yet.
    if (error && !['PGRST205', '42P01'].includes(error.code)) {
      console.warn('[history] write skipped:', error.message)
    }
  } catch (error) {
    console.warn('[history] write skipped:', error instanceof Error ? error.message : error)
  }
}

