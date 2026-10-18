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
  if (!searchIds.length) return NextResponse.json({ totalItems: 0, searches: 0, activeSearches: 0, pricedItems: 0, newItems5m: 0 })
  await claimLegacySearches(supabase, session.userId, searchIds)

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString()
  const [totalResult, searchesResult, activeSearchesResult, pricedResult, recentResult] = await Promise.all([
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', session.userId).in('search_id', searchIds),
    supabase.from('searches').select('*', { count: 'exact', head: true }).eq('user_id', session.userId).in('id', searchIds),
    supabase.from('searches').select('*', { count: 'exact', head: true }).eq('user_id', session.userId).in('id', searchIds).eq('enabled', true),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', session.userId).in('search_id', searchIds).not('price', 'is', null),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', session.userId).in('search_id', searchIds).gte('found_at', fiveMinutesAgo),
  ])

  const failed = [totalResult, searchesResult, activeSearchesResult, pricedResult, recentResult].find(result => result.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  return NextResponse.json({
    totalItems: totalResult.count ?? 0,
    searches: searchesResult.count ?? 0,
    activeSearches: activeSearchesResult.count ?? 0,
    pricedItems: pricedResult.count ?? 0,
    newItems5m: recentResult.count ?? 0,
  })
}
