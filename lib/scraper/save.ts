import { ScrapedItem } from './types'

// Only listings actually posted within this window count as "new". Anything the
// marketplace says is older gets remembered (seen_ids) but never shown in the feed.
const MAX_LISTING_AGE_MS = 48 * 60 * 60 * 1000 // 48h

// Single source of truth for persisting scraped items. Used by BOTH the cron
// scheduler and the dashboard's on-demand scrape, so found_at (the listing's real
// post time when known, else discovery time) and dedup behave identically no
// matter which path triggered the scrape.
export async function saveNewItems(supabase: any, search: any, items: ScrapedItem[]): Promise<number> {
  if (!items.length) return 0
  const nowMs = Date.now()
  const now = new Date(nowMs).toISOString()

  const { data: seenRows } = await supabase
    .from('seen_ids').select('item_id').eq('search_id', search.id)
  const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))

  // Baseline scan = the very first scrape of this search. Everything on the
  // marketplace at that moment is "old stock" — remember the ids, show nothing.
  // From the next scan on, an unseen id is a genuinely fresh listing.
  const isBaseline = seenSet.size === 0

  const newItems = items.filter(it => !seenSet.has(it.id))
  if (newItems.length === 0) return 0

  const freshItems = newItems.filter(it => {
    if (it.postedAt) {
      const age = nowMs - new Date(it.postedAt).getTime()
      return age <= MAX_LISTING_AGE_MS
    }
    // No real post time from the platform: trust only items that appear after
    // the baseline — those were posted between two scans, i.e. brand new.
    return !isBaseline
  })

  const rows = freshItems.map(it => ({
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
    rows.length
      ? supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id', ignoreDuplicates: true })
      : Promise.resolve(),
    // Remember EVERY id we saw (fresh or old) so old stock never resurfaces later
    supabase.from('seen_ids').upsert(
      newItems.map(it => ({ search_id: search.id, item_id: it.id })),
      { ignoreDuplicates: true }
    ),
  ])
  return rows.length
}
