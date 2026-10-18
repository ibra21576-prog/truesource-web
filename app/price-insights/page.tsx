'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Navigation from '@/components/Navigation'
import { apiFetch } from '@/lib/api-client'

type Stats = { lowest: number; average: number; median: number; highest: number; count: number }
type HistoryPoint = { date: string; median: number; low: number; high: number; count: number }
type Deal = { id: string; platform: string; title: string; price: number; currency: string; url: string | null; image: string | null; savingsPercent: number; score: number; rating: string }
type Opportunity = { key: string; title: string; platform: string; image: string | null; url: string | null; lowest: number; median: number; potentialProfit: number; spreadPercent: number; samples: number; currency: string }
type Insights = {
  viewerId: string; query: string; currency: string; availableCurrencies: string[]
  overview: { totalTracked: number; pricedInCurrency: number; platforms: number; currencies: number }
  stats: Stats | null; history: HistoryPoint[]; deals: Deal[]; opportunities: Opportunity[]
}
type InventoryItem = { id: string; name: string; buyPrice: number; salePrice: number; costs: number; status: 'owned' | 'listed' | 'sold'; createdAt: string }

const money = (value: number, currency: string) => new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value || 0)

function PriceChart({ points, currency }: { points: HistoryPoint[]; currency: string }) {
  if (!points.length) return <div className="empty-state">Noch keine Verlaufsdaten für diese Suche.</div>
  const width = 760, height = 230, padX = 22, padY = 22
  const values = points.map(point => point.median)
  const min = Math.min(...values), max = Math.max(...values), spread = Math.max(max - min, 1)
  const coordinates = points.map((point, index) => ({
    x: padX + (index / Math.max(points.length - 1, 1)) * (width - padX * 2),
    y: padY + ((max - point.median) / spread) * (height - padY * 2), ...point,
  }))
  const line = coordinates.map(point => `${point.x},${point.y}`).join(' ')
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`
  return <div className="chart-wrap">
    <div className="chart-label top">{money(max, currency)}</div><div className="chart-label bottom">{money(min, currency)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Historischer Medianpreis">
      <defs><linearGradient id="priceArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7c3aed" stopOpacity=".20" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient></defs>
      {[0.25, 0.5, 0.75].map(value => <line key={value} x1="22" x2="738" y1={height * value} y2={height * value} stroke="#e8e7e2" strokeDasharray="4 5" />)}
      <polygon points={area} fill="url(#priceArea)" /><polyline points={line} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {coordinates.map((point, index) => <circle key={`${point.date}-${index}`} cx={point.x} cy={point.y} r="4" fill="#fff" stroke="#7c3aed" strokeWidth="2"><title>{`${point.date}: ${money(point.median, currency)} (${point.count} Angebote)`}</title></circle>)}
    </svg>
    <div className="chart-dates"><span>{points[0].date}</span><span>{points[points.length - 1].date}</span></div>
  </div>
}

export default function PriceInsightsPage() {
  const [query, setQuery] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [buyPrice, setBuyPrice] = useState(0), [salePrice, setSalePrice] = useState(0)
  const [shipping, setShipping] = useState(0), [otherCosts, setOtherCosts] = useState(0), [fees, setFees] = useState(10)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [inventoryReady, setInventoryReady] = useState(false)
  const [itemName, setItemName] = useState(''), [itemBuy, setItemBuy] = useState(0), [itemSale, setItemSale] = useState(0), [itemCosts, setItemCosts] = useState(0)

  const load = async (nextQuery = query, nextCurrency = currency) => {
    setLoading(true); setError('')
    try {
      const response = await apiFetch(`/api/price-insights?q=${encodeURIComponent(nextQuery)}&currency=${encodeURIComponent(nextCurrency)}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Preis-Daten konnten nicht geladen werden.')
      setData(result)
      if (result.currency !== currency) setCurrency(result.currency)
      if (result.stats && !salePrice) setSalePrice(result.stats.median)
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unbekannter Fehler') }
    finally { setLoading(false) }
  }

  useEffect(() => { load('', 'EUR') }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!data?.viewerId) return
    try { setInventory(JSON.parse(localStorage.getItem(`ts_inventory_${data.viewerId}`) || '[]')) } catch { setInventory([]) }
    setInventoryReady(true)
  }, [data?.viewerId])
  useEffect(() => {
    if (inventoryReady && data?.viewerId) localStorage.setItem(`ts_inventory_${data.viewerId}`, JSON.stringify(inventory))
  }, [inventory, inventoryReady, data?.viewerId])

  const calculator = useMemo(() => {
    const feeAmount = salePrice * Math.max(fees, 0) / 100, totalCost = buyPrice + shipping + otherCosts + feeAmount, profit = salePrice - totalCost
    return { totalCost, profit, roi: buyPrice > 0 ? profit / buyPrice * 100 : 0 }
  }, [buyPrice, salePrice, shipping, otherCosts, fees])
  const manualScore = data?.stats && buyPrice > 0 ? Math.max(1, Math.min(99, Math.round(50 + ((data.stats.median - buyPrice) / data.stats.median * 100) * 1.35))) : null
  const inventoryStats = useMemo(() => ({
    invested: inventory.filter(item => item.status !== 'sold').reduce((sum, item) => sum + item.buyPrice + item.costs, 0),
    projected: inventory.filter(item => item.status !== 'sold').reduce((sum, item) => sum + item.salePrice - item.buyPrice - item.costs, 0),
    realized: inventory.filter(item => item.status === 'sold').reduce((sum, item) => sum + item.salePrice - item.buyPrice - item.costs, 0),
  }), [inventory])

  const addInventory = (event: FormEvent) => {
    event.preventDefault(); if (!itemName.trim() || itemBuy < 0 || itemSale <= 0) return
    setInventory(current => [{ id: crypto.randomUUID(), name: itemName.trim(), buyPrice: itemBuy, salePrice: itemSale, costs: itemCosts, status: 'owned', createdAt: new Date().toISOString() }, ...current])
    setItemName(''); setItemBuy(0); setItemSale(0); setItemCosts(0)
  }

  const metricCards = data?.stats ? [
    ['Niedrigster Preis', money(data.stats.lowest, data.currency), 'Bester gefundener Preis'],
    ['Durchschnitt', money(data.stats.average, data.currency), `${data.stats.count} passende Angebote`],
    ['Median', money(data.stats.median, data.currency), 'Robuster Marktpreis'],
    ['Höchster Preis', money(data.stats.highest, data.currency), 'Oberes Marktende'],
  ] : [
    ['Gespeicherte Angebote', String(data?.overview.totalTracked ?? '—'), 'Bleiben dauerhaft erhalten'],
    ['Plattformen', String(data?.overview.platforms ?? '—'), 'Internationale Quellen'],
    [`Preise in ${data?.currency || currency}`, String(data?.overview.pricedInCurrency ?? '—'), 'Für Analysen verfügbar'],
    ['Währungen', String(data?.overview.currencies ?? '—'), 'Getrennt ausgewertet'],
  ]

  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><Navigation /><main className="page insights-page">
    <section className="insights-hero"><div><div className="eyebrow">Live market intelligence</div><h1>Price Insights</h1><p>Echte Preisdaten aus deinem Scanner – analysiert ohne kostenpflichtige KI-API.</p></div><div className="live-chip"><span className="live-dot" /> Kostenlos aktiv</div></section>
    <form className="insights-search" onSubmit={event => { event.preventDefault(); load() }}><span className="search-icon">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Produkt suchen, z. B. PlayStation 5, iPhone 15 …" /><select value={currency} onChange={event => { setCurrency(event.target.value); load(query, event.target.value) }} aria-label="Währung">{(data?.availableCurrencies.length ? data.availableCurrencies : ['EUR']).map(value => <option key={value}>{value}</option>)}</select><button className="btn-primary" disabled={loading}>{loading ? 'Analysiere …' : 'Analysieren'}</button></form>
    <div className="search-suggestions"><span>Schnellsuche:</span>{['PlayStation 5', 'iPhone', 'Nintendo Switch'].map(value => <button key={value} onClick={() => { setQuery(value); load(value, currency) }}>{value}</button>)}</div>
    {error && <div className="error-box">{error}</div>}
    <section className="metric-grid">{metricCards.map(([label, value, meta]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>{meta}</small></article>)}</section>

    <section className="content-grid"><article className="panel chart-panel"><div className="panel-head"><div><span className="section-kicker">Preisentwicklung</span><h2>{data?.query || 'Marktverlauf'}</h2></div><span className="free-badge">LIVE</span></div>{data?.stats ? <PriceChart points={data.history} currency={data.currency} /> : <div className="empty-state">Suche nach einem Produkt, um dessen Preisverlauf zu sehen.</div>}</article>
      <article className="panel calculator-panel"><div className="panel-head"><div><span className="section-kicker">Reselling Rechner</span><h2>Gewinn & Deal-Score</h2></div>{manualScore && <span className={`score score-${manualScore >= 60 ? 'good' : 'weak'}`}>{manualScore}/99</span>}</div><div className="calc-grid">
        <label>Einkaufspreis<input type="number" min="0" step="0.01" value={buyPrice || ''} onChange={e => setBuyPrice(Number(e.target.value))} /></label><label>Verkaufspreis<input type="number" min="0" step="0.01" value={salePrice || ''} onChange={e => setSalePrice(Number(e.target.value))} /></label><label>Versand<input type="number" min="0" step="0.01" value={shipping || ''} onChange={e => setShipping(Number(e.target.value))} /></label><label>Sonstige Kosten<input type="number" min="0" step="0.01" value={otherCosts || ''} onChange={e => setOtherCosts(Number(e.target.value))} /></label><label>Gebühren %<input type="number" min="0" max="100" step="0.1" value={fees} onChange={e => setFees(Number(e.target.value))} /></label>
      </div><div className="calc-result"><div><span>Netto-Gewinn</span><strong className={calculator.profit >= 0 ? 'positive' : 'negative'}>{money(calculator.profit, data?.currency || currency)}</strong></div><div><span>ROI</span><strong>{calculator.roi.toFixed(1)}%</strong></div><div><span>Gesamtkosten</span><strong>{money(calculator.totalCost, data?.currency || currency)}</strong></div></div></article></section>

    <section className="panel section-panel"><div className="panel-head"><div><span className="section-kicker">Opportunity Finder</span><h2>Aktuelle Chancen</h2><p>Lokale Produkt-Gruppierung findet große Preisabstände – ganz ohne bezahlte KI.</p></div><span className="free-badge">FREE</span></div><div className="opportunity-grid">{data?.opportunities.map(item => <a className="opportunity-card" href={item.url || '#'} target="_blank" rel="noreferrer" key={item.key}><div className="opportunity-image">{item.image ? <img src={item.image} alt="" /> : <span>◎</span>}</div><div className="opportunity-copy"><span>{item.platform} · {item.samples} Vergleiche</span><strong>{item.title}</strong><small>Ab {money(item.lowest, item.currency)} · Median {money(item.median, item.currency)}</small></div><div className="margin-pill">+{money(item.potentialProfit, item.currency)}<small>{item.spreadPercent}% Abstand</small></div></a>)}{!loading && !data?.opportunities.length && <div className="empty-state">Noch nicht genug ähnliche Angebote für einen sicheren Vergleich.</div>}</div></section>

    {data?.deals.length ? <section className="panel section-panel"><div className="panel-head"><div><span className="section-kicker">Deal Score</span><h2>Beste Treffer für „{data.query}“</h2></div></div><div className="deal-grid">{data.deals.slice(0, 8).map(deal => <a className="deal-card" href={deal.url || '#'} target="_blank" rel="noreferrer" key={deal.id}><div className="deal-image">{deal.image ? <img src={deal.image} alt="" /> : <span>◎</span>}<b>{deal.score}</b></div><span>{deal.platform}</span><strong>{deal.title}</strong><div><b>{money(deal.price, deal.currency)}</b><small className={deal.savingsPercent > 0 ? 'positive' : 'negative'}>{deal.savingsPercent > 0 ? `${deal.savingsPercent}% unter Median` : deal.rating}</small></div></a>)}</div></section> : null}

    <section className="panel section-panel"><div className="panel-head"><div><span className="section-kicker">Business Toolkit</span><h2>Mein Inventar</h2><p>Kostenlos und privat auf diesem Gerät gespeichert. Keine Cloud-Kosten.</p></div><span className="free-badge">LOCAL</span></div><div className="inventory-metrics"><div><span>Aktiv investiert</span><strong>{money(inventoryStats.invested, currency)}</strong></div><div><span>Erwarteter Gewinn</span><strong>{money(inventoryStats.projected, currency)}</strong></div><div><span>Realisierter Gewinn</span><strong>{money(inventoryStats.realized, currency)}</strong></div></div>
      <form className="inventory-form" onSubmit={addInventory}><input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Produktname" required /><input type="number" min="0" step="0.01" value={itemBuy || ''} onChange={e => setItemBuy(Number(e.target.value))} placeholder="Einkauf" required /><input type="number" min="0" step="0.01" value={itemSale || ''} onChange={e => setItemSale(Number(e.target.value))} placeholder="Verkauf" required /><input type="number" min="0" step="0.01" value={itemCosts || ''} onChange={e => setItemCosts(Number(e.target.value))} placeholder="Kosten" /><button className="btn-primary">Hinzufügen</button></form>
      <div className="inventory-list">{inventory.map(item => <div className="inventory-row" key={item.id}><div><strong>{item.name}</strong><span>Einkauf {money(item.buyPrice, currency)} · Ziel {money(item.salePrice, currency)}</span></div><b className={item.salePrice - item.buyPrice - item.costs >= 0 ? 'positive' : 'negative'}>{money(item.salePrice - item.buyPrice - item.costs, currency)}</b><select value={item.status} onChange={e => setInventory(current => current.map(value => value.id === item.id ? { ...value, status: e.target.value as InventoryItem['status'] } : value))}><option value="owned">Gekauft</option><option value="listed">Inseriert</option><option value="sold">Verkauft</option></select><button aria-label="Entfernen" onClick={() => setInventory(current => current.filter(value => value.id !== item.id))}>×</button></div>)}{!inventory.length && <div className="empty-state">Noch kein Bestand eingetragen.</div>}</div>
    </section>

    <section className="roadmap"><div className="roadmap-head"><div><span className="section-kicker">Roadmap</span><h2>Kommt später</h2><p>Diese Funktionen brauchen externe Dienste, bezahlte APIs oder sichere Marketplace-Freigaben.</p></div></div><div className="roadmap-grid">{[['Smart Alerts','Telegram, Discord, WhatsApp und Push-Benachrichtigungen.'],['Auto Crosslisting','Angebote automatisch einstellen und nach Verkauf entfernen.'],['Foto- & Barcode-KI','Produkt nur über Bild oder Barcode erkennen.'],['Cloud Inventory','Geräteübergreifender Bestand, Teams und Buchhaltungsexporte.']].map(([title, description]) => <article key={title}><span>COMING SOON</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
  </main><style jsx>{`
    .insights-page{display:grid;gap:18px}.insights-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:8px 0 5px}.insights-hero h1{margin:0;font-size:clamp(36px,5vw,58px);line-height:.95;letter-spacing:-.055em}.insights-hero p{margin:13px 0 0;color:var(--text2);font-size:15px}.live-chip,.free-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #d9edbf;border-radius:999px;background:#f2fae8;color:#4c7b1f;font-size:10px;font-weight:800;letter-spacing:.06em;white-space:nowrap}.free-badge{padding:5px 8px}.insights-search{display:grid;grid-template-columns:auto 1fr 94px auto;align-items:center;gap:8px;padding:9px;background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-card)}.insights-search input,.insights-search select{border:0;box-shadow:none;background:transparent}.insights-search select{border-left:1px solid var(--border);border-radius:0}.search-icon{padding-left:10px;color:var(--text3);font-size:24px;transform:rotate(-15deg)}.search-suggestions{display:flex;align-items:center;gap:7px;margin-top:-9px;color:var(--text3);font-size:11px}.search-suggestions button{padding:5px 9px;border:1px solid var(--border);border-radius:999px;background:#fff;color:var(--text2);cursor:pointer;font:inherit}.error-box{padding:12px 14px;border:1px solid #fecaca;border-radius:9px;background:#fff1f2;color:#b91c1c;font-size:13px}
    .metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric-card{display:flex;flex-direction:column;padding:19px;border:1px solid var(--border);border-radius:12px;background:#fff;box-shadow:var(--shadow-card)}.metric-card span,.section-kicker{color:var(--text3);font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.metric-card strong{margin-top:13px;color:var(--text);font-size:27px;line-height:1;letter-spacing:-.04em}.metric-card small{margin-top:7px;color:var(--text3);font-size:11px}.content-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(330px,.65fr);gap:14px}.panel{padding:22px;border:1px solid var(--border);border-radius:13px;background:#fff;box-shadow:var(--shadow-card)}.panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}.panel-head h2,.roadmap h2{margin:5px 0 0;font-size:20px;letter-spacing:-.03em}.panel-head p,.roadmap-head p{margin:6px 0 0;color:var(--text3);font-size:12px}.chart-wrap{position:relative;margin-top:18px;padding:7px 0 0;overflow:hidden}.chart-wrap svg{width:100%;min-width:440px;display:block}.chart-label{position:absolute;left:28px;z-index:1;padding:2px 5px;border-radius:4px;background:rgba(255,255,255,.88);color:var(--text3);font-size:9px}.chart-label.top{top:7px}.chart-label.bottom{bottom:23px}.chart-dates{display:flex;justify-content:space-between;color:var(--text3);font-size:9px}.empty-state{width:100%;padding:42px 16px;color:var(--text3);text-align:center;font-size:12px;border:1px dashed var(--border2);border-radius:9px}.score{padding:7px 9px;border-radius:8px;font-size:12px;font-weight:800}.score-good{color:#15803d;background:#ecfdf5}.score-weak{color:#b45309;background:#fffbeb}.calc-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:18px}.calc-grid label{color:var(--text3);font-size:10px;font-weight:700;text-transform:uppercase}.calc-grid input{margin-top:5px;padding:9px 10px}.calc-result{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.calc-result div{padding:12px;border-radius:9px;background:var(--surface)}.calc-result div:first-child{grid-column:1/-1}.calc-result span{display:block;color:var(--text3);font-size:10px}.calc-result strong{display:block;margin-top:4px;font-size:18px}.positive{color:#16833d!important}.negative{color:#c2410c!important}
    .section-panel{display:grid;gap:18px}.opportunity-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.opportunity-card{display:grid;grid-template-columns:54px 1fr auto;align-items:center;gap:11px;padding:9px;border:1px solid var(--border);border-radius:10px;transition:.15s}.opportunity-card:hover,.deal-card:hover{border-color:#c4a9f7;transform:translateY(-1px)}.opportunity-image,.deal-image{overflow:hidden;background:var(--surface);border-radius:8px}.opportunity-image{width:54px;height:54px;display:grid;place-items:center}.opportunity-image img,.deal-image img{width:100%;height:100%;object-fit:cover}.opportunity-copy{min-width:0}.opportunity-copy span,.deal-card>span{color:var(--text3);font-size:9px;text-transform:uppercase;font-weight:700}.opportunity-copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.opportunity-copy small{color:var(--text3);font-size:10px}.margin-pill{color:#16833d;font-size:12px;font-weight:800;text-align:right}.margin-pill small{display:block;color:var(--text3);font-size:8px;font-weight:600}.deal-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.deal-card{display:flex;min-width:0;flex-direction:column;gap:6px;padding:10px;border:1px solid var(--border);border-radius:10px;transition:.15s}.deal-image{position:relative;width:100%;aspect-ratio:1.55;display:grid;place-items:center}.deal-image b{position:absolute;top:6px;right:6px;padding:4px 7px;border-radius:7px;background:#111;color:#9bea46;font-size:11px}.deal-card>strong{min-height:34px;overflow:hidden;font-size:12px;line-height:1.35}.deal-card>div:last-child{display:flex;justify-content:space-between;gap:5px;align-items:end}.deal-card small{font-size:9px;text-align:right}
    .inventory-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.inventory-metrics div{padding:14px;border-radius:9px;background:var(--surface)}.inventory-metrics span{display:block;color:var(--text3);font-size:10px}.inventory-metrics strong{display:block;margin-top:5px;font-size:18px}.inventory-form{display:grid;grid-template-columns:2fr repeat(3,1fr) auto;gap:8px}.inventory-form input{padding:9px 10px}.inventory-list{display:grid;gap:7px}.inventory-row{display:grid;grid-template-columns:1fr auto 105px 30px;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:9px}.inventory-row div strong,.inventory-row div span{display:block}.inventory-row div strong{font-size:12px}.inventory-row div span{color:var(--text3);font-size:10px}.inventory-row select{padding:7px;font-size:11px}.inventory-row>button{border:0;background:transparent;color:var(--text3);font-size:20px;cursor:pointer}.roadmap{padding:25px;border-radius:13px;background:#151616;color:#fff}.roadmap h2{color:#fff}.roadmap-head p{color:#85888d}.roadmap-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:19px}.roadmap-grid article{padding:16px;border:1px solid #2b2c2c;border-radius:10px;background:#1b1c1c}.roadmap-grid span{color:#a98af4;font-size:8px;font-weight:800;letter-spacing:.1em}.roadmap-grid h3{margin:9px 0 4px;font-size:14px}.roadmap-grid p{margin:0;color:#8d9093;font-size:11px;line-height:1.5}
    @media(max-width:1100px){.metric-grid,.deal-grid,.roadmap-grid{grid-template-columns:repeat(2,1fr)}.content-grid{grid-template-columns:1fr}.inventory-form{grid-template-columns:repeat(2,1fr)}.inventory-form button{grid-column:1/-1}.opportunity-grid{grid-template-columns:1fr}}@media(max-width:650px){.insights-hero{display:block}.live-chip{margin-top:16px}.insights-search{grid-template-columns:auto 1fr}.insights-search select{border:1px solid var(--border);border-radius:7px}.insights-search button{width:100%}.search-suggestions{overflow:auto}.metric-grid,.deal-grid,.roadmap-grid,.inventory-metrics{grid-template-columns:1fr 1fr}.panel{padding:16px}.inventory-row{grid-template-columns:1fr auto}.inventory-row select{grid-column:1/2}.inventory-form{grid-template-columns:1fr}.inventory-form button{grid-column:auto}.opportunity-card{grid-template-columns:48px 1fr}.margin-pill{grid-column:2}.chart-wrap{overflow:auto}}
  `}</style></div>
}
