// Residential proxy support. Set PROXY_URL in your host's env vars, e.g.
//   http://username:password@geo.iproyal.com:12321  (IPRoyal residential)
//
// Only the platforms that block datacenter IPs (Gumtree, Shpock, Leboncoin,
// eBay HTML) route through here. The platforms that work directly stay on plain
// fetch() so they don't burn paid proxy bandwidth.
//
// undici is imported lazily (dynamic import) so it never enters the Edge/build
// graph — it pulls in node: schemes that the Edge runtime can't bundle.

let cached: any | null | undefined

async function getAgent(): Promise<any | null> {
  if (cached !== undefined) return cached
  const url = process.env.PROXY_URL
  if (!url) { cached = null; return null }
  const { ProxyAgent } = await import('undici')
  cached = new ProxyAgent(url)
  return cached
}

export function hasProxy(): boolean {
  return !!process.env.PROXY_URL
}

export function hasScraperApi(): boolean {
  return !!process.env.SCRAPERAPI_KEY
}

// Drop-in fetch that tunnels through PROXY_URL when configured, else direct.
export async function proxyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const agent = await getAgent()
  if (agent) {
    // `dispatcher` is an undici extension to RequestInit not in the DOM types.
    return fetch(url, { ...init, dispatcher: agent } as any)
  }
  return fetch(url, init)
}

// ScraperAPI fallback for targets that actively block datacenter traffic. The
// target URL is kept server-side and the configured key never reaches clients.
export async function scraperApiFetch(
  targetUrl: string,
  init: RequestInit = {},
  options: { country?: string; render?: boolean; keepHeaders?: boolean } = {},
): Promise<Response | null> {
  const apiKey = process.env.SCRAPERAPI_KEY
  if (!apiKey) return null

  const params = new URLSearchParams({ api_key: apiKey, url: targetUrl })
  if (options.country) params.set('country_code', options.country)
  if (options.render) params.set('render', 'true')
  if (options.keepHeaders) params.set('keep_headers', 'true')

  return fetch(`https://api.scraperapi.com/?${params}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(options.render ? 45000 : 20000),
  })
}
