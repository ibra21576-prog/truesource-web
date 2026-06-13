'use client'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  no_access:         "You don't have an active subscription. Purchase access on Whop to continue.",
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

      {/* Card */}
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

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />

        {/* Description */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            Subscriber Access Required
          </p>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
            This tool is exclusively available to members of the TrueSource Flip course on Whop. Sign in with your Whop account to continue.
          </p>
        </div>

        {/* Error */}
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

        {/* Login button */}
        <a href="/api/auth/whop" style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '13px 20px', borderRadius: 12, fontWeight: 700, fontSize: 15,
          background: 'var(--accent)', color: 'var(--bg)', textDecoration: 'none',
          boxShadow: '0 0 24px rgba(61,245,200,0.25)',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 36px rgba(61,245,200,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(61,245,200,0.25)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
        >
          {/* Whop icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
          Sign in with Whop
        </a>

        {/* No account */}
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

      {/* Footer */}
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
