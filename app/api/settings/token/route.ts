import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const OWNER_ID = process.env.WHOP_OWNER_ID

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await verifySession(token)
  if (!session || session.userId !== OWNER_ID) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  return NextResponse.json({ token: process.env.EXTENSION_TOKEN ?? '' })
}
