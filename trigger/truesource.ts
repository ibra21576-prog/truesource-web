import { schedules } from '@trigger.dev/sdk'
import { runCrawleeScanCycle } from '@/lib/workers/crawlee-cycle'
import { enrichMarketHistory } from '@/lib/intelligence/embeddings'

const retry = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 2_000,
  maxTimeoutInMs: 30_000,
  randomize: true,
}

// One centrally controlled scan per minute. Platform-specific cooldowns and
// stable jitter still decide whether an individual marketplace is due.
export const marketplaceScan = schedules.task({
  id: 'truesource-marketplace-scan',
  cron: { pattern: '* * * * *', timezone: 'Europe/Berlin', environments: ['PRODUCTION'] },
  retry,
  machine: 'small-2x',
  maxDuration: 300,
  run: async () => runCrawleeScanCycle({
    timeBudgetMs: 240_000,
    maxConcurrency: 6,
    maxRequestsPerMinute: 60,
  }),
})

// Embeddings run separately so model downloads and AI work never slow the feed.
export const enrichPriceHistory = schedules.task({
  id: 'truesource-enrich-price-history',
  cron: { pattern: '*/10 * * * *', timezone: 'Europe/Berlin', environments: ['PRODUCTION'] },
  retry,
  machine: 'medium-1x',
  maxDuration: 300,
  run: async () => enrichMarketHistory(24),
})

