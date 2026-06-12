'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode]       = useState<'login' | 'signup'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${location.origin}/api/auth/callback` },
        })
        if (error) throw error
        setError('Bestätigungs-E-Mail gesendet! Klick auf den Link und meld dich dann an.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-bg font-bold text-lg">T</div>
            <span className="text-xl font-bold text-white">TrueSource Flip</span>
          </div>
          <p className="text-muted text-sm">Listings auf Vinted, eBay & Kleinanzeigen tracken</p>
        </div>

        <div className="card">
          <div className="flex gap-1 mb-6 bg-surface rounded-lg p-1">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === m ? 'bg-accent text-bg' : 'text-muted hover:text-white'
                }`}>
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted block mb-1">E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="deine@email.de" required />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Passwort</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen" required minLength={6} />
            </div>
            {error && (
              <div className={`text-sm p-3 rounded-lg ${
                error.includes('E-Mail') ? 'bg-teal-900/40 text-teal-300' : 'bg-red-900/40 text-red-300'
              }`}>{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Account erstellen'}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-xs mt-6">
          Deine Daten werden sicher bei Supabase gespeichert.
        </p>
      </div>
    </div>
  )
}
