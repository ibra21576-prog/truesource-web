'use client'
import { useState } from 'react'

const VINTED_DOMAINS = [
  { value: 'www.vinted.de',     label: '🇩🇪 vinted.de — Deutschland' },
  { value: 'www.vinted.at',     label: '🇦🇹 vinted.at — Österreich' },
  { value: 'www.vinted.fr',     label: '🇫🇷 vinted.fr — France' },
  { value: 'www.vinted.be',     label: '🇧🇪 vinted.be — Belgique' },
  { value: 'www.vinted.nl',     label: '🇳🇱 vinted.nl — Nederland' },
  { value: 'www.vinted.es',     label: '🇪🇸 vinted.es — España' },
  { value: 'www.vinted.it',     label: '🇮🇹 vinted.it — Italia' },
  { value: 'www.vinted.pl',     label: '🇵🇱 vinted.pl — Polska' },
  { value: 'www.vinted.co.uk',  label: '🇬🇧 vinted.co.uk — United Kingdom' },
  { value: 'www.vinted.lu',     label: '🇱🇺 vinted.lu — Luxembourg' },
  { value: 'www.vinted.cz',     label: '🇨🇿 vinted.cz — Česko' },
  { value: 'www.vinted.sk',     label: '🇸🇰 vinted.sk — Slovensko' },
  { value: 'www.vinted.hu',     label: '🇭🇺 vinted.hu — Magyarország' },
  { value: 'www.vinted.lt',     label: '🇱🇹 vinted.lt — Lietuva' },
  { value: 'www.vinted.lv',     label: '🇱🇻 vinted.lv — Latvija' },
  { value: 'www.vinted.ee',     label: '🇪🇪 vinted.ee — Eesti' },
  { value: 'www.vinted.fi',     label: '🇫🇮 vinted.fi — Suomi' },
  { value: 'www.vinted.se',     label: '🇸🇪 vinted.se — Sverige' },
  { value: 'www.vinted.com',    label: '🌍 vinted.com — International' },
]

const EBAY_DOMAINS = [
  { value: 'www.ebay.de',      label: '🇩🇪 ebay.de — Deutschland' },
  { value: 'www.ebay.at',      label: '🇦🇹 ebay.at — Österreich' },
  { value: 'www.ebay.fr',      label: '🇫🇷 ebay.fr — France' },
  { value: 'www.ebay.be',      label: '🇧🇪 ebay.be — Belgique' },
  { value: 'www.ebay.nl',      label: '🇳🇱 ebay.nl — Nederland' },
  { value: 'www.ebay.es',      label: '🇪🇸 ebay.es — España' },
  { value: 'www.ebay.it',      label: '🇮🇹 ebay.it — Italia' },
  { value: 'www.ebay.pl',      label: '🇵🇱 ebay.pl — Polska' },
  { value: 'www.ebay.co.uk',   label: '🇬🇧 ebay.co.uk — United Kingdom' },
  { value: 'www.ebay.ch',      label: '🇨🇭 ebay.ch — Schweiz' },
  { value: 'www.ebay.com',     label: '🇺🇸 ebay.com — United States' },
  { value: 'www.ebay.ca',      label: '🇨🇦 ebay.ca — Canada' },
  { value: 'www.ebay.com.au',  label: '🇦🇺 ebay.com.au — Australia' },
]

const GUMTREE_DOMAINS = [
  { value: 'www.gumtree.com',    label: '🇬🇧 gumtree.com — United Kingdom' },
  { value: 'www.gumtree.com.au', label: '🇦🇺 gumtree.com.au — Australia' },
]

const KIJIJI_DOMAINS = [
  { value: 'www.kijiji.ca', label: '🇨🇦 kijiji.ca — Canada' },
]

const CRAIGSLIST_DOMAINS = [
  { value: 'newyork.craigslist.org',    label: '🇺🇸 New York' },
  { value: 'losangeles.craigslist.org', label: '🇺🇸 Los Angeles' },
  { value: 'chicago.craigslist.org',    label: '🇺🇸 Chicago' },
  { value: 'sfbay.craigslist.org',      label: '🇺🇸 San Francisco' },
  { value: 'miami.craigslist.org',      label: '🇺🇸 Miami' },
  { value: 'seattle.craigslist.org',    label: '🇺🇸 Seattle' },
  { value: 'boston.craigslist.org',     label: '🇺🇸 Boston' },
  { value: 'dallas.craigslist.org',     label: '🇺🇸 Dallas' },
  { value: 'houston.craigslist.org',    label: '🇺🇸 Houston' },
  { value: 'atlanta.craigslist.org',    label: '🇺🇸 Atlanta' },
  { value: 'toronto.craigslist.org',    label: '🇨🇦 Toronto' },
  { value: 'vancouver.craigslist.org',  label: '🇨🇦 Vancouver' },
  { value: 'london.craigslist.org',     label: '🇬🇧 London' },
  { value: 'berlin.craigslist.org',     label: '🇩🇪 Berlin' },
  { value: 'sydney.craigslist.org',     label: '🇦🇺 Sydney' },
]

