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
  const { error } = await supabase.from('searches').update(body).eq('id', params.id).eq('user_id', user.userId)
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
