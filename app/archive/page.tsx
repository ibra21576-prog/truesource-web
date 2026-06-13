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
    { value: '', label: 'All', color: '' },
    { value: 'vinted', label: 'Vinted', color: '#3df5c8' },
    { value: 'ebay', label: 'eBay', color: '#fbbf24' },
    { value: 'kleinanzeigen', label: 'Kleinanzeigen', color: '#fb923c' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Archive</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{filtered.length} of {items.length} listings</p>
          </div>
          <button onClick={clearAll} className="btn-danger" style={{ fontSize: 13 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Clear All
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 300 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search archive…" style={{ paddingLeft: 36 }} />
            <svg width="14" height="14" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {filters.map(f => (
              <button key={f.value} onClick={() => setPlatform(f.value)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  ...(platform === f.value
                    ? { background: f.color ? `${f.color}15` : 'rgba(61,245,200,0.1)', border: `1.5px solid ${f.color || 'var(--accent)'}40`, color: f.color || 'var(--accent)' }
                    : { background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--text3)' }
                  ),
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 14 }}>
            <span className="spin" style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', display: 'inline-block' }} />
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Loading archive…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 24px', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>Archive is empty</p>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>{search ? 'No results for your search.' : 'Listings will be saved here automatically.'}</p>
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
