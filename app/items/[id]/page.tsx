'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { apiFetch } from '@/lib/api-client'

function priceNumber(value?: string) {
  const match = (value || '').replace(/\s/g, '').match(/[0-9]+(?:[.,][0-9]{1,2})?/)
  return match ? Number(match[0].replace(',', '.')) : 0
}
function money(value: number | null) { return value == null ? '—' : new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR' }).format(value) }

export default function ItemDetailsPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  useEffect(() => { apiFetch(`/api/items/${params.id}`).then(async response => { if (response.ok) { const value = await response.json(); setData(value); setSaved(Boolean(value.deal)) } }).finally(() => setLoading(false)) }, [params.id])
  const current = priceNumber(data?.item?.price)
  const difference = data?.median ? data.median - current : null
  const history = data?.history || []
  const changed = history.length > 1
  const min = useMemo(() => history.length ? Math.min(...history.map((row: any) => Number(row.price_amount || 0)).filter(Boolean)) : current, [history, current])

  async function save() {
    const response = await apiFetch('/api/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: params.id, status: 'watching' }) })
    if (response.ok) setSaved(true)
  }

  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><Navigation /><main className="page">
    {loading ? <p style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>Analysing listing…</p> : !data ? <p>Listing not found.</p> : <>
      <a href="/dashboard" style={{ color: 'var(--text3)', fontSize: 13 }}>← Back to Live Feed</a>
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,.8fr) minmax(360px,1.2fr)', gap: 22, marginTop: 18 }}>
        <div className="glass-panel" style={{ overflow: 'hidden', minHeight: 360, display: 'grid', placeItems: 'center', background: 'var(--surface)' }}>{data.item.image ? <img src={`/api/img?url=${encodeURIComponent(data.item.image)}`} alt="" style={{ width: '100%', height: '100%', maxHeight: 520, objectFit: 'contain' }} /> : <span style={{ color: 'var(--text3)' }}>No image available</span>}</div>
        <div><div className="eyebrow">Deal analysis · {data.item.platform}</div><h1 style={{ fontSize: 34, lineHeight: 1.15, letterSpacing: '-.04em', margin: '8px 0 16px' }}>{data.item.title}</h1><strong style={{ fontSize: 32 }}>{data.item.price}</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}><button className="btn-primary" onClick={save} disabled={saved}>{saved ? 'Saved to Deal Board' : '☆ Save deal'}</button><a href={data.item.url} target="_blank" rel="noreferrer" className="btn-secondary">Open marketplace ↗</a></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginTop: 24 }}>
            <div className="glass-panel" style={{ padding: 14 }}><span className="label">Market median</span><strong style={{ display: 'block', fontSize: 20 }}>{money(data.median)}</strong></div>
            <div className="glass-panel" style={{ padding: 14 }}><span className="label">Potential spread</span><strong style={{ display: 'block', fontSize: 20, color: (difference || 0) > 0 ? 'var(--success)' : 'var(--text)' }}>{money(difference)}</strong></div>
            <div className="glass-panel" style={{ padding: 14 }}><span className="label">Lowest recorded</span><strong style={{ display: 'block', fontSize: 20 }}>{money(min || null)}</strong></div>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, marginTop: 18 }}>{data.similar.length ? `Compared with ${data.similar.length} related listings from your monitored marketplaces.` : 'More market samples are needed before TrueSource can calculate a reliable comparison.'}</p>
        </div>
      </section>

      <section className="glass-panel" style={{ padding: 22, marginTop: 20 }}><div className="section-label">Price timeline</div><h2 style={{ margin: '5px 0 16px' }}>{changed ? `${history.length} recorded price points` : 'Current price recorded'}</h2><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{history.length ? history.map((event: any) => <div key={event.id} style={{ padding: '10px 13px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}><strong>{event.price_text || money(Number(event.price_amount))}</strong><small style={{ display: 'block', color: 'var(--text3)', marginTop: 3 }}>{new Date(event.recorded_at).toLocaleString()}</small></div>) : <p style={{ color: 'var(--text3)' }}>The next scan will start this listing’s price history.</p>}</div></section>

      <section className="glass-panel" style={{ padding: 22, marginTop: 20 }}><div className="section-label">Market comparison</div><h2 style={{ margin: '5px 0 16px' }}>Related listings</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 9 }}>{data.similar.map((item: any) => <a key={item.id} href={`/items/${item.id}`} style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)' }}><div style={{ width: 48, height: 48, borderRadius: 7, overflow: 'hidden', background: 'var(--card)', flexShrink: 0 }}>{item.image && <img src={`/api/img?url=${encodeURIComponent(item.image)}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div><div style={{ minWidth: 0 }}><strong>{item.price}</strong><p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p><small style={{ color: 'var(--text3)' }}>{item.platform}</small></div></a>)}</div></section>
    </>}
    <style>{`@media(max-width:800px){main.page>section:first-of-type{grid-template-columns:1fr!important}}`}</style>
  </main></div>
}
