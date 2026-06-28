import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─── Self-limiting scheduler ─────────────────────────────────────────────────
// Scales from 10 to hundreds of customers without code changes:
//  • Dedupe by (platform|query|domain) so 400 customers searching "iPhone" = 1 scrape
//  • Process oldest-scraped searches first (fair rotation)
//  • Stop launching new work once the time budget is hit — leftovers run next minute
//  • Small scale → everything every minute. Large scale → automatic rotation.
//
// Requires (optional) a `last_scraped_at timestamptz` column on `searches` for
// perfect rotation. Works without it too (degrades to DB-order, still budget-capped).

const TIME_BUDGET_MS = 7000          // leave headroom under Vercel's 10s limit
const CHUNK = 25                     // max concurrent scrapes per wave
const MIN_INTERVAL_MS: Record<string, number> = {
  ebay: 180_000,                     // eBay API quota → at most every 3 min per unique search
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  const supabase = createServiceClient()
  const errorDetails: string[] = []

  const { data: allSearches } = await supabase
    .from('searches')
    .select('*')
    .neq('enabled', false)

  const searches: any[] = allSearches ?? []
  if (searches.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, unique: 0 })
  }

  // 1. Dedupe into unique scrape groups; a group's freshness = its oldest member.
  type Group = { key: string; platform: string; rep: any; members: any[]; lastScraped: number }
  const groups = new Map<string, Group>()
  for (const s of searches) {
    const key = `${s.platform}|${(s.query || '').toLowerCase().trim()}|${s.domain || ''}`
    const ts = s.last_scraped_at ? new Date(s.last_scraped_at).getTime() : 0
    const g = groups.get(key)
    if (g) { g.members.push(s); g.lastScraped = Math.min(g.lastScraped, ts) }
    else groups.set(key, { key, platform: s.platform, rep: s, members: [s], lastScraped: ts })
  }

  // 2. Keep only groups whose per-platform cooldown has elapsed, oldest first.
  const now = Date.now()
  const eligible = Array.from(groups.values())
    .filter(g => now - g.lastScraped >= (MIN_INTERVAL_MS[g.platform] ?? 0))
    .sort((a, b) => a.lastScraped - b.lastScraped)

  // 3. Process in waves until the time budget runs out (leftovers run next minute).
  let processed = 0
  let scrapedGroups = 0
  const doneSearchIds: string[] = []
  for (let i = 0; i < eligible.length; i += CHUNK) {
    if (Date.now() - started > TIME_BUDGET_MS) break
    const wave = eligible.slice(i, i + CHUNK)
    await Promise.allSettled(wave.map(async (g) => {
      try {
        const items = await fetchItems(g.rep)
        await Promise.all(g.members.map(s => saveItems(supabase, s, items)))
        g.members.forEach(s => doneSearchIds.push(s.id))
        processed += g.members.length
        scrapedGroups += 1
      } catch (e: any) {
        errorDetails.push(`[${g.platform}] "${g.rep.query}": ${e.message}`)
      }
    }))
  }

  // 4. Stamp last_scraped_at so the next run rotates to the next-oldest searches.
  //    Tolerant of the column not existing yet (older DBs) — just skip silently.
  if (doneSearchIds.length) {
    try {
      await supabase.from('searches')
        .update({ last_scraped_at: new Date().toISOString() })
        .in('id', doneSearchIds)
    } catch {}
  }

  // 5. Cleanup — drop listings posted more than 7 days ago (found_at is now the
  //    real post time). Runs only every 10th minute to protect the time budget.
  if (new Date().getMinutes() % 10 === 0) {
    try {
      await supabase.from('items')
        .delete()
        .lt('found_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    processed,                              // customer-searches saved this run
    unique_groups: groups.size,             // distinct scrapes that exist
    eligible: eligible.length,              // how many were due this run
    scraped_groups: scrapedGroups,          // how many actually ran within budget
    rotating: scrapedGroups < eligible.length, // true once load exceeds one run → rotation kicked in
    ms: Date.now() - started,
    errors: errorDetails.length,
    errorDetails: errorDetails.slice(0, 10),
  })
}

async function saveItems(supabase: any, search: any, items: any[]) {
  if (!items.length) return
  const now = new Date().toISOString()

  // Which item_ids have we already stored for this search?
  const { data: seenRows } = await supabase
    .from('seen_ids').select('item_id').eq('search_id', search.id)
  const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))

  // Only INSERT genuinely new listings. found_at carries the listing's REAL post
  // time when the platform exposes it (Kijiji sortingDate, Craigslist PostedDate…),
  // otherwise the discovery time. This makes "X min ago" truthful and diverse
  // instead of every item from one scrape sharing the same timestamp — and needs
  // no extra DB column or migration.
  const newItems = items.filter((it: any) => !seenSet.has(it.id))
  if (newItems.length === 0) return

  const rows = newItems.map((it: any) => ({
    search_id:  search.id,
    item_id:    it.id,
    platform:   it.platform,
    domain:     search.domain,
    title:      it.title,
    price:      it.price,
    url:        it.url,
    image:      it.image,
    found_at:   it.postedAt || now,
    first_scan: true,
  }))

  await Promise.all([
    // ignoreDuplicates: never overwrite an existing row (protects found_at)
    supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id', ignoreDuplicates: true }),
    supabase.from('seen_ids').upsert(
      newItems.map((it: any) => ({ search_id: search.id, item_id: it.id })),
      { ignoreDuplicates: true }
    ),
  ])
}
