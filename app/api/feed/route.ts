import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/session'
import { claimLegacySearches, getUserSearchIds } from '@/lib/user-data'

export const dynamic = 'force-dynamic'

async function getUser(req: NextRequest) {
  return getRequestSession(req)
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')
  const supabase = createServiceClient()
  const searchIds = await getUserSearchIds(supabase, user.userId)
  if (searchIds.length === 0) return NextResponse.json([])
  await claimLegacySearches(supabase, user.userId, searchIds)

  try {
    // Show items newest-first. Items are never deleted — they accumulate as a
    // permanent archive. `before` cursor lets the dashboard load older pages.
    const before  = searchParams.get('before')   // ISO date — load items older than this
    // 500 is a page size, never a total account limit. Clients keep requesting
    // older cursors as the member scrolls.
    const limitN  = Math.min(Math.max(Number(searchParams.get('limit') || 250), 1), 500)

    let q = supabase
      .from('items')
      .select('*, searches(query)')
      .order('found_at', { ascending: false })
      .limit(limitN)
    if (platform) q = q.eq('platform', platform)
    q = q.eq('user_id', user.userId).in('search_id', searchIds)
    if (before)   q = q.lt('found_at', before)

    const { data: rows, error } = await q
    if (error) throw new Error(error.message)
    const data = rows ?? []

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServiceClient()
  const searchIds = await getUserSearchIds(supabase, user.userId)
  if (!searchIds.length) return NextResponse.json({ ok: true })
  const { error } = await supabase.from('items').delete().eq('user_id', user.userId).in('search_id', searchIds)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
