import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BUCKET = 'ts-settings'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  let processed = 0
  const errorDetails: string[] = []

  // ── 1. Per-user searches ────────────────────────────────────────────────────
  // List all user folders under user-data/
  const { data: userFolders } = await supabase.storage.from(BUCKET).list('user-data')

  for (const folder of userFolders ?? []) {
    const userId = folder.name

    // Get this user's Vinted session domains
    const { data: sessionFiles } = await supabase.storage.from(BUCKET).list(`vinted-sessions/${userId}`)
    const userDomains = (sessionFiles ?? []).map(f => f.name.replace('.json', ''))

    // Get this user's search IDs
    let searchIds: string[] = []
    try {
      const { data: idsFile } = await supabase.storage.from(BUCKET).download(`user-data/${userId}/search-ids.json`)
      if (idsFile) searchIds = JSON.parse(await idsFile.text())
    } catch {}

    if (!searchIds.length) continue

    // Fetch those searches from DB
    const { data: searches } = await supabase
      .from('searches')
      .select('*')
      .in('id', searchIds)
      .eq('enabled', true)

    for (const search of searches ?? []) {
      // Attach userId so vinted.ts loads the right session
      const searchWithUser = { ...search, user_id: userId }
      try {
        const items = await fetchItems(searchWithUser)
        await saveNewItems(supabase, search, items)
        processed++
      } catch (e: any) {
        errorDetails.push(`[user:${userId}][${search.platform}] "${search.query}": ${e.message}`)
      }
    }
  }

  // ── 2. Admin / global searches (searches not owned by any user) ─────────────
  // These are searches created before the per-user system, or admin-only searches
  const { data: allSearches } = await supabase
    .from('searches')
    .select('*')
    .eq('enabled', true)

  // Collect all IDs already processed via user folders
  const processedIds = new Set<string>()
  for (const folder of userFolders ?? []) {
    try {
      const { data } = await supabase.storage.from(BUCKET).download(`user-data/${folder.name}/search-ids.json`)
      if (data) {
        const ids: string[] = JSON.parse(await data.text())
        ids.forEach(id => processedIds.add(id))
      }
    } catch {}
  }

  const globalSearches = (allSearches ?? []).filter(s => !processedIds.has(s.id))

  for (const search of globalSearches) {
    try {
      const items = await fetchItems(search)
      await saveNewItems(supabase, search, items)
      processed++
    } catch (e: any) {
      errorDetails.push(`[global][${search.platform}] "${search.query}": ${e.message}`)
    }
  }

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
  const newItems = isFirst ? items.slice(0, 10) : items.filter(it => !seenSet.has(it.id))

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
    await supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id', ignoreDuplicates: true })
    await supabase.from('seen_ids').upsert(
      items.map((it: any) => ({ search_id: search.id, item_id: it.id })),
      { ignoreDuplicates: true }
    )
  }
}
