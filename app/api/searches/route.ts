import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

export async function GET(req: NextRequest) {
  // Allow local scraper to fetch searches with extension token
  const extToken = req.headers.get('x-extension-token')
  if (extToken && extToken !== process.env.EXTENSION_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createServiceClient()

  if (extToken) {
    // Local scraper: return all enabled searches
    const { data, error } = await supabase.from('searches').select('*').eq('enabled', true).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Normal authenticated user: return only their own searches
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = user.userId === process.env.WHOP_OWNER_ID
  let qb = supabase.from('searches').select('*').order('created_at', { ascending: false })

  // Admins see all searches, regular users see only their own
  if (!isAdmin) qb = qb.eq('user_id', user.userId)

  const { data, error } = await qb
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const body = await req.json()
  const { query, platform, domain, min_price, max_price } = body
  if (!query || !platform || !domain)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('searches')
    .insert({
      query,
      platform,
      domain,
      min_price: min_price || null,
      max_price: max_price || null,
      user_id: user.userId,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
