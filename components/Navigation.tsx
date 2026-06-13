'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  {
    href: '/dashboard', label: 'Feed',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )
  },
  {
    href: '/searches', label: 'Suchen',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    )
  },
  {
    href: '/archive', label: 'Archiv',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="21 8 21 21 3 21 3 8"/>
        <rect x="1" y="3" width="22" height="5"/>
        <line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
    )
  },
]

export default function Navigation() {
  const path = usePathname()

  return (
    <nav style={{
      background: 'rgba(7,9,15,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(30,45,66,0.8)',
    }} className="sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div style={{
            background: 'linear-gradient(135deg, #3bf0c5, #6366f1)',
            boxShadow: '0 0 16px rgba(59,240,197,0.35)',
          }} className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-bg transition-all group-hover:shadow-glow">
            T
          </div>
          <div>
            <span className="font-bold text-white text-sm tracking-tight">TrueSource</span>
            <span className="font-bold text-sm tracking-tight" style={{ color: '#3bf0c5' }}> Flip</span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid #1e2d42' }}>
          {links.map(l => {
            const active = path === l.href
            return (
              <Link key={l.href} href={l.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={active ? {
                  background: 'rgba(59,240,197,0.12)',
                  color: '#3bf0c5',
                  boxShadow: 'inset 0 1px 0 rgba(59,240,197,0.1)',
                } : {
                  color: '#6b87a0',
                }}>
                <span style={active ? { color: '#3bf0c5' } : { color: '#6b87a0' }}>{l.icon}</span>
                {l.label}
              </Link>
            )
          })}
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6b87a0' }}>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-soft inline-block" />
            Live
          </div>
        </div>

      </div>
    </nav>
  )
}
