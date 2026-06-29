'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
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
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function Navigation() {
  const path = usePathname()
  const [srvAgo, setSrvAgo] = useState<number | null>(null)

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
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, overflow: 'hidden',
            border: '1px solid var(--border)', flexShrink: 0,
            background: 'var(--card)',
          }}>
            <Image src="/logo.png" alt="TrueSource" width={34} height={34} style={{ display: 'block' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1.1 }}>
              TrueSource
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>
              Flip
            </div>
          </div>
        </Link>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '8px 10px 6px',
        }}>
          Platform
        </div>

        {NAV.map(l => {
          const active = path === l.href || (l.href !== '/dashboard' && path?.startsWith(l.href))
          return (
            <Link key={l.href} href={l.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 7, fontSize: 13.5,
              fontWeight: active ? 600 : 400,
              textDecoration: 'none',
              transition: 'background 0.12s, color 0.12s',
              color: active ? 'var(--text)' : 'var(--text3)',
              background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
              borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
              marginLeft: -2,
            }}>
              <span style={{ opacity: active ? 1 : 0.6, color: active ? 'var(--accent)' : 'currentColor' }}>
                {l.icon}
              </span>
              {l.label}
            </Link>
          )
        })}
      </nav>

      {/* Status panel */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          borderRadius: 9, background: 'var(--card)',
          border: `1px solid ${live ? 'rgba(22,194,174,0.2)' : 'var(--border)'}`,
          padding: '11px 13px', marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <div className="live-dot" style={!live ? { background: '#f59e0b', boxShadow: 'none', animation: 'none' } : undefined} />
            <span style={{ fontSize: 12, fontWeight: 600, color: live ? 'var(--accent)' : '#f59e0b', letterSpacing: '-0.01em' }}>
              {live ? 'Scraping live' : 'Scraper idle'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.01em' }}>
            {srvAgo == null
              ? 'Checking…'
              : srvAgo < 60
                ? 'Last scan: just now'
                : `Last scan: ${Math.round(srvAgo / 60)}m ago`}
          </div>
        </div>

        <a
          href="/api/auth/logout"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 7, fontSize: 13,
            fontWeight: 400, color: 'var(--text3)',
            textDecoration: 'none', transition: 'all 0.12s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'var(--text2)'
            el.style.background = 'var(--card)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'var(--text3)'
            el.style.background = 'transparent'
          }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </a>
      </div>
    </aside>
  )
}
