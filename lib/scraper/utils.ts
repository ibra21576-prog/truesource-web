export function formatPrice(amount: string | number, currency: string): string {
  const num = parseFloat(String(amount).replace(',', '.'))
  if (isNaN(num)) return `${amount} ${currency || ''}`.trim()
  const formatted = num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'USD' ? '$' : (currency || '€')
  return `${formatted} ${symbol}`.trim()
}

export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const ACCESSORY_TERMS = [
  'hülle','huelle','schutzhülle','tasche','schale','folie','panzerglas',
  'displayschutz','halter','halterung','ständer','aufkleber','sticker',
  'kabel','ladekabel','ladegerät','netzteil','adapter',
  'case','cover','shell','sleeve','pouch','protector','protective',
  'cable','charger','adaptor','mount','stand','dock','docking','decal','skin',
  'coque','étui','etui','housse','protection','chargeur','câble',
  'funda','carcasa','cargador',
  'custodia','caricatore','pellicola',
  'leer','leerverpackung','karton','ersatzteil','spare','parts','bastler','defekt','broken',
]

// "Wanted"/buying ads — sellers want to BUY, not sell. They clutter the deal feed
// and usually have no price. Patterns are deliberately specific to avoid hitting
// real sale listings (e.g. "Need for Speed Most Wanted" must NOT match).
const WANTED_PATTERNS: RegExp[] = [
  /\b(we|i)\s+buy\b/i,
  /\b(i|we)\s+will\s+buy\b/i,
  /\bwill\s+buy\b/i,
  /\bwe\s+(pay|purchase)\b/i,
  /\bcash\s+(for|paid)\b/i,
  /\$\$+\s*for\b/i,
  /\bpaying\s+cash\b/i,
  /\btop\s+dollar\b/i,
  /\binstant\s+cash\b/i,
  /\b(want|wanted|looking|wanting)\s+to\s+buy\b/i,
  /\bwtb\b/i,
  /\blooking\s+for\b/i,
  /\b(sell|sale)\s+(us|me|to\s+us)\b/i,
  /\bbuying\s+your\b/i,
  // German
  /\b(ich\s+kaufe|wir\s+kaufen)\b/i,
  /\bankauf\b/i,
  /\bsuche\b/i,
  /\bgesucht\b/i,
  // French
  /\b(recherche|cherche|achète|achete)\b/i,
  // Dutch
  /\b(gevraagd|gezocht)\b/i,
  /\bik\s+koop\b/i,
  // Spanish / Italian
  /\b(compro|busco|cerco|se\s+busca)\b/i,
]

export function isWantedAd(title: string): boolean {
  if (!title) return false
  return WANTED_PATTERNS.some(re => re.test(title))
}

export function matchesProduct(title: string, query: string, platform = ''): boolean {
  if (!title || !query) return true
  if (platform === 'ebay') return true
  const t = title.toLowerCase()
  const q = query.toLowerCase()
  const queryWords = q.split(/\s+/).filter(Boolean)
  for (const word of queryWords) {
    if (!t.includes(word)) return false
  }
  const head = t.slice(0, 30)
  for (const term of ACCESSORY_TERMS) {
    if (q.includes(term)) continue
    const re = new RegExp(`(^|[^a-zäöüßéèêàçñ])${escapeRegex(term)}([^a-zäöüßéèêàçñ]|$)`, 'i')
    if (re.test(head)) return false
  }
  return true
}
