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
const FEED_INTERVAL = 5_000
const SCRAPE_INTERVAL = 30_000

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
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35)
    setTimeout(() => ctx.close(), 500)
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
      title: 'Create a search',
      desc: 'Enter a product name — e.g. "PlayStation 5", "iPhone 15", "Nike Air Max". TrueSource monitors it across all platforms.',
      action: { label: 'Create search', href: '/searches' },
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
    },
    {
      num: 2, done: false,
      title: 'Listings appear automatically',
      desc: 'TrueSource scans 9 marketplaces every minute — new deals appear here the moment they are posted.',
      action: null,
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
    },
  ]
  const nextStep = steps.find(s => !s.done)
  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '40px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.025em' }}>Get started in 2 steps</h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 8, lineHeight: 1.65 }}>TrueSource will find new deals for you automatically around the clock.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => {
          const isNext = step === nextStep
          const isPast = step.done
          const isFuture = !isPast && !isNext
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px',
              background: isPast ? 'var(--surface)' : isNext ? 'var(--card)' : 'transparent',
              border: `1px solid ${isPast ? 'rgba(20,201,180,0.18)' : isNext ? 'var(--border2)' : 'var(--border)'}`,
              borderRadius: 12, opacity: isFuture ? 0.35 : 1,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isPast ? 'rgba(20,201,180,0.08)' : 'var(--surface)',
                border: `1px solid ${isPast ? 'rgba(20,201,180,0.25)' : 'var(--border)'}`,
                color: isPast ? 'var(--accent)' : isNext ? 'var(--text2)' : 'var(--text3)',
              }}>
                {isPast
                  ? <svg width="15" height="15" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  : step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Step {step.num}</span>
                  {isPast && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent)', background: 'rgba(20,201,180,0.08)', padding: '1px 7px', borderRadius: 4, border: '1px solid rgba(20,201,180,0.18)' }}>Complete</span>}
                  {isNext && <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--accent)', padding: '1px 7px', borderRadius: 4, color: '#04201c' }}>Next</span>}
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 4 }}>{step.title}</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.65 }}>{step.desc}</p>
                {step.action && isNext && (
                  <a href={step.action.href} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
                    padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#04201c',
                    fontWeight: 700, fontSize: 13,
                  }}>{step.action.label}
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </a>
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

  const [platFilter,   setPlatFilter]   = useState<string>('all')
  const [sortMode,     setSortMode]     = useState<'newest' | 'cheapest' | 'expensive'>('newest')
  const [dismissed,    setDismissed]    = useState<Set<string>>(new Set())
  const [soundOn,      setSoundOn]      = useState(false)
  const [notifPerm,    setNotifPerm]    = useState<NotificationPermission>('default')
  const [newCount,     setNewCount]     = useState(0)
  const [archiveItems, setArchiveItems] = useState<Item[]>([])
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [noMoreItems,  setNoMoreItems]  = useState(false)

  const searchesRef  = useRef<Search[]>([])
  const knownIdsRef  = useRef<Set<string>>(new Set())
  const firstLoadRef = useRef(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ts_dismissed')
      if (saved) setDismissed(new Set(JSON.parse(saved)))
    } catch {}
    if (typeof Notification !== 'undefined') setNotifPerm(Notification.permission)
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
      const n = new Notification(`${item.platform.toUpperCase()} — ${item.price || 'No price'}`, {
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
      const newItems = raw.filter(it => !knownIdsRef.current.has(it.id))
      if (newItems.length > 0) {
        setNewCount(n => n + newItems.length)
        if (soundOn) playBeep()
        newItems.slice(0, 3).forEach(it => fireNotification(it))
      }
    }

    raw.forEach(it => knownIdsRef.current.add(it.id))
    firstLoadRef.current = false
    setItems(raw)
    setLoading(false)
    setArchiveItems([])
    setNoMoreItems(false)
  }, [soundOn])

  const loadMoreArchive = useCallback(async () => {
    setLoadingMore(true)
    try {
      const allCurrent = [...items, ...archiveItems]
      if (allCurrent.length === 0) return
      const oldest = allCurrent.reduce((a, b) =>
        new Date(a.found_at).getTime() < new Date(b.found_at).getTime() ? a : b
      )
      const res = await fetch(`/api/feed?before=${encodeURIComponent(oldest.found_at)}&limit=500`)
      if (!res.ok) return
      const raw: Item[] = (await res.json()).map((it: any) => ({ ...it, search_query: it.searches?.query }))
      if (raw.length === 0) { setNoMoreItems(true); return }
      setArchiveItems(prev => {
        const existingIds = new Set([...items, ...prev].map(i => i.id))
        return [...prev, ...raw.filter(i => !existingIds.has(i.id))]
      })
      if (raw.length < 500) setNoMoreItems(true)
    } finally {
      setLoadingMore(false)
    }
  }, [items, archiveItems])

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
    const feedIv   = setInterval(loadFeed, FEED_INTERVAL)
    const scrapeIv = setInterval(() => { scrapeAll(); setNextScan(SCRAPE_INTERVAL / 1000) }, SCRAPE_INTERVAL)
    const countIv  = setInterval(() => setNextScan(n => Math.max(0, n - 1)), 1000)
    return () => { clearInterval(feedIv); clearInterval(scrapeIv); clearInterval(countIv) }
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => { await loadSearches(); scrapeAll() }, 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const iv = setInterval(loadFeed, FEED_INTERVAL)
    return () => clearInterval(iv)
  }, [loadFeed])

  const anyLoading = Object.values(scraping).some(Boolean)

  const allItems = [...items, ...archiveItems]
  const platsWithItems = Array.from(new Set(allItems.map(i => i.platform))).sort()

  const visibleItems = allItems
    .filter(it => !dismissed.has(it.id))
    .filter(it => platFilter === 'all' || it.platform === platFilter)
    .sort((a, b) => {
      if (sortMode === 'newest') return new Date(b.found_at).getTime() - new Date(a.found_at).getTime()
      const pa = parsePriceNum(a.price), pb = parsePriceNum(b.price)
      if (sortMode === 'cheapest') {
        if (pa < 0 && pb < 0) return 0
        if (pa < 0) return 1; if (pb < 0) return -1
        return pa - pb
      }
      if (pa < 0 && pb < 0) return 0
      if (pa < 0) return 1; if (pb < 0) return -1
      return pb - pa
    })

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

        {/* Page header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 16,
          marginBottom: 32, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="gradient-text" style={{
                fontSize: 26, fontWeight: 800, margin: 0,
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>
                Live Feed
              </h1>
              {newCount > 0 && (
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  background: 'var(--grad-accent)', color: '#04201c',
                  borderRadius: 20, padding: '3px 10px',
                  boxShadow: '0 3px 12px rgba(20,201,180,0.35)',
                }}>+{newCount} new</span>
              )}
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>
              Real-time listings across 9 marketplaces
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* Sound */}
            <button
              onClick={() => setSoundOn(v => !v)}
              title={soundOn ? 'Sound enabled' : 'Sound disabled'}
              style={{
                padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                background: soundOn ? 'rgba(20,201,180,0.1)' : 'var(--card)',
                border: `1px solid ${soundOn ? 'rgba(20,201,180,0.3)' : 'var(--border2)'}`,
                color: soundOn ? 'var(--accent)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.14s',
              }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                {soundOn
                  ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                  : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
                }
              </svg>
              Sound
            </button>

            {/* Notifications */}
            <button
              onClick={requestNotifications}
              title={notifPerm === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
              style={{
                padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                background: notifPerm === 'granted' ? 'rgba(20,201,180,0.1)' : 'var(--card)',
                border: `1px solid ${notifPerm === 'granted' ? 'rgba(20,201,180,0.3)' : 'var(--border2)'}`,
                color: notifPerm === 'granted' ? 'var(--accent)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.14s',
              }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {notifPerm === 'granted' ? 'Alerts on' : 'Alerts'}
            </button>

            {/* Countdown */}
            {searches.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                background: 'var(--card)', border: '1px solid var(--border2)',
                color: 'var(--text3)',
              }}>
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {anyLoading ? 'Scanning…' : `Next ${fmtCountdown(nextScan)}`}
              </div>
            )}

            {/* Scan now */}
            <button
              onClick={() => { setNewCount(0); scrapeAll().then(loadFeed) }}
              disabled={searches.length === 0 || anyLoading}
              className="btn-primary"
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              {anyLoading
                ? <><span className="spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(4,32,28,0.3)', borderTop: '2px solid #04201c', display: 'inline-block' }} />Scanning</>
                : <><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>Scan now</>
              }
            </button>
          </div>
        </div>

        {/* Member card */}
        {me && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 9, flexShrink: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src="/logo.png" alt="TrueSource" width={28} height={28} style={{ borderRadius: 6, display: 'block' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Member</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {me.username}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Subscribed {memberDuration(me.memberSince) ?? 'recently'}</div>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            {
              label: 'Total Listings', value: allItems.length, color: 'var(--accent)',
              icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
            },
            {
              label: 'Active Searches', value: searches.length, color: 'var(--purple)',
              icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
            },
            {
              label: 'New (5 min)', value: newToday, color: 'var(--success)',
              icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
            },
          ].map((s, i) => (
            <div key={i} className="anim-in" style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.color, flexShrink: 0,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Per-search quick scrape */}
        {searches.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 20 }}>
            {searches.map(s => {
              const err = errors[s.id]
              return (
                <div key={s.id}>
                  <button
                    onClick={() => scrapeOne(s.id).then(loadFeed)}
                    disabled={scraping[s.id]}
                    className="btn-secondary"
                    style={{ fontSize: 12.5, padding: '5px 12px', gap: 5 }}
                  >
                    {scraping[s.id]
                      ? <span className="spin" style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--border2)', borderTop: `2px solid ${PLAT_COLOR[s.platform] ?? 'var(--accent)'}`, display: 'inline-block' }} />
                      : <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    }
                    {s.query}
                    <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>· {PLAT_LABEL[s.platform] || s.platform}</span>
                  </button>
                  {err && !err.includes('LOGIN_REQUIRED') && (
                    <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{err}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Platform filter + Sort */}
        {allItems.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 18, flexWrap: 'wrap',
            padding: '10px 14px',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
              {(['all', ...platsWithItems] as string[]).map(plat => {
                const count = plat === 'all'
                  ? allItems.filter(i => !dismissed.has(i.id)).length
                  : allItems.filter(i => i.platform === plat && !dismissed.has(i.id)).length
                const active = platFilter === plat
                const col = PLAT_COLOR[plat] || 'var(--accent)'
                return (
                  <button key={plat} onClick={() => setPlatFilter(plat)} style={{
                    padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: active ? col : 'transparent',
                    border: `1px solid ${active ? col : 'transparent'}`,
                    color: active ? '#fff' : 'var(--text3)',
                    transition: 'all 0.14s', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {plat === 'all' ? 'All' : PLAT_LABEL[plat] || plat}
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
                      padding: '1px 5px', borderRadius: 4,
                      color: active ? '#fff' : 'var(--text3)',
                    }}>{count}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }} />

            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as any)}
              style={{
                padding: '5px 10px', borderRadius: 7, fontSize: 12.5, cursor: 'pointer',
                background: 'transparent', border: 'none',
                color: 'var(--text2)', outline: 'none', width: 'auto',
              }}
            >
              <option value="newest">Newest first</option>
              <option value="cheapest">Price: low to high</option>
              <option value="expensive">Price: high to low</option>
            </select>

            {dismissed.size > 0 && (
              <>
                <div style={{ width: 1, height: 22, background: 'var(--border)', flexShrink: 0 }} />
                <button
                  onClick={() => { setDismissed(new Set()); localStorage.removeItem('ts_dismissed') }}
                  style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: 'transparent', border: 'none', color: 'var(--text3)',
                  }}
                >
                  Restore {dismissed.size} hidden
                </button>
              </>
            )}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 14 }}>
            <span className="spin" style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', display: 'inline-block' }} />
            <p style={{ color: 'var(--text3)', fontSize: 13.5 }}>Loading feed…</p>
          </div>
        ) : visibleItems.length === 0 && allItems.length === 0 ? (
          <SetupGuide hasSearches={searches.length > 0} />
        ) : visibleItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)', fontSize: 14 }}>
            No listings match current filters.{' '}
            <button
              onClick={() => { setPlatFilter('all'); setDismissed(new Set()); localStorage.removeItem('ts_dismissed') }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            >
              Reset
            </button>
          </div>
        ) : (
          <>
            <div className="stagger" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 14,
            }}>
              {visibleItems.map(item => (
                <div key={item.id} style={{ position: 'relative' }} className={isFresh(item) ? 'item-new' : ''}>
                  <ItemCard item={item} variant="grid" />
                  <button
                    onClick={() => dismiss(item.id)}
                    title="Hide listing"
                    style={{
                      position: 'absolute', top: 8, right: 8, zIndex: 10,
                      width: 22, height: 22, borderRadius: 5,
                      background: 'rgba(0,0,0,0.65)', border: 'none',
                      color: 'rgba(255,255,255,0.8)', fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.12s',
                    }}
                    className="dismiss-btn"
                  >
                    <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Load older */}
            {!noMoreItems && items.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button
                  onClick={loadMoreArchive}
                  disabled={loadingMore}
                  style={{
                    padding: '10px 22px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    background: 'var(--card)', border: '1px solid var(--border2)',
                    color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 7,
                    transition: 'all 0.14s',
                  }}
                >
                  {loadingMore
                    ? <><span className="spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border2)', borderTop: '2px solid var(--accent)', display: 'inline-block' }} />Loading…</>
                    : <><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
                      Load older listings{archiveItems.length > 0 ? ` · ${archiveItems.length} loaded` : ''}</>
                  }
                </button>
              </div>
            )}
            {noMoreItems && archiveItems.length > 0 && (
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12.5, color: 'var(--text3)' }}>
                All {allItems.length} listings loaded
              </p>
            )}
          </>
        )}
      </div>

      <style>{`
        .dismiss-btn { opacity: 0 !important; }
        div:hover > .dismiss-btn { opacity: 1 !important; }
        @keyframes itemFlash {
          0%   { box-shadow: 0 0 0 0 rgba(20,201,180,0.55); border-color: rgba(20,201,180,0.3) !important; }
          60%  { box-shadow: 0 0 0 10px rgba(20,201,180,0); }
          100% { box-shadow: 0 0 0 0 rgba(20,201,180,0); }
        }
        .item-new > a { animation: itemFlash 1.4s ease-out 1; }
      `}</style>
    </div>
  )
}
