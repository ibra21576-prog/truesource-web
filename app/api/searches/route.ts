import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/session'
import { fetchItems } from '@/lib/scraper'
import { saveNewItems } from '@/lib/scraper/save'
import { claimLegacySearches, getUserSearchIds, saveUserSearchIds } from '@/lib/user-data'

export const dynamic = 'force-dynamic'

async function getUser(req: NextRequest) {
  return getRequestSession(req)
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const ids = await getUserSearchIds(supabase, user.userId)
  if (ids.length === 0) return NextResponse.json([])

  await claimLegacySearches(supabase, user.userId, ids)

  const { data, error } = await supabase.from('searches').select('*, items(count)').eq('user_id', user.userId).in('id', ids).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const body = await req.json()
  const { query, platform, domain, min_price, max_price } = body
  const exclude_terms = Array.isArray(body.exclude_terms)
    ? body.exclude_terms.map((value: unknown) => String(value).trim().toLowerCase()).filter(Boolean).slice(0, 20)
    : String(body.exclude_terms || '').split(',').map((value: string) => value.trim().toLowerCase()).filter(Boolean).slice(0, 20)
  const max_age_hours = Math.min(168, Math.max(1, Number(body.max_age_hours) || 48))
  const alert_max_price = body.alert_max_price === '' || body.alert_max_price == null ? null : Number(body.alert_max_price)
  const alert_min_discount = body.alert_min_discount === '' || body.alert_min_discount == null ? null : Math.min(90, Math.max(1, Number(body.alert_min_discount)))
  if (!query || !platform || !domain)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('searches')
    .insert({
      query, platform, domain,
      min_price: min_price || null,
      max_price: max_price || null,
      exclude_terms,
      max_age_hours,
      alert_max_price: Number.isFinite(alert_max_price) ? alert_max_price : null,
      alert_min_discount: Number.isFinite(alert_min_discount) ? alert_min_discount : null,
      enabled: true,
      user_id: user.userId,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Register this search as belonging to the user
  const ids = await getUserSearchIds(supabase, user.userId)
  if (!ids.includes(data.id)) {
    try {
      await saveUserSearchIds(supabase, user.userId, [...ids, data.id])
    } catch (e: any) {
      // Do not leave an invisible orphan search behind if ownership storage fails.
      await supabase.from('searches').delete().eq('id', data.id)
      return NextResponse.json({ error: `Search could not be linked to your account: ${e.message}` }, { status: 500 })
    }
  }

  // Populate the new monitor immediately instead of making the customer wait
  // for the next background tick. A scrape failure does not undo the monitor;
  // the continuous worker will retry it automatically.
  let initial_results = 0
  try {
    const searchWithUser = { ...data, user_id: user.userId }
    const items = await fetchItems(searchWithUser)
    initial_results = await saveNewItems(supabase, data, items)
    await supabase.from('searches')
      .update({ last_scraped_at: new Date().toISOString() })
      .eq('id', data.id)
  } catch (e: any) {
    console.error(`[searches] initial scrape failed for ${data.id}:`, e.message)
  }

  return NextResponse.json({ ...data, initial_results }, { status: 201 })
}
