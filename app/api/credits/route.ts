import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/session'
import { getCredits, addCredits } from '@/lib/credits'

export const dynamic = 'force-dynamic'

async function getUser(req: NextRequest) {
  return getRequestSession(req)
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = user.userId === process.env.WHOP_OWNER_ID
  if (isAdmin) return NextResponse.json({ balance: null, unlimited: true })

  const supabase = createServiceClient()
  const balance = await getCredits(supabase, user.userId)
  return NextResponse.json({ balance, unlimited: false })
}

// Admin-only: manually top up a customer's credit balance (until a paid
// credit-pack product exists in Whop with a webhook to automate this).
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user || user.userId !== process.env.WHOP_OWNER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { userId, amount } = await req.json()
  if (!userId || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Missing userId or amount' }, { status: 400 })
  }
  const supabase = createServiceClient()
  const balance = await addCredits(supabase, userId, amount)
  return NextResponse.json({ balance })
}
