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
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>Connect your Vinted account</p>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 20px', lineHeight: 1.6 }}>Works with Google, Apple, Facebook — any login method</p>

              {/* Animated tutorial */}
              <style>{`
                @keyframes blink-bar { 0%,100%{opacity:0.3} 50%{opacity:1} }
                @keyframes drag-btn { 0%{transform:translate(0,0)} 40%{transform:translate(0,0)} 70%{transform:translate(60px,-28px)} 100%{transform:translate(60px,-28px)} }
                @keyframes drag-cursor { 0%{transform:translate(30px,14px)} 40%{transform:translate(30px,14px)} 70%{transform:translate(90px,-14px)} 100%{transform:translate(90px,-14px)} }
                @keyframes fade-in-bar-item { 0%,65%{opacity:0;width:0} 80%,100%{opacity:1;width:90px} }
                @keyframes redirect-flash { 0%,84%{opacity:1} 90%{opacity:0.2} 100%{opacity:1} }
                @keyframes step-highlight { 0%{background:rgba(20,184,166,0)} 50%{background:rgba(20,184,166,0.08)} 100%{background:rgba(20,184,166,0)} }
              `}</style>

              <div style={{ background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 18 }}>
                {/* Browser mockup */}
                <div style={{ background: 'var(--surface)', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffbd2e' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28ca42' }} />
                    <div style={{ flex: 1, background: 'var(--card)', borderRadius: 4, padding: '3px 10px', fontSize: 10, color: 'var(--text3)', marginLeft: 8, fontFamily: 'monospace' }}>vinted.de</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>Ctrl+Shift+B</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 22 }}>
                    <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>BOOKMARKS</span>
                    <div style={{ fontSize: 9, color: 'var(--text3)', background: 'var(--card)', borderRadius: 3, padding: '2px 6px' }}>Amazon</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', background: 'var(--card)', borderRadius: 3, padding: '2px 6px' }}>YouTube</div>
                    <div style={{ fontSize: 9, color: 'var(--accent)', background: 'rgba(20,184,166,0.1)', borderRadius: 3, padding: '2px 6px', overflow: 'hidden', animation: 'fade-in-bar-item 4s ease-in-out infinite', whiteSpace: 'nowrap' }}>Connect Vinted</div>
                  </div>
                </div>

                <div style={{ padding: '14px 12px', position: 'relative', minHeight: 100 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: '#09b1ba', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>V</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>vinted.de</span>
                    <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)', animation: 'redirect-flash 4s ease-in-out infinite' }}>Logged in</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[80,60,70].map((w,i) => <div key={i} style={{ height: 5, borderRadius: 3, background: 'var(--border)', width: `${w}%` }} />)}
                  </div>
                  <div style={{ position: 'absolute', bottom: 14, left: 12, animation: 'drag-btn 4s ease-in-out infinite' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: 'rgba(20,184,166,0.08)', border: '1.5px dashed rgba(20,184,166,0.4)', fontSize: 10, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                      Connect Vinted
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 12, left: 10, animation: 'drag-cursor 4s ease-in-out infinite', pointerEvents: 'none' }}>
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                      <path d="M0 0 L0 12 L3 9 L5.5 14 L7 13.3 L4.5 8.3 L8 8.3 Z"/>
                    </svg>
                  </div>
                </div>

                <div style={{ padding: '8px 12px', background: 'var(--surface)', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)', textAlign: 'center', animation: 'step-highlight 4s ease-in-out infinite' }}>
                  Drag "Connect Vinted" into your bookmarks bar → log into Vinted → click it
                </div>
              </div>

              <button onClick={handleConnect} className="btn-primary" style={{ width: '100%', paddingTop: 12, paddingBottom: 12, fontSize: 14 }}>
                Connect with Vinted
              </button>
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
