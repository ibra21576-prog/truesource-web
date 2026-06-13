'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const path = usePathname()

  const links = [
    { href: '/dashboard', label: 'Feed' },
    { href: '/searches',  label: 'Suchen' },
    { href: '/archive',   label: 'Archiv' },
  ]

  return (
    <nav className="bg-surface border-b border-border sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-bg font-bold text-sm">T</div>
            <span className="font-semibold text-white hidden sm:block">TrueSource</span>
          </Link>
          <div className="flex gap-1">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  path === l.href ? 'bg-accent/20 text-accent' : 'text-muted hover:text-white'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
