export interface Search {
  id: string
  query: string
  platform: string
  domain: string
  min_price?: number | null
  max_price?: number | null
  enabled: boolean
}

export interface ScrapedItem {
  id: string
  title: string
  price: string
  url: string
  image: string | null
  platform: string
}
