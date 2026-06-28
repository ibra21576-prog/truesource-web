import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { saveNewItems } from '@/lib/scraper/save'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

const BUCKET = 'ts-settings'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  const session = token ? await verifySession(token) : null
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchId } = await req.json()
  const supabase = createServiceClient()

  const { data: search } = await supabase.from('searches').select('*').eq('id', searchId).single()
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify ownership (admin can scrape any search)
  const isAdmin = session.userId === process.env.WHOP_OWNER_ID
  if (!isAdmin) {
    try {
      const { data } = await supabase.storage.from(BUCKET).download(`user-data/${session.userId}/search-ids.json`)
      const ids: string[] = data ? JSON.parse(await data.text()) : []
      if (!ids.includes(searchId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Attach userId so vinted.ts loads the correct per-user session
  const searchWithUser = { ...search, user_id: session.userId }

  try {
    const items = await fetchItems(searchWithUser)
    // Same persistence path as the cron — real post time in found_at, dedup, etc.
    const saved = await saveNewItems(supabase, search, items)
    return NextResponse.json({ ok: true, found: items.length, new: saved })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
