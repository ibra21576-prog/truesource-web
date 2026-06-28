import { Search, ScrapedItem } from './types'
import { fetchVinted } from './vinted'
import { fetchEbay } from './ebay'
import { fetchKleinanzeigen } from './kleinanzeigen'
import { fetchGumtree } from './gumtree'
import { fetchKijiji } from './kijiji'
import { fetchCraigslist } from './craigslist'
import { fetchShpock } from './shpock'
import { fetchMarktplaats } from './marktplaats'
import { fetchLeboncoin } from './leboncoin'
import { matchesProduct } from './utils'

export type { Search, ScrapedItem }

export async function fetchItems(search: Search, cookieStr?: string): Promise<ScrapedItem[]> {
  let items: ScrapedItem[]
  switch (search.platform) {
    case 'ebay':          items = await fetchEbay(search); break
    case 'kleinanzeigen': items = await fetchKleinanzeigen(search); break
    case 'gumtree':       items = await fetchGumtree(search); break
    case 'kijiji':        items = await fetchKijiji(search); break
    case 'craigslist':    items = await fetchCraigslist(search); break
    case 'shpock':        items = await fetchShpock(search); break
    case 'marktplaats':   items = await fetchMarktplaats(search); break
    case 'leboncoin':     items = await fetchLeboncoin(search); break
    default:              items = await fetchVinted(search, cookieStr); break
  }
  return items.filter(it => matchesProduct(it.title, search.query, search.platform))
}
