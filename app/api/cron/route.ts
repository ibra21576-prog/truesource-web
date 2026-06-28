import { runScrapeCycle } from '@/lib/scheduler'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// HTTP trigger for the scrape cycle (cron-job.org / external schedulers on Vercel).
// On an always-on host the internal scheduler in lib/scheduler.ts runs this same
// cycle on a timer instead, so this endpoint isn't needed there.
export async function GET(req: Request) {
  // Accept the secret either as an Authorization: Bearer header OR a ?key= query
  // param. The query param means a free cron service just needs the URL — no
  // header configuration to get wrong (the usual reason triggers silently 401).
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const keyParam = new URL(req.url).searchParams.get('key')
  const ok = !!secret && (authHeader === `Bearer ${secret}` || keyParam === secret)
  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runScrapeCycle()
  return NextResponse.json(result)
}
