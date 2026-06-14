import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Allow local scraper to fetch searches with extension token
  const extToken = req.headers.get('x-extension-token')
  if (extToken && extToken !== process.env.EXTENSION_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const qb = supabase.from('searches').select('*').order('created_at', { ascending: false })
  const { data, error } = extToken
    ? await qb.eq('enabled', true)
    : await qb
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { query, platform, domain, min_price, max_price } = body
  if (!query || !platform || !domain)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('searches')
    .insert({ query, platform, domain, min_price: min_price || null, max_price: max_price || null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
