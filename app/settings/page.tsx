'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'

const DOMAINS = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']

const BOOKMARKLET = `javascript:(function(){if(!location.hostname.includes('vinted')){alert('Please open this on Vinted first!');return;}var base='https://truesource-web-pink.vercel.app/settings';var d=location.hostname;function go(t){if(t&&t.length>10){window.location.href=base+'?vtoken='+encodeURIComponent(t)+'&vdomain='+d;}}function deep(o,n){if(!o||n>8||typeof o!=='object')return null;if(Array.isArray(o)){for(var i=0;i<Math.min(o.length,30);i++){var r=deep(o[i],n+1);if(r)return r;}return null;}for(var k in o){try{var v=o[k];if(/^access_token/i.test(k)&&typeof v==='string'&&v.length>10)return v;var r=deep(v,n+1);if(r)return r;}catch(e){}}return null;}var c=document.cookie.match(/(?:^|;\\s*)access_token(?:_web)?=([^;]+)/);if(c){go(decodeURIComponent(c[1]));return;}var ws=['__NUXT__','__PRELOADED_STATE__','__INITIAL_STATE__','__REDUX_STATE__','gon'];for(var i=0;i<ws.length;i++){if(window[ws[i]]){var t=deep(window[ws[i]],0);if(t){go(t);return;}}}for(var i=0;i<localStorage.length;i++){try{var t=deep(JSON.parse(localStorage.getItem(localStorage.key(i))),0);if(t){go(t);return;}}catch(e){}}var orig=window.fetch,done=false;function cleanup(){window.fetch=orig;var e=document.getElementById('_ts');if(e)e.remove();}window.fetch=function(){return orig.apply(this,arguments).then(function(r){if(!done){r.clone().json().then(function(j){if(!done){var t=deep(j,0);if(t){done=true;cleanup();go(t);}}}).catch(function(){});}return r;});};var el=document.createElement('div');el.id='_ts';el.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#14b8a6;color:#fff;padding:10px 18px;border-radius:8px;z-index:2147483647;font:600 13px/1 sans-serif;pointer-events:none;box-shadow:0 4px 20px rgba(0,0,0,.3)';el.textContent='Connecting TrueSource…';document.body.appendChild(el);orig('/api/v2/users/current',{credentials:'include'}).then(function(r){return r.json();}).then(function(j){if(!done){var t=deep(j,0);if(t){done=true;cleanup();go(t);return;}cleanup();alert('Automatic connect failed.\\nPlease use the \\'Email & Password\\' method in TrueSource Settings.');}}).catch(function(){if(!done){cleanup();alert('Error — are you logged in to Vinted?');}});setTimeout(function(){if(!done){cleanup();alert('Timed out.\\nPlease use \\'Email & Password\\' method in TrueSource Settings.');}},8000);})();`
const SCRIPT = BOOKMARKLET

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

const SLIDES = [
  {
    label: 'Step 1 of 3',
    title: 'Save a bookmark',
    desc: 'Copy the code below, then right-click your bookmarks bar → "Add bookmark" → paste the code as the URL. Name it "Connect Vinted".',
  },
  {
    label: 'Step 2 of 3',
    title: 'Log in to Vinted',
    desc: 'Click "Go to Vinted" and sign in with Google, Apple or Facebook — whichever you used when you first registered.',
  },
  {
    label: 'Step 3 of 3',
    title: 'Click the bookmark on Vinted',
    desc: 'While logged in on Vinted, click "Connect Vinted" in your bookmarks bar. You\'ll be sent back here and connected automatically!',
  },
]

