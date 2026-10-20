export interface ScanHealth {
  attemptedAt: string
  lastSuccessAt: string | null
  nextRetryAt: string | null
  failures: number
  status: 'running' | 'ok' | 'retrying' | 'connection_required'
  message: string | null
  fetched: number
  saved: number
}

export function scanFailure(error: unknown, failures: number) {
  const message = error instanceof Error ? error.message : String(error)
  const connection = /LOGIN_REQUIRED|401|authentication|credential/i.test(message)
  const limited = /429|403|blocked|captcha/i.test(message)
  const delay = Math.min(30 * 60_000, (connection ? 300_000 : limited ? 180_000 : 60_000) * 2 ** Math.min(5, Math.max(0, failures - 1)))
  return {
    status: connection ? 'connection_required' as const : 'retrying' as const,
    message: connection ? 'Reconnect this marketplace in Connectors.'
      : limited ? 'Marketplace access is temporarily limited. Retrying with a longer pause.'
      : 'This search could not refresh. Retrying automatically.',
    delay,
  }
}

export async function readScanHealth(supabase: any, id: string): Promise<ScanHealth | null> {
  const { data, error } = await supabase.storage.from('ts-settings').download(`scan-health/${id}.json`)
  if (!data) {
    if (error && !['400', '404'].includes(String(error.statusCode))) throw new Error('Scan status unavailable')
    return null
  }
  return JSON.parse(await data.text())
}

export async function writeScanHealth(supabase: any, id: string, state: ScanHealth) {
  const { error } = await supabase.storage.from('ts-settings').upload(
    `scan-health/${id}.json`, new Blob([JSON.stringify(state)], { type: 'application/json' }),
    { upsert: true, cacheControl: '0' },
  )
  if (error) throw new Error('Could not record scan status')
}
