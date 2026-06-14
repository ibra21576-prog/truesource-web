'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

const NAV = [
  { href: '/dashboard', label: 'Feed',     icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { href: '/searches',  label: 'Searches', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { href: '/archive',   label: 'Archive',  icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> },
  { href: '/settings',  label: 'Settings', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
]

export default function Navigation() {
  const path = usePathname()

  return (
    <nav style={{
      background: 'rgba(9,9,11,0.95)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 24px',
        height: 56, display: 'flex', alignItems: 'center', gap: 0,
      }}>

        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, overflow: 'hidden',
            border: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <Image src="/logo.png" alt="TrueSource" width={32} height={32} style={{ display: 'block' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ color: 'var(--text)' }}>TrueSource</span>
            <span style={{ color: 'var(--accent)', marginLeft: 2 }}>Flip</span>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2 }}>
          {NAV.map(l => {
            const active = path === l.href
            return (
              <Link key={l.href} href={l.href} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6, fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                color: active ? 'var(--text)' : 'var(--text3)',
                background: active ? 'var(--surface)' : 'transparent',
              }}>
                {l.icon}
                {l.label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="live-dot pulse" />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)' }}>Live</span>
          </div>

          {/* Sign out */}
          <a href="/api/auth/logout" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 6, fontSize: 13, fontWeight: 500, color: 'var(--text3)',
            textDecoration: 'none', transition: 'all 0.15s',
          }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--text2)'
              el.style.background = 'var(--surface)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--text3)'
              el.style.background = 'transparent'
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </a>
        </div>

      </div>
    </nav>
  )
}
