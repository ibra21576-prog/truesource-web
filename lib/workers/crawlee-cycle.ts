import { BasicCrawler } from '@crawlee/basic'
import { Request } from '@crawlee/core'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchItems } from '@/lib/scraper'
import { saveNewItems } from '@/lib/scraper/save'
import { cooldownFor } from '@/lib/scraper/cadence'
import type { CycleResult } from '@/lib/scheduler'

type Group = {
  key: string
  platform: string
  rep: any
  members: any[]
  lastScraped: number
}

function requestUrl(group: Group) {
  const rawDomain = String(group.rep.domain || '').replace(/^https?:\/\//, '').split('/')[0]
  const host = rawDomain.includes('.') ? rawDomain : `${group.platform}.truesource.invalid`
  return `https://${host}/__truesource_scan?group=${encodeURIComponent(group.key)}`
}

export async function runCrawleeScanCycle(
  opts: { timeBudgetMs?: number; maxConcurrency?: number; maxRequestsPerMinute?: number } = {},
): Promise<CycleResult> {
  const started = Date.now()
  const timeBudgetMs = opts.timeBudgetMs ?? 240_000
  const supabase = createServiceClient()
  const errorDetails: string[] = []

  const { data: allSearches, error: searchError } = await supabase
    .from('searches')
    .select('*')
    .neq('enabled', false)

  if (searchError) throw new Error(`Could not load searches: ${searchError.message}`)
  const searches: any[] = allSearches ?? []
  if (!searches.length) {
    return { ok: true, processed: 0, unique_groups: 0, eligible: 0, scraped_groups: 0, rotating: false, ms: Date.now() - started, errors: 0, errorDetails: [] }
  }

  const groupMap = new Map<string, Group>()
  for (const search of searches) {
    const key = `${search.platform}|${(search.query || '').toLowerCase().trim()}|${search.domain || ''}`
    const lastScraped = search.last_scraped_at ? new Date(search.last_scraped_at).getTime() : 0
    const existing = groupMap.get(key)
    if (existing) {
      existing.members.push(search)
      existing.lastScraped = Math.min(existing.lastScraped, lastScraped)
    } else {
      groupMap.set(key, { key, platform: search.platform, rep: search, members: [search], lastScraped })
    }
  }

  const now = Date.now()
  const eligible = [...groupMap.values()]
    .filter(group => now - group.lastScraped >= cooldownFor(group.platform, group.key))
    .sort((a, b) => a.lastScraped - b.lastScraped)

  if (!eligible.length) {
    return {
      ok: true,
      processed: 0,
      unique_groups: groupMap.size,
      eligible: 0,
      scraped_groups: 0,
      rotating: false,
      ms: Date.now() - started,
      errors: 0,
      errorDetails: [],
    }
  }

  let processed = 0
  let scrapedGroups = 0
  const doneSearchIds: string[] = []

  const crawler = new BasicCrawler({
    maxConcurrency: opts.maxConcurrency ?? 6,
    maxRequestsPerMinute: opts.maxRequestsPerMinute ?? 60,
    maxRequestRetries: 2,
    sameDomainDelaySecs: 1,
    requestHandlerTimeoutSecs: 50,
    maxRequestsPerCrawl: eligible.length,
    requestHandler: async ({ request }) => {
      if (Date.now() - started > timeBudgetMs) return
      const group = request.userData.group as Group
      const items = await fetchItems(group.rep)
      await Promise.all(group.members.map(search => saveNewItems(supabase, search, items)))
      group.members.forEach(search => doneSearchIds.push(search.id))
      processed += group.members.length
      scrapedGroups += 1
    },
    failedRequestHandler: async ({ request }, error) => {
      const group = request.userData.group as Group
      errorDetails.push(`[${group.platform}] "${group.rep.query}": ${error.message}`)
    },
  })

  const requests = eligible.map(group => new Request({
    url: requestUrl(group),
    uniqueKey: group.key,
    userData: { group },
  }))
  await crawler.run(requests)

  if (doneSearchIds.length) {
    const { error } = await supabase
      .from('searches')
      .update({ last_scraped_at: new Date().toISOString() })
      .in('id', doneSearchIds)
    if (error) errorDetails.push(`[database] last_scraped_at: ${error.message}`)
  }

  try {
    const heartbeat = JSON.stringify({
      at: new Date().toISOString(),
      engine: 'crawlee',
      processed,
      unique_groups: groupMap.size,
      errors: errorDetails.length,
    })
    await supabase.storage.from('ts-settings').upload(
      'heartbeat2.json',
      new Blob([heartbeat], { type: 'application/json' }),
      { upsert: true, cacheControl: '0' },
    )
  } catch {}

  return {
    ok: true,
    processed,
    unique_groups: groupMap.size,
    eligible: eligible.length,
    scraped_groups: scrapedGroups,
    rotating: scrapedGroups < eligible.length,
    ms: Date.now() - started,
    errors: errorDetails.length,
    errorDetails: errorDetails.slice(0, 10),
  }
}

