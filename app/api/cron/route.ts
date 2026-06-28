import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BUCKET = 'ts-settings'

// Max searches to process per cron call — prevents Vercel 10s timeout
const BATCH_SIZE = 30

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const errorDetails: string[] = []

  // ── 1. Load all enabled searches ─────────────────────────────────────────────
  const { data: allSearches } = await supabase
    .from('searches')
    .select('*')
    .neq('enabled', false)

  const searches: any[] = allSearches ?? []
  if (searches.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, skipped: 0, errors: 0, errorDetails: [] })
  }

  // ── 2. Batch cursor — rotate through all searches across cron calls ───────────
  // Each cron call processes BATCH_SIZE searches starting at `offset`
  // The offset is stored in Supabase storage and increments each call
  let offset = 0
  try {
    const { data } = await supabase.storage.from(BUCKET).download('cron-state.json')
    if (data) offset = (JSON.parse(await data.text()).offset ?? 0) % searches.length
  } catch {}

  const batch = []
  for (let i = 0; i < Math.min(BATCH_SIZE, searches.length); i++) {
    batch.push(searches[(offset + i) % searches.length])
  }
  const nextOffset = (offset + batch.length) % searches.length

  // Save next offset (fire-and-forget)
  supabase.storage.from(BUCKET)
    .upload('cron-state.json', Buffer.from(JSON.stringify({ offset: nextOffset, updatedAt: Date.now() })), {
      contentType: 'application/json', upsert: true,
    })
    .catch(() => {})

  // ── 3. Deduplicate by (platform + query + domain) ────────────────────────────
  // If 100 customers all search "iPhone" on Kijiji, scrape only ONCE
  // then save results to ALL matching search IDs
  const uniqueKey = (s: any) => `${s.platform}|${(s.query || '').toLowerCase().trim()}|${s.domain || ''}`

  const grouped = new Map<string, any[]>()
  for (const s of batch) {
    const key = uniqueKey(s)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(s)
  }

  // ── 4. Run one scrape per unique (platform, query, domain) in parallel ────────
  let processed = 0
  const scrapeJobs = Array.from(grouped.entries()).map(async ([, group]) => {
    const representative = group[0]
    try {
      const items = await fetchItems(representative)
      // Save results for ALL searches in this group (all customers who monitor this)
      await Promise.all(group.map(search => saveItems(supabase, search, items)))
      processed += group.length
    } catch (e: any) {
      errorDetails.push(`[${representative.platform}] "${representative.query}": ${e.message}`)
    }
  })

  await Promise.allSettled(scrapeJobs)

  // ── 5. Clean up items older than 24h ─────────────────────────────────────────
  supabase.from('items')
    .delete()
    .lt('found_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .then(() => {})
    .catch(() => {})

  return NextResponse.json({
    ok: true,
    processed,
    unique_scrapes: grouped.size,
    batch_size: batch.length,
    total_searches: searches.length,
    offset_next: nextOffset,
    errors: errorDetails.length,
    errorDetails,
  })
}

async function saveItems(supabase: any, search: any, items: any[]) {
  if (!items.length) return

  const now = new Date().toISOString()

  const { data: seenRows } = await supabase
    .from('seen_ids')
    .select('item_id')
    .eq('search_id', search.id)
  const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))

  const rows = items.map((it: any) => ({
    search_id:  search.id,
    item_id:    it.id,
    platform:   it.platform,
    domain:     search.domain,
    title:      it.title,
    price:      it.price,
    url:        it.url,
    image:      it.image,
    found_at:   now,
    first_scan: !seenSet.has(it.id),
  }))

  await Promise.all([
    supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id' }),
    supabase.from('seen_ids').upsert(
      items.map((it: any) => ({ search_id: search.id, item_id: it.id })),
      { ignoreDuplicates: true }
    ),
  ])
}
