'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; first_scan?: boolean; searches?: { query: string }
  search_query?: string
}

interface Search {
  id: string; query: string; platform: string; domain: string; enabled: boolean
}

export default function DashboardPage() {
  const [items,    setItems]    = useState<Item[]>([])
  const [searches, setSearches] = useState<Search[]>([])
  const [loading,  setLoading]  = useState(true)
  const [scraping, setScraping] = useState<Record<string, boolean>>({})
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  const loadFeed = useCallback(async () => {
    const res = await fetch('/api/feed')
    if (res.ok) {
      const data = await res.json()
      setItems(data.map((it: any) => ({ ...it, search_query: it.searches?.query })))
    }
    setLoading(false)
  }, [])

  const loadSearches = useCallback(async () => {
    const res = await fetch('/api/searches')
    if (res.ok) setSearches((await res.json()).filter((s: Search) => s.enabled))
  }, [])

  useEffect(() => {
    loadFeed(); loadSearches()
    const iv = setInterval(loadFeed, 60000)
    return () => clearInterval(iv)
  }, [])

  async function refresh(searchId: string) {
    setScraping(s => ({ ...s, [searchId]: true }))
    setErrors(e => { const n = { ...e }; delete n[searchId]; return n })
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadFeed()
    } catch (e: any) {
      setErrors(s => ({ ...s, [searchId]: e.message }))
    } finally {
      setScraping(s => ({ ...s, [searchId]: false }))
    }
  }

  async function refreshAll() {
    await loadSearches()
    for (const s of searches) await refresh(s.id)
  }

  const anyLoading = Object.values(scraping).some(Boolean)

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="section-title mb-1">Feed</h1>
            <p className="text-sm" style={{ color: '#4a6a88' }}>
              Neue Listings in Echtzeit
            </p>
          </div>
          <button onClick={refreshAll} disabled={searches.length === 0 || anyLoading}
            className="btn-primary shrink-0 flex items-center gap-2">
            {anyLoading ? (
              <span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M8 16H3v5"/>
              </svg>
            )}
            Aktualisieren
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-chip">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59,240,197,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3bf0c5" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{items.length}</div>
              <div className="text-xs" style={{ color: '#4a6a88' }}>Listings</div>
            </div>
          </div>
          <div className="stat-chip">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{searches.length}</div>
              <div className="text-xs" style={{ color: '#4a6a88' }}>Aktive Suchen</div>
            </div>
          </div>
          <div className="stat-chip">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(34,197,94,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{items.filter(i => i.first_scan === false).length}</div>
              <div className="text-xs" style={{ color: '#4a6a88' }}>Neue heute</div>
            </div>
          </div>
        </div>

        {/* Per-search refresh buttons */}
        {searches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {searches.map(s => (
              <div key={s.id}>
                <button onClick={() => refresh(s.id)} disabled={scraping[s.id]}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                  style={scraping[s.id] ? { opacity: 0.6 } : {}}>
                  {scraping[s.id]
                    ? <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
                      </svg>
                  }
                  {s.query}
                  <span className="text-xs" style={{ color: '#4a6a88' }}>· {s.platform}</span>
                </button>
                {errors[s.id] && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors[s.id]}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p style={{ color: '#4a6a88' }} className="text-sm">Lade Feed…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(59,240,197,0.06)', border: '1px solid rgba(59,240,197,0.12)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3bf0c5" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Noch keine Ergebnisse</p>
              <p className="text-sm" style={{ color: '#4a6a88' }}>
                Erstelle zuerst eine Suche unter <a href="/searches" style={{ color: '#3bf0c5' }}>Suchen</a>,<br />
                dann klick &quot;Aktualisieren&quot;.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
