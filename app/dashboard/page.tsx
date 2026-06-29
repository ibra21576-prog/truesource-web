'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; posted_at?: string | null; first_scan?: boolean; searches?: { query: string }; search_query?: string
}
interface Search { id: string; query: string; platform: string; domain: string; enabled: boolean }
interface Me { userId: string; username: string; memberSince?: string }

const PLAT_COLOR: Record<string, string> = {
  vinted: '#14b8a6', ebay: '#f59e0b', kleinanzeigen: '#f97316',
  gumtree: '#00b140', kijiji: '#6d28d9', craigslist: '#7c3aed',
  shpock: '#e91e8c', marktplaats: '#d32f2f', leboncoin: '#1565c0',
}
const PLAT_LABEL: Record<string, string> = {
  vinted: 'Vinted', ebay: 'eBay', kleinanzeigen: 'Kleinanzeigen',
  gumtree: 'Gumtree', kijiji: 'Kijiji', craigslist: 'Craigslist',
  shpock: 'Shpock', marktplaats: 'Marktplaats', leboncoin: 'Leboncoin',
}
const FEED_INTERVAL = 5 * 1000
const SCRAPE_INTERVAL = 30 * 1000

function parsePriceNum(price?: string): number {
  if (!price) return -1
  const n = parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.'))
  return isNaN(n) ? -1 : n
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'; osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
    setTimeout(() => ctx.close(), 600)
  } catch {}
}

function memberDuration(since?: string) {
  if (!since) return null
  const ms = Date.now() - new Date(since).getTime()
  const days = Math.floor(ms / 86400000)
  if (days < 1) return 'since today'
  if (days === 1) return 'for 1 day'
  if (days < 30) return `for ${days} days`
  const months = Math.floor(days / 30)
  if (months === 1) return 'for 1 month'
  if (months < 12) return `for ${months} months`
  const years = Math.floor(months / 12)
  return years === 1 ? 'for 1 year' : `for ${years} years`
}

