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

// Drop-in fetch that tunnels through PROXY_URL when configured, else direct.
export async function proxyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const agent = await getAgent()
  if (agent) {
    // `dispatcher` is an undici extension to RequestInit not in the DOM types.
    return fetch(url, { ...init, dispatcher: agent } as any)
  }
  return fetch(url, init)
}
