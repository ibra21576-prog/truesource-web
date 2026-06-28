import { ScrapedItem, Search } from './types'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-CA,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) { console.log(`[kijiji] HTTP ${res.status}`); return '' }
    const t = await res.text()
    return t.length > 5000 ? t : ''
  } catch (e: any) {
    console.log(`[kijiji] fetch error: ${e.message}`)
    return ''
  }
}

function isBlocked(html: string) {
  // Real Kijiji listing pages are huge (400KB+) and legitimately contain the word
  // "captcha" in hidden anti-bot widgets. Only treat as blocked if the page is a
  // small Cloudflare/challenge interstitial.
  if (html.length > 60000) return false
  return /Just a moment|Checking your browser|cf-challenge|Access denied|Pardon Our Interruption|Attention Required/i.test(html)
}

export async function fetchKijiji(search: Search): Promise<ScrapedItem[]> {
  const domain = search.domain || 'www.kijiji.ca'
  const q = encodeURIComponent(search.query)
  // Buy & Sell across ALL of Canada. l0 = Canada-wide (no city filter),
  // c10 = Buy & Sell category. This page renders Schema.org JSON-LD; the
  // all-category /b-canada/ URL does NOT, so we keep c10 here.
  const base = `https://${domain}/b-buy-sell/canada/${q}/k0c10l0?sortingOrder=dateDesc`

  // Fetch pages 1 and 2 in parallel for double the items
  const [html1, html2] = await Promise.all([
    fetchPage(base),
    fetchPage(`${base}&page=2`),
  ])

  const allItems: ScrapedItem[] = []
  const seen = new Set<string>()

  for (const html of [html1, html2]) {
    if (!html || isBlocked(html)) continue
    // Prefer __APOLLO_STATE__ (richer: real post date, more items, images).
    // Fall back to JSON-LD if the page structure changes.
    let parsed = parseApolloState(html, domain)
    if (parsed.length === 0) parsed = parseJsonLd(html, domain)
    for (const item of parsed) {
      if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item) }
    }
  }

  console.log(`[kijiji] ${allItems.length} items from 2 pages`)
  return allItems
}

function fixRule(url: string | null | undefined): string | null {
  if (!url) return null
  return url.includes('rule=')
    ? url.replace(/rule=[^&]+/, 'rule=kijijica-960-jpg')
    : url + (url.includes('?') ? '&' : '?') + 'rule=kijijica-960-jpg'
}

function parseApolloState(html: string, domain: string): ScrapedItem[] {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return []
  let apollo: Record<string, any>
  try {
    apollo = JSON.parse(m[1])?.props?.pageProps?.__APOLLO_STATE__
  } catch { return [] }
  if (!apollo) return []

  const items: ScrapedItem[] = []
  for (const [key, v] of Object.entries(apollo)) {
    if (!key.startsWith('StandardListing:')) continue
    if (!v || typeof v !== 'object') continue
    const id = String(v.id || key.split(':')[1] || '')
    const title: string = v.title || ''
    if (!id || !title || title.length < 2) continue

    // Price: StandardAmountPrice.amount is in CENTS. NonAmountPrice = CONTACT/SWAP/etc.
    let price = ''
    const pr = v.price || {}
    if (pr.__typename === 'StandardAmountPrice' && typeof pr.amount === 'number') {
      const dollars = pr.amount / 100
      price = `$${dollars % 1 === 0 ? dollars : dollars.toFixed(2)}`
    } else if (pr.type === 'FREE') {
      price = 'Free'
    } else if (pr.type === 'SWAP_TRADE') {
      price = 'Swap/Trade'
    }

    const image = fixRule((v.imageUrls || [])[0] || null)
    const url: string = v.url
      ? (v.url.startsWith('http') ? v.url : `https://${domain}${v.url}`)
      : `https://${domain}/v-x/${id}`
    // sortingDate = most recent listing activity (matches Kijiji's date sort)
    const postedAt: string | null = v.sortingDate || v.activationDate || null

    items.push({ id, title, price, url, image, platform: 'kijiji', postedAt })
  }
  return items
}

function parseJsonLd(html: string, domain: string): ScrapedItem[] {
  const items: ScrapedItem[] = []
  const seen = new Set<string>()
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const list = data['@type'] === 'ItemList' ? data.itemListElement : null
      if (!Array.isArray(list)) continue
      for (const entry of list) {
        const it = entry.item || entry
        const urlStr: string = it.url || ''
        const idM = urlStr.match(/\/(\d{7,14})(?:\/|$)/)
        if (!idM) continue
        const id = idM[1]
        if (seen.has(id)) continue
        seen.add(id)
        const title: string = it.name || ''
        if (!title || title.length < 2) continue
        const priceRaw = it.offers?.price
        const priceNum = priceRaw ? Number(priceRaw) : NaN
        const priceStr = !isNaN(priceNum) && priceNum > 0
          ? `$${priceNum % 1 === 0 ? priceNum : priceNum.toFixed(2)}`
          : ''
        // Kijiji's media API uses size rules like kijijica-960-jpg. The old
        // galleryLargeV2 rule 404s on these URLs, so request a high-res JPEG.
        let image: string | null = it.image || null
        if (image) {
          image = image.includes('rule=')
            ? image.replace(/rule=[^&]+/, 'rule=kijijica-960-jpg')
            : image + (image.includes('?') ? '&' : '?') + 'rule=kijijica-960-jpg'
        }
        items.push({ id, title, price: priceStr, url: urlStr, image, platform: 'kijiji' })
      }
      if (items.length > 0) return items
    } catch {}
  }
  return items
}
