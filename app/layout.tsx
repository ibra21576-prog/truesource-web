import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TrueSource Flip',
  description: 'Finde die besten Deals auf Vinted, eBay & Kleinanzeigen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-bg">{children}</body>
    </html>
  )
}
