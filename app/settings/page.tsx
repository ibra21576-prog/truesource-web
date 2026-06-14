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
  const [status,  setStatus]  = useState<Record<string, DomainStatus>>({})
  const [loading, setLoading] = useState(true)
  const [autoMsg, setAutoMsg] = useState<{ text: string; ok: boolean } | null>(null)

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
    setAutoMsg({ text: 'Connecting your Vinted account…', ok: true })
    fetch('/api/vinted-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: d, accessToken: vtoken }),
    }).then(r => r.json()).then(data => {
      if (data.ok) {
        setAutoMsg({ text: `Vinted connected! You're all set. ✓`, ok: true })
        loadStatus()
        window.history.replaceState({}, '', '/settings')
      } else {
        setAutoMsg({ text: data.error || 'Connection failed — please try again', ok: false })
      }
    }).catch(() => setAutoMsg({ text: 'Connection failed', ok: false }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadStatus() }, [])

  async function disconnect(d: string) {
    await fetch('/api/vinted-connect', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: d }) })
    await loadStatus()
  }

  const connectedDomains = DOMAINS.filter(d => status[d]?.connected)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page" style={{ maxWidth: 560 }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Connect Vinted</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Link your Vinted account — scanning starts automatically every 5 minutes.</p>
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
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12, letterSpacing: '0.04em' }}>CONNECTED</p>
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

        {/* Bookmarklet connect */}
        <div style={{ background: 'var(--card)', border: '1.5px solid rgba(61,245,200,0.3)', borderRadius: 14, padding: '28px 24px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Step 1 */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.3)', fontSize: 13, fontWeight: 800, color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>1</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 10 }}>
                  Drag this button to your bookmarks bar
                </p>
                <a
                  href={BOOKMARKLET}
                  onClick={e => { e.preventDefault(); alert('Don\'t click — drag this button into your browser bookmarks bar!') }}
                  draggable
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '11px 20px', borderRadius: 10,
                    background: 'rgba(61,245,200,0.08)',
                    border: '2px dashed rgba(61,245,200,0.5)',
                    color: 'var(--accent)', fontSize: 14, fontWeight: 700,
                    textDecoration: 'none', cursor: 'grab', userSelect: 'none',
                  }}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18.364 5.636a9 9 0 1 1-12.728 0M12 3v9"/></svg>
                  Connect Vinted
                </a>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8, lineHeight: 1.5 }}>
                  Hold and drag the button above to your bookmarks bar.<br />
                  Show bookmarks bar: <strong style={{ color: 'var(--text)' }}>Ctrl+Shift+B</strong>
                </p>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Step 2 */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.3)', fontSize: 13, fontWeight: 800, color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>2</div>
              <div style={{ flex: 1, paddingTop: 6 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 6 }}>Go to Vinted and log in</p>
                <a href="https://www.vinted.de" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Open vinted.de
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                </a>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Log in with Google, Apple, or any method</p>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(61,245,200,0.1)', border: '1.5px solid rgba(61,245,200,0.3)', fontSize: 13, fontWeight: 800, color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>3</div>
              <div style={{ flex: 1, paddingTop: 6 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Click "Connect Vinted" in your bookmarks bar</p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>You'll be redirected back here and automatically connected!</p>
              </div>
            </div>

          </div>
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
