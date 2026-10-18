import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRequestSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

type MarketRow = {
  id: string
  platform: string
  title: string
  price_text: string | null
  price_amount: number | string | null
  currency: string | null
  url: string | null
  image: string | null
  posted_at: string | null
  first_seen_at: string
  last_seen_at: string
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'the', 'with', 'for', 'from', 'in', 'on', 'of', 'to',
  'und', 'mit', 'fur', 'für', 'von', 'der', 'die', 'das', 'im', 'in', 'zu',
  'new', 'neu', 'sealed', 'boxed', 'box', 'ovp', 'inkl', 'including', 'edition',
  'black', 'white', 'schwarz', 'weiss', 'weiß', 'excellent', 'good', 'condition',
])

function words(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word))
}

function matchesQuery(title: string, query: string) {
  const queryWords = words(query)
  if (!queryWords.length) return true
  const titleWords = words(title)
  const matches = queryWords.filter(queryWord =>
    titleWords.some(titleWord => titleWord === queryWord ||
      (queryWord.length >= 4 && (titleWord.startsWith(queryWord) || queryWord.startsWith(titleWord)))),
  ).length
  return matches >= Math.max(1, Math.ceil(queryWords.length * 0.65))
}

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

function signature(title: string) {
  return words(title).slice(0, 3).join(' ')
}

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 120)
  const requestedCurrency = (req.nextUrl.searchParams.get('currency') || 'EUR').toUpperCase().slice(0, 3)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('market_history')
    .select('id,platform,title,price_text,price_amount,currency,url,image,posted_at,first_seen_at,last_seen_at')
    .order('last_seen_at', { ascending: false })
    .limit(2500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const allRows = ((data || []) as MarketRow[]).filter(row => {
    const amount = Number(row.price_amount)
    return Number.isFinite(amount) && amount > 0 && Boolean(row.currency)
  })
  const availableCurrencies = [...new Set(allRows.map(row => row.currency!.toUpperCase()))].sort()
  const currency = availableCurrencies.includes(requestedCurrency)
    ? requestedCurrency
    : (availableCurrencies[0] || requestedCurrency)
  const currencyRows = allRows.filter(row => row.currency?.toUpperCase() === currency)
  const matchedRows = currencyRows.filter(row => matchesQuery(row.title, query))
  const amounts = matchedRows.map(row => Number(row.price_amount)).sort((a, b) => a - b)
  const marketMedian = median(amounts)

  const stats = query && amounts.length ? {
    lowest: round(amounts[0]),
    average: round(amounts.reduce((sum, value) => sum + value, 0) / amounts.length),
    median: round(marketMedian),
    highest: round(amounts[amounts.length - 1]),
    count: amounts.length,
  } : null

  const byDay = new Map<string, number[]>()
  for (const row of matchedRows) {
    const dateValue = row.posted_at || row.first_seen_at || row.last_seen_at
    const day = new Date(dateValue).toISOString().slice(0, 10)
    const values = byDay.get(day) || []
    values.push(Number(row.price_amount))
    byDay.set(day, values)
  }
  const history = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-90)
    .map(([date, values]) => ({
      date,
      median: round(median(values)),
      low: round(Math.min(...values)),
      high: round(Math.max(...values)),
      count: values.length,
    }))

  const deals = query && marketMedian > 0
    ? matchedRows
        .map(row => {
          const price = Number(row.price_amount)
          const savingsPercent = ((marketMedian - price) / marketMedian) * 100
          const score = Math.max(1, Math.min(99, Math.round(50 + savingsPercent * 1.35)))
          return {
            id: row.id,
            platform: row.platform,
            title: row.title,
            price: round(price),
            priceText: row.price_text,
            currency,
            url: row.url,
            image: row.image,
            lastSeenAt: row.last_seen_at,
            savingsPercent: round(savingsPercent),
            score,
            rating: score >= 75 ? 'Great deal' : score >= 60 ? 'Good deal' : score >= 45 ? 'Fair price' : 'Expensive',
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
    : []

  const groups = new Map<string, MarketRow[]>()
  for (const row of currencyRows) {
    const key = signature(row.title)
    if (key.split(' ').length < 2) continue
    const group = groups.get(key) || []
    group.push(row)
    groups.set(key, group)
  }
  const opportunities = [...groups.entries()]
    .filter(([, rows]) => rows.length >= 2)
    .map(([key, rows]) => {
      const values = rows.map(row => Number(row.price_amount)).sort((a, b) => a - b)
      const groupMedian = median(values)
      const cheapest = rows.reduce((best, row) => Number(row.price_amount) < Number(best.price_amount) ? row : best)
      const potentialProfit = Math.max(0, groupMedian - Number(cheapest.price_amount))
      return {
        key,
        title: cheapest.title,
        platform: cheapest.platform,
        image: cheapest.image,
        url: cheapest.url,
        lowest: round(Number(cheapest.price_amount)),
        median: round(groupMedian),
        potentialProfit: round(potentialProfit),
        spreadPercent: groupMedian ? round((potentialProfit / groupMedian) * 100) : 0,
        samples: rows.length,
        currency,
      }
    })
    .filter(item => item.potentialProfit > 0)
    .sort((a, b) => b.spreadPercent - a.spreadPercent)
    .slice(0, 8)

  return NextResponse.json({
    query,
    currency,
    availableCurrencies,
    overview: {
      totalTracked: allRows.length,
      pricedInCurrency: currencyRows.length,
      platforms: new Set(allRows.map(row => row.platform)).size,
      currencies: availableCurrencies.length,
    },
    stats,
    history,
    deals,
    opportunities,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
