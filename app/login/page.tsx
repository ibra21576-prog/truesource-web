'use client'
import Logo from '@/components/Logo'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  no_access:         'Your subscription is not active. Purchase access to continue.',
  token_failed:      'Authentication failed. Please try again.',
  user_failed:       'Could not retrieve your account. Please try again.',
  membership_failed: 'Could not verify your membership. Please try again.',
  server_error:      'Something went wrong. Please try again.',
  no_code:           'Authentication was cancelled. Please try again.',
}

function WhopMark() {
  return (
    <svg width="22" height="12" viewBox="0 0 1000 515" fill="none" aria-hidden="true">
      <path d="M158.881 -0.00366211C93.2014 -0.00366211 47.9251 28.989 13.6619 61.7749C13.6619 61.7749 -0.173169 74.965 0.00164277 75.3669L143.897 220.129L287.766 75.3669C260.521 37.6314 209.152 -0.00366211 158.881 -0.00366211Z" fill="white"/>
      <path d="M514.191 -0.00354004C448.513 -0.00354004 403.236 28.9891 368.971 61.7751C368.971 61.7751 356.336 74.6134 355.763 75.3671L177.903 254.322L321.574 398.857L643.077 75.3671C615.831 37.6316 564.488 -0.00354004 514.191 -0.00354004Z" fill="white"/>
      <path d="M870.479 -0.00354004C804.798 -0.00354004 759.524 28.9891 725.259 61.7751C725.259 61.7751 712.098 74.7138 711.6 75.3671L355.806 433.351L393.466 471.237C451.73 529.852 547.101 529.852 605.365 471.237L998.914 75.3671H999.365C972.119 37.6316 920.773 -0.00354004 870.479 -0.00354004Z" fill="white"/>
    </svg>
  )
}

const BENEFITS = [
  'Live listings across 13 marketplaces',
  'Fast, automated product monitoring',
  'Built for professional resellers',
]

function membershipUrl() {
  const value = (process.env.NEXT_PUBLIC_WHOP_BUY_URL || 'https://whop.com').replace(/^[\uFEFF\s]+/, '')
  try { return new URL(value).toString() } catch { return 'https://whop.com/' }
}

function LoginContent() {
  const params = useSearchParams()
  const router = useRouter()
  const error = params.get('error')
  const serverIframe = params.get('iframe') === '1'
  const [isIframe, setIsIframe] = useState(serverIframe)

  useEffect(() => {
    try { if (window.self !== window.top) setIsIframe(true) } catch { setIsIframe(true) }

    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'truesource_auth' && e.data?.token) {
        sessionStorage.setItem('ts_token', e.data.token)
        router.push(`/dashboard?t=${encodeURIComponent(e.data.token)}`)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [router])

  function openPopup() {
    const w = 520, h = 640
    const left = window.screenX + (window.outerWidth - w) / 2
    const top = window.screenY + (window.outerHeight - h) / 2
    window.open('/api/auth/whop?popup=1', 'whop_login', `width=${w},height=${h},left=${left},top=${top}`)
  }

  const authContent = <><WhopMark />Connect with Whop</>

  return (
    <main className="login-shell">
      <section className="login-showcase">
        <div className="login-showcase-brand">
          <Logo size={38} />
          <div>
            <div>TrueSource</div>
            <span>Flip intelligence</span>
          </div>
        </div>

        <div className="login-showcase-copy">
          <div className="login-kicker"><span /> Marketplace intelligence</div>
          <h1>Find the right deal before everyone else.</h1>
          <p>One focused workspace for monitoring new listings and identifying resale opportunities across international marketplaces.</p>

          <div className="login-benefits">
            {BENEFITS.map(benefit => (
              <div key={benefit}>
                <span>
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <p className="login-showcase-footer">TrueSource Flip · Private member platform</p>
      </section>

      <section className="login-auth-panel">
        <div className="login-auth-wrap">
          <div className="login-card">
            <div className="login-card-brand">
              <Logo size={44} />
              <div>
                <strong>TrueSource Flip</strong>
                <span>Member workspace</span>
              </div>
            </div>

            <div className="login-access-badge"><span /> Member access</div>
            <h2>Welcome back</h2>
            <p className="login-intro">Sign in with the Whop account connected to your active TrueSource membership.</p>

            {error && (
              <div className="login-error">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{ERROR_MESSAGES[error] ?? 'An error occurred. Please try again.'}</span>
              </div>
            )}

            {isIframe ? (
              <button onClick={openPopup} className="whop-login-button">{authContent}</button>
            ) : (
              <a href="/api/auth/whop" className="whop-login-button">{authContent}</a>
            )}

            <div className="login-separator"><span>Membership required</span></div>

            <p className="login-purchase">
              Don&apos;t have access yet?{' '}
              <a
                href={membershipUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                View membership →
              </a>
            </p>

            <div className="login-security">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
              </svg>
              Secure access verified by Whop
            </div>
          </div>

          <p className="login-legal">By continuing, you agree to use TrueSource in accordance with marketplace policies.</p>
        </div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}
