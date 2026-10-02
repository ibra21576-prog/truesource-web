import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json(null, { status: 401 })
  return NextResponse.json(session)
}
