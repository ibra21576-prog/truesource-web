import { ProxyAgent } from 'undici'

// Residential proxy support. Set PROXY_URL in Vercel env vars, e.g.
//   http://username:password@p.webshare.io:80   (Webshare residential rotating)
//   http://username:password@geo.iproyal.com:12321  (IPRoyal residential)
//
// Only the platforms that block datacenter IPs (Gumtree, Shpock, Leboncoin,
// eBay HTML) route through here. The 5 platforms that work directly from Vercel
// stay on plain fetch() so they don't burn paid proxy bandwidth.

let cached: ProxyAgent | null | undefined

function getAgent(): ProxyAgent | null {
  if (cached !== undefined) return cached
  const url = process.env.PROXY_URL
  cached = url ? new ProxyAgent(url) : null
  return cached
}

export function hasProxy(): boolean {
  return !!process.env.PROXY_URL
}

// Drop-in fetch that tunnels through PROXY_URL when configured, else direct.
export async function proxyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const agent = getAgent()
  if (agent) {
    // `dispatcher` is an undici extension to RequestInit not in the DOM types.
    return fetch(url, { ...init, dispatcher: agent } as any)
  }
  return fetch(url, init)
}
