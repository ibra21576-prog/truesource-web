import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { licenseKey } = await req.json()
    if (!licenseKey?.trim()) {
      return NextResponse.json({ error: 'no_key' }, { status: 400 })
    }

    // Verify license key against Whop API
    const res = await fetch(`https://api.whop.com/v5/licenses/${licenseKey.trim()}`, {
      headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'invalid_key' }, { status: 401 })
    }

    const license = await res.json()

    // Check if license is valid and belongs to our product
    const productId = process.env.WHOP_PRODUCT_ID
    const isValid = license.valid === true || license.status === 'active' || license.status === 'trialing'
    const isOurProduct = !productId || license.product_id === productId || license.plan?.product_id === productId

    if (!isValid || !isOurProduct) {
      return NextResponse.json({ error: 'no_access' }, { status: 403 })
    }

    // Create session
    const userId = String(license.user_id ?? license.id ?? 'member')
    const username = license.user?.name ?? license.user?.username ?? 'Member'
    const session = await createSession(userId, username)

    const response = NextResponse.json({ ok: true })
    response.cookies.set('session', session, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24,
      path:     '/',
    })
    return response

  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
