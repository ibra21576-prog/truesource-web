import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { saveNewItems, type SaveDiagnostics } from '@/lib/scraper/save'
import { cooldownFor } from '@/lib/scraper/cadence'

// ─── Shared scrape cycle ─────────────────────────────────────────────────────
// One self-limiting pass over all enabled searches. Called either by the HTTP
// trigger (/api/cron, e.g. cron-job.org on Vercel) OR by the internal scheduler
// below when the app runs on an always-on host (Railway/Render/Fly/VPS).
//
//  • Dedupe by (platform|query|domain) so 400 customers searching "iPhone" = 1 scrape
//  • Process oldest-scraped searches first (fair rotation)
//  • Stop launching new work once the time budget is hit — leftovers run next tick
//  • Small scale → everything every tick. Large scale → automatic rotation.

const CHUNK = 25
export interface CycleResult {
  ok: boolean
  processed: number
  unique_groups: number
  eligible: number
  scraped_groups: number
  rotating: boolean
  ms: number
  errors: number
  errorDetails: string[]
}

export async function runScrapeCycle(opts: { timeBudgetMs?: number } = {}): Promise<CycleResult> {
  // Serverless (Vercel) needs to finish under the 10s function limit; an always-on
  // worker can take much longer, so it passes a bigger budget.
  const timeBudget = opts.timeBudgetMs ?? 7000
  const started = Date.now()
  const supabase = createServiceClient()
  const errorDetails: string[] = []
  const groupStats: Array<{
    platform: string
    fetched: number
    eligible: number
    alreadyKnown: number
    unseen: number
    fresh: number
    tooOld: number
    invalidDates: number
    saved: number
  }> = []

  const { data: allSearches } = await supabase
    .from('searches')
    .select('*')
    .neq('enabled', false)

  const searches: any[] = allSearches ?? []
  if (searches.length === 0) {
    return { ok: true, processed: 0, unique_groups: 0, eligible: 0, scraped_groups: 0, rotating: false, ms: Date.now() - started, errors: 0, errorDetails: [] }
  }

  // 1. Dedupe into unique scrape groups; a group's freshness = its oldest member.
  type Group = { key: string; platform: string; rep: any; members: any[]; lastScraped: number }
  const groups = new Map<string, Group>()
  for (const s of searches) {
    const key = `${s.platform}|${(s.query || '').toLowerCase().trim()}|${s.domain || ''}`
    const ts = s.last_scraped_at ? new Date(s.last_scraped_at).getTime() : 0
    const g = groups.get(key)
    if (g) { g.members.push(s); g.lastScraped = Math.min(g.lastScraped, ts) }
    else groups.set(key, { key, platform: s.platform, rep: s, members: [s], lastScraped: ts })
  }

  // 2. Keep only groups whose per-platform cooldown has elapsed, oldest first.
  const now = Date.now()
  const eligible = Array.from(groups.values())
    .filter(g => now - g.lastScraped >= cooldownFor(g.platform, g.key))
    .sort((a, b) => a.lastScraped - b.lastScraped)

  // 3. Process in waves until the time budget runs out (leftovers run next tick).
  let processed = 0
  let scrapedGroups = 0
  const doneSearchIds: string[] = []
  for (let i = 0; i < eligible.length; i += CHUNK) {
    if (Date.now() - started > timeBudget) break
    const wave = eligible.slice(i, i + CHUNK)
    await Promise.allSettled(wave.map(async (g) => {
      try {
        const items = await fetchItems(g.rep)
        const memberStats: Partial<SaveDiagnostics>[] = g.members.map(() => ({}))
        const savedCounts = await Promise.all(g.members.map((s, index) => saveNewItems(supabase, s, items, memberStats[index])))
        groupStats.push({
          platform: g.platform,
          fetched: items.length,
          eligible: memberStats.reduce((sum, stat) => sum + (stat.eligible || 0), 0),
          alreadyKnown: memberStats.reduce((sum, stat) => sum + (stat.alreadyKnown || 0), 0),
          unseen: memberStats.reduce((sum, stat) => sum + (stat.unseen || 0), 0),
          fresh: memberStats.reduce((sum, stat) => sum + (stat.fresh || 0), 0),
          tooOld: memberStats.reduce((sum, stat) => sum + (stat.tooOld || 0), 0),
          invalidDates: memberStats.reduce((sum, stat) => sum + (stat.invalidDates || 0), 0),
          saved: savedCounts.reduce((sum, count) => sum + count, 0),
        })
        g.members.forEach(s => doneSearchIds.push(s.id))
        processed += g.members.length
        scrapedGroups += 1
      } catch (e: any) {
        errorDetails.push(`[${g.platform}] "${g.rep.query}": ${e.message}`)
      }
    }))
  }

  // 4. Stamp last_scraped_at so the next tick rotates to the next-oldest searches.
  if (doneSearchIds.length) {
    try {
      await supabase.from('searches')
        .update({ last_scraped_at: new Date().toISOString() })
        .in('id', doneSearchIds)
    } catch {}
  }

  // 5. Listings are intentionally never deleted. Each member gets a permanent,
  //    continuously growing archive that can be paged without a 500-item ceiling.

  // 6. Heartbeat — proves the cycle actually ran and when. Read by /api/status to
  //    distinguish "trigger isn't firing" from "no new listings to show".
  try {
    const beat = JSON.stringify({
      at: new Date().toISOString(),
      processed,
      unique_groups: groups.size,
      errors: errorDetails.length,
      groups: groupStats,
    })
    await supabase.storage.from('ts-settings')
      .upload('heartbeat2.json', new Blob([beat], { type: 'application/json' }), { upsert: true, cacheControl: '0' })
  } catch {}

  return {
    ok: true,
    processed,
    unique_groups: groups.size,
    eligible: eligible.length,
    scraped_groups: scrapedGroups,
    rotating: scrapedGroups < eligible.length,
    ms: Date.now() - started,
    errors: errorDetails.length,
    errorDetails: errorDetails.slice(0, 10),
  }
}

// ─── Internal always-on scheduler ────────────────────────────────────────────
// Only starts when ENABLE_INTERNAL_CRON=true (set it on Railway/Render/Fly, NOT
// on Vercel — serverless freezes between requests so the interval can't survive).
let running = false

export function startScheduler(intervalMs = 45_000) {
  if (running) return
  running = true

  const tick = async () => {
    try {
      const r = await runScrapeCycle({ timeBudgetMs: 50_000 })
      console.log(`[scheduler] ${new Date().toISOString()} processed=${r.processed} groups=${r.unique_groups} errors=${r.errors}`)
    } catch (e: any) {
      console.log(`[scheduler] tick error: ${e.message}`)
    }
  }

  console.log(`[scheduler] internal cron started — every ${intervalMs}ms`)
  tick()
  setInterval(tick, intervalMs)
}
