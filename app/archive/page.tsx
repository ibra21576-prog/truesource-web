'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; first_scan?: boolean; searches?: { query: string }; search_query?: string
}

const PLATFORM_FILTERS = [
  { value: '', label: 'Alle Plattformen' },
  { value: 'vinted', label: 'Vinted', color: '#2dd4bf' },
  { value: 'ebay', label: 'eBay', color: '#fbbf24' },
  { value: 'kleinanzeigen', label: 'Kleinanzeigen', color: '#fb923c' },
]

export default function ArchivePage() {
  const [items,    setItems]    = useState<Item[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [platform, setPlatform] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (platform) params.set('platform', platform)
    const res = await fetch(`/api/feed?${params}`)
    if (res.ok) setItems((await res.json()).map((it: any) => ({ ...it, search_query: it.searches?.query })))
    setLoading(false)
  }, [platform])

  useEffect(() => { load() }, [platform])

  async function clearAll() {
    if (!confirm('Gesamtes Archiv unwiderruflich löschen?')) return
    await fetch('/api/feed', { method: 'DELETE' })
    setItems([])
  }

  const filtered = items.filter(it => {
    if (!search) return true
    const q = search.toLowerCase()
    return (it.title || '').toLowerCase().includes(q) || (it.search_query || '').toLowerCase().includes(q)
  })

  return (
    <div style={{ minHeight: '100vh', background: '#06080f' }}>
      <Navigation />

      {/* Hero */}
      <div style={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: '20%', width: 400, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,240,197,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f0f6ff', letterSpacing: '-0.03em', margin: 0 }}>Archiv</h1>
            <p style={{ fontSize: 13, color: '#3a5470', marginTop: 6, fontWeight: 500 }}>
              {filtered.length} von {items.length} gespeicherten Listings
            </p>
          </div>
          <button onClick={clearAll} className="btn-danger" style={{ fontSize: 13 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Alles löschen
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Im Archiv suchen…" style={{ paddingLeft: 40 }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e4460" strokeWidth="2" strokeLinecap="round"
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {PLATFORM_FILTERS.map(pf => (
              <button key={pf.value} onClick={() => setPlatform(pf.value)}
                style={{
                  padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                  ...(platform === pf.value ? {
                    background: pf.color ? `${pf.color}15` : 'rgba(59,240,197,0.1)',
                    borderColor: pf.color ? `${pf.color}30` : 'rgba(59,240,197,0.25)',
                    color: pf.color || '#3bf0c5',
                  } : {
                    background: 'rgba(255,255,255,0.025)',
                    borderColor: 'rgba(255,255,255,0.07)',
                    color: '#4a6a88',
                  }),
                }}>
                {pf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', gap: 16 }}>
            <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(59,240,197,0.12)', borderTop: '3px solid #3bf0c5', borderRadius: '50%' }} />
            <p style={{ color: '#3a5470', fontSize: 14 }}>Lade Archiv…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round">
                <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#f0f6ff', marginBottom: 8 }}>Archiv ist leer</p>
              <p style={{ color: '#3a5470', fontSize: 13, lineHeight: 1.6 }}>
                {search ? 'Keine Treffer für diese Suche.' : 'Neue Listings werden hier automatisch gespeichert.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
