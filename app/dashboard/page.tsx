'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'
import Logo from '@/components/Logo'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; first_scan?: boolean; searches?: { query: string }; search_query?: string
}
interface Search { id: string; query: string; platform: string; domain: string; enabled: boolean }

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
      const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchId }) })
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
    const fresh = await fetch('/api/searches').then(r => r.json()).catch(() => [])
    const active = Array.isArray(fresh) ? fresh.filter((s: Search) => s.enabled) : searches
    setSearches(active)
    for (const s of active) await refresh(s.id)
  }

  const anyLoading = Object.values(scraping).some(Boolean)
  const newCount = items.filter(i => i.first_scan === false).length

  return (
    <div style={{ minHeight: '100vh', background: '#06080f' }}>
      <Navigation />

      {/* Hero banner */}
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -80, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,240,197,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -60, right: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div className="animate-float">
                <Logo size={56} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f0f6ff', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
                  Deal Feed
                </h1>
                <p style={{ fontSize: 13, color: '#3a5470', marginTop: 4, fontWeight: 500 }}>
                  Echtzeit-Listings · Vinted, eBay & Kleinanzeigen
                </p>
              </div>
            </div>

            <button onClick={refreshAll} disabled={searches.length === 0 || anyLoading}
              className="btn-primary">
              {anyLoading
                ? <><span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.3)', borderTop: '2px solid #06080f', borderRadius: '50%', display: 'inline-block' }} />Suche läuft…</>
                : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>Alle aktualisieren</>
              }
            </button>
          </div>

          {/* Stats row */}
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 28 }}>
            {[
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3bf0c5" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, color: '#3bf0c5', bg: 'rgba(59,240,197,0.08)', border: 'rgba(59,240,197,0.12)', value: items.length, label: 'Listings gesamt' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.12)', value: searches.length, label: 'Aktive Suchen' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.12)', value: newCount, label: 'Neue Listings' },
            ].map((s, i) => (
              <div key={i} className="animate-slide-up stat-card">
                <div className="stat-icon" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#f0f6ff', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#3a5470', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Per-search buttons */}
        {searches.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {searches.map(s => (
              <div key={s.id}>
                <button onClick={() => refresh(s.id)} disabled={scraping[s.id]} className="btn-secondary" style={{ fontSize: 13 }}>
                  {scraping[s.id]
                    ? <span className="animate-spin" style={{ width: 12, height: 12, border: '2px solid rgba(59,240,197,0.3)', borderTop: '2px solid #3bf0c5', borderRadius: '50%', display: 'inline-block' }} />
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                  }
                  {s.query}
                  <span style={{ color: '#3a5470', fontSize: 11 }}>· {s.platform}</span>
                </button>
                {errors[s.id] && <p style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{errors[s.id]}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', gap: 16 }}>
            <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(59,240,197,0.15)', borderTop: '3px solid #3bf0c5', borderRadius: '50%' }} />
            <p style={{ color: '#3a5470', fontSize: 14 }}>Lade Feed…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="animate-float">
              <Logo size={64} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#f0f6ff', marginBottom: 8 }}>Noch keine Listings</p>
              <p style={{ color: '#3a5470', fontSize: 14, lineHeight: 1.6 }}>
                Erstelle zuerst eine Suche unter{' '}
                <a href="/searches" style={{ color: '#3bf0c5', fontWeight: 600 }}>Suchen</a>
                {' '}— dann klick &quot;Alle aktualisieren&quot;.
              </p>
            </div>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
