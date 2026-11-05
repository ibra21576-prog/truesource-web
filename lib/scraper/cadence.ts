// Fastest practical cadence without needlessly hammering marketplaces.
// These limits are enforced server-side, so multiple browser tabs cannot
// accidentally multiply the request rate.
export const PLATFORM_COOLDOWN_MS: Record<string, number> = {
  subito: 45_000,       // public JSON endpoint
  marktplaats: 60_000,  // public search endpoint
  tradera: 60_000,      // server-rendered search page
  willhaben: 60_000,    // server-rendered search page
  // Identical searches are grouped into one request per cycle, so the real
  // per-marketplace rate stays low. Retries back off separately (health.ts).
  kleinanzeigen: 45_000,
  vinted: 45_000,       // per-user session, each user's own request budget
  craigslist: 90_000,
  gumtree: 90_000,
  kijiji: 90_000,
  shpock: 120_000,
  leboncoin: 120_000,
  ebay: 120_000,        // Browse API quota: 5,000 calls/day shared by all eBay searches
}

// Stable per-search jitter spreads requests over time instead of sending every
// user's scans to a marketplace in one synchronized burst.
export function cooldownFor(platform: string, seed = ''): number {
  const base = PLATFORM_COOLDOWN_MS[platform] ?? 90_000
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return base + Math.floor(base * ((hash % 16) / 100))
}
