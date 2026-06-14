'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import SearchForm from '@/components/SearchForm'

interface Search {
  id: string; query: string; platform: string; domain: string
  min_price?: number | null; max_price?: number | null
  enabled: boolean; created_at: string
}

const P: Record<string, { label: string }> = {
  vinted:        { label: 'Vinted' },
  ebay:          { label: 'eBay' },
  kleinanzeigen: { label: 'Kleinanzeigen' },
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
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 700, margin: 0,
            letterSpacing: '-0.03em', color: 'var(--text)',
          }}>Searches</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6, lineHeight: 1.6 }}>
            {searches.length} search{searches.length !== 1 ? 'es' : ''} configured
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
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
            ) : searches.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '48px 24px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
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
              return (
                <div key={s.id} className="anim-in" style={{
                  display: 'flex', alignItems: 'center',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12, overflow: 'hidden',
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
                    {(s.min_price || s.max_price) && (
                      <p style={{
                        fontSize: 12, color: 'var(--text3)', marginTop: 4,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
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
    </div>
  )
}
