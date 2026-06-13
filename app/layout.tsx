import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TrueSource Flip',
  description: 'Deal Monitor für Vinted, eBay & Kleinanzeigen',
  icons: { icon: '/logo.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
