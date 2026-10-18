import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { saveNewItems } from '@/lib/scraper/save'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/session'
import { cooldownFor } from '@/lib/scraper/cadence'
import { ownsSearch } from '@/lib/user-data'

export async function POST(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchId } = await req.json()
  const supabase = createServiceClient()

  const { data: search } = await supabase.from('searches').select('*').eq('id', searchId).single()
  if (!search) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Every member, including the owner account, may scrape only their own monitor.
  if (!(await ownsSearch(supabase, session.userId, searchId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Attach userId so vinted.ts loads the correct per-user session
  const searchWithUser = { ...search, user_id: session.userId }

  // Enforce marketplace-specific cooldowns on the server. This protects against
  // several open tabs (or repeated button clicks) multiplying the request rate.
  const now = Date.now()
  const last = search.last_scraped_at ? new Date(search.last_scraped_at).getTime() : 0
  const cooldown = cooldownFor(search.platform, search.id)
  const remaining = cooldown - (now - last)
  if (remaining > 0) {
    return NextResponse.json({ ok: true, skipped: true, retryAfterMs: remaining })
  }

  // Optimistic reservation: only one concurrent request may claim this scan.
  let reservation = supabase.from('searches')
    .update({ last_scraped_at: new Date(now).toISOString() })
    .eq('id', searchId)
  reservation = search.last_scraped_at
    ? reservation.eq('last_scraped_at', search.last_scraped_at)
    : reservation.is('last_scraped_at', null)
  const { data: claimed } = await reservation.select('id')
  if (!claimed?.length) {
    return NextResponse.json({ ok: true, skipped: true, retryAfterMs: cooldown })
  }

  try {
    const items = await fetchItems(searchWithUser)
    // Same persistence path as the cron — real post time in found_at, dedup, etc.
    const saved = await saveNewItems(supabase, search, items)
    return NextResponse.json({ ok: true, found: items.length, new: saved })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
