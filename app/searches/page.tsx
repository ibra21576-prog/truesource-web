'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import SearchForm from '@/components/SearchForm'
import { apiFetch } from '@/lib/api-client'
import { currencyForMarketplaceDomain, marketplaceCurrencySymbol } from '@/lib/intelligence/price'
import type { ScanHealth } from '@/lib/scraper/health'

interface Search {
  id: string; query: string; platform: string; domain: string
  min_price?: number | null; max_price?: number | null
  exclude_terms?: string[]; max_age_hours?: number | null; alert_max_price?: number | null; alert_min_discount?: number | null
  last_scraped_at?: string | null; items?: { count: number }[]
  enabled: boolean; created_at: string
  scan_health?: ScanHealth | null
}

const P: Record<string, { label: string }> = {
  vinted:        { label: 'Vinted' },
  ebay:          { label: 'eBay' },
  kleinanzeigen: { label: 'Kleinanzeigen' },
  gumtree:       { label: 'Gumtree' },
  kijiji:        { label: 'Kijiji' },
  craigslist:    { label: 'Craigslist' },
  shpock:        { label: 'Shpock' },
  marktplaats:   { label: 'Marktplaats' },
  leboncoin:     { label: 'Leboncoin' },
  subito:        { label: 'Subito' },
  tradera:       { label: 'Tradera' },
  willhaben:     { label: 'willhaben' },
}

