import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRequestSession } from '@/lib/session'

const STATUSES = new Set(['watching', 'bought', 'sold', 'ignored'])
function amount(value: unknown) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (STATUSES.has(body.status)) update.status = body.status
  for (const key of ['purchase_price', 'shipping_cost', 'fees', 'sale_price']) {
    if (key in body) update[key] = amount(body[key])
  }
  if ('notes' in body) update.notes = String(body.notes || '').slice(0, 2000)
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('saved_deals').update(update)
    .eq('user_id', session.userId).eq('item_id', params.itemId).select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { itemId: string } }) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServiceClient()
  const { error } = await supabase.from('saved_deals').delete().eq('user_id', session.userId).eq('item_id', params.itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
