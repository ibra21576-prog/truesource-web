'use client'
import { useState } from 'react'
import Navigation from '@/components/Navigation'

const DOMAINS = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']

const STEPS = [
  {
    num: 1,
    title: 'Go to Vinted and log in',
    desc: 'Open vinted.de in your browser and sign in with Google, Apple or Facebook.',
  },
  {
    num: 2,
    title: 'Open Developer Tools',
    desc: 'Press F12 on your keyboard (or right-click on the page → "Inspect").',
    highlight: 'F12',
  },
  {
    num: 3,
    title: 'Go to Application → Cookies',
    desc: 'Click the "Application" tab at the top. On the left, click "Cookies" → "https://www.vinted.de".',
    highlight: 'Application → Cookies',
  },
  {
    num: 4,
    title: 'Copy the token',
    desc: 'Find the entry called "access_token_web" in the list. Click it and copy the long value shown at the bottom (Ctrl+A, then Ctrl+C).',
    highlight: 'access_token_web',
  },
]

export default function TokenPage() {
  const [domain, setDomain] = useState('www.vinted.de')
  const [token,  setToken]  = useState('')
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState<{ text: string; ok: boolean } | null>(null)

  async function save() {
    if (!token.trim()) { setMsg({ text: 'Please paste your token first', ok: false }); return }
    setSaving(true); setMsg(null)
    const r = await fetch('/api/vinted-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, accessToken: token.trim() }),
    })
    const d = await r.json()
    if (r.ok && d.ok) {
      setMsg({ text: `Vinted (${domain}) connected successfully!`, ok: true })
      setToken('')
    } else {
      setMsg({ text: d.error || 'Failed to save token', ok: false })
    }
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page" style={{ maxWidth: 680 }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ padding: '4px 10px', borderRadius: 100, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 11, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.05em' }}>
              GOOGLE / APPLE / FACEBOOK
            </div>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            Connect Vinted manually
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6, lineHeight: 1.6 }}>
            You signed in to Vinted with Google, Apple or Facebook and don&apos;t have a password?<br/>
            No problem — just follow the steps below.
          </p>
        </div>

        {/* Step-by-step guide */}
        <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '24px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Step-by-step guide</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: i < STEPS.length - 1 ? 20 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.25)',
                    fontSize: 13, fontWeight: 800, color: 'var(--accent)',
                  }}>
                    {s.num}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 1.5, flex: 1, background: 'var(--border)', marginTop: 6 }} />
                  )}
                </div>

                <div style={{ flex: 1, paddingTop: 4 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 5 }}>{s.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0, lineHeight: 1.6 }}>
                    {s.desc.split(s.highlight ?? '___NONE___').map((part, j, arr) => (
                      <span key={j}>
                        {part}
                        {j < arr.length - 1 && s.highlight && (
                          <code style={{
                            background: 'rgba(61,245,200,0.08)', border: '1px solid rgba(61,245,200,0.2)',
                            borderRadius: 5, padding: '1px 6px', fontSize: 12,
                            color: 'var(--accent)', fontFamily: 'monospace',
                          }}>{s.highlight}</code>
                        )}
                      </span>
                    ))}
                  </p>

                  {i === 1 && (
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <kbd style={{ padding: '3px 8px', borderRadius: 5, border: '1.5px solid var(--border2)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>F12</kbd>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>or right-click → "Inspect" / "Inspect Element"</span>
                    </div>
                  )}

                  {i === 2 && (
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {['Elements', 'Console', 'Sources', 'Network', 'Application'].map((tab, ti) => (
                          <span key={ti} style={{
                            padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: ti === 4 ? 700 : 500,
                            background: ti === 4 ? 'rgba(61,245,200,0.1)' : 'var(--surface)',
                            border: ti === 4 ? '1px solid rgba(61,245,200,0.3)' : '1px solid var(--border)',
                            color: ti === 4 ? 'var(--accent)' : 'var(--text3)',
                          }}>{tab}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {i === 3 && (
                    <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '4px 16px', color: 'var(--text3)' }}>
                        <span style={{ fontWeight: 700 }}>Name</span>
                        <span style={{ fontWeight: 700 }}>Value</span>
                        <span>_vinted_session</span>
                        <span>abc123...</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>access_token_web</span>
                        <span style={{ color: 'var(--accent)' }}>← copy this value</span>
                        <span>locale</span>
                        <span>de</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input form */}
        <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Paste your token</p>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>VINTED DOMAIN</label>
            <select value={domain} onChange={e => setDomain(e.target.value)} style={{ width: '100%' }}>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              ACCESS TOKEN <span style={{ fontWeight: 400 }}>(from the "access_token_web" cookie)</span>
            </label>
            <textarea
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste the copied token here (long text)…"
              rows={4}
              style={{
                width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 11.5,
                background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8,
                padding: '10px 12px', color: 'var(--text)', lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
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

          <button onClick={save} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
            {saving
              ? <><span className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000', display: 'inline-block' }} /> Saving…</>
              : 'Connect'
            }
          </button>

          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
            The token is stored securely and refreshed automatically.
          </p>
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(61,245,200,0.04)', border: '1px solid rgba(61,245,200,0.1)' }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>Tip:</strong> Do you have a regular Vinted password? Use{' '}
            <a href="/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>Settings</a> instead — it&apos;s easier.
          </p>
        </div>

      </div>
    </div>
  )
}
