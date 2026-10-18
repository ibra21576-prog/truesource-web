import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/session'
import { getUserSearchIds, ownsSearch, saveUserSearchIds } from '@/lib/user-data'

async function getUser(req: NextRequest) {
  return getRequestSession(req)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  if (!(await ownsSearch(supabase, user.userId, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const allowed = ['enabled', 'query', 'min_price', 'max_price', 'exclude_terms', 'max_age_hours', 'alert_max_price', 'alert_min_discount']
  const update = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
  if (Array.isArray(update.exclude_terms)) {
    update.exclude_terms = update.exclude_terms.map(value => String(value).trim().toLowerCase()).filter(Boolean).slice(0, 20)
  }
  if (update.max_age_hours != null) update.max_age_hours = Math.min(168, Math.max(1, Number(update.max_age_hours) || 48))
  if (update.alert_min_discount != null) update.alert_min_discount = Math.min(90, Math.max(1, Number(update.alert_min_discount)))
  const { error } = await supabase.from('searches').update(update).eq('id', params.id).eq('user_id', user.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  if (!(await ownsSearch(supabase, user.userId, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('searches').delete().eq('id', params.id).eq('user_id', user.userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remove from user's search-ids index
  try {
    const ids = await getUserSearchIds(supabase, user.userId)
    await saveUserSearchIds(supabase, user.userId, ids.filter(id => id !== params.id))
  } catch {}

  return NextResponse.json({ ok: true })
}
