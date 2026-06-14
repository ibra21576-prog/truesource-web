import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')
  const isAdmin  = user.userId === process.env.WHOP_OWNER_ID

  const supabase = createServiceClient()

  // Get user's search IDs first (admins see everything)
  let searchIds: string[] | null = null
  if (!isAdmin) {
    const { data: searches } = await supabase
      .from('searches')
      .select('id')
      .eq('user_id', user.userId)
    searchIds = (searches || []).map((s: any) => s.id)
    if (searchIds.length === 0) return NextResponse.json([])
  }

  let query = supabase
    .from('items')
    .select('*, searches(query)')
    .order('found_at', { ascending: false })
    .limit(500)

  if (platform) query = query.eq('platform', platform)
  if (searchIds) query = query.in('search_id', searchIds)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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
