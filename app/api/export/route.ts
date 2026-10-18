import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRequestSession } from '@/lib/session'
import { claimLegacySearches, getUserSearchIds } from '@/lib/user-data'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
  const user = await getRequestSession(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const searchIds = await getUserSearchIds(supabase, user.userId)
  if (!searchIds.length) {
    return new NextResponse('platform,title,price,url,search,found_at,posted_at\r\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="truesource-listings.csv"',
      },
    })
  }

  await claimLegacySearches(supabase, user.userId, searchIds)
  const rows: any[] = []
  const batchSize = 1000

  for (let from = 0; ; from += batchSize) {
    const { data, error } = await supabase
      .from('items')
      .select('platform,title,price,url,found_at,posted_at,searches(query)')
      .eq('user_id', user.userId)
      .in('search_id', searchIds)
      .order('found_at', { ascending: false })
      .range(from, from + batchSize - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rows.push(...(data ?? []))
    if (!data || data.length < batchSize) break
  }

  const header = ['platform', 'title', 'price', 'url', 'search', 'found_at', 'posted_at']
  const lines = rows.map(row => [
    row.platform,
    row.title,
    row.price,
    row.url,
    Array.isArray(row.searches) ? row.searches[0]?.query : row.searches?.query,
    row.found_at,
    row.posted_at,
  ].map(csvCell).join(','))
  const csv = `\uFEFF${header.join(',')}\r\n${lines.join('\r\n')}`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="truesource-listings-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
