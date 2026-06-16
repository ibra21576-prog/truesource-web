import { Search, ScrapedItem } from './types'
import { fetchVinted } from './vinted'
import { fetchEbay } from './ebay'
import { fetchKleinanzeigen } from './kleinanzeigen'
import { fetchGumtree } from './gumtree'
import { fetchKijiji } from './kijiji'
import { fetchCraigslist } from './craigslist'
import { matchesProduct } from './utils'

export type { Search, ScrapedItem }

export async function fetchItems(search: Search, cookieStr?: string): Promise<ScrapedItem[]> {
  let items: ScrapedItem[]
  if (search.platform === 'ebay') {
    items = await fetchEbay(search)
  } else if (search.platform === 'kleinanzeigen') {
    items = await fetchKleinanzeigen(search)
  } else if (search.platform === 'gumtree') {
    items = await fetchGumtree(search)
  } else if (search.platform === 'kijiji') {
    items = await fetchKijiji(search)
  } else if (search.platform === 'craigslist') {
    items = await fetchCraigslist(search)
  } else {
    items = await fetchVinted(search, cookieStr)
  }
  return items.filter(it => matchesProduct(it.title, search.query, search.platform))
}
