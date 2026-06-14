import { ScrapedItem, Search } from './types'
import { formatPrice } from './utils'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'ts-settings'

async function loadVintedSession(domain: string): Promise<{ cookies: string; bearer: string; refreshToken: string }> {
  if (process.env.VINTED_COOKIES) {
    return { cookies: process.env.VINTED_COOKIES, bearer: process.env.VINTED_BEARER ?? '', refreshToken: '' }
  }
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(`vinted/${domain}.json`)
    if (error || !data) return { cookies: '', bearer: '', refreshToken: '' }
    const text = await data.text()
    const parsed = JSON.parse(text)
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > 60 * 24 * 3600 * 1000) {
      return { cookies: '', bearer: '', refreshToken: '' }
    }
    return { cookies: parsed.cookies ?? '', bearer: parsed.bearerToken ?? '', refreshToken: parsed.refreshToken ?? '' }
  } catch {
    return { cookies: '', bearer: '', refreshToken: '' }
  }
}

async function refreshVintedToken(domain: string, refreshToken: string): Promise<string> {
  try {
    const res = await fetch(`https://${domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Origin': `https://${domain}`,
        'Referer': `https://${domain}/`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: 'web' }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return ''
    const data = await res.json()
    const newAccessToken  = data.access_token  ?? ''
    const newRefreshToken = data.refresh_token ?? ''

    // Save updated tokens to Supabase Storage so they persist for next run
    if (newAccessToken) {
      const supabase = createServiceClient()
      const { data: existing } = await supabase.storage.from(BUCKET).download(`vinted/${domain}.json`)
      let stored: Record<string, unknown> = {}
      if (existing) {
        try { stored = JSON.parse(await existing.text()) } catch {}
      }
      stored.bearerToken  = newAccessToken
      if (newRefreshToken) stored.refreshToken = newRefreshToken
      stored.updatedAt = Date.now()
      await supabase.storage.from(BUCKET)
        .upload(`vinted/${domain}.json`, Buffer.from(JSON.stringify(stored)), {
          contentType: 'application/json', upsert: true,
        })
    }
    return newAccessToken
  } catch {
    return ''
  }
}

function sanitizeCookieHeader(cookieStr: string): string {
  return cookieStr
    .split(';')
    .map(c => c.trim())
    .filter(c => c.includes('='))
    .map(c => {
      const eqIdx = c.indexOf('=')
      const name  = c.slice(0, eqIdx).trim()
      // Keep only printable ASCII + Latin-1; strip control chars and chars > 255
      const value = c.slice(eqIdx + 1).replace(/[^\x09\x20-\x7e\xa0-\xff]/g, '')
      return `${name}=${value}`
    })
    .filter(c => {
      const name = c.slice(0, c.indexOf('='))
      // Skip cookies whose name contains non-ASCII
      return /^[a-zA-Z0-9_\-\.]+$/.test(name)
    })
    .join('; ')
}

async function doVintedRequest(apiUrl: string, domain: string, cookies: string, bearer: string): Promise<Response> {
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
  return fetch(apiUrl, { headers, signal: AbortSignal.timeout(15000) })
}

export async function fetchVinted(search: Search, cookieStr?: string): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.vinted.de'

  let cookies = cookieStr ?? ''
  let bearer  = ''
  let refreshToken = ''

  if (!cookies) {
    const session = await loadVintedSession(domain)
    cookies      = session.cookies
    bearer       = session.bearer
    refreshToken = session.refreshToken
  }

  if (!cookies) throw new Error('LOGIN_REQUIRED')
  cookies = sanitizeCookieHeader(cookies)

  const params = new URLSearchParams({
    search_text: search.query,
    order:       'newest_first',
    per_page:    '20',
    page:        '1',
  })
  if (search.min_price) params.set('price_from', String(search.min_price))
  if (search.max_price) params.set('price_to',   String(search.max_price))
  const apiUrl = `https://${domain}/api/v2/catalog/items?${params}`

  let res = await doVintedRequest(apiUrl, domain, cookies, bearer)

  // Auto-refresh: if token expired and we have a refreshToken, try once
  if ((res.status === 401 || res.status === 403) && refreshToken) {
    console.log('[vinted] token expired — attempting refresh')
    const newBearer = await refreshVintedToken(domain, refreshToken)
    if (newBearer) {
      bearer = newBearer
      res = await doVintedRequest(apiUrl, domain, cookies, bearer)
    }
  }

  if (res.status === 429) throw new Error('RATE_LIMITED')
  if (res.status === 401 || res.status === 403) throw new Error('LOGIN_REQUIRED')
  if (!res.ok) throw new Error(`Vinted HTTP ${res.status}`)

  const data = await res.json()
  if (data.error?.value === 'LOGIN_REQUIRED' || !Array.isArray(data.items)) throw new Error('LOGIN_REQUIRED')
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
