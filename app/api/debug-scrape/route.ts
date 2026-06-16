import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchDirect(url: string, lang = 'en-US,en;q=0.9'): Promise<{ status: number; text: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': lang },
      signal: AbortSignal.timeout(7000),
    })
    const text = await res.text()
    return { status: res.status, text }
  } catch (e: any) {
    return { status: 0, text: '', error: e.message }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || 'all'
  const query    = searchParams.get('q') || 'iphone'

  const results: Record<string, any> = {}

  if (platform === 'craigslist' || platform === 'all') {
    const rssUrl = `https://newyork.craigslist.org/search/sss?query=${encodeURIComponent(query)}&sort=date&format=rss`
    const r = await fetchDirect(rssUrl)
    results.craigslist = {
      status: r.status, error: r.error,
      isXml: r.text.includes('<channel>') || r.text.includes('<rss'),
      itemCount: (r.text.match(/<item>/g) || []).length,
      isBlocked: /blocked|captcha|Access Denied/i.test(r.text),
      preview: r.text.slice(0, 300),
    }
  }

  if (platform === 'kijiji' || platform === 'all') {
    const url = `https://www.kijiji.ca/b-buy-sell/canada/${encodeURIComponent(query)}/k0c10l0?sortingOrder=dateDesc`
    const r = await fetchDirect(url, 'en-CA,en;q=0.9')
    const hasNextData = r.text.includes('__NEXT_DATA__')
    const itemCount = (r.text.match(/\/v-[^/]+\/[^/]+\/[^/]+\/\d{7,}/g) || []).length
    results.kijiji = {
      status: r.status, error: r.error,
      hasNextData, itemCount,
      isBlocked: /captcha|Access Denied|Just a moment|are you a robot/i.test(r.text),
      preview: r.text.slice(0, 300),
    }
  }

  if (platform === 'gumtree' || platform === 'all') {
    const url = `https://www.gumtree.com/search?search_category=all&q=${encodeURIComponent(query)}&sort=date`
    const r = await fetchDirect(url, 'en-GB,en;q=0.9')
    results.gumtree = {
      status: r.status, error: r.error,
      hasNextData: r.text.includes('__NEXT_DATA__'),
      itemCount: (r.text.match(/"listingId"/g) || []).length,
      isBlocked: /captcha|Access Denied|Just a moment|are you a robot/i.test(r.text),
      preview: r.text.slice(0, 300),
    }
  }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } })
}
