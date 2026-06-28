import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'   // never serve a cached heartbeat read
export const revalidate = 0

// Read-only health view: when did the scrape cycle last run, and how fresh is the
// data. Helps tell apart "the trigger isn't firing" from "no new listings yet".
export async function GET() {
  const supabase = createServiceClient()
  const out: any = { now: new Date().toISOString() }

  // Last scrape-cycle heartbeat
  try {
    const { data } = await supabase.storage.from('ts-settings').download('heartbeat2.json')
    if (data) {
      const beat = JSON.parse(await data.text())
      out.lastScrape = beat
      out.secondsSinceLastScrape = Math.round((Date.now() - new Date(beat.at).getTime()) / 1000)
    } else {
      out.lastScrape = null
    }
  } catch (e: any) {
    out.lastScrape = null
    out.heartbeatError = e.message
  }

  // Item totals + freshest post time per platform
  try {
    const { count } = await supabase.from('items').select('*', { count: 'exact', head: true })
    out.totalItems = count ?? 0

    const { data: searches } = await supabase.from('searches').select('platform').neq('enabled', false)
    const plats = Array.from(new Set((searches || []).map((s: any) => s.platform)))
    out.platforms = {}
    for (const p of plats) {
      const { data: newest } = await supabase
        .from('items').select('found_at').eq('platform', p)
        .order('found_at', { ascending: false }).limit(1)
      const { count: c } = await supabase
        .from('items').select('*', { count: 'exact', head: true }).eq('platform', p)
      out.platforms[p] = { count: c ?? 0, newestPost: newest?.[0]?.found_at ?? null }
    }
  } catch (e: any) {
    out.dbError = e.message
  }

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
}
