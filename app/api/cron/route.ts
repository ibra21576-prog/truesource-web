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

  // Load each user's search IDs once, store in map to avoid re-downloading
  const userSearchMap = new Map<string, string[]>()
  await Promise.all(
    (userFolders ?? []).map(async folder => {
      try {
        const { data } = await supabase.storage.from(BUCKET).download(`user-data/${folder.name}/search-ids.json`)
        if (data) userSearchMap.set(folder.name, JSON.parse(await data.text()))
      } catch {}
    })
  )

  // Collect all user-owned search IDs (used later for global dedup)
  const allUserSearchIds = new Set<string>()
  userSearchMap.forEach(ids => ids.forEach((id: string) => allUserSearchIds.add(id)))

  // Collect all user searches to run in parallel
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

  // ── 2. Global / admin searches (not owned by any user) ───────────────────────
  const { data: allSearches } = await supabase
    .from('searches')
    .select('*')
    .neq('enabled', false)

  const globalJobs = (allSearches ?? []).filter(s => !allUserSearchIds.has(s.id))

  // Run ALL searches in parallel — much faster, fits in 10s Vercel limit
  const results = await Promise.allSettled([
    ...userJobs.map(({ search, userId }) =>
      fetchItems({ ...search, user_id: userId })
        .then(items => saveNewItems(supabase, search, items))
        .then(() => { processed++ })
        .catch(e => errorDetails.push(`[user:${userId}][${search.platform}] "${search.query}": ${e.message}`))
    ),
    ...globalJobs.map(search =>
      fetchItems(search)
        .then(items => saveNewItems(supabase, search, items))
        .then(() => { processed++ })
        .catch(e => errorDetails.push(`[global][${search.platform}] "${search.query}": ${e.message}`))
    ),
  ])
  void results

  return NextResponse.json({ ok: true, processed, errors: errorDetails.length, errorDetails })
}

async function saveNewItems(supabase: any, search: any, items: any[]) {
  if (!items.length) return

  const { data: seenRows } = await supabase
    .from('seen_ids')
    .select('item_id')
    .eq('search_id', search.id)

  const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))
  const isFirst = seenSet.size === 0
  const newItems = isFirst ? items.slice(0, 50) : items.filter(it => !seenSet.has(it.id))

  if (newItems.length > 0) {
    const rows = newItems.map((it: any) => ({
      search_id:  search.id,
      item_id:    it.id,
      platform:   it.platform,
      domain:     search.domain,
      title:      it.title,
      price:      it.price,
      url:        it.url,
      image:      it.image,
      first_scan: isFirst,
    }))
    await Promise.all([
      supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id', ignoreDuplicates: true }),
      supabase.from('seen_ids').upsert(
        items.map((it: any) => ({ search_id: search.id, item_id: it.id })),
        { ignoreDuplicates: true }
      ),
    ])
  }
}
