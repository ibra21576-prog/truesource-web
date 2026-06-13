import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/session'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    const allParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    console.error('[whop] callback without code:', JSON.stringify(allParams))
    return NextResponse.redirect(new URL('/login?error=no_code', req.url))
  }

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('pkce_verifier')?.value
  const redirectUri  = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`

  try {
    // 1) Exchange code for access token
    const tokenRes = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     process.env.WHOP_CLIENT_ID,
        code_verifier: codeVerifier,
      }),
    })

    const tokenText = await tokenRes.text()
    if (!tokenRes.ok) {
      console.error('[whop] token exchange failed', tokenRes.status, tokenText)
      return NextResponse.redirect(new URL('/login?error=token_failed', req.url))
    }
    const { access_token } = JSON.parse(tokenText)

    // 2) Get user info
    const meRes = await fetch('https://api.whop.com/oauth/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (!meRes.ok) return NextResponse.redirect(new URL('/login?error=user_failed', req.url))
    const me = await meRes.json()
    const userId   = me.sub ?? me.id
    const username = me.preferred_username ?? me.name ?? me.username ?? 'Member'

    // 3) Try to get real username from /v5/me
    let displayName = username
    try {
      const v5MeRes = await fetch('https://api.whop.com/v5/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const v5MeText = await v5MeRes.text()
      console.log('[whop] /v5/me status:', v5MeRes.status, 'body:', v5MeText.slice(0, 300))
      if (v5MeRes.ok) {
        const v5Me = JSON.parse(v5MeText)
        displayName = v5Me.username ?? v5Me.name ?? v5Me.email?.split('@')[0] ?? username
      }
    } catch (e) { console.log('[whop] /v5/me error:', e) }
    console.log('[whop] userinfo full:', JSON.stringify(me))
    console.log('[whop] displayName:', displayName)

    // 4) Check membership + get memberSince
    const productId = process.env.WHOP_PRODUCT_ID
    const ownerId   = process.env.WHOP_OWNER_ID

    let hasAccess   = false
    let memberSince = ''

    if (ownerId && userId === ownerId) {
      hasAccess   = true
      memberSince = new Date().toISOString()
    } else {
      const membUrl = new URL('https://api.whop.com/v5/memberships')
      if (productId) membUrl.searchParams.set('product_id', productId)
      membUrl.searchParams.set('valid', 'true')

      const membRes = await fetch(membUrl.toString(), {
        headers: { Authorization: `Bearer ${access_token}` },
      })

      if (membRes.ok) {
        const membData = await membRes.json()
        const memberships: any[] = membData.data ?? []
        const active = memberships.find(
          (m: any) => m.valid === true || m.status === 'active' || m.status === 'completed'
        )
        hasAccess   = !!active
        memberSince = active?.created_at ?? active?.starts_at ?? ''
      } else {
        const t = await membRes.text()
        console.error('[whop] membership check failed', membRes.status, t)
        return NextResponse.redirect(new URL('/login?error=membership_failed', req.url))
      }
    }

    if (!hasAccess) {
      return NextResponse.redirect(new URL('/login?error=no_access', req.url))
    }

    // 5) Create 24h JWT session with username + memberSince
    const session = await createSession(String(userId), displayName, memberSince)
    const res = NextResponse.redirect(new URL('/dashboard', req.url))
    res.cookies.delete('pkce_verifier')
    res.cookies.set('session', session, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24,
      path:     '/',
    })
    return res

  } catch (err) {
    console.error('[whop callback]', err)
    return NextResponse.redirect(new URL('/login?error=server_error', req.url))
  }
}
