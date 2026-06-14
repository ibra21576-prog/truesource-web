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
interface Me { userId: string; username: string; memberSince?: string }

const PLAT_COLOR: Record<string, string> = { vinted: '#3df5c8', ebay: '#fbbf24', kleinanzeigen: '#fb923c' }

function SetupGuide({ vintedLinked, hasSearches }: { vintedLinked: boolean | null; hasSearches: boolean }) {
  const step1Done = vintedLinked === true
  const step2Done = hasSearches
  const step3Done = false

  const steps = [
    {
      num: 1,
      done: step1Done,
      title: 'Vinted-Konto verbinden',
      desc: 'Einmalig E-Mail + Passwort eingeben. Dauert 10 Sekunden.',
      action: { label: 'Jetzt verbinden →', href: '/settings' },
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      ),
    },
    {
      num: 2,
      done: step2Done,
      title: 'Suche hinzufügen',
      desc: 'Was suchst du? z.B. "PlayStation 5", "Nike Air Max 90", "iPhone 15".',
      action: { label: 'Suche erstellen →', href: '/searches' },
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
    },
    {
      num: 3,
      done: step3Done,
      title: 'Fertig — Angebote kommen automatisch',
      desc: 'Alle 5 Minuten werden neue Angebote gefunden und hier angezeigt.',
      action: null,
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
    },
  ]

  const nextStep = steps.find(s => !s.done)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          In 2 Schritten loslegen
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6 }}>
          Danach findet TrueSource automatisch neue Deals für dich.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((step, i) => {
          const isNext = step === nextStep
          const isPast = step.done
          const isFuture = !isPast && !isNext

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              padding: '20px 22px',
              background: isPast ? 'rgba(61,245,200,0.04)' : isNext ? 'var(--card)' : 'var(--bg)',
              border: `1.5px solid ${isPast ? 'rgba(61,245,200,0.2)' : isNext ? 'var(--border)' : 'var(--border)'}`,
              borderRadius: 14,
              opacity: isFuture ? 0.4 : 1,
              transition: 'all 0.2s',
            }}>
              {/* Circle */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isPast ? 'rgba(61,245,200,0.15)' : isNext ? 'rgba(61,245,200,0.08)' : 'var(--border)',
                border: `2px solid ${isPast ? 'rgba(61,245,200,0.4)' : isNext ? 'rgba(61,245,200,0.25)' : 'transparent'}`,
                color: isPast ? 'var(--accent)' : isNext ? 'var(--accent)' : 'var(--text3)',
              }}>
                {isPast
                  ? <svg width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  : step.icon
                }
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em' }}>
                    SCHRITT {step.num}
                  </span>
                  {isPast && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(61,245,200,0.1)', padding: '2px 8px', borderRadius: 100 }}>Erledigt</span>}
                  {isNext && <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--accent)', padding: '2px 8px', borderRadius: 100, color: '#000' }}>Jetzt</span>}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>{step.title}</p>
                <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                {step.action && isNext && (
                  <a href={step.action.href} style={{
                    display: 'inline-flex', alignItems: 'center', marginTop: 14,
                    padding: '9px 18px', borderRadius: 10,
                    background: 'var(--accent)', color: '#000',
                    fontWeight: 800, fontSize: 13, textDecoration: 'none',
                    transition: 'opacity 0.15s',
                  }}>
                    {step.action.label}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {step1Done && step2Done && (
        <div style={{ textAlign: 'center', marginTop: 24, padding: '16px', borderRadius: 12, background: 'rgba(61,245,200,0.06)', border: '1px solid rgba(61,245,200,0.15)' }}>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
            Alles eingerichtet! Klick oben auf <strong style={{ color: 'var(--accent)' }}>Refresh All</strong> um sofort die ersten Ergebnisse zu laden.
          </p>
        </div>
      )}
    </div>
  )
}

function memberDuration(since?: string) {
  if (!since) return null
  const ms   = Date.now() - new Date(since).getTime()
  const days = Math.floor(ms / 86400000)
  if (days < 1)   return 'since today'
  if (days === 1) return 'for 1 day'
  if (days < 30)  return `for ${days} days`
  const months = Math.floor(days / 30)
  if (months === 1) return 'for 1 month'
  if (months < 12)  return `for ${months} months`
  const years = Math.floor(months / 12)
  return years === 1 ? 'for 1 year' : `for ${years} years`
}

export default function DashboardPage() {
  const [items,         setItems]         = useState<Item[]>([])
  const [searches,      setSearches]      = useState<Search[]>([])
  const [loading,       setLoading]       = useState(true)
  const [scraping,      setScraping]      = useState<Record<string, boolean>>({})
  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const [me,            setMe]            = useState<Me | null>(null)
  const [vintedLinked,  setVintedLinked]  = useState<boolean | null>(null)

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
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(setMe)
    fetch('/api/vinted-connect').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setVintedLinked(Object.values(d).some((s: any) => s.connected))
    })
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">

        {/* Welcome card */}
        {me && (
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #0d1f1a 0%, #0a1a14 50%, #0d1f1a 100%)',
            border: '1.5px solid rgba(61,245,200,0.2)',
            borderRadius: 20, padding: '32px 32px', marginBottom: 32,
          }}>
            {/* Glow blobs */}
            <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,245,200,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: 60, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,245,200,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {/* Logo */}
              <div style={{
                width: 72, height: 72, borderRadius: 18, flexShrink: 0,
                background: 'rgba(61,245,200,0.08)', border: '1.5px solid rgba(61,245,200,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 32px rgba(61,245,200,0.15)',
              }}>
                <img src="/logo.png" alt="TrueSource" width={52} height={52} style={{ borderRadius: 12, display: 'block' }} />
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                  TrueSource Member
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  Welcome back,{' '}
                  <span style={{
                    background: 'linear-gradient(90deg, #3df5c8, #22d3a0)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {me.username}
                  </span>{' '}👋
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Subscribed {memberDuration(me.memberSince) ?? 'recently'}
                </div>
              </div>

              {/* Badge */}
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(61,245,200,0.08)', border: '1px solid rgba(61,245,200,0.2)',
                borderRadius: 100, padding: '8px 16px',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Vinted not connected banner */}
        {vintedLinked === false && (
          <a href="/settings" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(61,245,200,0.06)', border: '1.5px solid rgba(61,245,200,0.25)',
              borderRadius: 12, padding: '14px 18px', marginBottom: 24, cursor: 'pointer',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(61,245,200,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Vinted-Konto verbinden</p>
                <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, marginTop: 2 }}>
                  Einmalig E-Mail + Passwort eingeben — danach läuft alles automatisch
                </p>
              </div>
              <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </a>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Live Feed</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>New listings in real time</p>
          </div>
          <button onClick={refreshAll} disabled={searches.length === 0 || anyLoading} className="btn-primary">
            {anyLoading
              ? <><span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid var(--bg)', display: 'inline-block' }} />Scanning…</>
              : <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>Refresh All</>
            }
          </button>
        </div>

        {/* Stats */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Listings', value: items.length, color: 'var(--accent)', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
            { label: 'Active Searches', value: searches.length, color: '#818cf8', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
            { label: 'New Listings', value: items.filter(i => i.first_scan === false).length, color: 'var(--success)', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
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

        {/* Per-search buttons */}
        {searches.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {searches.map(s => {
              const err = errors[s.id]
              const needsLogin = err?.includes('LOGIN_REQUIRED')
              const isTimeout  = err?.includes('timeout') || err?.includes('aborted')
              return (
                <div key={s.id}>
                  <button onClick={() => scrape(s.id)} disabled={scraping[s.id]} className="btn-secondary" style={{ fontSize: 13, padding: '7px 14px', gap: 6 }}>
                    {scraping[s.id]
                      ? <span className="spin" style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border2)', borderTop: `2px solid ${PLAT_COLOR[s.platform] ?? 'var(--accent)'}`, display: 'inline-block' }} />
                      : <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    }
                    {s.query}
                    <span style={{ color: 'var(--text3)', fontSize: 11 }}>· {s.platform}</span>
                  </button>
                  {needsLogin && (
                    <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                      Vinted nicht verbunden —{' '}
                      <a href="/settings" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}>jetzt verbinden</a>
                    </p>
                  )}
                  {isTimeout && (
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>eBay blockiert automatische Anfragen</p>
                  )}
                  {err && !needsLogin && !isTimeout && (
                    <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{err}</p>
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
            <p style={{ color: 'var(--text3)', fontSize: 14 }}>Lade Feed…</p>
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
