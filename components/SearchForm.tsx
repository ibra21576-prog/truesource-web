'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { currencyForMarketplaceDomain, marketplaceCurrencySymbol } from '@/lib/intelligence/price'

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

const SUBITO_DOMAINS = [{ value: 'www.subito.it', label: '🇮🇹 subito.it — Italia' }]
const TRADERA_DOMAINS = [{ value: 'www.tradera.com', label: '🇸🇪 tradera.com — Sverige' }]
const WILLHABEN_DOMAINS = [{ value: 'www.willhaben.at', label: '🇦🇹 willhaben.at — Österreich' }]

const WALLAPOP_DOMAINS = [
  { value: 'es.wallapop.com', label: '🇪🇸 wallapop.com — España' },
  { value: 'it.wallapop.com', label: '🇮🇹 wallapop.com — Italia' },
  { value: 'pt.wallapop.com', label: '🇵🇹 wallapop.com — Portugal' },
]

const OLX_DOMAINS = [
  { value: 'www.olx.pl', label: '🇵🇱 olx.pl — Polska' },
  { value: 'www.olx.ro', label: '🇷🇴 olx.ro — România' },
  { value: 'www.olx.bg', label: '🇧🇬 olx.bg — България' },
  { value: 'www.olx.pt', label: '🇵🇹 olx.pt — Portugal' },
  { value: 'www.olx.ua', label: '🇺🇦 olx.ua — Україна' },
]

const PLATFORMS = [
  { value: 'vinted',        label: 'Vinted',       domain: 'vinted.de' },
  { value: 'ebay',          label: 'eBay',         domain: 'ebay.de' },
  { value: 'kleinanzeigen', label: 'Kleinanz.',    domain: 'kleinanzeigen.de' },
  { value: 'shpock',        label: 'Shpock',       domain: 'shpock.com' },
  { value: 'marktplaats',   label: 'Marktplaats',  domain: 'marktplaats.nl' },
  { value: 'leboncoin',     label: 'Leboncoin',    domain: 'leboncoin.fr' },
  { value: 'craigslist',    label: 'Craigslist',   domain: 'craigslist.org' },
  { value: 'kijiji',        label: 'Kijiji',       domain: 'kijiji.ca' },
  { value: 'gumtree',       label: 'Gumtree',      domain: 'gumtree.com' },
  { value: 'subito',        label: 'Subito',       domain: 'subito.it' },
  { value: 'tradera',       label: 'Tradera',      domain: 'tradera.com' },
  { value: 'willhaben',     label: 'willhaben',    domain: 'willhaben.at' },
  { value: 'wallapop',      label: 'Wallapop',     domain: 'wallapop.com' },
  { value: 'olx',           label: 'OLX',          domain: 'olx.pl', soon: true },
  { value: 'facebook',      label: 'Facebook',     domain: 'facebook.com', soon: true },
]

