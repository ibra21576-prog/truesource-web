'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; first_scan?: boolean; searches?: { query: string }; search_query?: string
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
    if (res.ok) setItems((await res.json()).map((it: any) => ({ ...it, search_query: it.searches?.query })))
    setLoading(false)
  }, [platform])

  useEffect(() => { load() }, [platform])

  async function clearAll() {
    if (!confirm('Delete the entire archive? This cannot be undone.')) return
    await fetch('/api/feed', { method: 'DELETE' })
    setItems([])
  }

  const filtered = items.filter(it => {
    if (!search) return true
    const q = search.toLowerCase()
    return (it.title || '').toLowerCase().includes(q) || (it.search_query || '').toLowerCase().includes(q)
  })

  const filters = [
    { value: '',             label: 'All',          color: 'var(--purple)', glow: 'rgba(129,140,248,0.12)' },
    { value: 'vinted',       label: 'Vinted',       color: '#3df5c8',       glow: 'rgba(61,245,200,0.12)' },
    { value: 'ebay',         label: 'eBay',         color: '#fbbf24',       glow: 'rgba(251,191,36,0.12)' },
    { value: 'kleinanzeigen',label: 'Kleinanzeigen',color: '#fb923c',       glow: 'rgba(251,146,60,0.12)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">

        {/* Page header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, marginBottom: 32, flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{
              fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #edf2ff 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Archive</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6, letterSpacing: '0.01em' }}>
              {filtered.length} of {items.length} listings
            </p>
          </div>
          <button onClick={clearAll} className="btn-danger" style={{ fontSize: 13 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Clear All
          </button>
        </div>

        {/* Filters bar */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center',
          background: 'rgba(20,24,36,0.5)',
          border: '1px solid var(--border)',
          borderRadius: 16, padding: '12px 16px',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Search input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 320 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search archive…"
              style={{ paddingLeft: 38 }}
            />
            <svg width="14" height="14" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

          {/* Platform filters */}
          <div style={{ display: 'flex', gap: 6 }}>
            {filters.map(f => {
              const active = platform === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => setPlatform(f.value)}
                  style={{
                    padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                    letterSpacing: '-0.01em',
                    ...(active
                      ? {
                          background: `${f.color}12`,
                          border: `1.5px solid ${f.color}40`,
                          color: f.color,
                          boxShadow: `0 0 14px ${f.glow}`,
                          transform: 'translateY(-1px)',
                        }
                      : {
                          background: 'transparent',
                          border: '1.5px solid transparent',
                          color: 'var(--text3)',
                        }
                    ),
                  }}>
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 0', gap: 16 }}>
            <span className="spin" style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '2px solid var(--border)',
              borderTop: '2px solid var(--accent)',
              display: 'inline-block',
              boxShadow: '0 0 20px rgba(61,245,200,0.15)',
            }} />
            <p style={{ color: 'var(--text3)', fontSize: 14, letterSpacing: '0.01em' }}>Loading archive…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            background: 'rgba(20,24,36,0.6)',
            border: '1.5px solid var(--border)',
            borderRadius: 20,
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'rgba(129,140,248,0.06)',
              border: '1px solid rgba(129,140,248,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 0 20px rgba(129,140,248,0.06)',
            }}>
              <svg width="24" height="24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 24 24">
                <polyline points="21 8 21 21 3 21 3 8"/>
                <rect x="1" y="3" width="22" height="5"/>
                <line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
            </div>
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.03em' }}>
              Archive is empty
            </p>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
              {search ? 'No results for your search query.' : 'Listings will be saved here automatically.'}
            </p>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}

      </div>
    </div>
  )
}
