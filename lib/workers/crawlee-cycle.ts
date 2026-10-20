import { runScrapeCycle, type CycleResult } from '@/lib/scheduler'
import { createServiceClient } from '@/lib/supabase/server'

// All triggers share reservations, ownership, persistence and retry policy.
export async function runCrawleeScanCycle(
  opts: { timeBudgetMs?: number; maxConcurrency?: number; maxRequestsPerMinute?: number } = {},
): Promise<CycleResult> {
  const result = await runScrapeCycle({ timeBudgetMs: opts.timeBudgetMs ?? 35_000 })
  const { error } = await createServiceClient().storage.from('ts-settings').upload(
    'heartbeat-crawlee.json',
    new Blob([JSON.stringify({ at: new Date().toISOString(), engine: 'shared-scanner', ...result })], { type: 'application/json' }),
    { upsert: true, cacheControl: '0' },
  )
  if (error) throw new Error('Could not record worker heartbeat')
  return result
}

