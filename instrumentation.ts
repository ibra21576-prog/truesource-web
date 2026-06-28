// Runs once when the server process boots. On an always-on host (Railway, Render,
// Fly, a VPS) this starts the internal scheduler so the app scrapes itself every
// minute — no external cron needed. Guarded by ENABLE_INTERNAL_CRON so it stays
// OFF on Vercel (serverless freezes between requests; use cron-job.org there).
export async function register() {
  if (process.env.ENABLE_INTERNAL_CRON !== 'true') return
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { startScheduler } = await import('./lib/scheduler')
  startScheduler(Number(process.env.SCRAPE_INTERVAL_MS) || 60_000)
}
