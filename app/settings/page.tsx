'use client'
import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'

const DOMAINS = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']

interface DomainStatus {
  connected: boolean
  email?: string
  connectedAt?: number
}

function timeAgo(ms: number) {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function SettingsPage() {
  const [status,      setStatus]      = useState<Record<string, DomainStatus>>({})
  const [domain,      setDomain]      = useState('www.vinted.de')
  const [email,       setEmail]       = useState('')
  const [pass,        setPass]        = useState('')
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState<{ text: string; ok: boolean } | null>(null)
  const [showRegion,  setShowRegion]  = useState(false)

  async function loadStatus() {
    const r = await fetch('/api/vinted-connect')
    if (r.ok) setStatus(await r.json())
    setLoading(false)
  }

  useEffect(() => { loadStatus() }, [])

  async function connect() {
    if (!email.trim() || !pass.trim()) {
      setMsg({ text: 'Please enter your email and password', ok: false })
      return
    }
    setSaving(true); setMsg(null)
    const r = await fetch('/api/vinted-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, email: email.trim(), password: pass }),
    })
    const d = await r.json()
    if (r.ok && d.ok) {
      setMsg({ text: `Vinted (${domain}) connected successfully!`, ok: true })
      setEmail(''); setPass('')
      await loadStatus()
    } else {
      setMsg({ text: d.error || 'Connection failed — check your email and password', ok: false })
    }
    setSaving(false)
  }

  async function disconnect(d: string) {
    await fetch('/api/vinted-connect', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: d }),
    })
    await loadStatus()
  }

  const connectedDomains = DOMAINS.filter(d => status[d]?.connected)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page" style={{ maxWidth: 580 }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            Connect Vinted
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Sign in with your Vinted account — scanning runs automatically after that.
          </p>
        </div>

        {/* Connected accounts */}
        {!loading && connectedDomains.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Connected Accounts</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connectedDomains.map(d => {
                const s = status[d]!
                return (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(61,245,200,0.04)', borderRadius: 10, border: '1px solid rgba(61,245,200,0.15)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {s.email} · connected {s.connectedAt ? timeAgo(s.connectedAt) : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => disconnect(d)}
                      style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
                    >
                      Disconnect
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Connect form */}
        <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '28px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(61,245,200,0.08)', border: '1px solid rgba(61,245,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Connect your Vinted account</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, marginTop: 2 }}>Your credentials are only used to log in — not stored</p>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 15 }}
            />
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PASSWORD</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              onKeyDown={e => e.key === 'Enter' && connect()}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 15 }}
            />
          </div>

          {/* Region toggle */}
          <div style={{ marginBottom: 22, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setShowRegion(v => !v)}
              style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" style={{ transform: showRegion ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              {showRegion ? 'Hide region' : 'Change region'} <span style={{ color: 'var(--text3)', opacity: 0.6 }}>(default: vinted.de)</span>
            </button>
            {showRegion && (
              <select
                value={domain}
                onChange={e => setDomain(e.target.value)}
                style={{ width: '100%', marginTop: 8 }}
              >
                {DOMAINS.map(d => (
                  <option key={d} value={d}>{d}{status[d]?.connected ? ' ✓ connected' : ''}</option>
                ))}
              </select>
            )}
          </div>

          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
              background: msg.ok ? 'rgba(61,245,200,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${msg.ok ? 'rgba(61,245,200,0.2)' : 'rgba(248,113,113,0.2)'}`,
              color: msg.ok ? 'var(--accent)' : 'var(--danger)',
            }}>
              {msg.text}
            </div>
          )}

          <button onClick={connect} disabled={saving} className="btn-primary" style={{ width: '100%', fontSize: 15, padding: '13px' }}>
            {saving
              ? <><span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000', display: 'inline-block' }} /> Connecting…</>
              : <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Connect Vinted
                </>
            }
          </button>

          <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 12, textAlign: 'center', lineHeight: 1.7 }}>
            Your password is never stored — only the login token from Vinted is saved and auto-renewed.
          </p>
        </div>

        {/* Info box */}
        <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(61,245,200,0.04)', border: '1px solid rgba(61,245,200,0.1)' }}>
          <p style={{ fontSize: 12.5, color: 'var(--text3)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>How it works:</strong> After connecting, TrueSource scans your Vinted searches every 5 minutes and shows new listings instantly in your feed. The token refreshes automatically.
          </p>
        </div>

        {/* Google/Apple users */}
        <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12.5, color: 'var(--text3)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>Signed in via Google / Apple?</strong>{' '}
            You don&apos;t have a password —{' '}
            <a href="/token" style={{ color: 'var(--accent)', fontWeight: 600 }}>use the token method instead</a>.
          </p>
        </div>

      </div>
    </div>
  )
}
