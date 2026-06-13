'use client'
import { useState } from 'react'

const VINTED_DOMAINS = [
  'www.vinted.de','www.vinted.at','www.vinted.com','www.vinted.fr',
  'www.vinted.nl','www.vinted.es','www.vinted.it','www.vinted.pl','www.vinted.co.uk',
]

interface Props { onCreated: () => void }

export default function SearchForm({ onCreated }: Props) {
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

  const platformOptions = [
    { value: 'vinted',        label: 'Vinted',        color: '#2dd4bf' },
    { value: 'ebay',          label: 'eBay',           color: '#fbbf24' },
    { value: 'kleinanzeigen', label: 'Kleinanzeigen',  color: '#fb923c' },
  ]

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-1">
        <div style={{ background: 'rgba(59,240,197,0.1)', border: '1px solid rgba(59,240,197,0.2)' }}
          className="w-8 h-8 rounded-lg flex items-center justify-center">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3bf0c5" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-white text-sm">Neue Suche</h2>
          <p className="text-xs" style={{ color: '#4a6a88' }}>Listing-Monitor erstellen</p>
        </div>
      </div>

      {/* Search query */}
      <div>
        <label className="form-label">Suchbegriff</label>
        <div className="relative">
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="z.B. Nintendo Switch, Adidas Samba…" required
            style={{ paddingLeft: 40 }} />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3a5470" strokeWidth="2"
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* Platform picker */}
      <div>
        <label className="form-label">Plattform</label>
        <div className="grid grid-cols-3 gap-2">
          {platformOptions.map(opt => (
            <button key={opt.value} type="button" onClick={() => handlePlatformChange(opt.value)}
              className="rounded-xl py-2.5 px-3 text-sm font-medium transition-all"
              style={platform === opt.value ? {
                background: `rgba(${opt.value === 'vinted' ? '45,212,191' : opt.value === 'ebay' ? '251,191,36' : '251,146,60'},0.12)`,
                border: `1px solid rgba(${opt.value === 'vinted' ? '45,212,191' : opt.value === 'ebay' ? '251,191,36' : '251,146,60'},0.3)`,
                color: opt.color,
              } : {
                background: '#0d1117',
                border: '1px solid #1e2d42',
                color: '#6b87a0',
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
          <input value={domain} readOnly style={{ opacity: 0.5, cursor: 'default' }} />
        )}
      </div>

      {/* Price range */}
      <div>
        <label className="form-label">Preisbereich (optional)</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
              placeholder="Min." min="0" style={{ paddingRight: 32 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#3a5470', fontSize: 13, pointerEvents: 'none' }}>€</span>
          </div>
          <div className="relative">
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              placeholder="Max." min="0" style={{ paddingRight: 32 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#3a5470', fontSize: 13, pointerEvents: 'none' }}>€</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-sm flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
            Wird erstellt…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Suche hinzufügen
          </span>
        )}
      </button>
    </form>
  )
}
