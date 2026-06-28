import { runScrapeCycle } from '@/lib/scheduler'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// HTTP trigger for the scrape cycle (cron-job.org / external schedulers on Vercel).
// On an always-on host the internal scheduler in lib/scheduler.ts runs this same
// cycle on a timer instead, so this endpoint isn't needed there.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runScrapeCycle()
  return NextResponse.json(result)
}
