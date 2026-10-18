'use client'

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { apiFetch } from '@/lib/api-client'

const REGIONS = [
  { domain: 'www.vinted.de', country: 'Germany', flag: '🇩🇪' },
  { domain: 'www.vinted.at', country: 'Austria', flag: '🇦🇹' },
  { domain: 'www.vinted.fr', country: 'France', flag: '🇫🇷' },
  { domain: 'www.vinted.co.uk', country: 'United Kingdom', flag: '🇬🇧' },
]

const BUILT_IN = [
  ['eBay', 'Global'], ['Kleinanzeigen', 'Germany'], ['Gumtree', 'United Kingdom'],
  ['Kijiji', 'Canada'], ['Craigslist', 'United States'], ['Shpock', 'Europe'],
  ['Marktplaats', 'Netherlands'], ['Leboncoin', 'France'], ['Subito', 'Italy'],
  ['Tradera', 'Sweden'], ['willhaben', 'Austria'], ['Wallapop', 'Spain'],
]

type RegionStatus = { connected: boolean; email?: string; connectedAt?: number }
type StatusMap = Record<string, RegionStatus>
type Health = { secondsSinceLastScrape?: number; totalItems?: number; searches?: number; pricedItems?: number; lastScrape?: { errors?: number; processed?: number } }

