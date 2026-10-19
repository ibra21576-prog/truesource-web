import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRequestSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const STATUSES = new Set(['watching', 'bought', 'sold', 'ignored'])

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('saved_deals')
    .select('*, item:items(*, searches(query,domain))')
    .eq('user_id', session.userId)
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const itemId = String(body.item_id || '')
  const status = STATUSES.has(body.status) ? body.status : 'watching'
  if (!itemId) return NextResponse.json({ error: 'Missing item' }, { status: 400 })
  const supabase = createServiceClient()
  const { data: item } = await supabase.from('items').select('id').eq('id', itemId).eq('user_id', session.userId).maybeSingle()
  if (!item) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  const { data, error } = await supabase.from('saved_deals').upsert({
    user_id: session.userId,
    item_id: itemId,
    status,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,item_id' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

