'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'
import { useEffect, useState } from 'react'

const NAV = [
  {
    href: '/dashboard',
    label: 'Live Feed',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: '/searches',
    label: 'Searches',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    href: '/archive',
    label: 'Archive',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>
        <line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
    ),
  },
  {
    href: '/price-insights',
    label: 'Price Insights',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M3 20V10"/><path d="M9 20V4"/><path d="M15 20v-7"/><path d="M21 20V7"/>
        <path d="m3 8 6-5 6 8 6-6"/>
      </svg>
    ),
  },
  {
    href: '/create-listing',
    label: 'Create Listing',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    ),
  },
  {
    href: '/connectors',
    label: 'Connectors',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
        <path d="M8 12h8"/><path d="M12 8v8"/>
        <path d="M7 2v4M17 2v4M5 6h14v4a7 7 0 0 1-14 0V6Z"/>
        <path d="M12 17v5"/>
      </svg>
    ),
  },
]

export default function Navigation() {
  const path = usePathname()
  const [srvAgo, setSrvAgo] = useState<number | null>(null)
  const [sessionToken, setSessionToken] = useState('')

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('t')
    if (urlToken) sessionStorage.setItem('ts_token', urlToken)
    setSessionToken(urlToken || sessionStorage.getItem('ts_token') || '')
  }, [path])

  const authHref = (href: string) => sessionToken
    ? `${href}${href.includes('?') ? '&' : '?'}t=${encodeURIComponent(sessionToken)}`
    : href

  useEffect(() => {
    const pull = async () => {
      try {
        const r = await fetch('/api/status')
        if (r.ok) { const d = await r.json(); setSrvAgo(d.secondsSinceLastScrape ?? null) }
      } catch {}
    }
    pull()
    const iv = setInterval(pull, 30_000)
    return () => clearInterval(iv)
  }, [])

  const live = srvAgo != null && srvAgo < 150

  return (
    <>
    <nav className="bottom-nav">
      {NAV.map(l => {
        const active = path === l.href || (l.href !== '/dashboard' && path?.startsWith(l.href))
        return (
          <Link key={l.href} href={authHref(l.href)} className={active ? 'active' : undefined}>
            {l.icon}
            {l.label === 'Create Listing' ? 'Create' : l.label === 'Price Insights' ? 'Insights' : l.label === 'Connectors' ? 'Connect' : l.label}
          </Link>
        )
      })}
    </nav>
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link href={authHref('/dashboard')} className="sidebar-brand-link" aria-label="TrueSource Flip dashboard">
          <Logo size={34} />
          <span>TrueSource</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(l => {
          const active = path === l.href || (l.href !== '/dashboard' && path?.startsWith(l.href))
          return (
            <Link
              key={l.href}
              href={authHref(l.href)}
              className={`sidebar-link${active ? ' active' : ''}`}
              title={l.label}
            >
              <span className="sidebar-link-icon">{l.icon}</span>
              <span className="sidebar-link-label">{l.label === 'Create Listing' ? 'Create' : l.label === 'Price Insights' ? 'Insights' : l.label === 'Connectors' ? 'Connect' : l.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div
          className={`sidebar-status${live ? ' live' : ''}`}
          title={srvAgo == null ? 'Checking scraper status' : `Last scan: ${srvAgo < 60 ? 'just now' : `${Math.round(srvAgo / 60)}m ago`}`}
        >
          <div className="live-dot" style={!live ? { background: '#f59e0b', boxShadow: 'none', animation: 'none' } : undefined} />
          <span>{live ? 'Live' : 'Idle'}</span>
        </div>

        <a
          href="/api/auth/logout"
          onClick={() => sessionStorage.removeItem('ts_token')}
          className="sidebar-signout"
          title="Sign out"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Logout</span>
        </a>
      </div>
    </aside>
    </>
  )
}
