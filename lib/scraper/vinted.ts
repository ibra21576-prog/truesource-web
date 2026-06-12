import { ScrapedItem, Search } from './types'
import { formatPrice } from './utils'

export async function fetchVinted(search: Search, cookieStr?: string): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.vinted.de'
  const params = new URLSearchParams({
    search_text: search.query,
    order: 'newest_first',
    per_page: '20',
    page: '1',
  })
  if (search.min_price) params.set('price_from', String(search.min_price))
  if (search.max_price) params.set('price_to', String(search.max_price))
  const apiUrl = `https://${domain}/api/v2/catalog/items?${params}`

  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: `https://${domain}/catalog`,
    Origin: `https://${domain}`,
  }
  if (cookieStr) headers['Cookie'] = cookieStr

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
    const priceObj = it.price || it.total_item_price || {}
    const amount   = priceObj.amount ?? ''
    const currency = priceObj.currency_code || 'EUR'
    const url      = `https://${domain}/items/${it.id}`
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