export default function SearchesPage() {
  const [searches, setSearches] = useState<Search[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loadError, setLoadError] = useState('')
  const [alertsEnabled, setAlertsEnabled] = useState(false)
  const [editing, setEditing] = useState<Search | null>(null)
  const [draft, setDraft] = useState({ exclude: '', age: '48', maxPrice: '', discount: '' })

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/searches')
      if (!res.ok) throw new Error('Searches could not refresh. Please try again.')
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('Invalid response')
      setSearches(data)
      setLoadError('')
    } catch {
      setLoadError('Searches could not refresh. Your saved searches have not been removed.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(); setAlertsEnabled(typeof Notification !== 'undefined' && Notification.permission === 'granted' && localStorage.getItem('ts_browser_alerts') === '1') }, [load])
  useEffect(() => {
    const timer = setInterval(load, 30_000)
    return () => clearInterval(timer)
  }, [load])

  async function enableAlerts() {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    const enabled = permission === 'granted'
    setAlertsEnabled(enabled)
    if (enabled) localStorage.setItem('ts_browser_alerts', '1')
  }

  function openRules(search: Search) {
    setEditing(search)
    setDraft({
      exclude: (search.exclude_terms || []).join(', '),
      age: String(search.max_age_hours || 48),
      maxPrice: search.alert_max_price == null ? '' : String(search.alert_max_price),
      discount: search.alert_min_discount == null ? '' : String(search.alert_min_discount),
    })
  }

  async function saveRules() {
    if (!editing) return
    await apiFetch(`/api/searches/${editing.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exclude_terms: draft.exclude.split(',').map(value => value.trim()).filter(Boolean),
        max_age_hours: Number(draft.age),
        alert_max_price: draft.maxPrice || null,
        alert_min_discount: draft.discount || null,
      }),
    })
    setEditing(null)
    load()
  }

  async function toggle(s: Search) {
    await apiFetch(`/api/searches/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !s.enabled }) })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this search and all its listings?')) return
    await apiFetch(`/api/searches/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">
        {loadError && <p role="alert">{loadError} <button className="btn-secondary" onClick={load}>Retry</button></p>}

        {/* Page header */}
        <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
          <div className="eyebrow">Automation</div>
          <h1 style={{
            fontSize: 40, fontWeight: 700, margin: 0,
            letterSpacing: '-0.045em', color: 'var(--text)',
          }}>Searches</h1>
          <p style={{ fontSize: 15, color: 'var(--text2)', marginTop: 10, lineHeight: 1.5 }}>
            {searches.length} search{searches.length !== 1 ? 'es' : ''} configured
          </p>
          </div>
          <button className={alertsEnabled ? 'btn-secondary' : 'btn-primary'} onClick={enableAlerts} disabled={alertsEnabled}>{alertsEnabled ? '✓ Browser alerts enabled' : 'Enable smart alerts'}</button>
        </div>

        <div className="searches-layout">
          {/* Search form */}
          <SearchForm onCreated={load} />

          {/* Searches list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Section label */}
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Active Monitors
            </p>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: 12 }}>
                <span className="spin" style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '2px solid var(--border)',
                  borderTop: '2px solid var(--accent)',
                  display: 'inline-block',
                }} />
                <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading searches…</p>
              </div>
            ) : searches.length === 0 && !loadError ? (
              <div className="glass-panel" style={{
                textAlign: 'center', padding: '48px 24px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <svg width="20" height="20" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>No searches yet</p>
                <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>Create your first search on the left.</p>
              </div>
            ) : searches.map(s => {
              const plat = P[s.platform] ?? P.vinted
              const currencySymbol = marketplaceCurrencySymbol(currencyForMarketplaceDomain(s.domain))
              return (
                <div key={s.id} className="anim-in glass-panel" style={{
                  display: 'flex', alignItems: 'center',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, overflow: 'hidden',
                  opacity: s.enabled ? 1 : 0.45,
                  transition: 'opacity 0.2s, border-color 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'var(--border2)'
                    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'var(--border)'
                    el.style.boxShadow = 'none'
                  }}
                >
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span className={`badge badge-${s.platform}`}>{plat.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{s.domain}</span>
                    </div>
                    <p style={{
                      fontWeight: 600, color: 'var(--text)', fontSize: 14,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      margin: 0,
                    }}>{s.query}</p>
                    {s.enabled && s.scan_health?.message && <p role="status" style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
                      {s.scan_health.message}
                      {s.scan_health.nextRetryAt && ` Next attempt after ${new Date(s.scan_health.nextRetryAt).toLocaleTimeString()}.`}
                      {s.scan_health.status === 'connection_required' && <> <a href="/connectors">Open Connectors</a></>}
                    </p>}
                    {(s.min_price || s.max_price) && (
                      <p style={{
                        fontSize: 12, color: 'var(--text3)', marginTop: 4,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        {s.min_price ?? 0} {currencySymbol} – {s.max_price ?? '∞'} {currencySymbol}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      <span style={{ fontSize: 10.5, color: 'var(--text3)', padding: '3px 7px', background: 'var(--surface)', borderRadius: 5 }}>{!s.enabled ? 'Paused' : s.scan_health?.lastSuccessAt ? `Last successful scan: ${new Date(s.scan_health.lastSuccessAt).toLocaleString()}` : 'Waiting for a successful scan'}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text3)', padding: '3px 7px', background: 'var(--surface)', borderRadius: 5 }}>{s.items?.[0]?.count || 0} listings</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text3)', padding: '3px 7px', background: 'var(--surface)', borderRadius: 5 }}>Max age {s.max_age_hours || 48}h</span>
                      {!!s.exclude_terms?.length && <span style={{ fontSize: 10.5, color: 'var(--text3)', padding: '3px 7px', background: 'var(--surface)', borderRadius: 5 }}>Excludes {s.exclude_terms.join(', ')}</span>}
                      {(s.alert_max_price || s.alert_min_discount) && <span style={{ fontSize: 10.5, color: 'var(--accent)', padding: '3px 7px', background: 'rgba(124,58,237,.08)', borderRadius: 5 }}>Smart alert active</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 10px', flexShrink: 0 }}>
                    <button onClick={() => openRules(s)} title="Edit filters and alerts" className="btn-ghost" style={{ padding: '8px', color: 'var(--text3)' }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2"/></svg>
                    </button>
                    <button
                      onClick={() => toggle(s)}
                      title={s.enabled ? 'Pause' : 'Resume'}
                      className="btn-ghost"
                      style={{
                        color: s.enabled ? 'var(--accent)' : 'var(--text3)',
                        padding: '8px',
                      }}
                    >
                      {s.enabled
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3.5L19 12 5 20.5z"/></svg>
                      }
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      title="Delete"
                      className="btn-ghost"
                      style={{ padding: '8px', transition: 'all 0.15s' }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.color = 'var(--danger)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.color = 'var(--text3)'
                      }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
      {editing && <div className="soon-modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setEditing(null) }}>
        <section className="soon-modal" role="dialog" aria-modal="true" style={{ textAlign: 'left', maxWidth: 480 }}>
          <button className="soon-modal-close" onClick={() => setEditing(null)} aria-label="Close">×</button>
          <span className="soon-modal-badge">Search rules</span>
          <h2 style={{ marginTop: 12 }}>{editing.query}</h2>
          <div style={{ display: 'grid', gap: 13, marginTop: 20 }}>
            <label><span className="label">Exclude words</span><input value={draft.exclude} onChange={event => setDraft({ ...draft, exclude: event.target.value })} placeholder="defect, broken, parts only" /></label>
            <label><span className="label">Maximum listing age</span><select value={draft.age} onChange={event => setDraft({ ...draft, age: event.target.value })}><option value="1">1 hour</option><option value="6">6 hours</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option><option value="168">7 days</option></select></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><label><span className="label">Alert below price</span><input type="number" min="0" value={draft.maxPrice} onChange={event => setDraft({ ...draft, maxPrice: event.target.value })} placeholder="e.g. 250" /></label><label><span className="label">Below median</span><input type="number" min="1" max="90" value={draft.discount} onChange={event => setDraft({ ...draft, discount: event.target.value })} placeholder="e.g. 20%" /></label></div>
            <button className="btn-primary" onClick={saveRules}>Save rules</button>
          </div>
        </section>
      </div>}
    </div>
  )
}
