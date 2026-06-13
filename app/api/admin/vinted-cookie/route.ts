import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const BUCKET = 'ts-settings'
const OWNER_ID = process.env.WHOP_OWNER_ID

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.userId !== OWNER_ID) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { domain, cookies, bearer } = await req.json()
  if (!domain || !cookies) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = createServiceClient()
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {})

  const payload = JSON.stringify({ cookies, bearerToken: bearer ?? '', updatedAt: Date.now() })
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`vinted/${domain}.json`, Buffer.from(payload), {
      contentType: 'application/json',
      upsert: true,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.userId !== OWNER_ID) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const domains = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']
  const result: Record<string, { set: boolean; age?: string }> = {}

  for (const d of domains) {
    try {
      const { data } = await supabase.storage.from(BUCKET).download(`vinted/${d}.json`)
      if (data) {
        const text = await data.text()
        const parsed = JSON.parse(text)
        const ageMs = Date.now() - (parsed.updatedAt || 0)
        const ageDays = Math.floor(ageMs / 86400000)
        result[d] = { set: true, age: ageDays === 0 ? 'today' : `${ageDays}d ago` }
      } else {
        result[d] = { set: false }
      }
    } catch {
      result[d] = { set: false }
    }
  }

  return NextResponse.json(result)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.userId !== OWNER_ID) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { domain } = await req.json()
  const supabase = createServiceClient()
  await supabase.storage.from(BUCKET).remove([`vinted/${domain}.json`])
  return NextResponse.json({ ok: true })
}
