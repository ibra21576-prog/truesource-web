import { fetchItems } from './index'
import { claimScan } from './claim'
import { saveNewItems, type SaveDiagnostics } from './save'
import { readScanHealth, writeScanHealth, scanFailure, type ScanHealth } from './health'
import type { ScrapedItem } from './types'

// Group only identical upstream requests. Credentials and price filters matter.
export function scanGroupKey(s: any): string {
  return JSON.stringify([s.platform, (s.query || '').trim(), s.domain, s.min_price ?? null, s.max_price ?? null,
    s.platform === 'vinted' ? s.user_id || s.id : null])
}

export async function runSearchScan(
  supabase: any, search: any,
  fetcher: () => Promise<ScrapedItem[]> = () => fetchItems(search),
) {
  const previous = await readScanHealth(supabase, search.id)
  const now = Date.now()
  if (previous?.nextRetryAt && Date.parse(previous.nextRetryAt) > now) {
    return { skipped: true, health: previous, saved: 0, fetched: 0, diagnostics: {} }
  }
  if (!await claimScan(supabase, search)) {
    return { skipped: true, health: previous, saved: 0, fetched: 0, diagnostics: {} }
  }
  const state: ScanHealth = {
    attemptedAt: new Date(now).toISOString(), lastSuccessAt: previous?.lastSuccessAt || null,
    nextRetryAt: new Date(now + 90_000).toISOString(), failures: previous?.failures || 0,
    status: 'running', message: null, fetched: 0, saved: 0,
  }
  await writeScanHealth(supabase, search.id, state)
  try {
    const items = await fetcher()
    const diagnostics: Partial<SaveDiagnostics> = {}
    const saved = await saveNewItems(supabase, search, items, diagnostics)
    Object.assign(state, { status: 'ok', failures: 0, message: null, nextRetryAt: null,
      lastSuccessAt: new Date().toISOString(), fetched: items.length, saved })
    await writeScanHealth(supabase, search.id, state)
    return { skipped: false, health: state, saved, fetched: items.length, diagnostics }
  } catch (error) {
    state.failures += 1
    const failure = scanFailure(error, state.failures)
    Object.assign(state, { status: failure.status, message: failure.message, nextRetryAt: new Date(Date.now() + failure.delay).toISOString() })
    await writeScanHealth(supabase, search.id, state)
    throw new Error(failure.message)
  }
}
