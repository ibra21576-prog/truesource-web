'use client'
import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'

const DOMAINS = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']

const GOOGLE_STEPS = [
  {
    num: 1, title: 'Go to Vinted and log in',
    desc: 'Open vinted.de and sign in with Google, Apple or Facebook.',
  },
  {
    num: 2, title: 'Open Developer Tools',
    desc: 'Press F12 on your keyboard (or right-click → "Inspect").',
    highlight: 'F12',
  },
  {
    num: 3, title: 'Go to Application → Cookies',
    desc: 'Click the "Application" tab. On the left click "Cookies" → "https://www.vinted.de".',
    highlight: 'Application → Cookies',
  },
  {
    num: 4, title: 'Copy access_token_web',
    desc: 'Find "access_token_web" in the list. Click it and copy the long value (Ctrl+A, Ctrl+C).',
    highlight: 'access_token_web',
  },
]

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

export default function SettingsPage() {
  const [status,       setStatus]       = useState<Record<string, DomainStatus>>({})
  const [domain,       setDomain]       = useState('www.vinted.de')
  const [email,        setEmail]        = useState('')
  const [pass,         setPass]         = useState('')
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState<{ text: string; ok: boolean } | null>(null)
  const [showRegion,   setShowRegion]   = useState(false)
  const [showGoogle,   setShowGoogle]   = useState(false)
  const [googleDomain, setGoogleDomain] = useState('www.vinted.de')
  const [token,        setToken]        = useState('')
  const [tokenSaving,  setTokenSaving]  = useState(false)
  const [tokenMsg,     setTokenMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  async function loadStatus() {
    const r = await fetch('/api/vinted-connect')
    if (r.ok) setStatus(await r.json())
    setLoading(false)
  }

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

  async function saveToken() {
    if (!token.trim()) { setTokenMsg({ text: 'Please paste your token first', ok: false }); return }
    setTokenSaving(true); setTokenMsg(null)
    const r = await fetch('/api/vinted-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: googleDomain, accessToken: token.trim() }),
    })
    const d = await r.json()
    if (r.ok && d.ok) {
      setTokenMsg({ text: `Vinted (${googleDomain}) connected!`, ok: true })
      setToken('')
      await loadStatus()
    } else {
      setTokenMsg({ text: d.error || 'Failed to save token', ok: false })
    }
    setTokenSaving(false)
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
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{s.email || 'token login'} · {s.connectedAt ? timeAgo(s.connectedAt) : ''}</div>
                    </div>
                    <button onClick={() => disconnect(d)} style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>Disconnect</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main connect form */}
        <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(61,245,200,0.08)', border: '1px solid rgba(61,245,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="19" height="19" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Sign in with email + password</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, marginTop: 2 }}>Your password is never stored — only the session token</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" style={{ width: '100%', boxSizing: 'border-box', fontSize: 15 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PASSWORD</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && connect()} style={{ width: '100%', boxSizing: 'border-box', fontSize: 15 }} />
            </div>
          </div>

          {/* Region toggle */}
          <div style={{ marginTop: 10, marginBottom: 18 }}>
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

        {/* Google / Apple section */}
        <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowGoogle(v => !v)}
            style={{
              width: '100%', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: '3px 10px', borderRadius: 100, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>GOOGLE / APPLE</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Signed in via Google or Apple?</span>
            </div>
            <svg width="14" height="14" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" style={{ transform: showGoogle ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showGoogle && (
            <div style={{ padding: '0 22px 22px', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 16, marginBottom: 20, lineHeight: 1.6 }}>
                You don&apos;t have a Vinted password. Instead, copy your session token from the browser and paste it below.
              </p>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
                {GOOGLE_STEPS.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < GOOGLE_STEPS.length - 1 ? 18 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.25)', fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{s.num}</div>
                      {i < GOOGLE_STEPS.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'var(--border)', marginTop: 5 }} />}
                    </div>
                    <div style={{ flex: 1, paddingTop: 3 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 3 }}>{s.title}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text3)', margin: 0, lineHeight: 1.6 }}>
                        {s.desc.split(s.highlight ?? '___').map((part, j, arr) => (
                          <span key={j}>{part}{j < arr.length - 1 && s.highlight && (
                            <code style={{ background: 'rgba(61,245,200,0.08)', border: '1px solid rgba(61,245,200,0.2)', borderRadius: 4, padding: '1px 5px', fontSize: 11.5, color: 'var(--accent)', fontFamily: 'monospace' }}>{s.highlight}</code>
                          )}</span>
                        ))}
                      </p>
                      {i === 1 && (
                        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <kbd style={{ padding: '2px 7px', borderRadius: 4, border: '1.5px solid var(--border2)', background: 'var(--surface)', fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>F12</kbd>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>or right-click → "Inspect"</span>
                        </div>
                      )}
                      {i === 2 && (
                        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {['Elements', 'Console', 'Sources', 'Network', 'Application'].map((tab, ti) => (
                            <span key={ti} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: ti === 4 ? 700 : 500, background: ti === 4 ? 'rgba(61,245,200,0.1)' : 'var(--surface)', border: ti === 4 ? '1px solid rgba(61,245,200,0.3)' : '1px solid var(--border)', color: ti === 4 ? 'var(--accent)' : 'var(--text3)' }}>{tab}</span>
                          ))}
                        </div>
                      )}
                      {i === 3 && (
                        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 11.5 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '3px 12px', color: 'var(--text3)' }}>
                            <span style={{ fontWeight: 700 }}>Name</span><span style={{ fontWeight: 700 }}>Value</span>
                            <span>_vinted_session</span><span>abc123…</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>access_token_web</span><span style={{ color: 'var(--accent)' }}>← copy this</span>
                            <span>locale</span><span>de</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Token input */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PASTE TOKEN HERE</label>
                <textarea
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Paste the copied token (very long text)…"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 11.5, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <button type="button" onClick={() => setShowRegion(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  Change region <span style={{ opacity: 0.5 }}>(default: vinted.de)</span>
                </button>
                {showRegion && (
                  <select value={googleDomain} onChange={e => setGoogleDomain(e.target.value)} style={{ width: '100%', marginTop: 8 }}>
                    {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>

              {tokenMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: tokenMsg.ok ? 'rgba(61,245,200,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${tokenMsg.ok ? 'rgba(61,245,200,0.2)' : 'rgba(248,113,113,0.2)'}`, color: tokenMsg.ok ? 'var(--accent)' : 'var(--danger)' }}>
                  {tokenMsg.text}
                </div>
              )}

              <button onClick={saveToken} disabled={tokenSaving} className="btn-primary" style={{ width: '100%' }}>
                {tokenSaving
                  ? <><span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000', display: 'inline-block' }} /> Saving…</>
                  : 'Connect with token'
                }
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
