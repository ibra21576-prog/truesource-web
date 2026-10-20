import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/session'
import { ownsSearch } from '@/lib/user-data'
import { runSearchScan } from '@/lib/scraper/run'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const searchId = body?.searchId
  if (typeof searchId !== 'string' || !/^[0-9a-f-]{36}$/i.test(searchId)) return NextResponse.json({ error: 'Invalid search' }, { status: 400 })
  const supabase = createServiceClient()
  try {
    if (!(await ownsSearch(supabase, session.userId, searchId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data: search, error } = await supabase.from('searches').select('*').eq('id', searchId).single()
    if (error && error.code !== 'PGRST116') throw new Error('Search temporarily unavailable')
    if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (search.user_id && search.user_id !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (search.enabled === false) return NextResponse.json({ ok: true, skipped: true, paused: true })
    const result = await runSearchScan(supabase, { ...search, user_id: session.userId })
    return NextResponse.json({ ok: true, skipped: result.skipped, found: result.fetched, new: result.saved, health: result.health })
  } catch {
    return NextResponse.json({ error: 'Search could not refresh. Retrying automatically.' }, { status: 503 })
  }
}
