import { ScrapedItem } from './types'

// Single source of truth for persisting scraped items. Used by BOTH the cron
// scheduler and the dashboard's on-demand scrape, so found_at (the listing's real
// post time when known, else discovery time) and dedup behave identically no
// matter which path triggered the scrape.
export async function saveNewItems(supabase: any, search: any, items: ScrapedItem[]): Promise<number> {
  if (!items.length) return 0
  const now = new Date().toISOString()

  const { data: seenRows } = await supabase
    .from('seen_ids').select('item_id').eq('search_id', search.id)
  const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))

  const newItems = items.filter(it => !seenSet.has(it.id))
  if (newItems.length === 0) return 0

  const rows = newItems.map(it => ({
    search_id:  search.id,
    item_id:    it.id,
    platform:   it.platform,
    domain:     search.domain,
    title:      it.title,
    price:      it.price,
    url:        it.url,
    image:      it.image,
    found_at:   it.postedAt || now,   // real post time when the platform exposes it
    first_scan: true,
  }))

  await Promise.all([
    // ignoreDuplicates: never overwrite an existing row (protects found_at)
    supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id', ignoreDuplicates: true }),
    supabase.from('seen_ids').upsert(
      newItems.map(it => ({ search_id: search.id, item_id: it.id })),
      { ignoreDuplicates: true }
    ),
  ])
  return newItems.length
}
