import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BUCKET = 'ts-settings'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const errorDetails: string[] = []

  // Load all enabled searches
  const { data: allSearches } = await supabase
    .from('searches')
    .select('*')
    .neq('enabled', false)

  const searches: any[] = allSearches ?? []
  if (searches.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, scrapes: 0, errors: 0 })
  }

  // Deduplicate by (platform + query + domain) — if 10 customers all search
  // "iPhone" on Kijiji, scrape once and save for all of them simultaneously
  const grouped = new Map<string, any[]>()
  for (const s of searches) {
    const key = `${s.platform}|${(s.query || '').toLowerCase().trim()}|${s.domain || ''}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(s)
  }

  // Run ALL unique (platform+query+domain) combos in parallel — no batching
  // With 10 customers this is ~20-40 unique scrapes, fits easily in 10s
  let processed = 0
  const jobs = Array.from(grouped.entries()).map(async ([, group]) => {
    const rep = group[0]
    try {
      const items = await fetchItems(rep)
      // Save to ALL customers who monitor this search simultaneously
      await Promise.all(group.map(search => saveItems(supabase, search, items)))
      processed += group.length
    } catch (e: any) {
      errorDetails.push(`[${rep.platform}] "${rep.query}": ${e.message}`)
    }
  })

  await Promise.allSettled(jobs)

  // Clean up items older than 24h (sold/expired listings)
  supabase.from('items')
    .delete()
    .lt('found_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .then(() => {}).catch(() => {})

  return NextResponse.json({
    ok: true,
    processed,
    unique_scrapes: grouped.size,
    total_searches: searches.length,
    errors: errorDetails.length,
    errorDetails,
  })
}

async function saveItems(supabase: any, search: any, items: any[]) {
  if (!items.length) return
  const now = new Date().toISOString()

  const { data: seenRows } = await supabase
    .from('seen_ids').select('item_id').eq('search_id', search.id)
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
