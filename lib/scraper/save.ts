import { ScrapedItem } from './types'
import { recordMarketHistory } from '@/lib/intelligence/history'
import { parseMarketplacePrice } from '@/lib/intelligence/price'

// Only listings actually posted within this window count as "new". Anything the
// marketplace says is older gets remembered (seen_ids) but never shown in the feed.
const DEFAULT_MAX_LISTING_AGE_HOURS = 48

export interface SaveDiagnostics {
  fetched: number
  eligible: number
  alreadyKnown: number
  unseen: number
  fresh: number
  tooOld: number
  invalidDates: number
  saved: number
}

function writeDiagnostics(target: Partial<SaveDiagnostics> | undefined, values: SaveDiagnostics) {
  if (target) Object.assign(target, values)
}

// Single source of truth for persisting scraped items. Used by BOTH the cron
// scheduler and the dashboard's on-demand scrape, so found_at (the listing's real
// post time when known, else discovery time) and dedup behave identically no
// matter which path triggered the scrape.
export async function saveNewItems(
  supabase: any,
  search: any,
  items: ScrapedItem[],
  diagnostics?: Partial<SaveDiagnostics>,
): Promise<number> {
  const stats: SaveDiagnostics = {
    fetched: items.length,
    eligible: 0,
    alreadyKnown: 0,
    unseen: 0,
    fresh: 0,
    tooOld: 0,
    invalidDates: 0,
    saved: 0,
  }
  if (!items.length) {
    writeDiagnostics(diagnostics, stats)
    return 0
  }
  const nowMs = Date.now()
  const now = new Date(nowMs).toISOString()
  const excluded = (Array.isArray(search.exclude_terms) ? search.exclude_terms : [])
    .map((value: unknown) => String(value).trim().toLowerCase())
    .filter(Boolean)
  const maxAgeMs = Math.min(168, Math.max(1, Number(search.max_age_hours) || DEFAULT_MAX_LISTING_AGE_HOURS)) * 60 * 60 * 1000

  const [{ data: seenRows }] = await Promise.all([
    supabase.from('seen_ids').select('item_id').eq('search_id', search.id),
    // Keep a permanent, search-independent record for future price analysis.
    recordMarketHistory(supabase, search, items),
  ])
  const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))

  // Baseline scan = the very first scrape of this search. Show its current
  // results immediately so a newly-created monitor never looks broken, but mark
  // them as baseline items so the UI does not fire sound/push notifications.
  const isBaseline = seenSet.size === 0

  const eligibleItems = items.filter(item => {
    const title = item.title.toLowerCase()
    return !excluded.some((term: string) => title.includes(term))
  })
  stats.eligible = eligibleItems.length

  // Keep existing listings current and create a durable event whenever their
  // advertised price changes. This powers the detail-page price timeline.
  const fetchedIds = eligibleItems.map(item => item.id)
  const { data: existingRows } = fetchedIds.length
    ? await supabase.from('items').select('id,item_id,price').eq('search_id', search.id).in('item_id', fetchedIds)
    : { data: [] }
  const existingByMarketplaceId = new Map((existingRows || []).map((row: any) => [row.item_id, row]))
  const changed = eligibleItems.filter(item => {
    const existing: any = existingByMarketplaceId.get(item.id)
    return existing && (existing.price || '') !== (item.price || '')
  })
  if (changed.length) {
    await Promise.all(changed.map(async item => {
      const existing: any = existingByMarketplaceId.get(item.id)
      await supabase.from('items').update({ price: item.price, title: item.title, image: item.image, url: item.url }).eq('id', existing.id)
    }))
  }
  const currentEvents = eligibleItems.flatMap(item => {
    const existing: any = existingByMarketplaceId.get(item.id)
    if (!existing) return []
    const parsed = parseMarketplacePrice(item.price)
    return [{ user_id: search.user_id || null, item_id: existing.id, price_text: item.price || null, price_amount: parsed.amount, currency: parsed.currency, recorded_at: now }]
  })
  if (currentEvents.length) {
    await supabase.from('item_price_events').upsert(currentEvents, { onConflict: 'item_id,price_text,price_amount', ignoreDuplicates: true })
  }

  const newItems = eligibleItems.filter(it => !seenSet.has(it.id))
  stats.alreadyKnown = eligibleItems.length - newItems.length
  stats.unseen = newItems.length
  if (newItems.length === 0) {
    writeDiagnostics(diagnostics, stats)
    return 0
  }

  const freshItems = newItems.filter(it => {
    if (it.postedAt) {
      const postedMs = new Date(it.postedAt).getTime()
      // A malformed marketplace timestamp must not silently discard a genuinely
      // unseen listing forever. Treat it like an unknown timestamp instead.
      if (!Number.isFinite(postedMs)) {
        stats.invalidDates += 1
        return true
      }
      const age = nowMs - postedMs
      return age <= maxAgeMs
    }
    // Some marketplaces do not expose a reliable post time. An unseen ID is
    // still useful: on the baseline it becomes an initial result; afterwards it
    // is a newly discovered listing.
    return true
  })
  stats.fresh = freshItems.length
  stats.tooOld = newItems.length - freshItems.length - stats.invalidDates

  const rows = freshItems.map(it => ({
    search_id:  search.id,
    user_id:    search.user_id || null,
    item_id:    it.id,
    platform:   it.platform,
    domain:     search.domain,
    title:      it.title,
    price:      it.price,
    url:        it.url,
    image:      it.image,
    found_at:   it.postedAt || now,   // real post time when the platform exposes it
    posted_at:  it.postedAt || null,
    first_scan: isBaseline,
  }))

  const [itemWrite, seenWrite] = await Promise.all([
    // ignoreDuplicates: never overwrite an existing row (protects found_at)
    rows.length
      ? supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id', ignoreDuplicates: true }).select('id,item_id,price')
      : Promise.resolve(),
    // Remember EVERY id we saw (fresh or old) so old stock never resurfaces later
    supabase.from('seen_ids').upsert(
      newItems.map(it => ({ search_id: search.id, item_id: it.id })),
      { ignoreDuplicates: true }
    ),
  ])
  // A customer can delete/re-create a monitor while a background scrape is in
  // flight. In that narrow race the parent search is already gone, so both
  // foreign-key writes are expected to be discarded rather than reported as a
  // broken platform scan.
  if (itemWrite?.error?.code === '23503' || seenWrite?.error?.code === '23503') {
    writeDiagnostics(diagnostics, stats)
    return 0
  }
  if (itemWrite?.error) throw new Error(`Could not save listings: ${itemWrite.error.message}`)
  if (seenWrite?.error) throw new Error(`Could not save seen IDs: ${seenWrite.error.message}`)

  const insertedRows = itemWrite?.data || []
  stats.saved = insertedRows.length
  if (insertedRows.length) {
    const events = insertedRows.map((row: any) => {
      const parsed = parseMarketplacePrice(row.price)
      return {
        user_id: search.user_id || null,
        item_id: row.id,
        price_text: row.price || null,
        price_amount: parsed.amount,
        currency: parsed.currency,
        recorded_at: now,
      }
    })
    // Price history is an enhancement; a temporary history write failure must
    // never stop the scanner from delivering a newly discovered listing.
    await supabase.from('item_price_events').upsert(events, { onConflict: 'item_id,price_text,price_amount', ignoreDuplicates: true })
  }
  writeDiagnostics(diagnostics, stats)
  return insertedRows.length
}
