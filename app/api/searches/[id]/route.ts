import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

const BUCKET = 'ts-settings'

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

async function ownsSearch(supabase: any, userId: string, searchId: string): Promise<boolean> {
  try {
    const { data } = await supabase.storage.from(BUCKET).download(`user-data/${userId}/search-ids.json`)
    if (!data) return false
    const ids: string[] = JSON.parse(await data.text())
    return ids.includes(searchId)
  } catch {
    return false
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = user.userId === process.env.WHOP_OWNER_ID
  const supabase = createServiceClient()

  if (!isAdmin && !(await ownsSearch(supabase, user.userId, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { error } = await supabase.from('searches').update(body).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = user.userId === process.env.WHOP_OWNER_ID
  const supabase = createServiceClient()

  if (!isAdmin && !(await ownsSearch(supabase, user.userId, params.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('searches').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remove from user's search-ids index
  if (!isAdmin) {
    try {
      const { data } = await supabase.storage.from(BUCKET).download(`user-data/${user.userId}/search-ids.json`)
      if (data) {
        const ids: string[] = JSON.parse(await data.text())
        await supabase.storage.from(BUCKET).upload(
          `user-data/${user.userId}/search-ids.json`,
          Buffer.from(JSON.stringify(ids.filter(id => id !== params.id))),
          { contentType: 'application/json', upsert: true }
        )
      }
    } catch {}
  }

  return NextResponse.json({ ok: true })
}
