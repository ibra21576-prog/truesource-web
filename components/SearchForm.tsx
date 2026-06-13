'use client'
import { useState } from 'react'

const VINTED_DOMAINS = [
  'www.vinted.de','www.vinted.at','www.vinted.com','www.vinted.fr',
  'www.vinted.nl','www.vinted.es','www.vinted.it','www.vinted.pl','www.vinted.co.uk',
]

const PLATFORMS = [
  { value: 'vinted',        label: 'Vinted',       color: '#3df5c8', bg: 'rgba(61,245,200,0.1)',  border: 'rgba(61,245,200,0.25)' },
  { value: 'ebay',          label: 'eBay',          color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  { value: 'kleinanzeigen', label: 'Kleinanzeigen', color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.25)' },
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
      if (!res.ok) throw new Error((await res.json()).error || 'Fehler')
      setQuery(''); setMinPrice(''); setMaxPrice('')
      onCreated()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const activePlatform = PLATFORMS.find(p => p.value === platform)!

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Neue Suche erstellen</h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Listing-Monitor für eine Plattform einrichten</p>
      </div>

      {/* Search term */}
      <div>
        <label className="label">Suchbegriff</label>
        <div style={{ position: 'relative' }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="z.B. Nike Air Jordan, PS5 Controller…"
            required style={{ paddingLeft: 38 }} />
          <svg width="14" height="14" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* Platform */}
      <div>
        <label className="label">Plattform</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {PLATFORMS.map(opt => (
            <button key={opt.value} type="button" onClick={() => handlePlatformChange(opt.value)}
              style={{
                padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                ...(platform === opt.value
                  ? { background: opt.bg, border: `1.5px solid ${opt.border}`, color: opt.color }
                  : { background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text3)' }
                ),
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Domain */}
      <div>
        <label className="label">Domain</label>
        {platform === 'vinted'
          ? <select value={domain} onChange={e => setDomain(e.target.value)}>
              {VINTED_DOMAINS.map(d => <option key={d} value={d}>{d.replace('www.','')}</option>)}
            </select>
          : <input value={domain} readOnly />
        }
      </div>

      {/* Price */}
      <div>
        <label className="label">Preis <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(optional)</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min €" min="0" style={{ paddingRight: 28 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 12, pointerEvents: 'none' }}>€</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max €" min="0" style={{ paddingRight: 28 }} />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 12, pointerEvents: 'none' }}>€</span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
        {loading
          ? <><span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid var(--bg)', display: 'inline-block' }} />Wird erstellt…</>
          : <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Suche hinzufügen</>
        }
      </button>
    </form>
  )
}
