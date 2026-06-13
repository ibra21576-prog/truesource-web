import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { searchId } = await req.json()
  const supabase = createServiceClient()

  const { data: search } = await supabase.from('searches').select('*').eq('id', searchId).single()
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const items = await fetchItems(search)

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
      await supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id', ignoreDuplicates: true })
      await supabase.from('seen_ids').upsert(
        items.map(it => ({ search_id: searchId, item_id: it.id })),
        { ignoreDuplicates: true }
      )
    }
    return NextResponse.json({ ok: true, found: items.length, new: newItems.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
