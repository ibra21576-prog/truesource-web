'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'

const DOMAINS = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']

const BOOKMARKLET = `javascript:(function(){function getCookie(n){var m=document.cookie.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?decodeURIComponent(m[1]):null;}var t=getCookie('access_token_web');if(!t){alert('No Vinted token found. Make sure you are logged in!');return;}var d=location.hostname;window.location.href='https://truesource-web-pink.vercel.app/settings?vtoken='+encodeURIComponent(t)+'&vdomain='+encodeURIComponent(d);})();`

interface DomainStatus { connected: boolean; email?: string; connectedAt?: number }

function timeAgo(ms: number) {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function SettingsInner() {
  const params = useSearchParams()
  const [status,      setStatus]      = useState<Record<string, DomainStatus>>({})
  const [domain,      setDomain]      = useState('www.vinted.de')
  const [email,       setEmail]       = useState('')
  const [pass,        setPass]        = useState('')
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState<{ text: string; ok: boolean } | null>(null)
  const [showRegion,  setShowRegion]  = useState(false)
  const [showEmail,   setShowEmail]   = useState(false)
  const [autoMsg,     setAutoMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  async function loadStatus() {
    const r = await fetch('/api/vinted-connect')
    if (r.ok) setStatus(await r.json())
    setLoading(false)
  }

  // Auto-connect from bookmarklet redirect
  useEffect(() => {
    const vtoken = params.get('vtoken')
    const vdomain = params.get('vdomain')
    if (!vtoken) return
    const d = vdomain ? `www.${vdomain.replace(/^www\./, '')}` : 'www.vinted.de'
    setAutoMsg({ text: 'Connecting your Vinted account…', ok: true })
    fetch('/api/vinted-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: d, accessToken: vtoken }),
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        setAutoMsg({ text: `Vinted connected! You're all set.`, ok: true })
        loadStatus()
        // Clean URL
        window.history.replaceState({}, '', '/settings')
      } else {
        setAutoMsg({ text: data.error || 'Connection failed — please try again', ok: false })
      }
    }).catch(() => setAutoMsg({ text: 'Connection failed', ok: false }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadStatus() }, [])

  async function connect() {
    if (!email.trim() || !pass.trim()) { setMsg({ text: 'Please enter your email and password', ok: false }); return }
    setSaving(true); setMsg(null)
    const r = await fetch('/api/vinted-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, email: email.trim(), password: pass }),
    })
    const d = await r.json()
    if (r.ok && d.ok) {
      setMsg({ text: `Vinted (${domain}) connected successfully!`, ok: true })
      setEmail(''); setPass('')
      await loadStatus()
    } else {
      setMsg({ text: d.error || 'Wrong email or password — please try again', ok: false })
    }
    setSaving(false)
  }

  async function disconnect(d: string) {
    await fetch('/api/vinted-connect', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: d }) })
    await loadStatus()
  }

  const connectedDomains = DOMAINS.filter(d => status[d]?.connected)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page" style={{ maxWidth: 600 }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Connect Vinted</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Sign in with your Vinted account — scanning runs automatically every 5 minutes after that.</p>
        </div>

        {/* Auto-connect message */}
        {autoMsg && (
          <div style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 20, fontSize: 14, fontWeight: 600, background: autoMsg.ok ? 'rgba(61,245,200,0.08)' : 'rgba(248,113,113,0.08)', border: `1.5px solid ${autoMsg.ok ? 'rgba(61,245,200,0.25)' : 'rgba(248,113,113,0.25)'}`, color: autoMsg.ok ? 'var(--accent)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {autoMsg.ok
              ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            }
            {autoMsg.text}
          </div>
        )}

        {/* Connected accounts */}
        {!loading && connectedDomains.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12, letterSpacing: '0.04em' }}>CONNECTED ACCOUNTS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connectedDomains.map(d => {
                const s = status[d]!
                return (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(61,245,200,0.04)', borderRadius: 10, border: '1px solid rgba(61,245,200,0.15)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{s.email || 'browser login'} · {s.connectedAt ? timeAgo(s.connectedAt) : ''}</div>
                    </div>
                    <button onClick={() => disconnect(d)} style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>Disconnect</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* === BROWSER CONNECT (primary, Google/Apple users) === */}
        <div style={{ background: 'var(--card)', border: '1.5px solid rgba(61,245,200,0.3)', borderRadius: 14, padding: '24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(61,245,200,0.1)', border: '1px solid rgba(61,245,200,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="19" height="19" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Connect via Browser <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'rgba(61,245,200,0.1)', border: '1px solid rgba(61,245,200,0.2)', borderRadius: 20, padding: '2px 8px', marginLeft: 6 }}>RECOMMENDED</span></p>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, marginTop: 2 }}>Works with Google, Apple, Facebook — any login method</p>
            </div>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.25)', fontSize: 12, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>1</div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 6 }}>Drag this button to your bookmarks bar</p>
                <a
                  href={BOOKMARKLET}
                  onClick={e => { e.preventDefault(); alert('Don\'t click — drag this button to your browser bookmarks bar!') }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '9px 16px', borderRadius: 8, background: 'rgba(61,245,200,0.1)',
                    border: '1.5px dashed rgba(61,245,200,0.4)', color: 'var(--accent)',
                    fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'grab', userSelect: 'none',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18.364 5.636a9 9 0 1 1-12.728 0M12 3v9"/></svg>
                  Connect Vinted
                </a>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Hold and drag the button above into your bookmarks bar (only do this once)</p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.25)', fontSize: 12, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>2</div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Go to Vinted and log in with Google</p>
                <a href="https://www.vinted.de" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Open vinted.de →
                </a>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.25)', fontSize: 12, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>3</div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Click "Connect Vinted" in your bookmarks bar</p>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>You'll be redirected back here and automatically connected!</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(61,245,200,0.04)', border: '1px solid rgba(61,245,200,0.12)', fontSize: 12, color: 'var(--text3)' }}>
            💡 Make sure your bookmarks bar is visible: <strong style={{ color: 'var(--text)' }}>Ctrl+Shift+B</strong> (Chrome/Edge)
          </div>
        </div>

        {/* === EMAIL / PASSWORD (secondary, collapsible) === */}
        <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowEmail(v => !v)}
            style={{ width: '100%', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Sign in with email + password</span>
            </div>
            <svg width="14" height="14" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" style={{ transform: showEmail ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showEmail && (
            <div style={{ padding: '4px 22px 22px', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 14, marginBottom: 16 }}>
                Only works if you registered on Vinted with email+password (not Google/Apple).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>EMAIL</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PASSWORD</label>
                  <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && connect()} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginTop: 10, marginBottom: 14 }}>
                <button type="button" onClick={() => setShowRegion(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" style={{ transform: showRegion ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="9 18 15 12 9 6"/></svg>
                  Change region <span style={{ opacity: 0.5 }}>(default: vinted.de)</span>
                </button>
                {showRegion && (
                  <select value={domain} onChange={e => setDomain(e.target.value)} style={{ width: '100%', marginTop: 8 }}>
                    {DOMAINS.map(d => <option key={d} value={d}>{d}{status[d]?.connected ? ' ✓' : ''}</option>)}
                  </select>
                )}
              </div>
              {msg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13, background: msg.ok ? 'rgba(61,245,200,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${msg.ok ? 'rgba(61,245,200,0.2)' : 'rgba(248,113,113,0.2)'}`, color: msg.ok ? 'var(--accent)' : 'var(--danger)' }}>
                  {msg.text}
                </div>
              )}
              <button onClick={connect} disabled={saving} className="btn-primary" style={{ width: '100%', fontSize: 15, padding: '13px' }}>
                {saving
                  ? <><span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000', display: 'inline-block' }} /> Connecting…</>
                  : 'Connect Vinted'
                }
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <SettingsInner />
    </Suspense>
  )
}
