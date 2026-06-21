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
  let processed = 0
  const errorDetails: string[] = []

  // ── 1. Per-user searches ─────────────────────────────────────────────────────
  const { data: userFolders } = await supabase.storage.from(BUCKET).list('user-data')

  const userSearchMap = new Map<string, string[]>()
  await Promise.all(
    (userFolders ?? []).map(async folder => {
      try {
        const { data } = await supabase.storage.from(BUCKET).download(`user-data/${folder.name}/search-ids.json`)
        if (data) userSearchMap.set(folder.name, JSON.parse(await data.text()))
      } catch {}
    })
  )

  const allUserSearchIds = new Set<string>()
  userSearchMap.forEach(ids => ids.forEach((id: string) => allUserSearchIds.add(id)))

  const userJobs: Array<{ search: any; userId: string }> = []
  const userEntries = Array.from(userSearchMap.entries())
  await Promise.all(
    userEntries.map(async ([userId, searchIds]) => {
      if (!searchIds.length) return
      const { data: searches } = await supabase
        .from('searches')
        .select('*')
        .in('id', searchIds)
        .neq('enabled', false)
      for (const search of searches ?? []) {
        userJobs.push({ search, userId })
      }
    })
  )

  // ── 2. Global / admin searches ───────────────────────────────────────────────
  const { data: allSearches } = await supabase.from('searches').select('*').neq('enabled', false)
  const globalJobs = (allSearches ?? []).filter(s => !allUserSearchIds.has(s.id))

  // ── 3. Run all searches in parallel ─────────────────────────────────────────
  const results = await Promise.allSettled([
    ...userJobs.map(({ search, userId }) =>
      fetchItems({ ...search, user_id: userId })
        .then(items => saveItems(supabase, search, items))
        .then(() => { processed++ })
        .catch(e => errorDetails.push(`[user:${userId}][${search.platform}] "${search.query}": ${e.message}`))
    ),
    ...globalJobs.map(search =>
      fetchItems(search)
        .then(items => saveItems(supabase, search, items))
        .then(() => { processed++ })
        .catch(e => errorDetails.push(`[global][${search.platform}] "${search.query}": ${e.message}`))
    ),
  ])
  void results

  // ── 4. Clean up listings older than 24h (sold / expired) ────────────────────
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('items').delete().lt('found_at', cutoff)
  } catch {}

  return NextResponse.json({ ok: true, processed, errors: errorDetails.length, errorDetails })
}

// Upsert ALL scraped items every run — updates found_at so the live feed
// always reflects what is currently listed on each platform.
// Items no longer posted will age out and get deleted after 24h.
async function saveItems(supabase: any, search: any, items: any[]) {
  if (!items.length) return

  const now = new Date().toISOString()

  // Track which IDs we've never seen before (to mark as first_scan)
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
    first_scan: !seenSet.has(it.id),  // true = brand new listing
  }))

  await Promise.all([
    // Upsert all — on conflict update found_at + price (prices can change)
    supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id' }),
    // Track every seen ID so we know "first_scan" correctly next time
    supabase.from('seen_ids').upsert(
      items.map((it: any) => ({ search_id: search.id, item_id: it.id })),
      { ignoreDuplicates: true }
    ),
  ])
}
