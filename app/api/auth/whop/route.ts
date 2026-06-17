import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function base64urlEncode(buffer: ArrayBuffer): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function GET(req: Request) {
  const isPopup = new URL(req.url).searchParams.get('popup') === '1'
  const verifierBytes = new Uint8Array(32)
  crypto.getRandomValues(verifierBytes)
  const codeVerifier = base64urlEncode(verifierBytes.buffer)

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier)
  )
  const codeChallenge = base64urlEncode(digest)

  // Generate nonce (required for openid scope)
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = base64urlEncode(nonceBytes.buffer)

  const clientId    = process.env.WHOP_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`

  const url = new URL('https://api.whop.com/oauth/authorize')
  url.searchParams.set('client_id',             clientId)
  url.searchParams.set('redirect_uri',          redirectUri)
  url.searchParams.set('response_type',         'code')
  url.searchParams.set('scope',                 'openid profile email')
  url.searchParams.set('nonce',                 nonce)
  url.searchParams.set('code_challenge',        codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')

  const res = NextResponse.redirect(url.toString())
  res.cookies.set('pkce_verifier', codeVerifier, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 10,
    path:     '/',
  })
  if (isPopup) {
    res.cookies.set('auth_popup', '1', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 10,
      path:     '/',
    })
  }
  return res
}
