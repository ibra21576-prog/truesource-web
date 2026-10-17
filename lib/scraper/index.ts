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
import { fetchSubito } from './subito'
import { fetchTradera } from './tradera'
import { fetchWillhaben } from './willhaben'
import { fetchWallapop } from './wallapop'
import { fetchOlx } from './olx'
import { matchesProduct, isWantedAd } from './utils'

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
    case 'subito':        items = await fetchSubito(search); break
    case 'tradera':       items = await fetchTradera(search); break
    case 'willhaben':     items = await fetchWillhaben(search); break
    case 'wallapop':      items = await fetchWallapop(search); break
    case 'olx':           items = await fetchOlx(search); break
    default:              items = await fetchVinted(search, cookieStr); break
  }
  return items.filter(it => matchesProduct(it.title, search.query, search.platform) && !isWantedAd(it.title))
}
