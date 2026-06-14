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
  if (mins < 1)  return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const h = Math.floor(mins / 60)
  if (h < 24) return `vor ${h} Std.`
  return `vor ${Math.floor(h / 24)} Tagen`
}

export default function SettingsPage() {
  const [status,  setStatus]  = useState<Record<string, DomainStatus>>({})
  const [domain,  setDomain]  = useState('www.vinted.de')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  async function loadStatus() {
    const r = await fetch('/api/vinted-connect')
    if (r.ok) setStatus(await r.json())
    setLoading(false)
  }

  useEffect(() => { loadStatus() }, [])

  async function connect() {
    if (!email.trim() || !pass.trim()) {
      setMsg({ text: 'E-Mail und Passwort eingeben', ok: false })
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
      setMsg({ text: `Vinted (${domain}) erfolgreich verbunden!`, ok: true })
      setEmail(''); setPass('')
      await loadStatus()
    } else {
      setMsg({ text: d.error || 'Verbindung fehlgeschlagen', ok: false })
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
  const notConnected     = DOMAINS.filter(d => !status[d]?.connected)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page" style={{ maxWidth: 640 }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            Vinted verbinden
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Melde dich mit deinem Vinted-Konto an — danach läuft das Scraping automatisch.
          </p>
        </div>

        {/* Connected accounts */}
        {!loading && connectedDomains.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Verbundene Konten</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connectedDomains.map(d => {
                const s = status[d]!
                return (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(61,245,200,0.04)', borderRadius: 10, border: '1px solid rgba(61,245,200,0.15)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {s.email} · verbunden {s.connectedAt ? timeAgo(s.connectedAt) : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => disconnect(d)}
                      style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
                    >
                      Trennen
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Connect form */}
        <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(61,245,200,0.08)', border: '1px solid rgba(61,245,200,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Vinted-Konto verbinden</p>
              <p style={{ fontSize: 11.5, color: 'var(--text3)', margin: 0, marginTop: 2 }}>Deine Zugangsdaten werden nur für den Login verwendet</p>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>VINTED-DOMAIN</label>
            <select
              value={domain}
              onChange={e => setDomain(e.target.value)}
              style={{ width: '100%' }}
            >
              {DOMAINS.map(d => (
                <option key={d} value={d}>{d}{status[d]?.connected ? ' ✓ verbunden' : ''}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>E-MAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="deine@email.de"
              autoComplete="email"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PASSWORT</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              onKeyDown={e => e.key === 'Enter' && connect()}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
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

          <button onClick={connect} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
            {saving
              ? <><span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000', display: 'inline-block' }} /> Verbinde…</>
              : 'Verbinden'
            }
          </button>

          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
            Dein Passwort wird nicht gespeichert — nur der Login-Token von Vinted.
          </p>
        </div>

        {/* Info box */}
        <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(61,245,200,0.04)', border: '1px solid rgba(61,245,200,0.1)' }}>
          <p style={{ fontSize: 12.5, color: 'var(--text3)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>Wie es funktioniert:</strong> Nach dem Verbinden scannt TrueSource automatisch alle 5 Minuten deine Vinted-Suchen und zeigt neue Angebote sofort im Feed an. Der Login-Token wird automatisch erneuert.
          </p>
        </div>

      </div>
    </div>
  )
}
