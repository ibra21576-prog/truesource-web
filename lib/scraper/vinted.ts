import { ScrapedItem, Search } from './types'
import { formatPrice } from './utils'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'ts-settings'

async function loadVintedSession(domain: string, userId?: string | null): Promise<{ cookies: string; bearer: string; refreshToken: string }> {
  if (process.env.VINTED_COOKIES) {
    return { cookies: process.env.VINTED_COOKIES, bearer: process.env.VINTED_BEARER ?? '', refreshToken: '' }
  }
  const supabase = createServiceClient()

  // Per-user session (new system: user logged in with own Vinted account)
  if (userId) {
    try {
      const { data } = await supabase.storage.from(BUCKET).download(`vinted-sessions/${userId}/${domain}.json`)
      if (data) {
        const parsed = JSON.parse(await data.text())
        return { cookies: '', bearer: parsed.accessToken ?? '', refreshToken: parsed.refreshToken ?? '' }
      }
    } catch {}
  }

  // Global admin session (legacy: cookie-based)
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(`vinted/${domain}.json`)
    if (error || !data) return { cookies: '', bearer: '', refreshToken: '' }
    const parsed = JSON.parse(await data.text())
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > 60 * 24 * 3600 * 1000) {
      return { cookies: '', bearer: '', refreshToken: '' }
    }
    return { cookies: parsed.cookies ?? '', bearer: parsed.bearerToken ?? '', refreshToken: parsed.refreshToken ?? '' }
  } catch {
    return { cookies: '', bearer: '', refreshToken: '' }
  }
}

async function refreshVintedToken(domain: string, refreshToken: string, userId?: string | null): Promise<string> {
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

    if (newAccessToken) {
      const supabase = createServiceClient()
      // Determine which storage path to update
      const storagePath = userId
        ? `vinted-sessions/${userId}/${domain}.json`
        : `vinted/${domain}.json`

      const { data: existing } = await supabase.storage.from(BUCKET).download(storagePath)
      let stored: Record<string, unknown> = {}
      if (existing) {
        try { stored = JSON.parse(await existing.text()) } catch {}
      }
      // Update the right field name depending on session type
      if (userId) {
        stored.accessToken  = newAccessToken
        if (newRefreshToken) stored.refreshToken = newRefreshToken
      } else {
        stored.bearerToken  = newAccessToken
        if (newRefreshToken) stored.refreshToken = newRefreshToken
      }
      stored.updatedAt = Date.now()
      await supabase.storage.from(BUCKET)
        .upload(storagePath, Buffer.from(JSON.stringify(stored)), {
          contentType: 'application/json', upsert: true,
        })
    }
    return newAccessToken
  } catch {
    return ''
  }
}

async function getGuestSession(domain: string): Promise<string> {
  try {
    const res = await fetch(`https://${domain}/`, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control':   'no-cache',
        'Pragma':          'no-cache',
        'Sec-Fetch-Site':  'none',
        'Sec-Fetch-Mode':  'navigate',
        'Sec-Fetch-Dest':  'document',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(12000),
    })
    // getSetCookie() is available in Node 18+ and returns all Set-Cookie values
    const rawCookies: string[] = typeof (res.headers as any).getSetCookie === 'function'
      ? (res.headers as any).getSetCookie()
      : []

    // Fallback for environments without getSetCookie
    if (rawCookies.length === 0) {
      res.headers.forEach((v: string, k: string) => {
        if (k.toLowerCase() === 'set-cookie') rawCookies.push(v)
      })
    }

    const parts = rawCookies
      .map((c: string) => c.split(';')[0].trim())
      .filter((c: string) => c.includes('=') && c.split('=').slice(1).join('=').length > 0)

    console.log(`[vinted] guest session cookies (${domain}): ${parts.map(c => c.split('=')[0]).join(', ')}`)
    return parts.join('; ')
  } catch (e: any) {
    console.error('[vinted] getGuestSession failed:', e.message)
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

async function tryVintedRequest(apiUrl: string, domain: string, cookies: string, bearer: string): Promise<ScrapedItem[] | null> {
  const res = await doVintedRequest(apiUrl, domain, cookies, bearer)
  if (res.status === 429) throw new Error('RATE_LIMITED')
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data.items)) return null
  return mapItems(data.items, domain)
}

export async function fetchVinted(search: Search, cookieStr?: string): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.vinted.de'
  const userId = search.user_id ?? null

  const params = new URLSearchParams({
    search_text: search.query,
    order:       'newest_first',
    per_page:    '20',
    page:        '1',
  })
  if (search.min_price) params.set('price_from', String(search.min_price))
  if (search.max_price) params.set('price_to',   String(search.max_price))
  const apiUrl = `https://${domain}/api/v2/catalog/items?${params}`

  // 1. Try provided cookie string directly
  if (cookieStr) {
    const result = await tryVintedRequest(apiUrl, domain, sanitizeCookieHeader(cookieStr), '')
    if (result) return result
  }

  // 2. Try stored user/admin session
  const session = await loadVintedSession(domain, userId)
  if (session.bearer || session.cookies) {
    const cookies = session.cookies ? sanitizeCookieHeader(session.cookies) : ''
    let bearer = session.bearer

    let result = await tryVintedRequest(apiUrl, domain, cookies, bearer)

    // Auto-refresh on auth failure
    if (!result && session.refreshToken) {
      console.log('[vinted] token expired — attempting refresh')
      const newBearer = await refreshVintedToken(domain, session.refreshToken, userId)
      if (newBearer) {
        result = await tryVintedRequest(apiUrl, domain, cookies, newBearer)
      }
    }

    if (result) return result
    console.log('[vinted] stored session failed — falling back to guest session')
  }

  // 3. Guest session fallback: GET homepage to obtain anonymous session cookies (datadome etc.)
  const guestCookies = await getGuestSession(domain)
  if (guestCookies) {
    const result = await tryVintedRequest(apiUrl, domain, guestCookies, '')
    if (result) {
      console.log('[vinted] guest session worked')
      return result
    }
    console.log('[vinted] guest session also failed — LOGIN_REQUIRED')
  }

  throw new Error('LOGIN_REQUIRED')
}

function mapItems(raw: any[], domain: string): ScrapedItem[] {
  return raw.map((it) => {
    const priceObj = it.total_item_price || it.price || {}
    const amount   = priceObj.amount ?? ''
    const currency = priceObj.currency_code || 'EUR'
    // Vinted API returns either a full `url` or a relative `path` — ensure absolute
    const rawUrl   = it.url || it.path || `/items/${it.id}`
    const url      = rawUrl.startsWith('http') ? rawUrl : `https://${domain}${rawUrl}`
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