function ExtensionFlow({ onStart }: { onStart: () => void }) {
  const [copied, setCopied] = useState(false)
  const [activeStep, setActiveStep] = useState(1)

  function copyAndNext() {
    navigator.clipboard.writeText(BOOKMARKLET).then(() => {
      setCopied(true)
      setTimeout(() => setActiveStep(2), 800)
    })
  }

  const steps = [
    {
      n: 1,
      title: 'Code kopieren',
      visual: (
        <div style={{ background: '#111113', borderRadius: 8, padding: '12px 14px', border: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#52525b', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>javascript:(function()&#123;var t=…&#125;)()</div>
          <button onClick={copyAndNext} className="btn-primary" style={{ fontSize: 13, padding: '7px 14px', flexShrink: 0 }}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
      ),
      desc: 'Klick auf "Code kopieren" — der Code ist dann in deiner Zwischenablage.',
    },
    {
      n: 2,
      title: 'Auf Vinted gehen & Ctrl+D drücken',
      visual: (
        <div style={{ background: '#111113', borderRadius: 8, overflow: 'hidden', border: '1px solid #27272a' }}>
          <div style={{ background: '#18181b', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#28ca42' }} />
            <div style={{ flex: 1, background: '#111113', borderRadius: 3, padding: '2px 8px', fontSize: 9, color: '#52525b', marginLeft: 6, fontFamily: 'monospace' }}>vinted.de</div>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>⌨️</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#14b8a6' }}>Ctrl + D</div>
              <div style={{ fontSize: 9, color: '#52525b', marginTop: 1 }}>drücken</div>
            </div>
            <div style={{ fontSize: 18, color: '#27272a' }}>→</div>
            <div style={{ background: '#222224', border: '1px solid #3f3f46', borderRadius: 6, padding: '8px 10px', minWidth: 110 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#fafafa', marginBottom: 4 }}>Lesezeichen hinzufügen</div>
              <div style={{ fontSize: 8, color: '#71717a', marginBottom: 2 }}>Name</div>
              <div style={{ fontSize: 9, background: '#111', borderRadius: 2, padding: '2px 5px', color: '#fafafa', marginBottom: 4 }}>Connect Vinted</div>
              <div style={{ fontSize: 8, color: '#71717a', marginBottom: 2 }}>URL</div>
              <div style={{ fontSize: 8, background: '#111', borderRadius: 2, padding: '2px 5px', color: '#14b8a6', fontFamily: 'monospace' }}>javascript:…</div>
            </div>
          </div>
        </div>
      ),
      desc: (
        <>
          Geh auf <strong style={{ color: 'var(--text)' }}>vinted.de</strong>, drück <kbd style={{ padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border2)', background: 'var(--card)', fontSize: 11, fontWeight: 600 }}>Ctrl+D</kbd> → klick <strong style={{ color: 'var(--text)' }}>„Mehr…"</strong> → bei URL alles löschen → <kbd style={{ padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border2)', background: 'var(--card)', fontSize: 11, fontWeight: 600 }}>Ctrl+V</kbd> einfügen → Speichern.
        </>
      ),
      cta: <button onClick={onStart} className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>Zu Vinted →</button>,
    },
    {
      n: 3,
      title: 'Bookmark klicken — fertig!',
      visual: (
        <div style={{ background: '#111113', borderRadius: 8, overflow: 'hidden', border: '1px solid #27272a' }}>
          <div style={{ background: '#18181b', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#28ca42' }} />
            <div style={{ flex: 1, background: '#111113', borderRadius: 3, padding: '2px 8px', fontSize: 9, color: '#52525b', marginLeft: 6, fontFamily: 'monospace' }}>vinted.de</div>
          </div>
          <div style={{ background: '#18181b', borderTop: '1px solid #27272a', padding: '4px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ fontSize: 9, color: '#52525b' }}>Amazon</div>
            <div style={{ fontSize: 9, color: '#52525b' }}>YouTube</div>
            <div style={{ fontSize: 9, color: '#14b8a6', background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)', borderRadius: 3, padding: '1px 6px', fontWeight: 600, animation: 's-click-btn 1s ease infinite' }}>⭐ Connect Vinted</div>
          </div>
          <div style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>✓</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#14b8a6', marginTop: 2 }}>Verbunden!</div>
          </div>
        </div>
      ),
      desc: 'Während du auf Vinted eingeloggt bist, klick einfach auf das Bookmark in deiner Lesezeichenleiste — du wirst automatisch verbunden.',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((s) => {
        const isActive = activeStep === s.n
        const isDone = activeStep > s.n
        return (
          <div
            key={s.n}
            onClick={() => setActiveStep(s.n)}
            style={{ borderRadius: 10, border: isDone ? '1px solid rgba(34,197,94,0.3)' : isActive ? '1px solid var(--accent)' : '1px solid var(--border)', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isActive ? 'rgba(20,184,166,0.04)' : 'var(--surface)' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? 'rgba(20,184,166,0.15)' : 'var(--card)', border: `2px solid ${isDone ? '#22c55e' : isActive ? 'var(--accent)' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: isDone ? '#22c55e' : isActive ? 'var(--accent)' : 'var(--text3)' }}>
                {isDone ? '✓' : s.n}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: isDone ? 'var(--text2)' : isActive ? 'var(--text)' : 'var(--text3)' }}>{s.title}</span>
            </div>

            {/* Expanded content */}
            {isActive && (
              <div style={{ padding: '0 16px 16px', background: 'var(--card)' }}>
                <div style={{ marginBottom: 12 }}>{s.visual}</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 12px', lineHeight: 1.7 }}>{s.desc}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {s.cta}
                  <button onClick={(e) => { e.stopPropagation(); setActiveStep(s.n + 1) }} className="btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}>
                    {s.n === 3 ? 'Seite neu laden →' : 'Weiter →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TutorialSlides({ bookmarklet, onStart, onManual }: { bookmarklet: string; onStart: () => void; onManual: () => void }) {
  const [slide, setSlide] = useState(0)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const DURATION = 4500

  useEffect(() => {
    setProgress(0)
    const start = Date.now()
    const tick = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / DURATION) * 100)
      setProgress(p)
      if (p >= 100) { setSlide(s => (s + 1) % 3); clearInterval(tick) }
    }, 30)
    return () => clearInterval(tick)
  }, [slide])

  function copyCode() {
    navigator.clipboard.writeText(bookmarklet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const s = SLIDES[slide]

  return (
    <div>
      {/* Animated browser mockup */}
      <div style={{ background: '#111113', borderRadius: 10, border: '1px solid #27272a', overflow: 'hidden', marginBottom: 20 }}>
        {/* Chrome top bar */}
        <div style={{ background: '#18181b', padding: '8px 12px 0', borderBottom: '1px solid #27272a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#28ca42' }} />
            <div style={{ flex: 1, background: '#111113', borderRadius: 4, padding: '3px 10px', fontSize: 10, color: '#52525b', marginLeft: 10, fontFamily: 'monospace' }}>
              {slide === 0 ? 'truesource-web-pink.vercel.app/settings' : 'vinted.de'}
            </div>
          </div>
          {/* Bookmarks bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 7, minHeight: 26 }}>
            <span style={{ fontSize: 9, color: '#52525b', fontWeight: 600, flexShrink: 0 }}>BOOKMARKS</span>
            <div style={{ fontSize: 9, color: '#52525b', background: '#111113', borderRadius: 3, padding: '2px 7px' }}>Amazon</div>
            <div style={{ fontSize: 9, color: '#52525b', background: '#111113', borderRadius: 3, padding: '2px 7px' }}>YouTube</div>
            {slide >= 1 && (
              <div style={{ fontSize: 9, color: '#14b8a6', background: 'rgba(20,184,166,0.12)', borderRadius: 3, padding: '2px 8px', border: '1px solid rgba(20,184,166,0.2)', animation: slide === 1 ? 's-bar-pop 0.5s ease both' : 's-click-btn 1.2s ease 0.5s infinite', whiteSpace: 'nowrap' }}>
                ⭐ Connect Vinted
              </div>
            )}
          </div>
        </div>

        {/* Page content area */}
        <div style={{ padding: '18px 16px', minHeight: 130, position: 'relative' }}>
          {/* SLIDE 0 — adding bookmark */}
          {slide === 0 && (
            <div style={{ animation: 's-slide-in 0.3s ease both' }}>
              <div style={{ fontSize: 10, color: '#52525b', fontWeight: 700, marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Settings — Connect Vinted</div>
              <div style={{ height: 5, borderRadius: 3, background: '#27272a', width: '65%', marginBottom: 7 }} />
              <div style={{ height: 5, borderRadius: 3, background: '#27272a', width: '45%', marginBottom: 18 }} />
              {/* Animated "add bookmark" popup */}
              <div style={{ position: 'absolute', right: 16, top: 18, background: '#222224', border: '1px solid #3f3f46', borderRadius: 8, padding: '10px 14px', width: 160, animation: 's-redirect 4.5s ease infinite' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#fafafa', marginBottom: 6 }}>Add bookmark</div>
                <div style={{ fontSize: 8, color: '#71717a', marginBottom: 4 }}>Name</div>
                <div style={{ fontSize: 9, background: '#111113', borderRadius: 3, padding: '3px 6px', color: '#14b8a6', marginBottom: 6 }}>Connect Vinted</div>
                <div style={{ fontSize: 8, color: '#71717a', marginBottom: 4 }}>URL</div>
                <div style={{ fontSize: 7, background: '#111113', borderRadius: 3, padding: '3px 6px', color: '#52525b', marginBottom: 8, fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap' }}>javascript:(func…</div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: '#3f3f46', color: '#a1a1aa' }}>Cancel</div>
                  <div style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: '#14b8a6', color: '#fff', animation: 's-dot-blink 1.2s ease-in-out infinite' }}>Save</div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1 — Vinted login */}
          {slide === 1 && (
            <div style={{ animation: 's-slide-in 0.3s ease both', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 110 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#09b1ba', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 10 }}>V</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 14 }}>Log in to Vinted</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 7, background: '#fff', fontSize: 11, fontWeight: 600, color: '#111', animation: 's-dot-blink 1.5s ease-in-out infinite' }}>
                <svg width="12" height="12" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </div>
            </div>
          )}

          {/* SLIDE 2 — click bookmark → connected */}
          {slide === 2 && (
            <div style={{ animation: 's-slide-in 0.3s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: 5, background: '#09b1ba', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>V</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#a1a1aa' }}>vinted.de</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#22c55e', fontWeight: 600 }}>● Logged in</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#27272a', width: '80%', marginBottom: 6 }} />
              <div style={{ height: 5, borderRadius: 3, background: '#27272a', width: '60%', marginBottom: 6 }} />
              <div style={{ height: 5, borderRadius: 3, background: '#27272a', width: '70%' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.85)', borderRadius: 10, animation: 's-redirect 4.5s ease infinite' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, marginBottom: 4 }}>✓</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#14b8a6' }}>Connected!</div>
                  <div style={{ fontSize: 10, color: '#52525b', marginTop: 3 }}>Redirecting back…</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: '#27272a' }}>
          <div style={{ height: '100%', background: '#14b8a6', transition: 'width 0.1s linear', width: `${progress}%` }} />
        </div>
      </div>

      {/* Slide label + description */}
      <div style={{ marginBottom: 16, animation: 's-slide-in 0.3s ease both' }} key={slide}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>{s.title}</p>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
      </div>

      {/* Dot nav */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
        {[0,1,2].map(i => (
          <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, background: i === slide ? 'var(--accent)' : 'var(--border2)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }} />
        ))}
      </div>

      {/* Copy button for step 1 */}
      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>Step 1 — Copy & save as bookmark</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>Press <kbd style={{ padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border2)', background: 'var(--card)', fontSize: 11, fontWeight: 600 }}>Ctrl+Shift+B</kbd> to show bookmarks bar, then copy → right-click bar → Add bookmark → paste as URL</p>
        </div>
        <button onClick={copyCode} className="btn-primary" style={{ fontSize: 13, padding: '8px 14px', flexShrink: 0 }}>
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>

      <button onClick={onStart} className="btn-primary" style={{ width: '100%', paddingTop: 13, paddingBottom: 13, fontSize: 15, marginBottom: 12 }}>
        Go to Vinted →
      </button>
      <button onClick={onManual} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', padding: '8px 0', fontFamily: 'Geist, sans-serif' }}>
        Bookmark not working? Enter token manually →
      </button>
    </div>
  )
}

function SettingsInner() {
  const params = useSearchParams()
  const [status,   setStatus]   = useState<Record<string, DomainStatus>>({})
  const [loading,  setLoading]  = useState(true)
  const [autoMsg,  setAutoMsg]  = useState<{ text: string; ok: boolean } | null>(null)
  const [step,     setStep]     = useState<'idle' | 'waiting' | 'manual' | 'password'>('idle')
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

  function handleManual() { setStep('manual') }
  function handlePassword() { setStep('password') }

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
      <div className="page" style={{ maxWidth: 640 }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.03em' }}>Vinted</h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6, lineHeight: 1.6 }}>Vinted läuft bereits automatisch — kein Account nötig.</p>
        </div>

        {/* Auto-working notice */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(20,184,166,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>Vinted ist aktiv</p>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, marginTop: 2, lineHeight: 1.5 }}>Deine Suchanfragen scannen Vinted automatisch. Du musst nichts verbinden.</p>
          </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Account verbinden (optional)</p>
                <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontWeight: 500 }}>für künftige Features</span>
              </div>
              <style>{`
                @keyframes s-slide-in  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                @keyframes s-drag      { 0%,20%{transform:translate(0,0);opacity:1} 60%{transform:translate(4px,-52px);opacity:1} 75%,100%{transform:translate(4px,-52px);opacity:0} }
                @keyframes s-cursor    { 0%,20%{transform:translate(18px,8px)} 60%{transform:translate(22px,-44px)} 75%,100%{transform:translate(22px,-44px)} }
                @keyframes s-bar-pop   { 0%,55%{opacity:0;max-width:0;padding:0} 70%,100%{opacity:1;max-width:120px;padding:2px 8px} }
                @keyframes s-click-btn { 0%,60%{transform:scale(1);background:rgba(20,184,166,0.1)} 70%{transform:scale(0.93);background:rgba(20,184,166,0.25)} 80%,100%{transform:scale(1);background:rgba(20,184,166,0.1)} }
                @keyframes s-redirect  { 0%,70%{opacity:0} 80%,100%{opacity:1} }
                @keyframes s-dot-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
                @keyframes s-progress  { from{width:0%} to{width:100%} }
              `}</style>


              {/* Method 1: Email + Password — RECOMMENDED */}
              <div
                onClick={handlePassword}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 10, background: 'rgba(20,184,166,0.04)', border: '1.5px solid var(--accent)', cursor: 'pointer', marginBottom: 10, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.08)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.04)'}
              >
                <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(20,184,166,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M12 15h8"/><path d="M18 12v6"/><path d="M15 12v6"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Via Email &amp; Password</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>Works with Google login — just enter your email &amp; a Vinted password</div>
                </div>
                <div style={{ fontSize: 10, background: 'rgba(20,184,166,0.15)', color: 'var(--accent)', padding: '4px 8px', borderRadius: 4, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>Easiest</div>
              </div>

              {/* Method 2: Bookmarklet */}
              <div
                onClick={handleConnect}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
              >
                <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Via Bookmark</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>Save a browser bookmark and click it on Vinted</div>
                </div>
              </div>
            </div>
          )}

          {step === 'waiting' && (
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 20px' }}>Connect via Bookmark — 3 Schritte</p>

              {/* Step 1 */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>1</div>
                <div style={{ flex: 1, paddingTop: 5 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>Code kopieren</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text3)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>javascript:(function()&#123;…&#125;)()</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(BOOKMARKLET); setCopied(true); setTimeout(() => setCopied(false), 2500) }}
                      className="btn-primary"
                      style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}
                    >{copied ? '✓ Kopiert!' : 'Code kopieren'}</button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>2</div>
                <div style={{ flex: 1, paddingTop: 5 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>Lesezeichen erstellen (einmalig)</p>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 8px', lineHeight: 1.7 }}>
                      <strong style={{ color: 'var(--text)' }}>Schon ein "Connect Vinted" Lesezeichen?</strong><br />
                      Rechtsklick darauf → <strong style={{ color: 'var(--text)' }}>Bearbeiten</strong> → URL-Feld komplett löschen → <kbd style={{ padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border2)', background: 'var(--card)', fontSize: 11, fontWeight: 600 }}>Ctrl+V</kbd> → Speichern
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.7 }}>
                      <strong style={{ color: 'var(--text)' }}>Noch kein Lesezeichen?</strong><br />
                      Rechtsklick auf die <strong style={{ color: 'var(--text)' }}>Lesezeichenleiste</strong> → "Lesezeichen hinzufügen" → Name: <strong style={{ color: 'var(--accent)' }}>Connect Vinted</strong> → URL: <kbd style={{ padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border2)', background: 'var(--card)', fontSize: 11, fontWeight: 600 }}>Ctrl+V</kbd> → Speichern
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>3</div>
                <div style={{ flex: 1, paddingTop: 5 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>Auf Vinted gehen &amp; Lesezeichen klicken</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 10px', lineHeight: 1.6 }}>
                    Logge dich auf Vinted ein → klick auf <strong style={{ color: 'var(--accent)' }}>"Connect Vinted"</strong> in deiner Lesezeichenleiste → du wirst automatisch verbunden!
                  </p>
                  <button
                    onClick={() => window.open('https://www.vinted.de', '_blank')}
                    className="btn-primary"
                    style={{ fontSize: 13, padding: '9px 18px' }}
                  >Zu Vinted gehen →</button>
                </div>
              </div>

              <button onClick={() => setStep('idle')} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'Geist, sans-serif' }}>← Zurück</button>
            </div>
          )}

          {step === 'manual' && <ManualConnect domains={DOMAINS} onBack={() => setStep('idle')} onSuccess={(msg) => { setAutoMsg({ text: msg, ok: true }); setStep('idle'); loadStatus() }} />}
          {step === 'password' && <PasswordConnect domains={DOMAINS} onBack={() => setStep('idle')} onSuccess={(msg) => { setAutoMsg({ text: msg, ok: true }); setStep('idle'); loadStatus() }} />}
        </div>

      </div>
    </div>
  )
}

function ManualConnect({ domains, onBack, onSuccess }: { domains: string[]; onBack: () => void; onSuccess: (msg: string) => void }) {
  const [token, setToken] = useState('')
  const [domain, setDomain] = useState('www.vinted.de')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!token.trim()) return
    setSaving(true); setErr('')
    const r = await fetch('/api/vinted-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, accessToken: token.trim() }),
    })
    const data = await r.json()
    setSaving(false)
    if (data.ok) onSuccess('Vinted connected successfully!')
    else setErr(data.error || 'Failed — check the token and try again')
  }

  return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Enter your Vinted token manually</p>
      <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 20px', lineHeight: 1.6 }}>
        Open <strong style={{ color: 'var(--text)' }}>vinted.de</strong>, log in, then press <kbd style={{ padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border2)', background: 'var(--card)', fontSize: 11, fontWeight: 600 }}>F12</kbd> → tab <strong style={{ color: 'var(--text)' }}>„Application"</strong> (or „Storage") → <strong style={{ color: 'var(--text)' }}>Cookies</strong> → <strong style={{ color: 'var(--text)' }}>vinted.de</strong> → find <strong style={{ color: 'var(--accent)' }}>access_token_web</strong> → copy the value.
      </p>

      <div style={{ marginBottom: 14 }}>
        <label className="label">Vinted Country</label>
        <select value={domain} onChange={e => setDomain(e.target.value)}>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="label">access_token_web value</label>
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Paste your token here…"
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </div>

      {err && <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 14 }}>{err}</p>}

      <button onClick={save} disabled={!token.trim() || saving} className="btn-primary" style={{ width: '100%', paddingTop: 12, paddingBottom: 12, fontSize: 15, marginBottom: 12 }}>
        {saving ? 'Connecting…' : 'Connect →'}
      </button>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'Geist, sans-serif' }}>← Back</button>
    </div>
  )
}

function PasswordConnect({ domains, onBack, onSuccess }: { domains: string[]; onBack: () => void; onSuccess: (msg: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [domain, setDomain] = useState('www.vinted.de')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [showPw, setShowPw] = useState(false)

  async function connect() {
    if (!email.trim() || !password.trim()) return
    setSaving(true); setErr('')
    const r = await fetch('/api/vinted-connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, email: email.trim(), password: password.trim() }),
    })
    const data = await r.json()
    setSaving(false)
    if (data.ok) onSuccess('Vinted connected successfully!')
    else setErr(data.error || 'Wrong email or password — please try again')
  }

  return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Connect via Email &amp; Password</p>
      <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 20px', lineHeight: 1.6 }}>
        Enter your Vinted login credentials below.
      </p>

      {/* "No password?" hint */}
      <div style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', margin: '0 0 4px' }}>Registered with Google?</p>
        <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>
          No problem! Go to <strong style={{ color: 'var(--text)' }}>vinted.de</strong> → click <strong style={{ color: 'var(--text)' }}>"Forgot password"</strong> → enter your Google email → check your inbox → set a new password → come back here!
        </p>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="label">Vinted Country</label>
        <select value={domain} onChange={e => setDomain(e.target.value)}>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="label">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          onKeyDown={e => { if (e.key === 'Enter') connect() }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="label">Password</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your Vinted password"
            style={{ paddingRight: 40 }}
            onKeyDown={e => { if (e.key === 'Enter') connect() }}
          />
          <button
            onClick={() => setShowPw(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, padding: 0, fontFamily: 'Geist, sans-serif' }}
          >{showPw ? 'Hide' : 'Show'}</button>
        </div>
      </div>

      {err && <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 14 }}>{err}</p>}

      <button
        onClick={connect}
        disabled={!email.trim() || !password.trim() || saving}
        className="btn-primary"
        style={{ width: '100%', paddingTop: 13, paddingBottom: 13, fontSize: 15, marginBottom: 12 }}
      >
        {saving ? 'Connecting…' : 'Connect Vinted →'}
      </button>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'Geist, sans-serif' }}>← Back</button>
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
