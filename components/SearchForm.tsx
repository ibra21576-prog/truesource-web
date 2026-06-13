'use client'
import { useState } from 'react'

const VINTED_DOMAINS = ['www.vinted.de','www.vinted.at','www.vinted.com','www.vinted.fr','www.vinted.nl','www.vinted.es','www.vinted.it','www.vinted.pl','www.vinted.co.uk']

const PLATFORMS = [
  { value: 'vinted',        label: 'Vinted',        color: '#2dd4bf', active: 'rgba(20,184,166,0.12)', activeBorder: 'rgba(20,184,166,0.3)', icon: '🟢' },
  { value: 'ebay',          label: 'eBay',           color: '#fbbf24', active: 'rgba(234,179,8,0.1)',   activeBorder: 'rgba(234,179,8,0.3)',   icon: '🟡' },
  { value: 'kleinanzeigen', label: 'Kleinanzeigen',  color: '#fb923c', active: 'rgba(249,115,22,0.1)',  activeBorder: 'rgba(249,115,22,0.3)',  icon: '🟠' },
]

export default function SearchForm({ onCreated }: { onCreated: () => void }) {
  const [query,    setQuery]    = useState('')
  const [platform, setPlatform] = useState('vinted')
  const [domain,   setDomain]   = useState('www.vinted.de')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  function handlePlatformChange(p: string) {
    setPlatform(p)
    if (p === 'vinted') setDomain('www.vinted.de')
    else if (p === 'ebay') setDomain('www.ebay.de')
    else setDomain('www.kleinanzeigen.de')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), platform, domain, min_price: minPrice || null, max_price: maxPrice || null }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Fehler') }
      setQuery(''); setMinPrice(''); setMaxPrice('')
      onCreated()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const activePlatform = PLATFORMS.find(p => p.value === platform)!

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 20,
      padding: 24,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 32px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,240,197,0.08)', border: '1px solid rgba(59,240,197,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3bf0c5" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: '#f0f6ff', margin: 0 }}>Neue Suche</h2>
          <p style={{ fontSize: 11, color: '#3a5470', marginTop: 2 }}>Monitor erstellen</p>
        </div>
      </div>

      {/* Search input */}
      <div>
        <label className="form-label">Suchbegriff</label>
        <div style={{ position: 'relative' }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="z.B. Nike Air Jordan, PS5 Controller…"
            required style={{ paddingLeft: 40 }} />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2e4460" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* Platform selector */}
      <div>
        <label className="form-label">Plattform</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {PLATFORMS.map(opt => (
            <button key={opt.value} type="button" onClick={() => handlePlatformChange(opt.value)}
              style={{
                padding: '10px 8px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s', border: `1px solid`, fontFamily: 'Inter, sans-serif',
                ...(platform === opt.value ? {
                  background: opt.active, borderColor: opt.activeBorder, color: opt.color,
                  boxShadow: `0 0 12px ${opt.color}18`,
                } : {
                  background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)', color: '#4a6a88',
                }),
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Domain */}
      <div>
        <label className="form-label">Domain</label>
        {platform === 'vinted' ? (
          <select value={domain} onChange={e => setDomain(e.target.value)}>
            {VINTED_DOMAINS.map(d => <option key={d} value={d}>{d.replace('www.', '')}</option>)}
          </select>
        ) : (
          <input value={domain} readOnly />
        )}
      </div>

      {/* Price range */}
      <div>
        <label className="form-label">Preisbereich <span style={{ color: '#2e4460', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min." min="0" style={{ paddingRight: 30 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#2e4460', fontSize: 13, pointerEvents: 'none', fontWeight: 600 }}>€</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max." min="0" style={{ paddingRight: 30 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#2e4460', fontSize: 13, pointerEvents: 'none', fontWeight: 600 }}>€</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ borderRadius: 12, padding: '12px 14px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
        {loading ? (
          <><span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTop: '2px solid #06080f', borderRadius: '50%', display: 'inline-block' }} />Wird erstellt…</>
        ) : (
          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Suche hinzufügen</>
        )}
      </button>
    </form>
  )
}
