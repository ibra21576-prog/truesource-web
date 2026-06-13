'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'

const links = [
  {
    href: '/dashboard',
    label: 'Feed',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/searches',
    label: 'Suchen',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    href: '/archive',
    label: 'Archiv',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="21 8 21 21 3 21 3 8"/>
        <rect x="1" y="3" width="22" height="5"/>
        <line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
    ),
  },
]

export default function Navigation() {
  const path = usePathname()

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(6,8,15,0.75)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo + Wordmark */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <Logo size={36} />
          <div style={{ lineHeight: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#f0f6ff', letterSpacing: '-0.03em' }}>TrueSource</span>
              <span style={{
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #3bf0c5, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginLeft: 5,
              }}>Flip</span>
            </div>
            <div style={{ fontSize: 10, color: '#3a5470', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
              Deal Monitor
            </div>
          </div>
        </Link>

        {/* Nav pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {links.map(l => {
            const active = path === l.href
            return (
              <Link key={l.href} href={l.href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                textDecoration: 'none',
                transition: 'all 0.2s',
                ...(active ? {
                  background: 'linear-gradient(135deg, rgba(59,240,197,0.15), rgba(91,124,247,0.1))',
                  color: '#3bf0c5',
                  boxShadow: '0 0 12px rgba(59,240,197,0.1), inset 0 1px 0 rgba(59,240,197,0.1)',
                  border: '1px solid rgba(59,240,197,0.15)',
                } : {
                  color: '#4a6a88',
                  border: '1px solid transparent',
                }),
              }}>
                <span style={{ color: active ? '#3bf0c5' : '#4a6a88', transition: 'color 0.2s' }}>{l.icon}</span>
                {l.label}
              </Link>
            )
          })}
        </div>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} className="animate-pulse-soft" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', letterSpacing: '0.04em' }}>LIVE</span>
          </div>
        </div>

      </div>
    </nav>
  )
}
