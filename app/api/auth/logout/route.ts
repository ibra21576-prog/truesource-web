import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const res = NextResponse.redirect(new URL('/login', origin))
  res.cookies.delete('session')
  return res
}
