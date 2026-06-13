'use client'
import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'

const DOMAINS = ['www.vinted.de', 'www.vinted.at', 'www.vinted.fr', 'www.vinted.co.uk']

interface DomainStatus { set: boolean; age?: string }

const SITE_URL = 'https://truesource-web-pink.vercel.app'
const EXT_TOKEN = process.env.NEXT_PUBLIC_EXTENSION_TOKEN || ''

function buildBookmarklet(token: string, siteUrl: string) {
  const code = `(function(){
var d=window.location.hostname;
var allowed=['www.vinted.de','www.vinted.at','www.vinted.fr','www.vinted.co.uk'];
if(!allowed.includes(d)){alert('Bitte auf einer Vinted-Seite klicken!');return;}
var c=document.cookie;
if(!c){alert('Kein Cookie gefunden. Bitte zuerst bei Vinted einloggen!');return;}
fetch('${siteUrl}/vinted-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'${token}',domain:d,cookies:c})})
.then(function(r){return r.json();})
.then(function(j){if(j.ok){alert('✅ Cookie gespeichert! Scraper läuft jetzt.');}else{alert('❌ Fehler: '+(j.error||'unbekannt'));}})
.catch(function(e){alert('❌ Fehler: '+e.message);});
})();`
  return 'javascript:' + encodeURIComponent(code)
}

export default function SettingsPage() {
  const [status,  setStatus]  = useState<Record<string, DomainStatus>>({})
  const [domain,  setDomain]  = useState('www.vinted.de')
  const [cookie,  setCookie]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ text: string; ok: boolean } | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [token,   setToken]   = useState('')

  useEffect(() => {
    fetch('/api/admin/vinted-cookie').then(r => {
      if (r.ok) { setIsAdmin(true); return r.json() }
      else { setIsAdmin(false); return null }
    }).then(d => { if (d) setStatus(d) })

    fetch('/api/settings/token').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.token) setToken(d.token)
    })
  }, [])

  async function save() {
    if (!cookie.trim()) { setMsg({ text: 'Cookie darf nicht leer sein', ok: false }); return }
    setSaving(true); setMsg(null)
    const r = await fetch('/api/admin/vinted-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, cookies: cookie.trim() })
    })
    const d = await r.json()
    if (r.ok) {
      setMsg({ text: `Cookie für ${domain} gespeichert ✓`, ok: true })
      setCookie('')
      const fresh = await fetch('/api/admin/vinted-cookie').then(r2 => r2.ok ? r2.json() : null)
      if (fresh) setStatus(fresh)
    } else {
      setMsg({ text: d.error || 'Fehler beim Speichern', ok: false })
    }
    setSaving(false)
  }

  async function remove(d: string) {
    await fetch('/api/admin/vinted-cookie', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: d })
    })
    setStatus(s => ({ ...s, [d]: { set: false } }))
  }

  if (isAdmin === false) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p style={{ color: 'var(--text3)' }}>Diese Seite ist nur für Admins.</p>
      </div>
    </div>
  )

  const bookmarklet = token ? buildBookmarklet(token, SITE_URL) : '#'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page" style={{ maxWidth: 680 }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Vinted-Cookie verwalten</p>
        </div>

        {/* BOOKMARKLET — Easiest Method */}
        <div style={{ background: 'rgba(61,245,200,0.06)', border: '1.5px solid rgba(61,245,200,0.25)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', margin: 0 }}>1-Klick Cookie Sync (Empfohlen)</p>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.7 }}>
            Ziehe den Button unten in deine <strong style={{ color: 'var(--text)' }}>Lesezeichenleiste</strong>.
            Dann gehe zu Vinted, logge dich ein, und klick einmal auf das Lesezeichen — fertig!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
              <div style={{ flex: 1, fontSize: 12.5, color: 'var(--text3)' }}>
                Ziehe diesen Button in die Lesezeichenleiste (Bookmarks Bar):
              </div>
            </div>
            <div style={{ paddingLeft: 36 }}>
              <a
                href={bookmarklet}
                onClick={e => { e.preventDefault(); alert('Diesen Button in die Lesezeichenleiste ZIEHEN — nicht klicken!') }}
                draggable
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #3df5c8, #00c9a7)',
                  color: '#000', fontWeight: 800, fontSize: 13,
                  textDecoration: 'none', cursor: 'grab',
                  boxShadow: '0 2px 12px rgba(61,245,200,0.35)',
                  userSelect: 'none',
                }}
              >
                🔐 TrueSource Cookie Sync
              </a>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>← Diesen Button in die Lesezeichenleiste ziehen</p>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
              <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>
                Gehe zu <strong style={{ color: 'var(--text)' }}>vinted.de</strong> (eingeloggt), klick auf das Lesezeichen → Cookie wird automatisch gespeichert
              </div>
            </div>
          </div>
        </div>

        {/* Current status */}
        <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Gespeicherte Cookies</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DOMAINS.map(d => {
              const s = status[d]
              return (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s?.set ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontFamily: 'monospace' }}>{d}</span>
                  {s?.set
                    ? <><span style={{ fontSize: 11, color: 'var(--text3)' }}>gesetzt · {s.age}</span>
                        <button onClick={() => remove(d)} style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>löschen</button></>
                    : <span style={{ fontSize: 11, color: 'var(--text3)' }}>nicht gesetzt</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Manual cookie input — fallback */}
        <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Cookie manuell eintragen</p>
          <p style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 16 }}>Alternativ — falls Bookmarklet nicht funktioniert</p>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>DOMAIN</label>
            <select value={domain} onChange={e => setDomain(e.target.value)} style={{ width: '100%' }}>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              COOKIE-WERT
            </label>
            <textarea
              value={cookie}
              onChange={e => setCookie(e.target.value)}
              placeholder="_vinted_session=...; locale=de; ..."
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
              padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
              background: msg.ok ? 'rgba(61,245,200,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${msg.ok ? 'rgba(61,245,200,0.2)' : 'rgba(248,113,113,0.2)'}`,
              color: msg.ok ? 'var(--accent)' : 'var(--danger)',
            }}>
              {msg.text}
            </div>
          )}

          <button onClick={save} disabled={saving} className="btn-primary" style={{ width: '100%' }}>
            {saving ? 'Wird gespeichert…' : 'Cookie speichern'}
          </button>
        </div>

      </div>
    </div>
  )
}
