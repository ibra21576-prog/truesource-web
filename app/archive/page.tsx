'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; first_scan?: boolean; searches?: { query: string }; search_query?: string
}

const PAGE_SIZE = 25

export default function ArchivePage() {
  const [items,    setItems]    = useState<Item[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [platform, setPlatform] = useState('')
  const [page,     setPage]     = useState(1)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (platform) params.set('platform', platform)
    const res = await fetch(`/api/feed?${params}`)
    if (res.ok) setItems((await res.json()).map((it: any) => ({ ...it, search_query: it.searches?.query })))
    setLoading(false)
  }, [platform])

  useEffect(() => { load() }, [platform])

  // Reset to page 1 whenever filter/search changes
  useEffect(() => { setPage(1) }, [search, platform])

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const filters = [
    { value: '',              label: 'All' },
    { value: 'vinted',        label: 'Vinted' },
    { value: 'ebay',          label: 'eBay' },
    { value: 'kleinanzeigen', label: 'Kleinanzeigen' },
    { value: 'gumtree',       label: 'Gumtree' },
    { value: 'kijiji',        label: 'Kijiji' },
    { value: 'craigslist',    label: 'Craigslist' },
  ]

  // Build page numbers to show: always first, last, and a window around current
  function pageNumbers(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const result: (number | '…')[] = []
    const around = Array.from(new Set([1, totalPages, safePage - 1, safePage, safePage + 1].filter(n => n >= 1 && n <= totalPages))).sort((a, b) => a - b)
    let prev = 0
    for (const n of around) {
      if (n - prev > 1) result.push('…')
      result.push(n)
      prev = n
    }
    return result
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">

        {/* Page header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, marginBottom: 28, flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.03em', color: 'var(--text)' }}>
              Archive
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6, lineHeight: 1.6 }}>
              {filtered.length} of {items.length} listings
              {totalPages > 1 && <span style={{ color: 'var(--text3)' }}> · Seite {safePage} von {totalPages}</span>}
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
          display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 300 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search archive…"
              style={{ paddingLeft: 36 }}
            />
            <svg width="13" height="13" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

          <div style={{ display: 'flex', gap: 4 }}>
            {filters.map(f => {
              const active = platform === f.value
              return (
                <button key={f.value} onClick={() => setPlatform(f.value)} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'Geist, -apple-system, system-ui, sans-serif',
                  border: 'none', transition: 'all 0.15s ease',
                  ...(active
                    ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }
                    : { background: 'transparent', color: 'var(--text3)' }),
                }}>
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 14 }}>
            <span className="spin" style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', display: 'inline-block',
            }} />
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Loading archive…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12, background: 'var(--surface)',
              border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="22" height="22" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 24 24">
                <polyline points="21 8 21 21 3 21 3 8"/>
                <rect x="1" y="3" width="22" height="5"/>
                <line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.01em' }}>
              Archive is empty
            </p>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
              {search ? 'No results for your search query.' : 'Listings will be saved here automatically.'}
            </p>
          </div>
        ) : (
          <>
            <div className="stagger" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: 14,
            }}>
              {pageItems.map(item => <ItemCard key={item.id} item={item} variant="grid" />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 4, marginTop: 28, flexWrap: 'wrap',
              }}>
                {/* Previous */}
                <button
                  onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={safePage === 1}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    cursor: safePage === 1 ? 'default' : 'pointer',
                    border: '1px solid var(--border)',
                    background: 'var(--card)', color: safePage === 1 ? 'var(--text3)' : 'var(--text)',
                    fontFamily: 'Geist, -apple-system, system-ui, sans-serif',
                    transition: 'all 0.15s', opacity: safePage === 1 ? 0.4 : 1,
                  }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                  Zurück
                </button>

                {/* Page numbers */}
                {pageNumbers().map((n, i) =>
                  n === '…' ? (
                    <span key={`ellipsis-${i}`} style={{ color: 'var(--text3)', padding: '0 4px', fontSize: 13 }}>…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => { setPage(n as number); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      style={{
                        width: 36, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', border: '1px solid',
                        fontFamily: 'Geist, -apple-system, system-ui, sans-serif',
                        transition: 'all 0.15s',
                        ...(n === safePage
                          ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
                          : { background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text2)' }),
                      }}
                    >
                      {n}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={safePage === totalPages}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    cursor: safePage === totalPages ? 'default' : 'pointer',
                    border: '1px solid var(--border)',
                    background: 'var(--card)', color: safePage === totalPages ? 'var(--text3)' : 'var(--text)',
                    fontFamily: 'Geist, -apple-system, system-ui, sans-serif',
                    transition: 'all 0.15s', opacity: safePage === totalPages ? 0.4 : 1,
                  }}
                >
                  Weiter
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
