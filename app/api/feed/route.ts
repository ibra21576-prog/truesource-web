import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const BUCKET = 'ts-settings'

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session')?.value || req.nextUrl.searchParams.get('t') || ''
  if (!token) return null
  return verifySession(token)
}

async function getUserSearchIds(supabase: any, userId: string): Promise<string[]> {
  try {
    const { data } = await supabase.storage.from(BUCKET).download(`user-data/${userId}/search-ids.json`)
    if (!data) return []
    return JSON.parse(await data.text()) as string[]
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')
  const isAdmin  = user.userId === process.env.WHOP_OWNER_ID

  const supabase = createServiceClient()

  // Show items seen in the last 30 min (current scan) or fall back to 2h
  // This makes the feed "live" — it always reflects what's currently listed
  const cutoff30m = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const cutoff2h  = new Date(Date.now() -  2 * 60 * 60 * 1000).toISOString()

  let searchIds: string[] | null = null
  if (!isAdmin) {
    const ids = await getUserSearchIds(supabase, user.userId)
    if (ids.length === 0) return NextResponse.json([])
    searchIds = ids
  }

  async function queryItems(cutoff: string) {
    let q = supabase
      .from('items')
      .select('*, searches(query)')
      .gte('found_at', cutoff)
      .order('found_at', { ascending: false })
      .limit(500)

    if (platform) q = q.eq('platform', platform)
    if (searchIds) q = q.in('search_id', searchIds)

    const { data, error } = await q
    if (error) throw new Error(error.message)
    return data ?? []
  }

  try {
    // Try last 30 min first (most recent cron run)
    let data = await queryItems(cutoff30m)

    // If empty (cron hasn't run yet or just failed), show last 2h
    if (data.length === 0) {
      data = await queryItems(cutoff2h)
    }

    // If still empty, show all time (first run, no cutoff)
    if (data.length === 0) {
      let q = supabase
        .from('items')
        .select('*, searches(query)')
        .order('found_at', { ascending: false })
        .limit(500)
      if (platform) q = q.eq('platform', platform)
      if (searchIds) q = q.in('search_id', searchIds)
      const { data: all } = await q
      data = all ?? []
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user || user.userId !== process.env.WHOP_OWNER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const supabase = createServiceClient()
  const { error } = await supabase.from('items').delete().gte('id', '00000000-0000-0000-0000-000000000000')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
