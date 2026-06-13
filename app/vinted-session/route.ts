import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BUCKET = 'ts-settings'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, domain, cookies, bearerToken } = body

  const expected = process.env.EXTENSION_TOKEN
  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403, headers: CORS })
  }
  if (!domain || !cookies) {
    return NextResponse.json({ ok: false, error: 'domain+cookies fehlen' }, { status: 400, headers: CORS })
  }

  const supabase = createServiceClient()

  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {})

  const payload = JSON.stringify({ cookies, bearerToken: bearerToken || '', updatedAt: Date.now() })
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`vinted/${domain}.json`, Buffer.from(payload), {
      contentType: 'application/json',
      upsert: true,
    })

  if (error) {
    console.error('[vinted-session] storage error:', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500, headers: CORS })
  }

  console.log(`[vinted-session] saved ${domain} (${cookies.length} chars)`)
  return NextResponse.json({ ok: true }, { headers: CORS })
}

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() }, { headers: CORS })
}
