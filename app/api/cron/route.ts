import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  let processed = 0
  const errorDetails: string[] = []

  // ── 1. Per-user searches (each user with their own Vinted session) ──────────
  const { data: userFolders } = await supabase.storage.from('ts-settings').list('vinted-sessions')

  for (const folder of userFolders ?? []) {
    const userId = folder.name

    const { data: searches } = await supabase
      .from('searches')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true)

    if (!searches?.length) continue

    for (const search of searches) {
      try {
        const items = await fetchItems(search)
        await saveNewItems(supabase, search, items)
        processed++
      } catch (e: any) {
        errorDetails.push(`[user:${userId}][${search.platform}] "${search.query}": ${e.message}`)
      }
    }
  }

  // ── 2. Global / admin searches (no user_id — legacy or admin-created) ───────
  const { data: globalSearches } = await supabase
    .from('searches')
    .select('*')
    .is('user_id', null)
    .eq('enabled', true)

  for (const search of globalSearches ?? []) {
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
