'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import SearchForm from '@/components/SearchForm'

interface Search {
  id: string; query: string; platform: string; domain: string
  min_price?: number | null; max_price?: number | null
  enabled: boolean; created_at: string
}

function platformInfo(p: string) {
  if (p === 'ebay') return { label: 'eBay', cls: 'badge-ebay' }
  if (p === 'kleinanzeigen') return { label: 'Kleinanzeigen', cls: 'badge-kleinanzeigen' }
  return { label: 'Vinted', cls: 'badge-vinted' }
}

export default function SearchesPage() {
  const [searches, setSearches] = useState<Search[]>([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    const res  = await fetch('/api/searches')
    const data = await res.json()
    setSearches(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  async function toggle(s: Search) {
    await fetch(`/api/searches/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !s.enabled }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Suche und alle zugehörigen Ergebnisse löschen?')) return
    await fetch(`/api/searches/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="section-title mb-1">Suchen</h1>
          <p className="text-sm" style={{ color: '#4a6a88' }}>
            {searches.length} Suche{searches.length !== 1 ? 'n' : ''} konfiguriert
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <SearchForm onCreated={load} />

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : searches.length === 0 ? (
              <div className="empty-state py-12">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1 text-sm">Noch keine Suchen</p>
                  <p style={{ color: '#4a6a88' }} className="text-xs">Erstell deine erste Suche links.</p>
                </div>
              </div>
            ) : searches.map(s => {
              const plat = platformInfo(s.platform)
              return (
                <div key={s.id}
                  className="card flex items-center gap-3 transition-all"
                  style={!s.enabled ? { opacity: 0.45 } : {}}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`badge ${plat.cls}`}>{plat.label}</span>
                      <span className="text-xs" style={{ color: '#4a6a88' }}>{s.domain}</span>
                    </div>
                    <p className="font-medium text-white text-sm truncate">{s.query}</p>
                    {(s.min_price || s.max_price) && (
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#4a6a88' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="1" x2="12" y2="23"/>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        {s.min_price ? `${s.min_price}€` : '0€'} – {s.max_price ? `${s.max_price}€` : '∞'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggle(s)} title={s.enabled ? 'Pausieren' : 'Aktivieren'}
                      className="btn-ghost p-2" style={{ color: s.enabled ? '#3bf0c5' : '#4a6a88' }}>
                      {s.enabled ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1.5"/>
                          <rect x="14" y="4" width="4" height="16" rx="1.5"/>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5 3.5L19 12 5 20.5z"/>
                        </svg>
                      )}
                    </button>
                    <button onClick={() => remove(s.id)} title="Löschen"
                      className="btn-ghost p-2 hover:text-red-400" style={{ color: '#4a6a88' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

        {/* Info box */}
        <div className="rounded-xl p-4 flex gap-3"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>Vinted-Hinweis</p>
            <p className="text-xs mt-0.5" style={{ color: '#8a7040' }}>
              Vinted benötigt eine aktive Session. Falls Suchen fehlschlagen, aktiviere die Chrome-Extension — sie synchronisiert deine Vinted-Cookies automatisch.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
