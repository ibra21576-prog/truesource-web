'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'

const DOMAINS = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']

const SCRIPT = `var t=document.cookie.match(/(?:^|; )access_token_web=([^;]*)/);if(t)window.location.href='https://truesource-web-pink.vercel.app/settings?vtoken='+encodeURIComponent(decodeURIComponent(t[1]))+'&vdomain='+location.hostname;else alert('Please log in to Vinted first!');`
const BOOKMARKLET = `javascript:(function(){var t=document.cookie.match(/(?:^|; )access_token_web=([^;]*)/);if(t)window.location.href='https://truesource-web-pink.vercel.app/settings?vtoken='+encodeURIComponent(decodeURIComponent(t[1]))+'&vdomain='+location.hostname;else alert('Please log in to Vinted first!');})();`

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
        setAutoMsg({ text: 'Vinted connected successfully', ok: true })
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
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.03em' }}>Connect Vinted</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6, lineHeight: 1.6 }}>Link your Vinted account to start scanning automatically.</p>
        </div>

        {/* Auto-connect result */}
        {autoMsg && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 18, fontSize: 14, fontWeight: 500,
            background: autoMsg.ok ? 'rgba(20,184,166,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${autoMsg.ok ? 'rgba(20,184,166,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: autoMsg.ok ? 'var(--accent)' : 'var(--danger)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {autoMsg.ok
              ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            }
            {autoMsg.text}
          </div>
        )}

        {/* Connected accounts */}
        {!loading && connectedDomains.length > 0 && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 18px', marginBottom: 16,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Connected</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connectedDomains.map(d => {
                const s = status[d]!
                return (
                  <div key={d} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: 'var(--surface)',
                    borderRadius: 8, border: '1px solid var(--border)',
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{s.email || 'browser login'} · {s.connectedAt ? timeAgo(s.connectedAt) : ''}</div>
                    </div>
                    <button onClick={() => disconnect(d)} style={{
                      fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontFamily: 'Geist, sans-serif',
                      transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--danger)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text3)'}
                    >Disconnect</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Connect card */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>

          {step === 'idle' && (
            <div style={{ padding: '28px 24px' }}>
              <style>{`
                @keyframes pulse-num { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
                @keyframes arrow-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
                @keyframes appear { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
              `}</style>

              {/* Step cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>

                {/* Step 1 */}
                <div style={{ display: 'flex', gap: 16, padding: '16px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', animation: 'appear 0.3s ease both' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>1</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Drag this button into your browser bookmarks bar</p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 10px', lineHeight: 1.5 }}>The bookmarks bar is the bar under your browser address bar. First press <kbd style={{ padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border2)', background: 'var(--card)', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>Ctrl+Shift+B</kbd> to show it.</p>
                    <a
                      href={BOOKMARKLET}
                      onClick={e => { e.preventDefault(); alert('Hold and drag this button to your bookmarks bar!') }}
                      draggable
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, background: 'var(--card)', border: '2px dashed var(--border2)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'grab', userSelect: 'none', transition: 'border-color 0.15s' }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18.364 5.636a9 9 0 1 1-12.728 0M12 3v9"/></svg>
                      Connect Vinted
                    </a>
                    <p style={{ fontSize: 11, color: 'var(--text3)', margin: '8px 0 0' }}>↑ Hold mouse down on this and drag it up to the bookmarks bar</p>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ textAlign: 'center', animation: 'arrow-bounce 1.5s ease-in-out infinite', color: 'var(--text3)', fontSize: 18 }}>↓</div>

                {/* Step 2 */}
                <div style={{ display: 'flex', gap: 16, padding: '16px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', animation: 'appear 0.3s ease 0.1s both' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>2</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Click "Connect with Vinted" — Vinted opens</p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>Log in on Vinted with Google, Apple or any method you used before.</p>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ textAlign: 'center', animation: 'arrow-bounce 1.5s ease-in-out 0.3s infinite', color: 'var(--text3)', fontSize: 18 }}>↓</div>

                {/* Step 3 */}
                <div style={{ display: 'flex', gap: 16, padding: '16px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', animation: 'appear 0.3s ease 0.2s both' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>3</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Click "Connect Vinted" in your bookmarks bar</p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>You get redirected back here and your account is connected automatically. Done!</p>
                  </div>
                </div>
              </div>

              <button onClick={handleConnect} className="btn-primary" style={{ width: '100%', paddingTop: 13, paddingBottom: 13, fontSize: 15 }}>
                Connect with Vinted →
              </button>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: '10px 0 0', textAlign: 'center' }}>Vinted will open in a new tab</p>
            </div>
          )}

          {step === 'waiting' && (
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Vinted opened — log in there first</span>
              </div>

              {/* Option A Bookmarklet */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Option A — All Browsers</span>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {/* Step 1 */}
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>1</div>
                      <div style={{ width: 1, height: 18, background: 'var(--border)', marginTop: 3 }} />
                    </div>
                    <div style={{ paddingTop: 4, paddingBottom: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Show your bookmarks bar</p>
                      <p style={{ fontSize: 12, color: 'var(--text2)', margin: '3px 0 0', lineHeight: 1.6 }}>Press <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>Ctrl+Shift+B</kbd> to show the bookmarks bar</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>2</div>
                      <div style={{ width: 1, height: 18, background: 'var(--border)', marginTop: 3 }} />
                    </div>
                    <div style={{ paddingTop: 4, paddingBottom: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Drag this button into the bookmarks bar</p>
                      <div style={{ marginTop: 10 }}>
                        <a
                          href={BOOKMARKLET}
                          onClick={e => { e.preventDefault(); alert('Drag this button into your bookmarks bar — do not click it here!') }}
                          draggable
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'var(--surface)', border: '1px dashed var(--border2)', color: 'var(--text2)', fontSize: 13, fontWeight: 500, textDecoration: 'none', cursor: 'grab', userSelect: 'none' }}
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18.364 5.636a9 9 0 1 1-12.728 0M12 3v9"/></svg>
                          Connect Vinted
                        </a>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text3)', margin: '6px 0 0' }}>Hold and drag the button above to your bookmarks bar</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>3</div>
                    </div>
                    <div style={{ paddingTop: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Go to vinted.de, log in, then click "Connect Vinted" in the bar</p>
                      <p style={{ fontSize: 12, color: 'var(--text2)', margin: '3px 0 0', lineHeight: 1.6 }}>You'll be redirected back here automatically.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option B Console */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Option B — Chrome / Firefox / Edge</span>
                  <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 10px', lineHeight: 1.7 }}>
                  On the Vinted tab:<br />
                  1. Press <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>F12</kbd><br />
                  2. Click the <strong style={{ color: 'var(--text)' }}>"Console"</strong> tab<br />
                  3. Click the black area → press <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>Ctrl+V</kbd> → press <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>Enter</kbd>
                </p>
                <button
                  onClick={() => { navigator.clipboard.writeText(SCRIPT); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{
                    padding: '6px 14px', borderRadius: 6,
                    background: copied ? 'rgba(20,184,166,0.08)' : 'var(--surface)',
                    border: `1px solid ${copied ? 'rgba(20,184,166,0.25)' : 'var(--border)'}`,
                    color: copied ? 'var(--accent)' : 'var(--text2)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'Geist, sans-serif',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy script'}
                </button>
              </div>

              <button onClick={() => setStep('idle')} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'Geist, sans-serif' }}>← Start over</button>
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
