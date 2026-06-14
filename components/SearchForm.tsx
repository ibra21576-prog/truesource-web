'use client'
import { useState } from 'react'

const VINTED_DOMAINS = [
  'www.vinted.de','www.vinted.at','www.vinted.com','www.vinted.fr',
  'www.vinted.nl','www.vinted.es','www.vinted.it','www.vinted.pl','www.vinted.co.uk',
]
const PLATFORMS = [
  { value: 'vinted',        label: 'Vinted',        color: '#3df5c8', bg: 'rgba(61,245,200,0.08)',  border: 'rgba(61,245,200,0.25)', glow: 'rgba(61,245,200,0.12)' },
  { value: 'ebay',          label: 'eBay',          color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  glow: 'rgba(251,191,36,0.12)' },
  { value: 'kleinanzeigen', label: 'Kleinanzeigen', color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)',  glow: 'rgba(251,146,60,0.12)' },
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
      display: 'flex', flexDirection: 'column', gap: 20,
      background: 'rgba(20,24,36,0.7)',
      border: '1.5px solid var(--border)',
      borderRadius: 20,
      padding: 24,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 4px 32px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.03) inset',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 24, right: 24, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(61,245,200,0.3), transparent)',
        borderRadius: 1,
      }} />

      {/* Header */}
      <div>
        <h2 style={{
          fontSize: 17, fontWeight: 800, margin: 0, letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, var(--text) 0%, var(--text2) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>Create New Search</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 4, letterSpacing: '0.01em' }}>
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
            style={{ paddingLeft: 40 }}
          />
          <svg width="14" height="14" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      </div>

      {/* Platform */}
      <div>
        <label className="label">Platform</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {PLATFORMS.map(opt => {
            const active = platform === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePlatformChange(opt.value)}
                style={{
                  padding: '10px 8px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                  letterSpacing: '-0.01em',
                  ...(active
                    ? {
                        background: opt.bg,
                        border: `1.5px solid ${opt.border}`,
                        color: opt.color,
                        boxShadow: `0 0 16px ${opt.glow}, 0 2px 8px rgba(0,0,0,0.2)`,
                        transform: 'translateY(-1px)',
                      }
                    : {
                        background: 'rgba(14,17,23,0.6)',
                        border: '1.5px solid var(--border)',
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
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10.5, opacity: 0.7 }}>
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
              style={{ paddingRight: 32 }}
            />
            <span style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', fontSize: 13, pointerEvents: 'none', fontWeight: 600,
            }}>€</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Max"
              min="0"
              style={{ paddingRight: 32 }}
            />
            <span style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', fontSize: 13, pointerEvents: 'none', fontWeight: 600,
            }}>€</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.06)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 12, padding: '11px 14px',
          fontSize: 13, color: 'var(--danger)',
          display: 'flex', gap: 9, alignItems: 'center',
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
      <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', paddingTop: 12, paddingBottom: 12, fontSize: 14 }}>
        {loading
          ? <>
              <span className="spin" style={{
                width: 15, height: 15, borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.15)',
                borderTop: '2px solid rgba(0,0,0,0.6)',
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
