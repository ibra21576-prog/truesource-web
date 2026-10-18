export interface Search {
  id: string
  query: string
  platform: string
  domain: string
  min_price?: number | null
  max_price?: number | null
  exclude_terms?: string[] | null
  max_age_hours?: number | null
  alert_max_price?: number | null
  alert_min_discount?: number | null
  enabled: boolean
  user_id?: string | null
}

export interface ScrapedItem {
  id: string
  title: string
  price: string
  url: string
  image: string | null
  platform: string
  // Real listing/post time from the marketplace (ISO string), when available.
  // Falls back to discovery time for display when absent.
  postedAt?: string | null
}
