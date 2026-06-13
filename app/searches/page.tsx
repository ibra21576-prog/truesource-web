'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import SearchForm from '@/components/SearchForm'

interface Search {
  id: string; query: string; platform: string; domain: string
  min_price?: number | null; max_price?: number | null
  enabled: boolean; created_at: string
}

const P: Record<string, { label: string; color: string }> = {
  vinted:        { label: 'Vinted',        color: '#3df5c8' },
  ebay:          { label: 'eBay',          color: '#fbbf24' },
  kleinanzeigen: { label: 'Kleinanzeigen', color: '#fb923c' },
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
    if (!confirm('Suche und alle zugehörigen Listings löschen?')) return
    await fetch(`/api/searches/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Suchen</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{searches.length} Suche{searches.length !== 1 ? 'n' : ''} konfiguriert</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          <SearchForm onCreated={load} />

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <span className="spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', display: 'inline-block' }} />
              </div>
            ) : searches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14 }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>Keine Suchen</p>
                <p style={{ fontSize: 13, color: 'var(--text3)' }}>Erstelle deine erste Suche links.</p>
              </div>
            ) : searches.map(s => {
              const plat = P[s.platform] ?? P.vinted
              return (
                <div key={s.id} className="anim-in" style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden',
                  opacity: s.enabled ? 1 : 0.45, transition: 'opacity 0.2s',
                }}>
                  {/* Color strip */}
                  <div style={{ width: 3, alignSelf: 'stretch', background: plat.color, flexShrink: 0 }} />

                  <div style={{ flex: 1, minWidth: 0, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span className={`badge badge-${s.platform}`}>{plat.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s.domain}</span>
                    </div>
                    <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.query}</p>
                    {(s.min_price || s.max_price) && (
                      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                        {s.min_price ?? 0}€ – {s.max_price ?? '∞'}€
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', flexShrink: 0 }}>
                    <button onClick={() => toggle(s)} title={s.enabled ? 'Pausieren' : 'Aktivieren'} className="btn-ghost"
                      style={{ color: s.enabled ? 'var(--accent)' : 'var(--text3)', padding: '8px' }}>
                      {s.enabled
                        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3.5L19 12 5 20.5z"/></svg>
                      }
                    </button>
                    <button onClick={() => remove(s.id)} title="Löschen" className="btn-ghost"
                      style={{ padding: '8px' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Vinted info */}
        <div style={{ marginTop: 28, borderRadius: 10, padding: '12px 16px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <svg width="15" height="15" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" style={{ marginTop: 1, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: 12, color: '#8a7030', lineHeight: 1.5 }}>
            <strong style={{ color: '#fbbf24' }}>Vinted:</strong> Erfordert eine aktive Session. Falls Suchen fehlschlagen, aktiviere die Chrome-Extension — sie synchronisiert deine Cookies automatisch.
          </p>
        </div>

      </div>
    </div>
  )
}
