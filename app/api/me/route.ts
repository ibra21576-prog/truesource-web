import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return NextResponse.json(null, { status: 401 })
  const session = await verifySession(token)
  if (!session) return NextResponse.json(null, { status: 401 })
  return NextResponse.json(session)
}
