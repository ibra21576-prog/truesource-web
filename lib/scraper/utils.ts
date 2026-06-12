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
