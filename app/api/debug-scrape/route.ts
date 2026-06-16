import { NextRequest, NextResponse } from 'next/server'
import { fetchKijiji } from '@/lib/scraper/kijiji'
import { fetchCraigslist } from '@/lib/scraper/craigslist'
import { fetchGumtree } from '@/lib/scraper/gumtree'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || 'all'
  const query    = searchParams.get('q') || 'iphone'

  const results: Record<string, any> = {}
  const fakeSearch = { id: 'debug', query, platform, domain: '', min_price: null, max_price: null, enabled: true }

  if (platform === 'kijiji' || platform === 'all') {
    try {
      const items = await fetchKijiji({ ...fakeSearch, domain: 'www.kijiji.ca' })
      results.kijiji = { itemCount: items.length, sample: items.slice(0, 2) }
    } catch (e: any) {
      results.kijiji = { error: e.message }
    }
  }

  if (platform === 'craigslist' || platform === 'all') {
    try {
      const items = await fetchCraigslist({ ...fakeSearch, domain: 'newyork.craigslist.org' })
      results.craigslist = { itemCount: items.length, sample: items.slice(0, 2) }
    } catch (e: any) {
      results.craigslist = { error: e.message }
    }
  }

  if (platform === 'gumtree' || platform === 'all') {
    try {
      const items = await fetchGumtree({ ...fakeSearch, domain: 'www.gumtree.com' })
      results.gumtree = { itemCount: items.length, sample: items.slice(0, 2) }
    } catch (e: any) {
      results.gumtree = { error: e.message }
    }
  }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } })
}
