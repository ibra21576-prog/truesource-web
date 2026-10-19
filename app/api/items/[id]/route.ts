import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRequestSession } from '@/lib/session'
import { currencyForMarketplaceDomain, parseMarketplacePrice } from '@/lib/intelligence/price'

export const dynamic = 'force-dynamic'

function words(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, ' ').split(/\s+/).filter(word => word.length >= 3).slice(0, 5)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequestSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServiceClient()
  const { data: item, error } = await supabase.from('items').select('*, searches(query,domain)').eq('id', params.id).eq('user_id', session.userId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!item) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  const [{ data: deal }, { data: history }, { data: recent }] = await Promise.all([
    supabase.from('saved_deals').select('*').eq('user_id', session.userId).eq('item_id', item.id).maybeSingle(),
    supabase.from('item_price_events').select('*').eq('item_id', item.id).order('recorded_at', { ascending: true }),
    supabase.from('items').select('id,title,price,platform,image,url,found_at').eq('user_id', session.userId).neq('id', item.id).order('found_at', { ascending: false }).limit(250),
  ])
  const itemWords = new Set(words(item.title || ''))
  const itemPrice = parseMarketplacePrice(item.price)
  const itemCurrency = itemPrice.currency || currencyForMarketplaceDomain(item.searches?.domain || '')
  const similar = (recent || []).map((candidate: any) => {
    const overlap = words(candidate.title || '').filter(word => itemWords.has(word)).length
    return { ...candidate, overlap, parsed: parseMarketplacePrice(candidate.price) }
  }).filter((candidate: any) => candidate.overlap >= Math.min(2, itemWords.size) && (!candidate.parsed.currency || candidate.parsed.currency === itemCurrency)).sort((a: any, b: any) => b.overlap - a.overlap).slice(0, 8)
  const prices = similar.map((candidate: any) => candidate.parsed.amount).filter((value: any) => typeof value === 'number') as number[]
  const sorted = [...prices].sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  return NextResponse.json({ item, deal, history: history || [], similar, median, currency: itemCurrency }, { headers: { 'Cache-Control': 'no-store' } })
}
