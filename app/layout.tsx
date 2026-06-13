import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TrueSource Flip',
  description: 'Finde die besten Deals auf Vinted, eBay & Kleinanzeigen',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='40' y2='40' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0%25' stop-color='%233bf0c5'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='40' height='40' rx='11' fill='url(%23g)'/%3E%3Cpath d='M11 17.5C11 13.9 15 11 20 11C24.5 11 27.5 13 29 15.5' stroke='white' stroke-width='2.8' stroke-linecap='round' fill='none'/%3E%3Cpath d='M26.5 12L29 15.5L25.5 17' stroke='white' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3Cpath d='M29 22.5C29 26.1 25 29 20 29C15.5 29 12.5 27 11 24.5' stroke='white' stroke-width='2.8' stroke-linecap='round' fill='none'/%3E%3Cpath d='M13.5 28L11 24.5L14.5 23' stroke='white' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
