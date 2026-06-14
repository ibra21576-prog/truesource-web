import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-extension-token') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token || token !== process.env.EXTENSION_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { search_query, search_platform, search_domain, items } = body

  if (!search_query || !search_platform || !Array.isArray(items)) {
    return NextResponse.json({ ok: false, error: 'search_query, search_platform, items required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Find the search
  let query = supabase.from('searches').select('*').eq('query', search_query).eq('platform', search_platform).eq('enabled', true)
  if (search_domain) query = query.eq('domain', search_domain)
  const { data: searches } = await query.limit(1)

  if (!searches?.length) {
    return NextResponse.json({ ok: false, error: `Search not found: ${search_platform}/${search_query}` }, { status: 404 })
  }

  const search = searches[0]

  const { data: seenRows } = await supabase.from('seen_ids').select('item_id').eq('search_id', search.id)
  const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))
  const isFirst = seenSet.size === 0
  const newItems = isFirst ? items.slice(0, 10) : items.filter((it: any) => !seenSet.has(it.id))

  let saved = 0
  if (newItems.length > 0) {
    const rows = newItems.map((it: any) => ({
      search_id:  search.id,
      item_id:    it.id,
      platform:   it.platform || search_platform,
      domain:     search.domain,
      title:      it.title,
      price:      it.price || '',
      url:        it.url,
      image:      it.image || null,
      first_scan: isFirst,
    }))
    await supabase.from('items').upsert(rows, { onConflict: 'search_id,item_id', ignoreDuplicates: true })
    await supabase.from('seen_ids').upsert(
      items.map((it: any) => ({ search_id: search.id, item_id: it.id })),
      { ignoreDuplicates: true }
    )
    saved = newItems.length
  }

  return NextResponse.json({ ok: true, saved, total: items.length, isFirst })
}
