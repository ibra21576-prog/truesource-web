import { Search, ScrapedItem } from './types'
import { fetchVinted } from './vinted'
import { fetchEbay } from './ebay'
import { fetchKleinanzeigen } from './kleinanzeigen'
import { matchesProduct } from './utils'

export type { Search, ScrapedItem }

export async function fetchItems(search: Search, cookieStr?: string): Promise<ScrapedItem[]> {
  let items: ScrapedItem[]
  if (search.platform === 'ebay') {
    items = await fetchEbay(search)
  } else if (search.platform === 'kleinanzeigen') {
    items = await fetchKleinanzeigen(search)
  } else {
    items = await fetchVinted(search, cookieStr)
  }
  return items.filter(it => matchesProduct(it.title, search.query, search.platform))
}
