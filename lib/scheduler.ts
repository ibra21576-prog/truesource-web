import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { runSearchScan, scanGroupKey } from '@/lib/scraper/run'
import type { ScrapedItem } from '@/lib/scraper/types'

export interface CycleResult {
  ok: boolean; processed: number; unique_groups: number; eligible: number
  scraped_groups: number; rotating: boolean; ms: number; errors: number; errorDetails: string[]
}

export async function runScrapeCycle(opts: { timeBudgetMs?: number } = {}): Promise<CycleResult> {
  const started = Date.now()
  const supabase = createServiceClient()
  const timeBudget = opts.timeBudgetMs ?? 20_000
  const searches: any[] = []
  // Page through all customers, beyond Supabase's default response row limit.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('searches').select('*')
      .neq('enabled', false).order('id').range(offset, offset + 499)
    if (error) throw new Error('Could not load active searches')
    searches.push(...(data || []))
    if (!data || data.length < 500) break
  }
  // Persist rotation on installations without last_scraped_at too.
  let offset = 0
  try {
    const { data } = await supabase.storage.from('ts-settings').download('scan-cursor.json')
    if (data) offset = Number((JSON.parse(await data.text())).offset) || 0
  } catch {}
  offset = searches.length ? offset % searches.length : 0
  const ordered = [...searches.slice(offset), ...searches.slice(0, offset)]
  const fetched = new Map<string, Promise<ScrapedItem[]>>()
  const completedGroups = new Set<string>()
  const groups: any[] = []
  const errorDetails: string[] = []
  let processed = 0
  let visited = 0
  for (let i = 0; i < ordered.length; i += 4) {
    if (Date.now() - started > timeBudget) break
    const wave = ordered.slice(i, i + 4)
    await Promise.all(wave.map(async search => {
      const key = scanGroupKey(search)
      try {
        const result = await runSearchScan(supabase, search, () => {
          if (!fetched.has(key)) fetched.set(key, fetchItems(search))
          return fetched.get(key)!
        })
        if (result.skipped) return
        processed++
        completedGroups.add(key)
        groups.push({ platform: search.platform, ...result.diagnostics, fetched: result.fetched, saved: result.saved })
      } catch (error) {
        errorDetails.push(search.platform + ': ' + (error instanceof Error ? error.message : 'Scan failed'))
      }
    }))
    visited += wave.length
  }
  const result: CycleResult = {
    ok: errorDetails.length === 0, processed, unique_groups: new Set(searches.map(scanGroupKey)).size,
    eligible: searches.length, scraped_groups: completedGroups.size, rotating: visited < searches.length,
    ms: Date.now() - started, errors: errorDetails.length, errorDetails: errorDetails.slice(0, 10),
  }
  const bucket = supabase.storage.from('ts-settings')
  await bucket.upload('scan-cursor.json', new Blob([JSON.stringify({ offset: searches.length ? (offset + visited) % searches.length : 0 })], { type: 'application/json' }), { upsert: true, cacheControl: '0' })
  const { error } = await bucket.upload('heartbeat2.json',
    new Blob([JSON.stringify({ at: new Date().toISOString(), ...result, groups })], { type: 'application/json' }),
    { upsert: true, cacheControl: '0' })
  if (error) throw new Error('Could not record scanner heartbeat')
  return result
}

let running = false
export function startScheduler(intervalMs = 45_000) {
  if (running) return
  running = true
  const tick = async () => {
    try {
      const result = await runScrapeCycle({ timeBudgetMs: 35_000 })
      console.log('[scheduler] processed=' + result.processed + ' errors=' + result.errors)
    } catch (error) { console.error('[scheduler] cycle failed', error) }
    finally { setTimeout(tick, intervalMs) }
  }
  void tick()
}
