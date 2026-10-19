const CURRENCY_MARKERS: Array<[RegExp, string]> = [
  [/(?:a\$|\baud\b|aud\$)/i, 'AUD'],
  [/(?:c\$|\bcad\b|cad\$)/i, 'CAD'],
  [/(?:€|\beur\b)/i, 'EUR'],
  [/(?:£|\bgbp\b)/i, 'GBP'],
  [/(?:\bchf\b)/i, 'CHF'],
  [/(?:\bczk\b|\bkč\b)/i, 'CZK'],
  [/(?:\bhuf\b|\bft\b)/i, 'HUF'],
  [/(?:\bron\b|\blei\b)/i, 'RON'],
  [/(?:\bbgn\b|\bлв\b)/i, 'BGN'],
  [/(?:\buah\b|₴)/i, 'UAH'],
  [/(?:\$|\busd\b)/i, 'USD'],
  [/(?:\bsek\b|\bkr\b)/i, 'SEK'],
  [/(?:\bpln\b|\bzł\b)/i, 'PLN'],
]

export function parseMarketplacePrice(value: string | null | undefined): {
  amount: number | null
  currency: string | null
} {
  if (!value) return { amount: null, currency: null }

  const currency = CURRENCY_MARKERS.find(([pattern]) => pattern.test(value))?.[1] ?? null
  const match = value.replace(/\s/g, '').match(/\d[\d.,]*/)
  if (!match) return { amount: null, currency }

  let raw = match[0]
  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  const decimalIndex = Math.max(lastComma, lastDot)

  if (decimalIndex >= 0 && raw.length - decimalIndex - 1 <= 2) {
    const integer = raw.slice(0, decimalIndex).replace(/[.,]/g, '')
    const decimals = raw.slice(decimalIndex + 1).replace(/[.,]/g, '')
    raw = `${integer}.${decimals}`
  } else {
    raw = raw.replace(/[.,]/g, '')
  }

  const amount = Number(raw)
  return { amount: Number.isFinite(amount) ? amount : null, currency }
}

export function formatMarketplaceMoney(amount: number | null | undefined, currency = 'EUR') {
  if (amount == null || !Number.isFinite(amount)) return '—'
  try {
    return new Intl.NumberFormat('en-DE', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function currencyForMarketplaceDomain(domain: string) {
  const host = domain.toLowerCase()
  if (host.endsWith('.com.au')) return 'AUD'
  if (host.endsWith('.ca')) return 'CAD'
  if (host.includes('tradera.com') || host.endsWith('.se')) return 'SEK'
  if (host === 'www.gumtree.com' || host === 'london.craigslist.org') return 'GBP'
  if (host.endsWith('wallapop.com') || host.endsWith('shpock.com')) return 'EUR'
  if (host === 'toronto.craigslist.org' || host === 'vancouver.craigslist.org') return 'CAD'
  if (host === 'sydney.craigslist.org') return 'AUD'
  if (host.endsWith('.craigslist.org') && host !== 'berlin.craigslist.org') return 'USD'
  if (host.endsWith('.co.uk')) return 'GBP'
  if (host.endsWith('.pl')) return 'PLN'
  if (host.endsWith('.ro')) return 'RON'
  if (host.endsWith('.bg')) return 'BGN'
  if (host.endsWith('.ua')) return 'UAH'
  if (host.endsWith('.cz')) return 'CZK'
  if (host.endsWith('.hu')) return 'HUF'
  if (host.endsWith('.ch')) return 'CHF'
  if (host.endsWith('.com')) return 'USD'
  return 'EUR'
}

export function marketplaceCurrencySymbol(currency: string) {
  return ({ EUR: '€', GBP: '£', USD: '$', CAD: 'C$', AUD: 'A$', SEK: 'kr', PLN: 'zł', CHF: 'CHF', CZK: 'Kč', HUF: 'Ft', RON: 'lei', BGN: 'лв', UAH: '₴' } as Record<string, string>)[currency] || currency
}

