import type { Metadata } from 'next'
import { Inter_Tight } from 'next/font/google'
import './globals.css'

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TrueSource Flip',
  description: 'Deal Monitor für Vinted, eBay & Kleinanzeigen',
  icons: { icon: '/truesource-mark-v2.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={interTight.variable}>
      <body>{children}</body>
    </html>
  )
}
