import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url))
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://api.whop.com/v5/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     process.env.WHOP_CLIENT_ID,
        client_secret: process.env.WHOP_CLIENT_SECRET,
        code,
        redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        grant_type:    'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      console.error('[whop] token exchange failed', await tokenRes.text())
      return NextResponse.redirect(new URL('/login?error=token_failed', req.url))
    }

    const { access_token } = await tokenRes.json()

    // Get user info
    const meRes = await fetch('https://api.whop.com/v5/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (!meRes.ok) return NextResponse.redirect(new URL('/login?error=user_failed', req.url))
    const me = await meRes.json()

    // Check active membership for the gated product
    const productId = process.env.WHOP_PRODUCT_ID
    const membRes = await fetch(
      `https://api.whop.com/v5/memberships?product_id=${productId}&valid=true`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    if (!membRes.ok) return NextResponse.redirect(new URL('/login?error=membership_failed', req.url))

    const membData = await membRes.json()
    const memberships: any[] = membData.data ?? membData ?? []
    const hasAccess = memberships.length > 0 &&
      memberships.some((m: any) => m.valid === true || m.status === 'active')

    if (!hasAccess) {
      return NextResponse.redirect(new URL('/login?error=no_access', req.url))
    }

    // Create JWT session
    const session = await createSession(String(me.id ?? me.username), me.username ?? me.name ?? 'Member')
    const res = NextResponse.redirect(new URL('/dashboard', req.url))
    res.cookies.set('session', session, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })
    return res

  } catch (err) {
    console.error('[whop callback]', err)
    return NextResponse.redirect(new URL('/login?error=server_error', req.url))
  }
}
