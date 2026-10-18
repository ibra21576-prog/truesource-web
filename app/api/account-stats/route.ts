import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRequestSession } from '@/lib/session'
import { claimLegacySearches, getUserSearchIds } from '@/lib/user-data'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServiceClient()
  const searchIds = await getUserSearchIds(supabase, session.userId)
  if (!searchIds.length) return NextResponse.json({ totalItems: 0, searches: 0, pricedItems: 0 })
  await claimLegacySearches(supabase, session.userId, searchIds)

  const [{ count: totalItems }, { count: searches }, { count: pricedItems }] = await Promise.all([
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', session.userId).in('search_id', searchIds),
    supabase.from('searches').select('*', { count: 'exact', head: true }).eq('user_id', session.userId).in('id', searchIds),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', session.userId).in('search_id', searchIds).not('price', 'is', null),
  ])

  return NextResponse.json({ totalItems: totalItems ?? 0, searches: searches ?? 0, pricedItems: pricedItems ?? 0 })
}
