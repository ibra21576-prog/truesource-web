const CURRENCY_MARKERS: Array<[RegExp, string]> = [
  [/(?:€|\beur\b)/i, 'EUR'],
  [/(?:£|\bgbp\b)/i, 'GBP'],
  [/(?:\bc\$\b|\bcad\b)/i, 'CAD'],
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

