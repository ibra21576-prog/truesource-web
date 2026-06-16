import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = new URL(req.url).searchParams.get('platform') || 'kijiji'
  const supabase = createServiceClient()

  // Delete all items for this platform so they get re-scraped with correct data
  const { error: itemsErr, count: itemsDeleted } = await supabase
    .from('items')
    .delete({ count: 'exact' })
    .eq('platform', platform)

  // Delete seen_ids for searches of this platform so cron treats them as new
  const { data: searches } = await supabase
    .from('searches')
    .select('id')
    .eq('platform', platform)

  let seenDeleted = 0
  if (searches?.length) {
    const ids = searches.map(s => s.id)
    const { count } = await supabase
      .from('seen_ids')
      .delete({ count: 'exact' })
      .in('search_id', ids)
    seenDeleted = count || 0
  }

  return NextResponse.json({
    ok: true, platform,
    itemsDeleted: itemsDeleted || 0,
    seenDeleted,
    error: itemsErr?.message,
  })
}
