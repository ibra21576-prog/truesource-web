'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; first_scan?: boolean; searches?: { query: string }; search_query?: string
}
interface Search { id: string; query: string; platform: string; domain: string; enabled: boolean }

const PLAT_COLOR: Record<string, string> = { vinted: '#3df5c8', ebay: '#fbbf24', kleinanzeigen: '#fb923c' }

export default function DashboardPage() {
  const [items,    setItems]    = useState<Item[]>([])
  const [searches, setSearches] = useState<Search[]>([])
  const [loading,  setLoading]  = useState(true)
  const [scraping, setScraping] = useState<Record<string, boolean>>({})
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  const loadFeed = useCallback(async () => {
    const res = await fetch('/api/feed')
    if (res.ok) setItems((await res.json()).map((it: any) => ({ ...it, search_query: it.searches?.query })))
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

  async function scrape(searchId: string) {
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
    const active: Search[] = Array.isArray(fresh) ? fresh.filter((s: Search) => s.enabled) : searches
    setSearches(active)
    for (const s of active) await scrape(s.id)
  }

  const anyLoading = Object.values(scraping).some(Boolean)
  const newItems = items.filter(i => i.first_scan === false).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />

      <div className="page">

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Deal Feed</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Neue Listings auf einen Blick</p>
          </div>
          <button onClick={refreshAll} disabled={searches.length === 0 || anyLoading} className="btn-primary">
            {anyLoading
              ? <><span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid var(--bg)', display: 'inline-block' }} />Lädt…</>
              : <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>Alle aktualisieren</>
            }
          </button>
        </div>

        {/* Stats */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Listings gesamt', value: items.length, color: 'var(--accent)',   icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
            { label: 'Aktive Suchen',   value: searches.length, color: '#818cf8',      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
            { label: 'Neue Listings',   value: newItems, color: 'var(--success)',       icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
          ].map((s, i) => (
            <div key={i} className="anim-in" style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}15`, border: `1px solid ${s.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Individual refresh buttons */}
        {searches.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {searches.map(s => (
              <div key={s.id}>
                <button onClick={() => scrape(s.id)} disabled={scraping[s.id]} className="btn-secondary" style={{ fontSize: 13, padding: '7px 14px', gap: 6 }}>
                  {scraping[s.id]
                    ? <span className="spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border2)', borderTop: `2px solid ${PLAT_COLOR[s.platform] ?? 'var(--accent)'}`, display: 'inline-block' }} />
                    : <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                  }
                  {s.query}
                  <span style={{ color: 'var(--text3)', fontSize: 11 }}>· {s.platform}</span>
                </button>
                {errors[s.id] && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors[s.id]}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Feed list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 16 }}>
            <span className="spin" style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', display: 'inline-block' }} />
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Lade Feed…</p>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 24px', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(61,245,200,0.06)', border: '1px solid rgba(61,245,200,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>Noch keine Listings</p>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
              Gehe zu <a href="/searches" style={{ color: 'var(--accent)', fontWeight: 600 }}>Suchen</a>, erstelle eine Suche und klick dann &quot;Alle aktualisieren&quot;.
            </p>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
