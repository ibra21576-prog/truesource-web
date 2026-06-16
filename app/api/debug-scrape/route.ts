import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchViaProxy(url: string): Promise<{ status: number; text: string; error?: string }> {
  const key = process.env.SCRAPERAPI_KEY
  const proxyUrl = key
    ? `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(url)}&country_code=us`
    : url
  try {
    const res = await fetch(proxyUrl, {
      headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()
    return { status: res.status, text }
  } catch (e: any) {
    return { status: 0, text: '', error: e.message }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || 'craigslist'
  const query    = searchParams.get('q') || 'playstation 5'

  const results: Record<string, any> = {}

  if (platform === 'craigslist') {
    const rssUrl = `https://newyork.craigslist.org/search/sss?query=${encodeURIComponent(query)}&sort=date&format=rss`
    const r = await fetchViaProxy(rssUrl)
    results.rss = {
      status: r.status, error: r.error,
      isXml: r.text.includes('<channel>') || r.text.includes('<rss'),
      isBlocked: r.text.includes('blocked'),
      preview: r.text.slice(0, 500),
    }
  }

  if (platform === 'gumtree') {
    const url = `https://www.gumtree.com/search?search_category=all&q=${encodeURIComponent(query)}&sort=date`
    const r = await fetchViaProxy(url)
    const hasNextData = r.text.includes('__NEXT_DATA__')
    const itemCount = (r.text.match(/"listingId"/g) || []).length
    results.gumtree = {
      status: r.status, error: r.error,
      hasNextData, itemCount,
      isBlocked: /captcha|Access Denied|Just a moment/i.test(r.text),
      preview: r.text.slice(0, 300),
    }
  }

  if (platform === 'kijiji') {
    const url = `https://www.kijiji.ca/b-buy-sell/canada/${encodeURIComponent(query)}/k0c10l0?sortingOrder=dateDesc`
    const r = await fetchViaProxy(url)
    const hasNextData = r.text.includes('__NEXT_DATA__')
    const itemCount = (r.text.match(/\/v-[^/]+\/[^/]+\/[^/]+\/\d{7,}/g) || []).length
    results.kijiji = {
      status: r.status, error: r.error,
      hasNextData, itemCount,
      isBlocked: /captcha|Access Denied|Just a moment|challenge/i.test(r.text),
      preview: r.text.slice(0, 300),
    }
  }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } })
}
