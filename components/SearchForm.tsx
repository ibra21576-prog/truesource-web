'use client'
import { useState } from 'react'

const VINTED_DOMAINS = [
  'www.vinted.de','www.vinted.at','www.vinted.com','www.vinted.fr',
  'www.vinted.nl','www.vinted.es','www.vinted.it','www.vinted.pl','www.vinted.co.uk',
]
const PLATFORMS = [
  { value: 'vinted',        label: 'Vinted' },
  { value: 'ebay',          label: 'eBay' },
  { value: 'kleinanzeigen', label: 'Kleinanzeigen' },
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
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      setQuery(''); setMinPrice(''); setMaxPrice('')
      onCreated()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', flexDirection: 'column', gap: 18,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
    }}>

      {/* Header */}
      <div>
        <h2 style={{
          fontSize: 15, fontWeight: 600, margin: 0,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}>Create New Search</h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Set up a listing monitor
        </p>
      </div>

      {/* Search Term */}
      <div>
        <label className="label">Search Term</label>
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Nike Air Jordan, PS5 Controller…"
            required
            style={{ paddingLeft: 38 }}
          />
          <svg width="14" height="14" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* Platform — segmented control */}
      <div>
        <label className="label">Platform</label>
        <div style={{
          display: 'flex',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 3,
          gap: 2,
        }}>
          {PLATFORMS.map(opt => {
            const active = platform === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePlatformChange(opt.value)}
                style={{
                  flex: 1, padding: '7px 8px', borderRadius: 6,
                  fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Geist, -apple-system, system-ui, sans-serif',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  ...(active
                    ? {
                        background: 'var(--card)',
                        color: 'var(--text)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--text3)',
                      }
                  ),
                }}>
                {opt.label}
              </button>
            )
          })}
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

      {/* Price Range */}
      <div>
        <label className="label">
          Price Range{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, opacity: 0.65 }}>
            (optional)
          </span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              placeholder="Min"
              min="0"
              style={{ paddingRight: 30 }}
            />
            <span style={{
              position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', fontSize: 13, pointerEvents: 'none', fontWeight: 500,
            }}>€</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Max"
              min="0"
              style={{ paddingRight: 30 }}
            />
            <span style={{
              position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', fontSize: 13, pointerEvents: 'none', fontWeight: 500,
            }}>€</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 13, color: 'var(--danger)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', paddingTop: 11, paddingBottom: 11 }}>
        {loading
          ? <>
              <span className="spin" style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTop: '2px solid #fff',
                display: 'inline-block',
              }} />
              Creating…
            </>
          : <>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Search
            </>
        }
      </button>
    </form>
  )
}
