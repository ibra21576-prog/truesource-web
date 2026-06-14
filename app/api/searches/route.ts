import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const BUCKET = 'ts-settings'

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

async function getUserSearchIds(supabase: any, userId: string): Promise<string[]> {
  try {
    const { data } = await supabase.storage.from(BUCKET).download(`user-data/${userId}/search-ids.json`)
    if (!data) return []
    return JSON.parse(await data.text()) as string[]
  } catch {
    return []
  }
}

async function saveUserSearchIds(supabase: any, userId: string, ids: string[]) {
  await supabase.storage.from(BUCKET).upload(
    `user-data/${userId}/search-ids.json`,
    Buffer.from(JSON.stringify(ids)),
    { contentType: 'application/json', upsert: true }
  )
}

export async function GET(req: NextRequest) {
  // Local scraper: return all enabled searches
  const extToken = req.headers.get('x-extension-token')
  if (extToken) {
    if (extToken !== process.env.EXTENSION_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const supabase = createServiceClient()
    const { data, error } = await supabase.from('searches').select('*').eq('enabled', true).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = user.userId === process.env.WHOP_OWNER_ID
  const supabase = createServiceClient()

  if (isAdmin) {
    const { data, error } = await supabase.from('searches').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Regular user: get only their own search IDs
  const ids = await getUserSearchIds(supabase, user.userId)
  if (ids.length === 0) return NextResponse.json([])

  const { data, error } = await supabase.from('searches').select('*').in('id', ids).order('created_at', { ascending: false })
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
    .insert({ query, platform, domain, min_price: min_price || null, max_price: max_price || null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Register this search as belonging to the user
  const ids = await getUserSearchIds(supabase, user.userId)
  if (!ids.includes(data.id)) {
    await saveUserSearchIds(supabase, user.userId, [...ids, data.id])
  }

  return NextResponse.json(data, { status: 201 })
}
