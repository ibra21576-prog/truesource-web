import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

const BUCKET = 'ts-settings'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchId } = await req.json()
  const supabase = createServiceClient()

  const { data: search } = await supabase.from('searches').select('*').eq('id', searchId).single()
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify ownership (admin can scrape any search)
  const isAdmin = session.userId === process.env.WHOP_OWNER_ID
  if (!isAdmin) {
    try {
      const { data } = await supabase.storage.from(BUCKET).download(`user-data/${session.userId}/search-ids.json`)
      const ids: string[] = data ? JSON.parse(await data.text()) : []
      if (!ids.includes(searchId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Attach userId so vinted.ts loads the correct per-user session
  const searchWithUser = { ...search, user_id: session.userId }

  try {
    const items = await fetchItems(searchWithUser)

    const { data: seenRows } = await supabase.from('seen_ids').select('item_id').eq('search_id', searchId)
    const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))
    const isFirst = seenSet.size === 0
    const newItems = isFirst ? items.slice(0, 10) : items.filter(it => !seenSet.has(it.id))

    if (newItems.length > 0) {
      const rows = newItems.map(it => ({
        search_id:  searchId,
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
        supabase.from('seen_ids').upsert(items.map(it => ({ search_id: searchId, item_id: it.id })), { ignoreDuplicates: true }),
      ])
    }
    return NextResponse.json({ ok: true, found: items.length, new: newItems.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
