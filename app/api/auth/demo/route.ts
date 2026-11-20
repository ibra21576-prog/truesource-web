import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// TEMPORARY (approved by owner): demo access for tutorial screenshots. Removed again right after.
const DEMO_KEY = 'OPnDB15sojtKSEAfyeeVXLbxfSs2x6r7qqZVUSt_1s8'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('k') !== DEMO_KEY) {
    return new NextResponse('Not found', { status: 404 })
  }
  const userId = process.env.WHOP_OWNER_ID?.trim() || 'demo'
  const session = await createSession(userId, 'Demo')
  if (req.nextUrl.searchParams.get('json') === '1') return NextResponse.json({ token: session })
  const res = NextResponse.redirect(new URL('/dashboard', req.url))
  res.cookies.set('session', session, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 3600, path: '/' })
  return res
}