const SHPOCK_DOMAINS = [
  { value: 'www.shpock.com',    label: '🇩🇪 shpock.com — DE/AT/CH' },
]

const MARKTPLAATS_DOMAINS = [
  { value: 'www.marktplaats.nl', label: '🇳🇱 marktplaats.nl — Nederland' },
]

const LEBONCOIN_DOMAINS = [
  { value: 'www.leboncoin.fr', label: '🇫🇷 leboncoin.fr — France' },
]

const PLATFORMS = [
  { value: 'vinted',        label: 'Vinted',        flag: '👗' },
  { value: 'ebay',          label: 'eBay',          flag: '🛒' },
  { value: 'kleinanzeigen', label: 'Kleinanz.',     flag: '📌' },
  { value: 'shpock',        label: 'Shpock',        flag: '📦' },
  { value: 'marktplaats',   label: 'Marktplaats',  flag: '🇳🇱' },
  { value: 'leboncoin',     label: 'Leboncoin',    flag: '🇫🇷' },
  { value: 'craigslist',    label: 'Craigslist',   flag: '🇺🇸' },
  { value: 'kijiji',        label: 'Kijiji',       flag: '🇨🇦' },
  { value: 'gumtree',       label: 'Gumtree',      flag: '🇬🇧' },
]

const DEFAULT_DOMAINS: Record<string, string> = {
  vinted: 'www.vinted.de',
  ebay: 'www.ebay.de',
  kleinanzeigen: 'www.kleinanzeigen.de',
  gumtree: 'www.gumtree.com',
  kijiji: 'www.kijiji.ca',
  craigslist: 'newyork.craigslist.org',
  shpock: 'www.shpock.com',
  marktplaats: 'www.marktplaats.nl',
  leboncoin: 'www.leboncoin.fr',
}

const DOMAIN_OPTIONS: Record<string, { value: string; label: string }[] | null> = {
  vinted: VINTED_DOMAINS,
  ebay: EBAY_DOMAINS,
  gumtree: GUMTREE_DOMAINS,
  kijiji: KIJIJI_DOMAINS,
  craigslist: CRAIGSLIST_DOMAINS,
  shpock: SHPOCK_DOMAINS,
  marktplaats: MARKTPLAATS_DOMAINS,
  leboncoin: LEBONCOIN_DOMAINS,
  kleinanzeigen: null,
}

function currencyForDomain(domain: string): string {
  if (domain.endsWith('.co.uk'))  return '£'
  if (domain.endsWith('.com') || domain.endsWith('.ca')) return '$'
  if (domain.endsWith('.com.au')) return 'A$'
  if (domain.endsWith('.pl'))     return 'zł'
  if (domain.endsWith('.cz'))     return 'Kč'
  if (domain.endsWith('.hu'))     return 'Ft'
  if (domain.endsWith('.se'))     return 'kr'
  if (domain.endsWith('.ch'))     return 'CHF'
  return '€'
}

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
    setDomain(DEFAULT_DOMAINS[p] || 'www.' + p + '.com')
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

  const currency = currencyForDomain(domain)
  const domainOptions = DOMAIN_OPTIONS[platform]

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', flexDirection: 'column', gap: 18,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
    }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Create New Search
        </h2>
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

      {/* Platform grid — 3 columns */}
      <div>
        <label className="label">Platform</label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}>
          {PLATFORMS.map(opt => {
            const active = platform === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePlatformChange(opt.value)}
                style={{
                  padding: '8px 4px', borderRadius: 8,
                  fontSize: 12, fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Geist, -apple-system, system-ui, sans-serif',
                  border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  transition: 'all 0.15s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  ...(active
                    ? { background: 'rgba(20,184,166,0.08)', color: 'var(--accent)' }
                    : { background: 'var(--surface)', color: 'var(--text2)' }
                  ),
                }}>
                <span style={{ fontSize: 16 }}>{opt.flag}</span>
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Country / Domain */}
      <div>
        <label className="label">Country / Region</label>
        {domainOptions
          ? <select value={domain} onChange={e => setDomain(e.target.value)}>
              {domainOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
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
              style={{ paddingRight: 38 }}
            />
            <span style={{
              position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', fontSize: 12, pointerEvents: 'none', fontWeight: 500,
            }}>{currency}</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Max"
              min="0"
              style={{ paddingRight: 38 }}
            />
            <span style={{
              position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', fontSize: 12, pointerEvents: 'none', fontWeight: 500,
            }}>{currency}</span>
          </div>
        </div>
      </div>

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
