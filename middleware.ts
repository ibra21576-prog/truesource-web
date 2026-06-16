import { NextRequest, NextResponse } from 'next/server'

const PUBLIC = ['/login', '/api/auth', '/_next', '/logo', '/favicon', '/api/cron', '/api/debug-scrape']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/' || PUBLIC.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get('session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Verify JWT using Web Crypto API (Edge-compatible)
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('invalid')

    const secret = process.env.SESSION_SECRET ?? 'fallback-change-me'
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    // Base64URL → Base64 → Uint8Array
    const sigB64 = parts[2].replace(/-/g, '+').replace(/_/g, '/').padEnd(
      parts[2].length + (4 - (parts[2].length % 4)) % 4, '='
    )
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0))

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, sigInput)
    if (!valid) throw new Error('bad sig')

    // Check expiry
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(
      parts[1].length + (4 - (parts[1].length % 4)) % 4, '='
    )
    const payload = JSON.parse(atob(payloadB64))
    if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('expired')

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
