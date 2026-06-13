'use client'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  no_access:         "Your subscription is not active. Purchase access to continue.",
  token_failed:      'Authentication failed. Please try again.',
  user_failed:       'Could not retrieve your account. Please try again.',
  membership_failed: 'Could not verify your membership. Please try again.',
  server_error:      'Something went wrong. Please try again.',
  no_code:           'Authentication was cancelled. Please try again.',
}

function LoginContent() {
  const params = useSearchParams()
  const error  = params.get('error')

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: 'var(--card)', border: '1.5px solid var(--border)',
        borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Image src="/logo.png" alt="TrueSource Flip" width={64} height={64} style={{ borderRadius: 14 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              TrueSource <span style={{ color: 'var(--accent)' }}>Flip</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, fontWeight: 500, letterSpacing: '0.05em' }}>
              MEMBERS ONLY
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            Subscriber Access Required
          </p>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
            This tool is exclusively available to members of the TrueSource Flip course. Sign in with your Whop account to continue.
          </p>
        </div>

        {error && (
          <div style={{
            width: '100%', background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10,
            padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <svg width="15" height="15" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>
              {ERROR_MESSAGES[error] ?? 'An error occurred. Please try again.'}
            </p>
          </div>
        )}

        <a href="/api/auth/whop" style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '13px 20px', borderRadius: 12, fontWeight: 700, fontSize: 15,
          background: '#FA4616', color: '#fff', textDecoration: 'none',
          boxShadow: '0 0 28px rgba(250,70,22,0.4)', transition: 'all 0.15s',
        }}>
          {/* Official Whop brandmark */}
          <svg width="22" height="12" viewBox="0 0 1000 515" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M158.881 -0.00366211C93.2014 -0.00366211 47.9251 28.989 13.6619 61.7749C13.6619 61.7749 -0.173169 74.965 0.00164277 75.3669L143.897 220.129L287.766 75.3669C260.521 37.6314 209.152 -0.00366211 158.881 -0.00366211Z" fill="white"/>
            <path d="M514.191 -0.00354004C448.513 -0.00354004 403.236 28.9891 368.971 61.7751C368.971 61.7751 356.336 74.6134 355.763 75.3671L177.903 254.322L321.574 398.857L643.077 75.3671C615.831 37.6316 564.488 -0.00354004 514.191 -0.00354004Z" fill="white"/>
            <path d="M870.479 -0.00354004C804.798 -0.00354004 759.524 28.9891 725.259 61.7751C725.259 61.7751 712.098 74.7138 711.6 75.3671L355.806 433.351L393.466 471.237C451.73 529.852 547.101 529.852 605.365 471.237L998.914 75.3671H999.365C972.119 37.6316 920.773 -0.00354004 870.479 -0.00354004Z" fill="white"/>
          </svg>
          Connect to Whop
        </a>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
            Don&apos;t have access yet?{' '}
            <a href={process.env.NEXT_PUBLIC_WHOP_BUY_URL ?? 'https://whop.com'}
              target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              Purchase membership →
            </a>
          </p>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 24, textAlign: 'center' }}>
        Protected by Whop · TrueSource Flip
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
