import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose/jwt/verify'

const PUBLIC = ['/login', '/api/auth', '/_next', '/logo', '/truesource-logo-purple.png', '/truesource-mark-v2.png', '/truesource-logo-original-compact.png', '/favicon', '/api/cron', '/api/img', '/api/status']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/' || PUBLIC.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Accept session from cookie OR URL param ?t= (iframe mode — cookies blocked)
  const authorization = req.headers.get('authorization') || ''
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const token = bearer || req.nextUrl.searchParams.get('t') || req.cookies.get('session')?.value
  if (!token) {
    // Detect iframe via Sec-Fetch-Dest header — pass ?iframe=1 so login page knows
    const dest = req.headers.get('Sec-Fetch-Dest') || ''
    const isFrame = dest === 'iframe' || dest === 'frame'
    const loginUrl = new URL('/login', req.url)
    if (isFrame) loginUrl.searchParams.set('iframe', '1')
    return NextResponse.redirect(loginUrl)
  }

  // jose uses the Edge runtime's Web Crypto implementation and applies the
  // same signature and expiry checks as the API route session helper.
  try {
    const secret = process.env.SESSION_SECRET?.trim()
    if (!secret) {
      return new NextResponse('Server configuration error', { status: 503 })
    }
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))

    const comingSoonRoutes = ['/price-insights', '/create-listing']
    const isComingSoon = comingSoonRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))
    if (isComingSoon && payload.userId !== process.env.WHOP_OWNER_ID) {
      const dashboardUrl = new URL('/dashboard', req.url)
      dashboardUrl.searchParams.set('notice', 'coming-soon')
      const urlToken = req.nextUrl.searchParams.get('t')
      if (urlToken) dashboardUrl.searchParams.set('t', urlToken)
      return NextResponse.redirect(dashboardUrl)
    }

    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('session')
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
