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

export default function ArchivePage() {
  const [items,    setItems]    = useState<Item[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [platform, setPlatform] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (platform) params.set('platform', platform)
    const res = await fetch(`/api/feed?${params}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.map((it: any) => ({ ...it, search_query: it.searches?.query })))
    }
    setLoading(false)
  }, [platform])

  useEffect(() => { load() }, [platform])

  async function clearAll() {
    if (!confirm('Gesamtes Archiv löschen?')) return
    await fetch('/api/feed', { method: 'DELETE' })
    setItems([])
  }

  const filtered = items.filter(it => {
    if (!search) return true
    const q = search.toLowerCase()
    return (it.title || '').toLowerCase().includes(q)
        || (it.search_query || '').toLowerCase().includes(q)
  })

  const platforms = [
    { value: '', label: 'Alle' },
    { value: 'vinted', label: 'Vinted' },
    { value: 'ebay', label: 'eBay' },
    { value: 'kleinanzeigen', label: 'Kleinanzeigen' },
  ]

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="section-title mb-1">Archiv</h1>
            <p className="text-sm" style={{ color: '#4a6a88' }}>
              {filtered.length} von {items.length} Listings
            </p>
          </div>
          <button onClick={clearAll} className="btn-danger text-sm flex items-center gap-2 shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
            </svg>
            Löschen
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Im Archiv suchen…"
              style={{ paddingLeft: 38 }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3a5470" strokeWidth="2"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          {/* Platform pills */}
          <div className="flex gap-2 flex-wrap">
            {platforms.map(p => (
              <button key={p.value} onClick={() => setPlatform(p.value)}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={platform === p.value ? {
                  background: 'rgba(59,240,197,0.1)',
                  border: '1px solid rgba(59,240,197,0.25)',
                  color: '#3bf0c5',
                } : {
                  background: '#111827',
                  border: '1px solid #1e2d42',
                  color: '#6b87a0',
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p style={{ color: '#4a6a88' }} className="text-sm">Lade Archiv…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
                <polyline points="21 8 21 21 3 21 3 8"/>
                <rect x="1" y="3" width="22" height="5"/>
                <line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Noch keine Einträge</p>
              <p className="text-sm" style={{ color: '#4a6a88' }}>Neue Listings werden automatisch hier gespeichert.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
