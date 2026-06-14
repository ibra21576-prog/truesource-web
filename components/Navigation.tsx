'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

const NAV = [
  { href: '/dashboard', label: 'Feed',     icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { href: '/searches',  label: 'Searches', icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
  { href: '/archive',   label: 'Archive',  icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> },
  { href: '/settings',  label: 'Settings', icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
]

export default function Navigation() {
  const path = usePathname()

  return (
    <nav style={{
      background: 'rgba(8,10,15,0.85)',
      borderBottom: '1px solid rgba(30,37,53,0.8)',
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', gap: 0 }}>

        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', marginRight: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, overflow: 'hidden',
            border: '1px solid rgba(61,245,200,0.2)',
            boxShadow: '0 0 16px rgba(61,245,200,0.12)',
            flexShrink: 0,
          }}>
            <Image src="/logo.png" alt="TrueSource" width={36} height={36} style={{ display: 'block' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15.5, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              <span style={{
                background: 'linear-gradient(135deg, #edf2ff 0%, #c9d6f0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>TrueSource</span>
              <span style={{
                background: 'linear-gradient(135deg, #3df5c8 0%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginLeft: 3,
              }}>Flip</span>
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', marginTop: 1 }}>DEAL MONITOR</div>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2 }}>
          {NAV.map(l => {
            const active = path === l.href
            return (
              <Link key={l.href} href={l.href} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 14px', borderRadius: 10, fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                textDecoration: 'none',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                color: active ? 'var(--accent)' : 'var(--text2)',
                background: active
                  ? 'rgba(61,245,200,0.08)'
                  : 'transparent',
                border: active
                  ? '1px solid rgba(61,245,200,0.15)'
                  : '1px solid transparent',
                boxShadow: active ? '0 0 16px rgba(61,245,200,0.08)' : 'none',
                letterSpacing: '-0.01em',
              }}>
                {l.icon}
                {l.label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Live indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(52,211,153,0.07)',
            border: '1px solid rgba(52,211,153,0.15)',
            padding: '5px 10px', borderRadius: 20,
          }}>
            <span className="pulse glow-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 8px var(--success)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', letterSpacing: '0.06em' }}>LIVE</span>
          </div>

          {/* Sign out */}
          <a href="/api/auth/logout" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px',
            borderRadius: 10, fontSize: 13, fontWeight: 500, color: 'var(--text3)',
            textDecoration: 'none', transition: 'all 0.2s',
            border: '1px solid transparent',
          }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--danger)'
              el.style.borderColor = 'rgba(248,113,113,0.2)'
              el.style.background = 'rgba(248,113,113,0.05)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--text3)'
              el.style.borderColor = 'transparent'
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
