'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import SearchForm from '@/components/SearchForm'

interface Search {
  id: string; query: string; platform: string; domain: string
  min_price?: number | null; max_price?: number | null
  enabled: boolean; created_at: string
}

const PLATFORM_STYLE: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  vinted:        { label: 'Vinted',        color: '#2dd4bf', bg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.18)',  dot: '#2dd4bf' },
  ebay:          { label: 'eBay',          color: '#fbbf24', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.18)',   dot: '#fbbf24' },
  kleinanzeigen: { label: 'Kleinanzeigen', color: '#fb923c', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.16)', dot: '#fb923c' },
}

export default function SearchesPage() {
  const [searches, setSearches] = useState<Search[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    const res  = await fetch('/api/searches')
    const data = await res.json()
    setSearches(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  async function toggle(s: Search) {
    await fetch(`/api/searches/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !s.enabled }) })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Suche und alle Ergebnisse löschen?')) return
    await fetch(`/api/searches/${id}`, { method: 'DELETE' })
    load()
  }

  const active  = searches.filter(s => s.enabled).length
  const paused  = searches.filter(s => !s.enabled).length

  return (
    <div style={{ minHeight: '100vh', background: '#06080f' }}>
      <Navigation />

      {/* Hero */}
      <div style={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, left: '30%', width: 500, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', position: 'relative' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f0f6ff', letterSpacing: '-0.03em', margin: 0 }}>
            Suchen
          </h1>
          <p style={{ fontSize: 13, color: '#3a5470', marginTop: 6, fontWeight: 500 }}>
            Verwalte deine Listing-Monitore · {active} aktiv{paused > 0 ? `, ${paused} pausiert` : ''}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          <SearchForm onCreated={load} />

          {/* Search list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: '2px solid rgba(59,240,197,0.15)', borderTop: '2px solid #3bf0c5', borderRadius: '50%' }} />
              </div>
            ) : searches.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: '#f0f6ff', fontSize: 15, marginBottom: 6 }}>Noch keine Suchen</p>
                  <p style={{ color: '#3a5470', fontSize: 13 }}>Erstell deine erste Suche links.</p>
                </div>
              </div>
            ) : searches.map(s => {
              const plat = PLATFORM_STYLE[s.platform] ?? PLATFORM_STYLE.vinted
              return (
                <div key={s.id} className="animate-fade-in" style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  borderRadius: 16, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  opacity: s.enabled ? 1 : 0.45,
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
                }}>
                  {/* Color strip */}
                  <div style={{ width: 3, alignSelf: 'stretch', background: `linear-gradient(180deg, ${plat.dot}, ${plat.dot}44)`, flexShrink: 0 }} />

                  <div style={{ flex: 1, minWidth: 0, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: plat.bg, color: plat.color, border: `1px solid ${plat.border}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: plat.dot }} />
                        {plat.label}
                      </span>
                      <span style={{ fontSize: 11, color: '#3a5470' }}>{s.domain}</span>
                    </div>
                    <p style={{ fontWeight: 600, color: '#e0eaf8', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.query}</p>
                    {(s.min_price || s.max_price) && (
                      <p style={{ fontSize: 11, color: '#3a5470', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        {s.min_price ? `${s.min_price}€` : '0€'} – {s.max_price ? `${s.max_price}€` : '∞'}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 10px', flexShrink: 0 }}>
                    <button onClick={() => toggle(s)} title={s.enabled ? 'Pausieren' : 'Aktivieren'} className="btn-ghost"
                      style={{ color: s.enabled ? '#3bf0c5' : '#4a6a88', padding: '8px' }}>
                      {s.enabled
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3.5L19 12 5 20.5z"/></svg>
                      }
                    </button>
                    <button onClick={() => remove(s.id)} title="Löschen" className="btn-ghost"
                      style={{ color: '#3a5470', padding: '8px' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3a5470')}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Vinted info */}
        <div style={{ marginTop: 28, borderRadius: 14, padding: '14px 18px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 3 }}>Vinted-Hinweis</p>
            <p style={{ fontSize: 12, color: '#7a6030', lineHeight: 1.6 }}>
              Vinted benötigt eine aktive Session. Falls Suchen fehlschlagen, aktiviere die Chrome-Extension — sie synchronisiert deine Vinted-Cookies automatisch.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
