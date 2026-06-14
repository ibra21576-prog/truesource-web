import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

const BUCKET = 'ts-settings'

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { error } = await supabase.from('searches').update(body).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  const supabase = createServiceClient()

  const { error } = await supabase.from('searches').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remove from user's search-ids list
  if (user) {
    try {
      const { data } = await supabase.storage.from(BUCKET).download(`user-data/${user.userId}/search-ids.json`)
      if (data) {
        const ids: string[] = JSON.parse(await data.text())
        const updated = ids.filter(id => id !== params.id)
        await supabase.storage.from(BUCKET).upload(
          `user-data/${user.userId}/search-ids.json`,
          Buffer.from(JSON.stringify(updated)),
          { contentType: 'application/json', upsert: true }
        )
      }
    } catch {}
  }

  return NextResponse.json({ ok: true })
}