function timeAgo(value?: number) {
  if (!value) return 'Recently'
  const minutes = Math.max(0, Math.floor((Date.now() - value) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours} hr ago` : `${Math.floor(hours / 24)} days ago`
}

function bookmarklet() {
  const base = 'https://truesource-web-pink.vercel.app/connectors'
  return `javascript:(function(){if(!location.hostname.includes('vinted')){alert('Open Vinted first, then click this bookmark.');return;}var b='${base}',d=location.hostname;function g(t){if(t&&t.length>10)location.href=b+'?vtoken='+encodeURIComponent(t)+'&vdomain='+encodeURIComponent(d)}function f(o,n){if(!o||n>8||typeof o!=='object')return null;if(Array.isArray(o)){for(var i=0;i<Math.min(o.length,30);i++){var r=f(o[i],n+1);if(r)return r}return null}for(var k in o)try{var v=o[k];if(/^access_token/i.test(k)&&typeof v==='string'&&v.length>10)return v;var x=f(v,n+1);if(x)return x}catch(e){}return null}var c=document.cookie.match(/(?:^|;\\s*)access_token(?:_web)?=([^;]+)/);if(c){g(decodeURIComponent(c[1]));return}for(var i=0;i<localStorage.length;i++)try{var t=f(JSON.parse(localStorage.getItem(localStorage.key(i))),0);if(t){g(t);return}}catch(e){}var q=window.fetch,z=false;window.fetch=function(){return q.apply(this,arguments).then(function(r){r.clone().json().then(function(j){if(!z){var t=f(j,0);if(t){z=true;window.fetch=q;g(t)}}}).catch(function(){});return r})};var e=document.createElement('div');e.style='position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#111;color:#fff;padding:12px 18px;border-radius:9px;font:600 13px Arial';e.textContent='TrueSource is connecting…';document.body.appendChild(e);q('/api/v2/users/current',{credentials:'include'}).then(function(r){return r.json()}).then(function(j){var t=f(j,0);if(t)g(t);else alert('No session found. Make sure you are logged in to Vinted.')}).catch(function(){alert('Connection failed. Make sure you are logged in to Vinted.')});setTimeout(function(){window.fetch=q;e.remove()},9000)})();`
}

function ConnectorsInner() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<StatusMap>({})
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [method, setMethod] = useState<'browser' | 'password'>('browser')
  const [domain, setDomain] = useState(REGIONS[0].domain)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const [connectionResponse, healthResponse, accountResponse] = await Promise.all([
        apiFetch('/api/vinted-connect'), fetch('/api/status', { cache: 'no-store' }), apiFetch('/api/account-stats'),
      ])
      if (connectionResponse.ok) setStatus(await connectionResponse.json())
      const system = healthResponse.ok ? await healthResponse.json() : {}
      const account = accountResponse.ok ? await accountResponse.json() : {}
      setHealth({ ...system, ...account })
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const accessToken = searchParams.get('vtoken')
    const callbackDomain = searchParams.get('vdomain')
    if (!accessToken || !callbackDomain || !REGIONS.some(region => region.domain === callbackDomain)) return
    setConnecting(true)
    apiFetch('/api/vinted-connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: callbackDomain, accessToken }),
    }).then(async response => {
      const result = await response.json()
      setMessage({ ok: response.ok && result.ok, text: result.ok ? 'Vinted connected successfully.' : result.error || 'Connection failed.' })
      if (result.ok) load()
    }).catch(() => setMessage({ ok: false, text: 'Connection failed. Please try again.' }))
      .finally(() => {
        setConnecting(false)
        const url = new URL(window.location.href); url.searchParams.delete('vtoken'); url.searchParams.delete('vdomain')
        window.history.replaceState({}, '', url.toString())
      })
  }, [searchParams, load])

  const connected = useMemo(() => Object.values(status).filter(value => value.connected).length, [status])
  const live = health?.secondsSinceLastScrape != null && health.secondsSinceLastScrape < 180 && (health.lastScrape?.errors || 0) === 0

  const copyHelper = async () => {
    await navigator.clipboard.writeText(bookmarklet())
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  const connectPassword = async (event: FormEvent) => {
    event.preventDefault(); if (!email.trim() || !password) return
    setConnecting(true); setMessage(null)
    try {
      const response = await apiFetch('/api/vinted-connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, email: email.trim(), password }),
      })
      const result = await response.json()
      setMessage({ ok: response.ok && result.ok, text: result.ok ? 'Vinted connected successfully.' : result.error || 'Connection failed.' })
      if (result.ok) { setPassword(''); await load() }
    } catch { setMessage({ ok: false, text: 'Connection failed. Please try again.' }) }
    finally { setConnecting(false) }
  }

  const disconnect = async (targetDomain: string) => {
    if (!confirm('Disconnect this Vinted region? Public scanning will keep working.')) return
    await apiFetch('/api/vinted-connect', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: targetDomain }) })
    setMessage({ ok: true, text: 'Vinted region disconnected. Public scanning remains active.' }); load()
  }

  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }}><Navigation /><main className="page connectors-page">
    <header className="connector-hero"><div><div className="eyebrow">Integration center</div><h1>Connectors</h1><p>Connect accounts only when they improve your results. Most marketplace scanners work automatically with no login.</p></div><button className="refresh-button" onClick={load} disabled={refreshing}><span className={refreshing ? 'spin' : ''}>↻</span>{refreshing ? 'Checking…' : 'Refresh status'}</button></header>

    <section className="status-grid">
      <article><span className={`status-dot ${live ? 'green' : 'amber'}`} /><div><small>Scanner</small><strong>{live ? 'Live and healthy' : 'Checking scanner'}</strong><p>{health?.secondsSinceLastScrape != null ? `Last scan ${health.secondsSinceLastScrape}s ago` : 'Waiting for status'}</p></div></article>
      <article><span className="status-icon">◎</span><div><small>Your marketplace data</small><strong>{health?.totalItems ?? '—'} listings</strong><p>{health?.pricedItems ?? '—'} prices · {health?.searches ?? '—'} searches</p></div></article>
      <article><span className="status-icon vinted">V</span><div><small>Vinted accounts</small><strong>{connected} connected</strong><p>Optional authenticated fallback</p></div></article>
    </section>

    {message && <div className={`message ${message.ok ? 'success' : 'error'}`}><b>{message.ok ? '✓' : '!'}</b><span>{message.text}</span><button onClick={() => setMessage(null)}>×</button></div>}

    <section className="vinted-layout">
      <article className="connector-card vinted-card">
        <div className="connector-title"><div className="brand-mark">V</div><div><div className="title-line"><h2>Vinted</h2><span className="optional">OPTIONAL</span></div><p>Public searches already work. Connect your account as a fallback when Vinted blocks guest requests.</p></div></div>
        <div className="benefits"><div><b>✓</b><span><strong>More reliable fallback</strong><small>Use an authenticated session if public access is unavailable.</small></span></div><div><b>✓</b><span><strong>Separate by country</strong><small>Connect only the Vinted regions you actually use.</small></span></div><div><b>✓</b><span><strong>No password stored</strong><small>TrueSource stores the resulting session, not your password.</small></span></div></div>
        <div className="region-list"><div className="region-head"><span>Connected regions</span><small>{connected}/{REGIONS.length}</small></div>{REGIONS.map(region => {
          const current = status[region.domain]
          return <div className="region-row" key={region.domain}><span className="flag">{region.flag}</span><div><strong>{region.country}</strong><small>{current?.connected ? `${current.email || 'Vinted session'} · ${timeAgo(current.connectedAt)}` : region.domain}</small></div><span className={`connection-state ${current?.connected ? 'connected' : ''}`}>{current?.connected ? 'Connected' : 'Not connected'}</span>{current?.connected && <button onClick={() => disconnect(region.domain)}>Disconnect</button>}</div>
        })}</div>
      </article>

      <article className="connector-card setup-card">
        <div className="setup-head"><span className="section-kicker">Connect Vinted</span><h2>Choose the easiest method</h2><p>The browser method is recommended and does not use a paid API.</p></div>
        <div className="method-tabs"><button className={method === 'browser' ? 'active' : ''} onClick={() => setMethod('browser')}><span>Recommended</span>Browser helper</button><button className={method === 'password' ? 'active' : ''} onClick={() => setMethod('password')}><span>Alternative</span>Email & password</button></div>
        {method === 'browser' ? <div className="browser-flow">
          <div className="step"><b>1</b><div><strong>Copy the connection helper</strong><p>This creates a bookmark you can run while logged in to Vinted.</p><button className="btn-primary" onClick={copyHelper}>{copied ? 'Copied ✓' : 'Copy helper code'}</button></div></div>
          <div className="step"><b>2</b><div><strong>Create a browser bookmark</strong><p>Press <kbd>Ctrl + D</kbd> on any page. Choose “More”, replace the URL with the copied code, and name it <em>Connect Vinted</em>.</p></div></div>
          <div className="step"><b>3</b><div><strong>Open Vinted and connect</strong><p>Log in to your selected Vinted country, then click the “Connect Vinted” bookmark.</p><select value={domain} onChange={event => setDomain(event.target.value)}>{REGIONS.map(region => <option value={region.domain} key={region.domain}>{region.flag} {region.country}</option>)}</select><a className="btn-secondary open-vinted" href={`https://${domain}`} target="_blank" rel="noreferrer">Open Vinted ↗</a></div></div>
        </div> : <form className="password-flow" onSubmit={connectPassword}>
          <div className="info-note"><b>Private connection</b><span>Your password is sent directly for sign-in and is never saved. Only the Vinted session is stored.</span></div>
          <label>Vinted country<select value={domain} onChange={event => setDomain(event.target.value)}>{REGIONS.map(region => <option value={region.domain} key={region.domain}>{region.flag} {region.country}</option>)}</select></label>
          <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="username" required /></label>
          <label>Password<div className="password-input"><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Your Vinted password" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
          <button className="btn-primary connect-button" disabled={connecting}>{connecting ? 'Connecting…' : 'Connect Vinted'}</button>
          <p className="password-help">Signed up with Google, Apple or Facebook? Use the recommended browser helper instead.</p>
        </form>}
      </article>
    </section>

    <section className="built-in-section"><div className="section-heading"><div><span className="section-kicker">No account required</span><h2>Built-in marketplace scanners</h2><p>These sources are already part of TrueSource. Create a search and the scanner handles the connection.</p></div><a href="/searches" className="btn-secondary">Create a search →</a></div><div className="source-grid">{BUILT_IN.map(([name, market]) => <article key={name}><div className="source-logo">{name.slice(0, 1)}</div><div><strong>{name}</strong><small>{market}</small></div><span><i /> Ready</span></article>)}<article className="coming-source"><div className="source-logo">O</div><div><strong>OLX</strong><small>Reliable direct scanner in development</small></div><span>COMING SOON</span></article><article className="coming-source"><div className="source-logo">f</div><div><strong>Facebook Marketplace</strong><small>Account integration required</small></div><span>COMING SOON</span></article></div></section>

    <section className="explain-grid"><article><span>01</span><h3>Do I need to connect Vinted?</h3><p>No. Public Vinted scanning works automatically. Connect only if your searches show repeated Vinted access errors.</p></article><article><span>02</span><h3>What does TrueSource save?</h3><p>For account connections, a private storage bucket holds the session token. Your password is not stored.</p></article><article><span>03</span><h3>Can I disconnect later?</h3><p>Yes. Disconnect any country above at any time. Your searches and already saved listings stay available.</p></article></section>
  </main><style jsx>{`
    .connectors-page{display:grid;gap:18px}.connector-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:7px 0 10px}.connector-hero h1{margin:0;font-size:clamp(38px,5vw,58px);line-height:.96;letter-spacing:-.055em}.connector-hero p{max-width:650px;margin:14px 0 0;color:var(--text2);font-size:15px;line-height:1.6}.refresh-button{display:flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid var(--border2);border-radius:8px;background:#fff;color:var(--text2);font:600 12px var(--font-sans);cursor:pointer}.refresh-button:disabled{opacity:.6}.status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}.status-grid article{display:flex;align-items:center;gap:12px;padding:16px;border:1px solid var(--border);border-radius:11px;background:#fff}.status-grid small,.status-grid strong,.status-grid p{display:block;margin:0}.status-grid small{color:var(--text3);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.status-grid strong{margin-top:2px;font-size:13px}.status-grid p{margin-top:2px;color:var(--text3);font-size:10px}.status-dot{width:11px;height:11px;border-radius:50%;box-shadow:0 0 0 5px rgba(245,158,11,.1);background:#f59e0b}.status-dot.green{background:#65c914;box-shadow:0 0 0 5px rgba(101,201,20,.1)}.status-icon{width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--accent);font-weight:800}.status-icon.vinted{background:#e6fbfb;color:#007782;border-color:#c0eded}.message{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:9px;font-size:12px}.message.success{border:1px solid #bbebbd;background:#f0fbef;color:#23752d}.message.error{border:1px solid #fecaca;background:#fff1f2;color:#b91c1c}.message b{width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:currentColor;color:#fff}.message span{flex:1}.message button{border:0;background:transparent;color:currentColor;font-size:19px;cursor:pointer}
    .vinted-layout{display:grid;grid-template-columns:minmax(0,.9fr) minmax(420px,1.1fr);gap:14px}.connector-card,.built-in-section{padding:23px;border:1px solid var(--border);border-radius:13px;background:#fff;box-shadow:var(--shadow-card)}.connector-title{display:flex;gap:14px}.brand-mark{width:48px;height:48px;display:grid;place-items:center;flex:0 0 auto;border-radius:12px;background:#007782;color:#fff;font-size:22px;font-weight:800}.title-line{display:flex;align-items:center;gap:8px}.title-line h2,.setup-head h2,.section-heading h2{margin:0;font-size:20px;letter-spacing:-.03em}.optional{padding:3px 6px;border-radius:999px;background:var(--surface);color:var(--text3);font-size:7px;font-weight:800;letter-spacing:.08em}.connector-title p,.setup-head p,.section-heading p{margin:6px 0 0;color:var(--text2);font-size:12px;line-height:1.55}.benefits{display:grid;gap:8px;margin:20px 0}.benefits>div{display:flex;gap:9px;padding:10px;border-radius:9px;background:var(--surface)}.benefits b{color:#5cae18}.benefits span strong,.benefits span small{display:block}.benefits span strong{font-size:11px}.benefits span small{margin-top:2px;color:var(--text3);font-size:9px}.region-list{overflow:hidden;border:1px solid var(--border);border-radius:10px}.region-head{display:flex;justify-content:space-between;padding:10px 12px;background:var(--surface);color:var(--text3);font-size:9px;font-weight:800;text-transform:uppercase}.region-row{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:9px;padding:10px 12px;border-top:1px solid var(--border)}.flag{font-size:19px}.region-row div strong,.region-row div small{display:block}.region-row div strong{font-size:11px}.region-row div small{color:var(--text3);font-size:9px}.connection-state{padding:3px 6px;border-radius:999px;background:var(--surface);color:var(--text3);font-size:8px;font-weight:700}.connection-state.connected{background:#effbe6;color:#4d861e}.region-row>button{border:0;background:none;color:#b45309;font:600 9px var(--font-sans);cursor:pointer}
    .setup-head{margin-bottom:16px}.method-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:5px;border-radius:10px;background:var(--surface)}.method-tabs button{padding:10px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--text3);font:650 12px var(--font-sans);cursor:pointer}.method-tabs button span{display:block;margin-bottom:2px;font-size:7px;letter-spacing:.08em;text-transform:uppercase}.method-tabs button.active{border-color:var(--border);background:#fff;color:var(--text);box-shadow:0 2px 8px rgba(0,0,0,.04)}.browser-flow{display:grid;gap:0;margin-top:17px}.step{display:grid;grid-template-columns:28px 1fr;gap:11px;position:relative;padding-bottom:18px}.step:not(:last-child):before{content:'';position:absolute;left:13px;top:29px;bottom:2px;width:1px;background:var(--border)}.step>b{width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#f1eafd;color:var(--accent);font-size:11px}.step strong{font-size:12px}.step p{margin:3px 0 9px;color:var(--text3);font-size:10px;line-height:1.55}.step kbd{padding:2px 5px;border:1px solid var(--border2);border-radius:4px;background:var(--surface)}.step em{color:var(--accent);font-style:normal;font-weight:700}.step select{display:inline-block;width:calc(100% - 127px);margin-right:7px;padding:8px 9px;font-size:11px}.open-vinted{padding:8px 10px;font-size:11px}.password-flow{display:grid;gap:12px;margin-top:17px}.password-flow label{color:var(--text3);font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.password-flow input,.password-flow select{margin-top:5px}.password-input{position:relative}.password-input button{position:absolute;right:9px;top:50%;transform:translateY(-35%);border:0;background:transparent;color:var(--text3);font:600 10px var(--font-sans);cursor:pointer}.password-input input{padding-right:55px}.info-note{display:flex;gap:8px;padding:10px;border:1px solid #ddd0fa;border-radius:8px;background:#f7f3ff;color:var(--text2);font-size:10px}.info-note b{color:var(--accent);white-space:nowrap}.connect-button{width:100%;margin-top:2px}.password-help{margin:0;color:var(--text3);font-size:9px;text-align:center}
    .section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.source-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px}.source-grid article{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:9px;padding:10px;border:1px solid var(--border);border-radius:9px}.source-logo{width:34px;height:34px;display:grid;place-items:center;border-radius:8px;background:var(--surface);color:var(--accent);font-weight:800}.source-grid strong,.source-grid small{display:block}.source-grid strong{font-size:11px}.source-grid small{color:var(--text3);font-size:8px}.source-grid article>span{color:#4d861e;font-size:8px;font-weight:800}.source-grid article>span i{display:inline-block;width:5px;height:5px;margin-right:3px;border-radius:50%;background:#65c914}.source-grid .coming-source>span{color:var(--accent);font-size:7px}.explain-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}.explain-grid article{padding:18px;border:1px solid var(--border);border-radius:11px;background:#fff}.explain-grid span{color:var(--accent);font-size:9px;font-weight:800}.explain-grid h3{margin:9px 0 5px;font-size:13px}.explain-grid p{margin:0;color:var(--text3);font-size:10px;line-height:1.55}
    @media(max-width:1100px){.vinted-layout{grid-template-columns:1fr}.source-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.connector-hero{display:block}.refresh-button{margin-top:15px}.status-grid,.explain-grid{grid-template-columns:1fr}.vinted-layout{display:block}.setup-card{margin-top:12px}.source-grid{grid-template-columns:1fr}.section-heading{display:block}.section-heading>a{margin-top:12px}.region-row{grid-template-columns:auto 1fr auto}.region-row>button{grid-column:2}.step select{display:block;width:100%;margin:0 0 7px}.method-tabs{grid-template-columns:1fr 1fr}.connector-card,.built-in-section{padding:17px}}
  `}</style></div>
}

export default function ConnectorsPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}><ConnectorsInner /></Suspense>
}
