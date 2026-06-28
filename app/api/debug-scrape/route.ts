import { NextRequest, NextResponse } from 'next/server'
import { fetchItems } from '@/lib/scraper'

export const dynamic = 'force-dynamic'
export const maxDuration = 10  // Vercel Hobby hard limit; platforms run in parallel so total ≈ slowest one

// Test every platform from Vercel's actual IPs. Returns item count + sample + timing.
const TARGETS: Record<string, { domain: string }> = {
  vinted:        { domain: 'www.vinted.de' },
  ebay:          { domain: 'www.ebay.de' },
  kleinanzeigen: { domain: 'www.kleinanzeigen.de' },
  kijiji:        { domain: 'www.kijiji.ca' },
  craigslist:    { domain: 'newyork.craigslist.org' },
  shpock:        { domain: 'www.shpock.com' },
  marktplaats:   { domain: 'www.marktplaats.nl' },
  leboncoin:     { domain: 'www.leboncoin.fr' },
  gumtree:       { domain: 'www.gumtree.com' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const only  = searchParams.get('platform')
  const query = searchParams.get('q') || 'iphone'

  const platforms = only && only !== 'all' ? [only] : Object.keys(TARGETS)
  const results: Record<string, any> = {}

  await Promise.all(platforms.map(async (platform) => {
    const target = TARGETS[platform]
    if (!target) { results[platform] = { error: 'unknown platform' }; return }
    const t0 = Date.now()
    try {
      const items = await fetchItems({
        id: 'debug', query, platform, domain: target.domain,
        min_price: null, max_price: null, enabled: true,
      } as any)
      results[platform] = {
        ok: items.length > 0,
        count: items.length,
        ms: Date.now() - t0,
        sample: items.slice(0, 2).map(i => ({ title: i.title?.slice(0, 45), price: i.price, hasImg: !!i.image })),
      }
    } catch (e: any) {
      results[platform] = { ok: false, count: 0, ms: Date.now() - t0, error: e.message }
    }
  }))

  const env = {
    EBAY_APP_ID: !!process.env.EBAY_APP_ID,
    EBAY_CERT_ID: !!process.env.EBAY_CERT_ID,
    SCRAPERAPI_KEY: !!process.env.SCRAPERAPI_KEY,
    PROXY_URL: !!process.env.PROXY_URL,
  }

  return NextResponse.json({ env, results }, { headers: { 'Cache-Control': 'no-store' } })
}
