import { NextResponse } from 'next/server'

export async function GET() {
  const clientId    = process.env.WHOP_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`

  const url = new URL('https://whop.com/oauth')
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('redirect_uri',  redirectUri)
  url.searchParams.set('response_type', 'code')

  return NextResponse.redirect(url.toString())
}
