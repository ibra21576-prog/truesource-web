'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'

// A second trigger for signed-in customers; the server owns the cooldown and
// atomic reservation. Background cron remains responsible for closed browsers.
export default function ScannerWatchdog() {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let stopped = false
    let busy = false
    const controller = new AbortController()
    const scan = async () => {
      if (stopped || busy || !navigator.onLine) return
      busy = true
      try {
        const response = await apiFetch('/api/searches', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) })
        if (response.status === 401) return
        if (!response.ok) throw new Error('Searches unavailable')
        const searches = (await response.json()).filter((s: any) => s.enabled !== false)
          .sort((a: any, b: any) => (Date.parse(a.last_scraped_at) || 0) - (Date.parse(b.last_scraped_at) || 0))
        let errors = false
        // Small waves keep accounts with many searches from overwhelming the API.
        for (let i = 0; i < searches.length && !stopped; i += 3) {
          const results = await Promise.allSettled(searches.slice(i, i + 3).map(async (search: any) => {
            const result = await apiFetch('/api/scrape', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ searchId: search.id }),
              signal: AbortSignal.any([controller.signal, AbortSignal.timeout(40_000)]),
            })
            if (!result.ok) throw new Error('Scan unavailable')
          }))
          errors ||= results.some(result => result.status === 'rejected')
        }
        if (!stopped) setFailed(errors)
      } catch {
        if (!stopped) setFailed(true)
      } finally { busy = false }
    }
    const resume = () => { if (document.visibilityState === 'visible') void scan() }
    void scan()
    const timer = setInterval(scan, 30_000)
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      stopped = true
      controller.abort()
      clearInterval(timer)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [])
  return failed ? <div role="status" style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 100, maxWidth: 300, padding: 12, borderRadius: 10, background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>Some searches could not refresh. Retrying automatically.</div> : null
}
