import { createClient, createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { NextResponse } from 'next/server'

// Manually triggered scrape for a single search (called from UI "refresh" button)
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchId } = await req.json()

  const { data: search } = await supabase
    .from('searches')
    .select('*')
    .eq('id', searchId)
    .eq('user_id', user.id)
    .single()

  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get Vinted session cookies if available
  let cookieStr: string | undefined
  if (search.platform === 'vinted') {
    const { data: session } = await supabase
      .from('vinted_sessions')
      .select('cookies')
      .eq('user_id', user.id)
      .single()
    cookieStr = session?.cookies
  }

  const service = createServiceClient()

  try {
    const items = await fetchItems(search, cookieStr)

    // Get existing seen IDs
    const { data: seenRows } = await service
      .from('seen_ids')
      .select('item_id')
      .eq('search_id', searchId)

    const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))
    const isFirst = seenSet.size === 0

    const newItems = isFirst ? items.slice(0, 10) : items.filter(it => !seenSet.has(it.id))

    if (newItems.length > 0) {
      const rows = newItems.map(it => ({
        search_id:  searchId,
        user_id:    user.id,
        item_id:    it.id,
        platform:   it.platform,
        domain:     search.domain,
        title:      it.title,
        price:      it.price,
        url:        it.url,
        image:      it.image,
        first_scan: isFirst,
      }))
      await service.from('items').upsert(rows, { onConflict: 'search_id,item_id', ignoreDuplicates: true })

      // Update seen IDs
      const seenInserts = items.map(it => ({ search_id: searchId, item_id: it.id }))
      await service.from('seen_ids').upsert(seenInserts, { ignoreDuplicates: true })
    }

    return NextResponse.json({ ok: true, found: items.length, new: newItems.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
