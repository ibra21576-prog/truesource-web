import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TrueSource Flip',
  description: 'Track listings on Vinted, eBay and Kleinanzeigen',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