const platformLogo = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`

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
  subito: 'www.subito.it',
  tradera: 'www.tradera.com',
  willhaben: 'www.willhaben.at',
  wallapop: 'es.wallapop.com',
  olx: 'www.olx.pl',
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
  subito: SUBITO_DOMAINS,
  tradera: TRADERA_DOMAINS,
  willhaben: WILLHABEN_DOMAINS,
  wallapop: WALLAPOP_DOMAINS,
  olx: OLX_DOMAINS,
  kleinanzeigen: null,
}

function currencyForDomain(domain: string): string {
  return marketplaceCurrencySymbol(currencyForMarketplaceDomain(domain))
}

export default function SearchForm({ onCreated }: { onCreated: () => void }) {
  const [query,    setQuery]    = useState('')
  const [platform, setPlatform] = useState('vinted')
  const [domain,   setDomain]   = useState('www.vinted.de')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [excludeTerms, setExcludeTerms] = useState('')
  const [maxAgeHours, setMaxAgeHours] = useState('48')
  const [alertMaxPrice, setAlertMaxPrice] = useState('')
  const [alertMinDiscount, setAlertMinDiscount] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [regionOpen, setRegionOpen] = useState(false)
  const [platformNotice, setPlatformNotice] = useState('')
  const regionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (regionRef.current && !regionRef.current.contains(event.target as Node)) setRegionOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRegionOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function handlePlatformChange(p: string) {
    setPlatform(p)
    setDomain(DEFAULT_DOMAINS[p] || 'www.' + p + '.com')
    setRegionOpen(false)
    setPlatformNotice('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError('')
    try {
      const res = await apiFetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(), platform, domain,
          min_price: minPrice || null, max_price: maxPrice || null,
          exclude_terms: excludeTerms.split(',').map(value => value.trim()).filter(Boolean),
          max_age_hours: maxAgeHours,
          alert_max_price: alertMaxPrice || null,
          alert_min_discount: alertMinDiscount || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      setQuery(''); setMinPrice(''); setMaxPrice(''); setExcludeTerms(''); setAlertMaxPrice(''); setAlertMinDiscount('')
      onCreated()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const currency = currencyForDomain(domain)
  const domainOptions = DOMAIN_OPTIONS[platform]
  const selectedRegion = domainOptions?.find(option => option.value === domain)

  function regionParts(label: string) {
    const [flag, ...name] = label.split(' ')
    const regionalIndicators = [...flag].map(character => character.codePointAt(0) ?? 0)
    const flagCode = regionalIndicators.length === 2 && regionalIndicators.every(code => code >= 0x1f1e6 && code <= 0x1f1ff)
      ? String.fromCharCode(...regionalIndicators.map(code => code - 0x1f1e6 + 97))
      : null
    return { flagCode, name: name.join(' ') }
  }

  function RegionFlag({ code, name }: { code: string | null; name: string }) {
    return (
      <span className="region-picker-flag" aria-hidden="true">
        {code
          ? <img src={`https://flagcdn.com/${code}.svg`} alt="" loading="lazy" />
          : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z" />
            </svg>
        }
        <span className="sr-only">{name}</span>
      </span>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{
      display: 'flex', flexDirection: 'column', gap: 18,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 26,
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
                onClick={() => {
                  if (!opt.soon) return handlePlatformChange(opt.value)
                  setPlatformNotice(opt.value === 'facebook'
                    ? 'Facebook Marketplace is coming soon — we are waiting for an official, account-safe connection so nobody risks a ban.'
                    : 'OLX is coming soon — direct access is currently blocked, so we will only activate it once scanning is reliable.')
                }}
                aria-disabled={opt.soon || undefined}
                style={{
                  padding: '10px 4px', borderRadius: 9,
                  fontSize: 12, fontWeight: 500,
                  cursor: opt.soon ? 'default' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  transition: 'all 0.15s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  position: 'relative',
                  opacity: opt.soon ? 0.66 : 1,
                  ...(active
                    ? { background: 'rgba(168,85,247,0.10)', color: 'var(--accent)' }
                    : { background: 'var(--surface)', color: 'var(--text2)' }
                  ),
                }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#fff', border: '1px solid var(--border)',
                  boxShadow: '0 1px 2px rgba(18,18,18,0.05)', overflow: 'hidden',
                }}>
                  <img
                    src={platformLogo(opt.domain)}
                    alt={`${opt.label} logo`}
                    width="20"
                    height="20"
                    loading="lazy"
                    style={{ width: 20, height: 20, objectFit: 'contain' }}
                  />
                </span>
                <span>{opt.label}</span>
                {opt.soon && <span className="platform-soon">Soon</span>}
              </button>
            )
          })}
        </div>
        {platformNotice && (
          <div className="platform-notice" role="status">
            <span>Coming soon</span>
            {platformNotice}
          </div>
        )}
      </div>

      {/* Country / Domain */}
      <div>
        <label className="label">Country / Region</label>
        {domainOptions
          ? <div className="region-picker" ref={regionRef}>
              <button
                type="button"
                className={`region-picker-trigger${regionOpen ? ' open' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={regionOpen}
                onClick={() => setRegionOpen(open => !open)}
              >
                {selectedRegion && (() => {
                  const parts = regionParts(selectedRegion.label)
                  return <>
                    <RegionFlag code={parts.flagCode} name={parts.name} />
                    <span className="region-picker-copy">
                      <strong>{parts.name}</strong>
                      <small>{selectedRegion.value}</small>
                    </span>
                  </>
                })()}
                <svg className="region-picker-chevron" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {regionOpen && (
                <div className="region-picker-menu" role="listbox" aria-label="Country or region">
                  {domainOptions.map(option => {
                    const parts = regionParts(option.label)
                    const active = option.value === domain
                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`region-picker-option${active ? ' active' : ''}`}
                        key={option.value}
                        onClick={() => { setDomain(option.value); setRegionOpen(false) }}
                      >
                        <RegionFlag code={parts.flagCode} name={parts.name} />
                        <span className="region-picker-copy">
                          <strong>{parts.name}</strong>
                          <small>{option.value}</small>
                        </span>
                        {active && (
                          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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

      <button type="button" className="btn-ghost" onClick={() => setAdvancedOpen(open => !open)} style={{ justifyContent: 'space-between', width: '100%', padding: '8px 2px', color: 'var(--text2)' }}>
        <span>Advanced filters & smart alerts</span><span>{advancedOpen ? '−' : '+'}</span>
      </button>

      {advancedOpen && <div style={{ display: 'grid', gap: 12, padding: 14, borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label><span className="label">Exclude words</span><input value={excludeTerms} onChange={event => setExcludeTerms(event.target.value)} placeholder="defect, broken, parts only" /><small style={{ color: 'var(--text3)' }}>Separate words or phrases with commas.</small></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label><span className="label">Maximum listing age</span><select value={maxAgeHours} onChange={event => setMaxAgeHours(event.target.value)}><option value="1">1 hour</option><option value="6">6 hours</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option><option value="168">7 days</option></select></label>
          <label><span className="label">Alert below price</span><input type="number" min="0" value={alertMaxPrice} onChange={event => setAlertMaxPrice(event.target.value)} placeholder={`e.g. 250 ${currency}`} /></label>
        </div>
        <label><span className="label">Alert when below market median</span><div style={{ position: 'relative' }}><input type="number" min="1" max="90" value={alertMinDiscount} onChange={event => setAlertMinDiscount(event.target.value)} placeholder="e.g. 20" style={{ paddingRight: 34 }} /><span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>%</span></div></label>
      </div>}

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
