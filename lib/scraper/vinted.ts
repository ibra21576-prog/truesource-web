import { ScrapedItem, Search } from './types'
import { formatPrice } from './utils'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'ts-settings'

async function loadVintedSession(domain: string): Promise<{ cookies: string; bearer: string }> {
  // 1. Env var override (manual fallback)
  if (process.env.VINTED_COOKIES) {
    return { cookies: process.env.VINTED_COOKIES, bearer: process.env.VINTED_BEARER ?? '' }
  }
  // 2. Supabase Storage (synced by extension)
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(`vinted/${domain}.json`)
    if (error || !data) return { cookies: '', bearer: '' }
    const text = await data.text()
    const parsed = JSON.parse(text)
    // Treat sessions older than 14 days as expired
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > 14 * 24 * 3600 * 1000) {
      return { cookies: '', bearer: '' }
    }
    return { cookies: parsed.cookies ?? '', bearer: parsed.bearerToken ?? '' }
  } catch {
    return { cookies: '', bearer: '' }
  }
}

export async function fetchVinted(search: Search, cookieStr?: string): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.vinted.de'

  let cookies = cookieStr ?? ''
  let bearer  = ''

  if (!cookies) {
    const session = await loadVintedSession(domain)
    cookies = session.cookies
    bearer  = session.bearer
  }

  if (!cookies) throw new Error('LOGIN_REQUIRED')

  const params = new URLSearchParams({
    search_text: search.query,
    order:       'newest_first',
    per_page:    '20',
    page:        '1',
  })
  if (search.min_price) params.set('price_from', String(search.min_price))
  if (search.max_price) params.set('price_to',   String(search.max_price))
  const apiUrl = `https://${domain}/api/v2/catalog/items?${params}`

  const headers: Record<string, string> = {
    Accept:              'application/json, text/plain, */*',
    'Accept-Language':   'de-DE,de;q=0.9,en;q=0.8',
    'X-Requested-With':  'XMLHttpRequest',
    'User-Agent':        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer:             `https://${domain}/catalog`,
    Origin:              `https://${domain}`,
    'Sec-Fetch-Site':    'same-origin',
    'Sec-Fetch-Mode':    'cors',
    'Sec-Fetch-Dest':    'empty',
    Cookie:              cookies,
  }
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`

  const res = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(15000) })
  if (res.status === 429) throw new Error('RATE_LIMITED')
  if (res.status === 401 || res.status === 403) throw new Error('LOGIN_REQUIRED')
  if (!res.ok) throw new Error(`Vinted HTTP ${res.status}`)

  const data = await res.json()
  if (!Array.isArray(data.items)) throw new Error('LOGIN_REQUIRED')
  return mapItems(data.items, domain)
}

function mapItems(raw: any[], domain: string): ScrapedItem[] {
  return raw.map((it) => {
    const priceObj = it.total_item_price || it.price || {}
    const amount   = priceObj.amount ?? ''
    const currency = priceObj.currency_code || 'EUR'
    const url      = it.url || `https://${domain}/items/${it.id}`
    const image    = it.photo?.url || it.photos?.[0]?.url || it.photo?.full_size_url || null
    return {
      id:       String(it.id),
      title:    it.title || '(no title)',
      price:    amount ? formatPrice(amount, currency) : '',
      url,
      image,
      platform: 'vinted',
    }
  })
}
