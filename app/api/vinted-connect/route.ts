import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const BUCKET = 'ts-settings'
const ALLOWED_DOMAINS = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const entries = await Promise.all(
    ALLOWED_DOMAINS.map(async domain => {
      try {
        const { data } = await supabase.storage.from(BUCKET).download(`vinted-sessions/${user.userId}/${domain}.json`)
        if (data) {
          const info = JSON.parse(await data.text())
          return [domain, { connected: true, email: info.email, connectedAt: info.connectedAt }] as const
        }
      } catch {}
      return [domain, { connected: false }] as const
    })
  )

  return NextResponse.json(Object.fromEntries(entries))
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { domain, email, password } = body

  if (!domain || !email || !password) {
    return NextResponse.json({ ok: false, error: 'domain, email und password erforderlich' }, { status: 400 })
  }
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return NextResponse.json({ ok: false, error: 'Ungültige Domain' }, { status: 400 })
  }

  // Authenticate with Vinted via OAuth2 password grant
  let accessToken = ''
  let refreshToken = ''

  try {
    const res = await fetch(`https://${domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Accept':         'application/json',
        'Accept-Language':'de-DE,de;q=0.9,en;q=0.8',
        'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin':         `https://${domain}`,
        'Referer':        `https://${domain}/login`,
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username:   email,
        password:   password,
        client_id:  'web',
        scope:      'user',
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error('[vinted-connect] login failed:', res.status, txt.slice(0, 200))
      const msg = res.status === 400 || res.status === 401
        ? 'E-Mail oder Passwort falsch'
        : `Vinted Fehler (${res.status}) — bitte später nochmal versuchen`
      return NextResponse.json({ ok: false, error: msg }, { status: 400 })
    }

    const data = await res.json()
    accessToken  = data.access_token  ?? ''
    refreshToken = data.refresh_token ?? ''

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Kein Token erhalten — bitte erneut versuchen' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `Verbindungsfehler: ${e.message}` }, { status: 500 })
  }

  // Save session to Supabase Storage per user
  const supabase = createServiceClient()
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {})

  const payload = JSON.stringify({
    email,
    accessToken,
    refreshToken,
    connectedAt: Date.now(),
    updatedAt:   Date.now(),
  })

  const { error } = await supabase.storage.from(BUCKET).upload(
    `vinted-sessions/${user.userId}/${domain}.json`,
    Buffer.from(payload),
    { contentType: 'application/json', upsert: true }
  )

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  console.log(`[vinted-connect] user ${user.userId} connected ${domain} (${email})`)
  return NextResponse.json({ ok: true, email })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { domain } = await req.json()
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    return NextResponse.json({ ok: false, error: 'Ungültige Domain' }, { status: 400 })
  }

  const supabase = createServiceClient()
  await supabase.storage.from(BUCKET).remove([`vinted-sessions/${user.userId}/${domain}.json`])
  return NextResponse.json({ ok: true })
}
