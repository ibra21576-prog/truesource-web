// Fastest practical cadence without needlessly hammering marketplaces.
// These limits are enforced server-side, so multiple browser tabs cannot
// accidentally multiply the request rate.
export const PLATFORM_COOLDOWN_MS: Record<string, number> = {
  subito: 45_000,       // public JSON endpoint
  marktplaats: 60_000,  // public search endpoint
  tradera: 60_000,      // server-rendered search page
  willhaben: 60_000,    // server-rendered search page
  kleinanzeigen: 60_000,
  craigslist: 90_000,
  vinted: 90_000,
  gumtree: 90_000,
  kijiji: 90_000,
  shpock: 120_000,
  leboncoin: 120_000,
  ebay: 180_000,        // official API quota
}

// Stable per-search jitter spreads requests over time instead of sending every
// user's scans to a marketplace in one synchronized burst.
export function cooldownFor(platform: string, seed = ''): number {
  const base = PLATFORM_COOLDOWN_MS[platform] ?? 90_000
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return base + Math.floor(base * ((hash % 16) / 100))
}
