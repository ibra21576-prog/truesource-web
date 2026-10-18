'use client'
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Navigation from '@/components/Navigation'
import { apiFetch } from '@/lib/api-client'

type DealStatus = 'watching' | 'bought' | 'sold' | 'ignored'
type Deal = {
  item_id: string; status: DealStatus; purchase_price: number | null; shipping_cost: number | null
  fees: number | null; sale_price: number | null; notes: string; updated_at: string
  item: { id: string; title: string; price: string; platform: string; image: string | null; url: string; found_at: string; searches?: { query: string } }
}

const TABS: { value: DealStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'watching', label: 'Watching' },
  { value: 'bought', label: 'Bought' }, { value: 'sold', label: 'Sold' }, { value: 'ignored', label: 'Ignored' },
]

function numericPrice(value?: string | null) {
  if (!value) return 0
  const match = value.replace(/\s/g, '').match(/[0-9]+(?:[.,][0-9]{1,2})?/)
  return match ? Number(match[0].replace(',', '.')) : 0
}

function money(value: number) { return new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR' }).format(value || 0) }

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [tab, setTab] = useState<DealStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')

  const load = useCallback(async () => {
    const response = await apiFetch('/api/deals')
    if (response.ok) setDeals(await response.json())
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function update(deal: Deal, fields: Partial<Deal>) {
    setSaving(deal.item_id)
    const response = await apiFetch(`/api/deals/${deal.item_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
    if (response.ok) await load()
    setSaving('')
  }

  async function remove(itemId: string) {
    await apiFetch(`/api/deals/${itemId}`, { method: 'DELETE' })
    setDeals(current => current.filter(deal => deal.item_id !== itemId))
  }

  const visible = deals.filter(deal => tab === 'all' || deal.status === tab)
  const totals = useMemo(() => deals.reduce((sum, deal) => {
    const buy = Number(deal.purchase_price || 0), shipping = Number(deal.shipping_cost || 0), fees = Number(deal.fees || 0), sale = Number(deal.sale_price || 0)
    if (deal.status === 'bought') sum.invested += buy + shipping + fees
    if (deal.status === 'sold') sum.profit += sale - buy - shipping - fees
    return sum
  }, { invested: 0, profit: 0 }), [deals])

  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><Navigation /><main className="page">
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 30 }}>
      <div><div className="eyebrow">Reseller workflow</div><h1 style={{ fontSize: 40, margin: 0, letterSpacing: '-.045em' }}>Deal Board</h1><p style={{ color: 'var(--text2)', marginTop: 9 }}>Save opportunities, track purchases and see your real profit.</p></div>
      <div style={{ display: 'flex', gap: 9 }}>
        <div className="glass-panel" style={{ padding: '11px 15px' }}><small style={{ color: 'var(--text3)' }}>ACTIVE INVESTMENT</small><strong style={{ display: 'block', marginTop: 3 }}>{money(totals.invested)}</strong></div>
        <div className="glass-panel" style={{ padding: '11px 15px' }}><small style={{ color: 'var(--text3)' }}>REALISED PROFIT</small><strong style={{ display: 'block', marginTop: 3, color: totals.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{money(totals.profit)}</strong></div>
      </div>
    </header>

    <div className="glass-panel" style={{ display: 'flex', gap: 5, padding: 7, marginBottom: 18, overflowX: 'auto' }}>
      {TABS.map(item => <button key={item.value} onClick={() => setTab(item.value)} className={tab === item.value ? 'btn-primary' : 'btn-ghost'} style={{ whiteSpace: 'nowrap' }}>{item.label}<span style={{ marginLeft: 6, opacity: .65 }}>{item.value === 'all' ? deals.length : deals.filter(deal => deal.status === item.value).length}</span></button>)}
    </div>

    {loading ? <p style={{ color: 'var(--text3)', padding: 50, textAlign: 'center' }}>Loading your deals…</p> : visible.length === 0 ? <section className="glass-panel" style={{ padding: 56, textAlign: 'center' }}><h2 style={{ margin: 0 }}>No deals here yet</h2><p style={{ color: 'var(--text2)' }}>Open the Live Feed and use the star button to save an opportunity.</p></section> : <div style={{ display: 'grid', gap: 12 }}>
      {visible.map(deal => {
        const livePrice = numericPrice(deal.item.price)
        const buy = Number(deal.purchase_price ?? livePrice), shipping = Number(deal.shipping_cost || 0), fees = Number(deal.fees || 0), sale = Number(deal.sale_price || 0)
        const profit = sale - buy - shipping - fees
        return <article key={deal.item_id} className="glass-panel" style={{ padding: 15, display: 'grid', gridTemplateColumns: '86px minmax(180px,1fr) minmax(300px,1.25fr)', gap: 16, alignItems: 'center' }}>
          <a href={`/items/${deal.item_id}`} style={{ width: 86, height: 86, borderRadius: 10, overflow: 'hidden', background: 'var(--surface)', display: 'grid', placeItems: 'center' }}>{deal.item.image ? <img src={`/api/img?url=${encodeURIComponent(deal.item.image)}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'var(--text3)' }}>No image</span>}</a>
          <div style={{ minWidth: 0 }}><span className={`badge badge-${deal.item.platform}`}>{deal.item.platform}</span><h2 style={{ fontSize: 15, margin: '8px 0 5px', lineHeight: 1.4 }}>{deal.item.title}</h2><strong style={{ fontSize: 19 }}>{deal.item.price || '—'}</strong><div style={{ marginTop: 10, display: 'flex', gap: 7 }}><a className="btn-secondary" href={`/items/${deal.item_id}`} style={{ fontSize: 12 }}>Details</a><a className="btn-ghost" href={deal.item.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Marketplace ↗</a></div></div>
          <div style={{ display: 'grid', gap: 8 }}>
            <select value={deal.status} onChange={event => update(deal, { status: event.target.value as DealStatus })}><option value="watching">Watching</option><option value="bought">Bought</option><option value="sold">Sold</option><option value="ignored">Ignored</option></select>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {[['Purchase', 'purchase_price', buy], ['Shipping', 'shipping_cost', shipping], ['Fees', 'fees', fees], ['Sale', 'sale_price', sale]].map(([label, key, value]) => <label key={String(key)}><span className="label">{label}</span><input type="number" defaultValue={Number(value) || ''} onBlur={event => update(deal, { [String(key)]: event.target.value } as any)} /></label>)}
            </div>
            <textarea defaultValue={deal.notes || ''} placeholder="Private notes…" rows={2} onBlur={event => update(deal, { notes: event.target.value })} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, color: 'var(--text3)' }}>{saving === deal.item_id ? 'Saving…' : deal.status === 'sold' ? `Profit ${money(profit)}` : 'Saved privately to your account'}</span><button className="btn-ghost" onClick={() => remove(deal.item_id)} style={{ color: 'var(--danger)', fontSize: 12 }}>Remove</button></div>
          </div>
        </article>
      })}
    </div>}
    <style>{`@media(max-width:900px){article.glass-panel{grid-template-columns:72px 1fr!important}article.glass-panel>div:last-child{grid-column:1/-1}}@media(max-width:600px){article.glass-panel>div:last-child>div:nth-child(2){grid-template-columns:1fr 1fr!important}}`}</style>
  </main></div>
}