function SetupGuide({ hasSearches }: { hasSearches: boolean }) {
  const steps = [
    {
      num: 1, done: hasSearches,
      title: 'Add a search',
      desc: 'What are you looking for? e.g. "PlayStation 5", "Nike Air Max 90", "iPhone 15".',
      action: { label: 'Create search →', href: '/searches' },
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    },
    {
      num: 2, done: false,
      title: 'Listings appear automatically',
      desc: 'TrueSource scans 9 platforms every minute — new deals show up here instantly.',
      action: null,
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
  ]
  const nextStep = steps.find(s => !s.done)
  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Get started in 2 steps</h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6, lineHeight: 1.6 }}>TrueSource will automatically find new deals for you.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => {
          const isNext = step === nextStep
          const isPast = step.done
          const isFuture = !isPast && !isNext
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 18px',
              background: isPast ? 'var(--surface)' : isNext ? 'var(--card)' : 'var(--bg)',
              border: `1px solid ${isPast ? 'rgba(20,184,166,0.2)' : 'var(--border)'}`,
              borderRadius: 12, opacity: isFuture ? 0.4 : 1,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isPast ? 'rgba(20,184,166,0.1)' : isNext ? 'var(--surface)' : 'var(--border)',
                border: `1px solid ${isPast ? 'rgba(20,184,166,0.3)' : 'var(--border)'}`,
                color: isPast ? 'var(--accent)' : isNext ? 'var(--text2)' : 'var(--text3)',
              }}>
                {isPast
                  ? <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  : step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Step {step.num}</span>
                  {isPast && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'rgba(20,184,166,0.1)', padding: '1px 7px', borderRadius: 4, border: '1px solid rgba(20,184,166,0.2)' }}>Done</span>}
                  {isNext && <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--accent)', padding: '1px 7px', borderRadius: 4, color: '#fff' }}>Now</span>}
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 3 }}>{step.title}</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                {step.action && isNext && (
                  <a href={step.action.href} style={{
                    display: 'inline-flex', alignItems: 'center', marginTop: 12,
                    padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff',
                    fontWeight: 600, fontSize: 13, textDecoration: 'none',
                  }}>{step.action.label}</a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [items,        setItems]        = useState<Item[]>([])
  const [searches,     setSearches]     = useState<Search[]>([])
  const [loading,      setLoading]      = useState(true)
  const [scraping,     setScraping]     = useState<Record<string, boolean>>({})
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [me,           setMe]           = useState<Me | null>(null)
  const [nextScan,     setNextScan]     = useState(SCRAPE_INTERVAL / 1000)

  // "über krass" features
  const [platFilter,   setPlatFilter]   = useState<string>('all')
  const [sortMode,     setSortMode]     = useState<'newest' | 'cheapest' | 'expensive'>('newest')
  const [dismissed,    setDismissed]    = useState<Set<string>>(new Set())
  const [soundOn,      setSoundOn]      = useState(false)
  const [notifPerm,    setNotifPerm]    = useState<NotificationPermission>('default')
  const [newCount,     setNewCount]     = useState(0)
  const [srvAgo,       setSrvAgo]       = useState<number | null>(null)  // seconds since server last scraped

  const searchesRef  = useRef<Search[]>([])
  const knownIdsRef  = useRef<Set<string>>(new Set())
  const firstLoadRef = useRef(true)

  // Load dismissed from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ts_dismissed')
      if (saved) setDismissed(new Set(JSON.parse(saved)))
    } catch {}
    if (typeof Notification !== 'undefined') setNotifPerm(Notification.permission)
  }, [])

  // Poll the server-side scrape heartbeat so the user can SEE it's running 24/7
  useEffect(() => {
    const pull = async () => {
      try {
        const r = await fetch('/api/status')
        if (r.ok) { const d = await r.json(); setSrvAgo(d.secondsSinceLastScrape ?? null) }
      } catch {}
    }
    pull()
    const iv = setInterval(pull, 20000)
    return () => clearInterval(iv)
  }, [])

  function dismiss(itemId: string) {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(itemId)
      try { localStorage.setItem('ts_dismissed', JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  async function requestNotifications() {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
  }

  function fireNotification(item: Item) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      const n = new Notification(`🔥 ${item.platform.toUpperCase()} — ${item.price || 'No price'}`, {
        body: item.title || 'New listing found',
        icon: '/logo.png',
        tag: item.id,
      })
      n.onclick = () => { window.open(item.url, '_blank'); n.close() }
    } catch {}
  }

  const loadFeed = useCallback(async () => {
    const res = await fetch('/api/feed')
    if (!res.ok) { setLoading(false); return }
    const raw: Item[] = (await res.json()).map((it: any) => ({ ...it, search_query: it.searches?.query }))

    if (!firstLoadRef.current) {
      // Find truly new items (IDs we haven't seen yet)
      const newItems = raw.filter(it => !knownIdsRef.current.has(it.id))
      if (newItems.length > 0) {
        setNewCount(n => n + newItems.length)
        if (soundOn) playBeep()
        // Notify for first 3 to avoid spam
        newItems.slice(0, 3).forEach(it => fireNotification(it))
      }
    }

    // Update known IDs
    raw.forEach(it => knownIdsRef.current.add(it.id))
    firstLoadRef.current = false

    setItems(raw)
    setLoading(false)
  }, [soundOn])

  const loadSearches = useCallback(async () => {
    const res = await fetch('/api/searches')
    if (res.ok) {
      const active = (await res.json()).filter((s: Search) => s.enabled)
      setSearches(active)
      searchesRef.current = active
    }
  }, [])

  async function scrapeOne(searchId: string) {
    setScraping(s => ({ ...s, [searchId]: true }))
    setErrors(e => { const n = { ...e }; delete n[searchId]; return n })
    try {
      const res = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
    } catch (e: any) {
      setErrors(s => ({ ...s, [searchId]: e.message }))
    } finally {
      setScraping(s => ({ ...s, [searchId]: false }))
    }
  }

  async function scrapeAll(list?: Search[]) {
    const targets = list ?? searchesRef.current
    if (targets.length === 0) return
    await Promise.all(targets.map(s => scrapeOne(s.id)))
    await loadFeed()
  }

  useEffect(() => {
    loadFeed(); loadSearches()
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(setMe)

    const feedIv = setInterval(loadFeed, FEED_INTERVAL)
    const scrapeIv = setInterval(() => { scrapeAll(); setNextScan(SCRAPE_INTERVAL / 1000) }, SCRAPE_INTERVAL)
    const countIv  = setInterval(() => setNextScan(n => Math.max(0, n - 1)), 1000)

    return () => { clearInterval(feedIv); clearInterval(scrapeIv); clearInterval(countIv) }
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => { await loadSearches(); scrapeAll() }, 3000)
    return () => clearTimeout(t)
  }, [])

  // Re-run loadFeed when soundOn changes so the closure captures the latest value
  useEffect(() => {
    const iv = setInterval(loadFeed, FEED_INTERVAL)
    return () => clearInterval(iv)
  }, [loadFeed])

  const anyLoading = Object.values(scraping).some(Boolean)

  // Platforms that have items
  const platsWithItems = Array.from(new Set(items.map(i => i.platform))).sort()

  // Filtered + sorted items
  const visibleItems = items
    .filter(it => !dismissed.has(it.id))
    .filter(it => platFilter === 'all' || it.platform === platFilter)
    .sort((a, b) => {
      if (sortMode === 'newest') return new Date(b.found_at).getTime() - new Date(a.found_at).getTime()
      const pa = parsePriceNum(a.price), pb = parsePriceNum(b.price)
      if (sortMode === 'cheapest') {
        if (pa < 0 && pb < 0) return 0
        if (pa < 0) return 1
        if (pb < 0) return -1
        return pa - pb
      }
      // expensive: descending
      if (pa < 0 && pb < 0) return 0
      if (pa < 0) return 1
      if (pb < 0) return -1
      return pb - pa
    })

  // "New" = posted (or discovered) in the last 5 minutes (matches ItemCard)
  const isFresh = (it: Item) => Date.now() - new Date(it.posted_at || it.found_at).getTime() < 5 * 60_000
  const newToday = items.filter(isFresh).length

  function fmtCountdown(s: number) {
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">

        {/* Welcome card */}
        {me && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src="/logo.png" alt="TrueSource" width={32} height={32} style={{ borderRadius: 7, display: 'block' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>TrueSource Member</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Welcome back, <span style={{ color: 'var(--accent)' }}>{me.username}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>Subscribed {memberDuration(me.memberSince) ?? 'recently'}</div>
            </div>
            {(() => {
              const live = srvAgo != null && srvAgo < 150
              const label = srvAgo == null ? 'Checking…'
                : srvAgo < 90 ? 'Scraping live'
                : srvAgo < 150 ? 'Scraping live'
                : `Last scrape ${srvAgo < 3600 ? Math.round(srvAgo/60)+'m' : Math.round(srvAgo/3600)+'h'} ago`
              return (
                <div title={srvAgo != null ? `Server last scraped ${srvAgo}s ago` : ''} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'var(--surface)',
                  border: `1px solid ${live ? 'rgba(20,184,166,0.4)' : 'rgba(245,158,11,0.4)'}`,
                  borderRadius: 6, padding: '6px 12px',
                }}>
                  <div className="live-dot" style={live ? undefined : { background: '#f59e0b', boxShadow: 'none', animation: 'none' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: live ? 'var(--accent)' : '#f59e0b' }}>{label}</span>
                </div>
              )
            })()}
          </div>
        )}

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: '-0.035em', display: 'inline-flex', alignItems: 'center' }}>
              Live Feed
              {newCount > 0 && (
                <span style={{
                  marginLeft: 12, fontSize: 13, fontWeight: 700,
                  background: 'var(--grad-accent)', color: '#04201c',
                  borderRadius: 20, padding: '3px 11px', verticalAlign: 'middle',
                  boxShadow: '0 4px 14px rgba(22,194,174,0.4)',
                  WebkitTextFillColor: '#04201c',
                }}>+{newCount} new</span>
              )}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4, lineHeight: 1.6 }}>New listings in real time across 9 platforms</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Sound toggle */}
            <button
              onClick={() => setSoundOn(v => !v)}
              title={soundOn ? 'Sound ON — click to disable' : 'Sound OFF — click to enable'}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: soundOn ? 'rgba(20,184,166,0.12)' : 'var(--card)',
                border: `1px solid ${soundOn ? 'rgba(20,184,166,0.4)' : 'var(--border)'}`,
                color: soundOn ? 'var(--accent)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {soundOn ? '🔔' : '🔕'} Sound
            </button>

            {/* Notification bell */}
            <button
              onClick={requestNotifications}
              title={notifPerm === 'granted' ? 'Notifications enabled' : 'Enable browser notifications'}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: notifPerm === 'granted' ? 'rgba(20,184,166,0.12)' : 'var(--card)',
                border: `1px solid ${notifPerm === 'granted' ? 'rgba(20,184,166,0.4)' : 'var(--border)'}`,
                color: notifPerm === 'granted' ? 'var(--accent)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {notifPerm === 'granted' ? '🔔' : '🔔'} {notifPerm === 'granted' ? 'Notifs ON' : 'Notifs'}
            </button>

            {/* Scan countdown */}
            {searches.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
                background: 'var(--card)', border: '1px solid var(--border)',
              }}>
                <svg width="12" height="12" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>
                  {anyLoading ? 'Scanning…' : `Next ${fmtCountdown(nextScan)}`}
                </span>
              </div>
            )}

            {/* Scan now button */}
            <button onClick={() => { setNewCount(0); scrapeAll().then(loadFeed) }} disabled={searches.length === 0 || anyLoading} className="btn-primary">
              {anyLoading
                ? <><span className="spin" style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', display: 'inline-block' }} />Scanning…</>
                : <><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>Scan Now</>
              }
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'Total Listings',  value: items.length,    color: 'var(--accent)', icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
            { label: 'Active Searches', value: searches.length, color: 'var(--purple)', icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
            { label: 'New (5 min)',     value: newToday,        color: 'var(--success)', icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
          ].map((s, i) => (
            <div key={i} className="anim-in" style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.color, flexShrink: 0,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Platform filter tabs + Sort */}
        {items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {/* Platform tabs */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
              {(['all', ...platsWithItems] as string[]).map(plat => {
                const count = plat === 'all' ? items.filter(i => !dismissed.has(i.id)).length : items.filter(i => i.platform === plat && !dismissed.has(i.id)).length
                const active = platFilter === plat
                const col = PLAT_COLOR[plat] || 'var(--accent)'
                return (
                  <button key={plat} onClick={() => setPlatFilter(plat)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: active ? col : 'var(--card)',
                    border: `1.5px solid ${active ? col : 'var(--border)'}`,
                    color: active ? '#fff' : 'var(--text2)',
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {plat === 'all' ? 'All' : PLAT_LABEL[plat] || plat}
                    <span style={{
                      fontSize: 10, fontWeight: 700, lineHeight: 1,
                      background: active ? 'rgba(255,255,255,0.25)' : 'var(--surface)',
                      padding: '2px 5px', borderRadius: 10,
                      color: active ? '#fff' : 'var(--text3)',
                    }}>{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Sort selector */}
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as any)}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: 'var(--card)', border: '1px solid var(--border)',
                color: 'var(--text2)', outline: 'none',
              }}
            >
              <option value="newest">Newest first</option>
              <option value="cheapest">Price: low → high</option>
              <option value="expensive">Price: high → low</option>
            </select>

            {/* Clear dismissed */}
            {dismissed.size > 0 && (
              <button onClick={() => { setDismissed(new Set()); localStorage.removeItem('ts_dismissed') }} style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text3)',
              }}>
                ↩ Show {dismissed.size} hidden
              </button>
            )}
          </div>
        )}

        {/* Per-search quick scrape buttons */}
        {searches.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            {searches.map(s => {
              const err = errors[s.id]
              return (
                <div key={s.id}>
                  <button onClick={() => scrapeOne(s.id).then(loadFeed)} disabled={scraping[s.id]} className="btn-secondary" style={{ fontSize: 13, padding: '5px 12px', gap: 6 }}>
                    {scraping[s.id]
                      ? <span className="spin" style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid var(--border2)', borderTop: `2px solid ${PLAT_COLOR[s.platform] ?? 'var(--accent)'}`, display: 'inline-block' }} />
                      : <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    }
                    {s.query}
                    <span style={{ color: 'var(--text3)', fontSize: 11 }}>· {s.platform}</span>
                  </button>
                  {err && !err.includes('LOGIN_REQUIRED') && (
                    <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{err}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 14 }}>
            <span className="spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', display: 'inline-block' }} />
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Loading feed…</p>
          </div>
        ) : visibleItems.length === 0 && items.length === 0 ? (
          <SetupGuide hasSearches={searches.length > 0} />
        ) : visibleItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)', fontSize: 14 }}>
            No listings match current filter.{' '}
            <button onClick={() => { setPlatFilter('all'); setDismissed(new Set()); localStorage.removeItem('ts_dismissed') }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Reset filters</button>
          </div>
        ) : (
          <div className="stagger" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 14,
          }}>
            {visibleItems.map(item => (
              <div key={item.id} style={{ position: 'relative' }} className={isFresh(item) ? 'item-new' : ''}>
                <ItemCard item={item} variant="grid" />
                {/* Dismiss button */}
                <button
                  onClick={() => dismiss(item.id)}
                  title="Hide this listing"
                  style={{
                    position: 'absolute', top: 6, right: 6, zIndex: 10,
                    width: 24, height: 24, borderRadius: 6,
                    background: 'rgba(0,0,0,0.55)', border: 'none',
                    color: '#fff', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.15s',
                  }}
                  className="dismiss-btn"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .dismiss-btn { opacity: 0 !important; }
        div:hover > .dismiss-btn { opacity: 1 !important; }

        @keyframes itemFlash {
          0%   { box-shadow: 0 0 0 0 rgba(20,184,166,0.6); }
          50%  { box-shadow: 0 0 0 8px rgba(20,184,166,0); }
          100% { box-shadow: 0 0 0 0 rgba(20,184,166,0); }
        }
        .item-new > * {
          animation: itemFlash 1.2s ease-out 1;
          border-color: rgba(20,184,166,0.35) !important;
        }
      `}</style>
    </div>
  )
}
