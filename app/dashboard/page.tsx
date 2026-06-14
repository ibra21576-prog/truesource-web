'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; first_scan?: boolean; searches?: { query: string }; search_query?: string
}
interface Search { id: string; query: string; platform: string; domain: string; enabled: boolean }
interface Me { userId: string; username: string; memberSince?: string }

const PLAT_COLOR: Record<string, string> = { vinted: '#3df5c8', kleinanzeigen: '#fb923c' }
const FEED_INTERVAL  = 20 * 1000       // refresh feed display every 20s
const SCRAPE_INTERVAL = 5 * 60 * 1000 // auto-scrape every 5 min

function SetupGuide({ vintedLinked, hasSearches }: { vintedLinked: boolean | null; hasSearches: boolean }) {
  const step1Done = vintedLinked === true
  const step2Done = hasSearches

  const steps = [
    {
      num: 1, done: step1Done,
      title: 'Connect your Vinted account',
      desc: 'Enter your email + password once. Done in 10 seconds.',
      action: { label: 'Connect now →', href: '/settings' },
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    },
    {
      num: 2, done: step2Done,
      title: 'Add a search',
      desc: 'What are you looking for? e.g. "PlayStation 5", "Nike Air Max 90", "iPhone 15".',
      action: { label: 'Create search →', href: '/searches' },
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    },
    {
      num: 3, done: false,
      title: 'Listings appear automatically',
      desc: 'TrueSource scans every 5 minutes and shows new listings here — no button needed.',
      action: null,
      icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
  ]

  const nextStep = steps.find(s => !s.done)

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>🚀</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Get started in 2 steps</h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>TrueSource will automatically find new deals for you.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((step, i) => {
          const isNext = step === nextStep
          const isPast = step.done
          const isFuture = !isPast && !isNext
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px',
              background: isPast ? 'rgba(61,245,200,0.04)' : isNext ? 'var(--card)' : 'var(--bg)',
              border: `1.5px solid ${isPast ? 'rgba(61,245,200,0.2)' : 'var(--border)'}`,
              borderRadius: 14, opacity: isFuture ? 0.4 : 1, transition: 'all 0.2s',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isPast ? 'rgba(61,245,200,0.15)' : isNext ? 'rgba(61,245,200,0.08)' : 'var(--border)',
                border: `2px solid ${isPast ? 'rgba(61,245,200,0.4)' : isNext ? 'rgba(61,245,200,0.25)' : 'transparent'}`,
                color: isPast || isNext ? 'var(--accent)' : 'var(--text3)',
              }}>
                {isPast
                  ? <svg width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  : step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em' }}>STEP {step.num}</span>
                  {isPast && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(61,245,200,0.1)', padding: '2px 8px', borderRadius: 100 }}>Done</span>}
                  {isNext && <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--accent)', padding: '2px 8px', borderRadius: 100, color: '#000' }}>Now</span>}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>{step.title}</p>
                <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                {step.action && isNext && (
                  <a href={step.action.href} style={{
                    display: 'inline-flex', alignItems: 'center', marginTop: 12,
                    padding: '9px 18px', borderRadius: 10, background: 'var(--accent)', color: '#000',
                    fontWeight: 800, fontSize: 13, textDecoration: 'none',
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

function QuickConnectBanner({ onConnected }: { onConnected: () => void }) {
  const [open,   setOpen]   = useState(false)
  const [email,  setEmail]  = useState('')
  const [pass,   setPass]   = useState('')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')
  const [ok,     setOk]     = useState(false)

  async function connect() {
    if (!email.trim() || !pass.trim()) { setErr('Please enter email and password'); return }
    setSaving(true); setErr('')
    const r = await fetch('/api/vinted-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'www.vinted.de', email: email.trim(), password: pass }),
    })
    const d = await r.json()
    if (r.ok && d.ok) { setOk(true); setTimeout(onConnected, 800) }
    else setErr(d.error || 'Wrong email or password — please try again')
    setSaving(false)
  }

  if (ok) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(61,245,200,0.08)', border: '1.5px solid rgba(61,245,200,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 24 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Vinted connected! Scanning now…</p>
    </div>
  )

  if (!open) return (
    <div onClick={() => setOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(61,245,200,0.06)', border: '1.5px solid rgba(61,245,200,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, cursor: 'pointer' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(61,245,200,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Connect your Vinted account</p>
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, marginTop: 2 }}>Click here → enter email + password → done</p>
      </div>
      <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
    </div>
  )

  return (
    <div style={{ background: 'var(--card)', border: '1.5px solid rgba(61,245,200,0.3)', borderRadius: 12, padding: '20px 22px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Connect Vinted</p>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Vinted email" autoComplete="email" style={{ flex: '1 1 160px', minWidth: 0 }} />
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Password" autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && connect()} style={{ flex: '1 1 140px', minWidth: 0 }} />
        <button onClick={connect} disabled={saving} className="btn-primary" style={{ flexShrink: 0 }}>
          {saving ? <span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000', display: 'inline-block' }} /> : 'Connect'}
        </button>
      </div>
      {err && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8, marginBottom: 0 }}>{err}</p>}
      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, marginBottom: 0 }}>
        Password is never stored — only the session token.{' '}
        <a href="/settings" style={{ color: 'var(--text3)', textDecoration: 'underline' }}>More options →</a>
      </p>
    </div>
  )
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

export default function DashboardPage() {
  const [items,        setItems]        = useState<Item[]>([])
  const [searches,     setSearches]     = useState<Search[]>([])
  const [loading,      setLoading]      = useState(true)
  const [scraping,     setScraping]     = useState<Record<string, boolean>>({})
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [me,           setMe]           = useState<Me | null>(null)
  const [vintedLinked, setVintedLinked] = useState<boolean | null>(null)
  const [nextScan,     setNextScan]     = useState(SCRAPE_INTERVAL / 1000)
  const searchesRef = useRef<Search[]>([])

  const loadFeed = useCallback(async () => {
    const res = await fetch('/api/feed')
    if (res.ok) setItems((await res.json()).map((it: any) => ({ ...it, search_query: it.searches?.query })))
    setLoading(false)
  }, [])

  const loadSearches = useCallback(async () => {
    const res = await fetch('/api/searches')
    if (res.ok) {
      const active = (await res.json()).filter((s: Search) => s.enabled)
      setSearches(active)
      searchesRef.current = active
    }
  }, [])

  async function refreshVintedStatus() {
    const d = await fetch('/api/vinted-connect').then(r => r.ok ? r.json() : null)
    if (d) setVintedLinked(Object.values(d).some((s: any) => s.connected))
  }

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
    refreshVintedStatus()

    // Auto-refresh feed display every 20 seconds
    const feedIv = setInterval(loadFeed, FEED_INTERVAL)

    // Auto-scrape every 5 minutes
    const scrapeIv = setInterval(() => {
      scrapeAll()
      setNextScan(SCRAPE_INTERVAL / 1000)
    }, SCRAPE_INTERVAL)

    // Countdown ticker
    const countIv = setInterval(() => setNextScan(n => Math.max(0, n - 1)), 1000)

    return () => { clearInterval(feedIv); clearInterval(scrapeIv); clearInterval(countIv) }
  }, [])

  // Trigger initial scrape 3s after page load (so searches are loaded first)
  useEffect(() => {
    const t = setTimeout(async () => {
      await loadSearches()
      scrapeAll()
    }, 3000)
    return () => clearTimeout(t)
  }, [])

  const anyLoading = Object.values(scraping).some(Boolean)

  function fmtCountdown(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">

        {/* Welcome card */}
        {me && (
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #0d1f1a 0%, #0a1a14 50%, #0d1f1a 100%)',
            border: '1.5px solid rgba(61,245,200,0.2)', borderRadius: 20, padding: '28px 32px', marginBottom: 28,
          }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,245,200,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, flexShrink: 0, background: 'rgba(61,245,200,0.08)', border: '1.5px solid rgba(61,245,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(61,245,200,0.15)' }}>
                <img src="/logo.png" alt="TrueSource" width={46} height={46} style={{ borderRadius: 10, display: 'block' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>TrueSource Member</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  Welcome back, <span style={{ background: 'linear-gradient(90deg, #3df5c8, #22d3a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{me.username}</span> 👋
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>Subscribed {memberDuration(me.memberSince) ?? 'recently'}</div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(61,245,200,0.08)', border: '1px solid rgba(61,245,200,0.2)', borderRadius: 100, padding: '8px 14px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick connect if not linked */}
        {vintedLinked === false && (
          <QuickConnectBanner onConnected={() => { refreshVintedStatus(); loadSearches().then(() => scrapeAll()) }} />
        )}

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Live Feed</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>New listings in real time</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {searches.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)' }}>
                <svg width="12" height="12" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                  {anyLoading ? 'Scanning…' : `Next scan ${fmtCountdown(nextScan)}`}
                </span>
              </div>
            )}
            <button onClick={() => scrapeAll().then(loadFeed)} disabled={searches.length === 0 || anyLoading} className="btn-primary">
              {anyLoading
                ? <><span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid var(--bg)', display: 'inline-block' }} />Scanning…</>
                : <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>Scan Now</>
              }
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Listings', value: items.length, color: 'var(--accent)', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
            { label: 'Active Searches', value: searches.length, color: '#818cf8', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
            { label: 'New Today', value: items.filter(i => i.first_scan === false).length, color: 'var(--success)', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
          ].map((s, i) => (
            <div key={i} className="anim-in" style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}15`, border: `1px solid ${s.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Per-search status */}
        {searches.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {searches.map(s => {
              const err = errors[s.id]
              const needsLogin = err?.includes('LOGIN_REQUIRED')
              return (
                <div key={s.id}>
                  <button onClick={() => scrapeOne(s.id).then(loadFeed)} disabled={scraping[s.id]} className="btn-secondary" style={{ fontSize: 13, padding: '6px 12px', gap: 6 }}>
                    {scraping[s.id]
                      ? <span className="spin" style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid var(--border2)', borderTop: `2px solid ${PLAT_COLOR[s.platform] ?? 'var(--accent)'}`, display: 'inline-block' }} />
                      : <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    }
                    {s.query}
                    <span style={{ color: 'var(--text3)', fontSize: 11 }}>· {s.platform}</span>
                  </button>
                  {needsLogin && (
                    <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>
                      Not connected — <a href="/settings" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>connect Vinted</a>
                    </p>
                  )}
                  {err && !needsLogin && (
                    <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>{err}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 16 }}>
            <span className="spin" style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', display: 'inline-block' }} />
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Loading feed…</p>
          </div>
        ) : items.length === 0 ? (
          <SetupGuide vintedLinked={vintedLinked} hasSearches={searches.length > 0} />
        ) : (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
