import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: searches } = await supabase
    .from('searches')
    .select('*')
    .eq('enabled', true)

  if (!searches?.length) return NextResponse.json({ ok: true, processed: 0 })

  let processed = 0
  const errorDetails: string[] = []

  for (const search of searches) {
    try {
      const items = await fetchItems(search)

      const { data: seenRows } = await supabase
        .from('seen_ids')
        .select('item_id')
        .eq('search_id', search.id)

      const seenSet = new Set((seenRows || []).map((r: any) => r.item_id))
      const isFirst = seenSet.size === 0
      const newItems = isFirst ? items.slice(0, 10) : items.filter(it => !seenSet.has(it.id))

      if (newItems.length > 0) {
        const rows = newItems.map(it => ({
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
          items.map(it => ({ search_id: search.id, item_id: it.id })),
          { ignoreDuplicates: true }
        )
      }

      processed++
    } catch (e: any) {
      errorDetails.push(`[${search.platform}] "${search.query}": ${e.message}`)
    }
  }

  return NextResponse.json({ ok: true, processed, errors: errorDetails.length, errorDetails })
}
