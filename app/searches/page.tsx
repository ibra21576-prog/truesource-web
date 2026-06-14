'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import SearchForm from '@/components/SearchForm'

interface Search {
  id: string; query: string; platform: string; domain: string
  min_price?: number | null; max_price?: number | null
  enabled: boolean; created_at: string
}

const P: Record<string, { label: string; color: string; glow: string }> = {
  vinted:        { label: 'Vinted',        color: '#3df5c8', glow: 'rgba(61,245,200,0.1)' },
  ebay:          { label: 'eBay',          color: '#fbbf24', glow: 'rgba(251,191,36,0.1)' },
  kleinanzeigen: { label: 'Kleinanzeigen', color: '#fb923c', glow: 'rgba(251,146,60,0.1)' },
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
    if (!confirm('Delete this search and all its listings?')) return
    await fetch(`/api/searches/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">

        {/* Page header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{
            fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #edf2ff 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Searches</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6, letterSpacing: '0.01em' }}>
            {searches.length} search{searches.length !== 1 ? 'es' : ''} configured
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Search form */}
          <SearchForm onCreated={load} />

          {/* Searches list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 14 }}>
                <span className="spin" style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: '2px solid var(--border)',
                  borderTop: '2px solid var(--accent)',
                  display: 'inline-block',
                  boxShadow: '0 0 16px rgba(61,245,200,0.15)',
                }} />
                <p style={{ color: 'var(--text3)', fontSize: 13 }}>Loading searches…</p>
              </div>
            ) : searches.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '56px 24px',
                background: 'rgba(20,24,36,0.7)',
                border: '1.5px solid var(--border)',
                borderRadius: 20,
                backdropFilter: 'blur(12px)',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(129,140,248,0.06)',
                  border: '1px solid rgba(129,140,248,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <svg width="22" height="22" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.02em' }}>No searches yet</p>
                <p style={{ fontSize: 13, color: 'var(--text3)' }}>Create your first search on the left.</p>
              </div>
            ) : searches.map(s => {
              const plat = P[s.platform] ?? P.vinted
              return (
                <div key={s.id} className="anim-in" style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  background: 'rgba(20,24,36,0.75)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 16, overflow: 'hidden',
                  opacity: s.enabled ? 1 : 0.45,
                  transition: 'opacity 0.25s, border-color 0.2s, box-shadow 0.2s',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = plat.color + '40'
                    el.style.boxShadow = `0 4px 24px rgba(0,0,0,0.25), 0 0 16px ${plat.glow}`
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'var(--border)'
                    el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  {/* Platform accent bar */}
                  <div style={{
                    width: 3, alignSelf: 'stretch',
                    background: `linear-gradient(180deg, ${plat.color} 0%, ${plat.color}55 100%)`,
                    flexShrink: 0,
                    boxShadow: `2px 0 10px ${plat.glow}`,
                  }} />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className={`badge badge-${s.platform}`}>{plat.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.01em' }}>{s.domain}</span>
                    </div>
                    <p style={{
                      fontWeight: 700, color: 'var(--text)', fontSize: 14,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      letterSpacing: '-0.01em',
                    }}>{s.query}</p>
                    {(s.min_price || s.max_price) && (
                      <p style={{
                        fontSize: 11, color: 'var(--text3)', marginTop: 4,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 8v4l3 3"/>
                        </svg>
                        {s.min_price ?? 0}€ – {s.max_price ?? '∞'}€
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 10px', flexShrink: 0 }}>
                    <button
                      onClick={() => toggle(s)}
                      title={s.enabled ? 'Pause' : 'Resume'}
                      className="btn-ghost"
                      style={{
                        color: s.enabled ? 'var(--accent)' : 'var(--text3)',
                        padding: '9px', borderRadius: 10,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.background = s.enabled ? 'rgba(61,245,200,0.08)' : 'rgba(255,255,255,0.04)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent'
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
                      style={{ padding: '9px', borderRadius: 10, transition: 'all 0.2s' }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.color = 'var(--danger)'
                        el.style.background = 'rgba(248,113,113,0.08)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement
                        el.style.color = 'var(--text3)'
                        el.style.background = 'transparent'
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
    </div>
  )
}
