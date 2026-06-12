'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import SearchForm from '@/components/SearchForm'

interface Search {
  id: string; query: string; platform: string; domain: string
  min_price?: number | null; max_price?: number | null
  enabled: boolean; created_at: string
}

function platformLabel(p: string) {
  if (p === 'ebay') return 'eBay'
  if (p === 'kleinanzeigen') return 'Kleinanzeigen'
  return 'Vinted'
}

function platformClass(p: string) {
  if (p === 'ebay') return 'badge-ebay'
  if (p === 'kleinanzeigen') return 'badge-kleinanzeigen'
  return 'badge-vinted'
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
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-white">Meine Suchen</h1>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <SearchForm onCreated={load} />

          <div className="space-y-3">
            {loading ? (
              <div className="text-muted text-sm py-8 text-center">Lade…</div>
            ) : searches.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-white font-medium mb-1">Noch keine Suchen</p>
                <p className="text-muted text-sm">Erstell deine erste Suche links.</p>
              </div>
            ) : searches.map(s => (
              <div key={s.id} className={`card flex items-center gap-3 transition-opacity ${!s.enabled ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${platformClass(s.platform)}`}>{platformLabel(s.platform)}</span>
                    <span className="text-xs text-muted">{s.domain}</span>
                  </div>
                  <p className="font-medium text-white truncate">{s.query}</p>
                  {(s.min_price || s.max_price) && (
                    <p className="text-xs text-muted mt-0.5">
                      {s.min_price ? `${s.min_price}€` : '0€'} – {s.max_price ? `${s.max_price}€` : '∞'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggle(s)} title={s.enabled ? 'Pausieren' : 'Aktivieren'}
                    className="btn-ghost p-1.5">
                    {s.enabled ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 3.5L19 12 5 20.5z"/>
                      </svg>
                    )}
                  </button>
                  <button onClick={() => remove(s.id)} title="Löschen"
                    className="btn-ghost p-1.5 hover:text-red-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vinted Cookie Info */}
        <div className="card border-yellow-800 bg-yellow-900/20">
          <p className="text-yellow-300 font-medium text-sm mb-1">Vinted-Session benötigt</p>
          <p className="text-yellow-200/70 text-xs">
            Vinted erfordert eine aktive Sitzung. Wenn Vinted-Suchen fehlschlagen, aktivier
            die Chrome Extension — sie synchronisiert automatisch deine Vinted-Cookies.
          </p>
        </div>
      </div>
    </div>
  )
}
