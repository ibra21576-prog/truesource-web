import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Next.js may otherwise cache Supabase's GET requests in server functions.
// Search changes must be visible to the background scanner immediately.
const noStoreFetch: typeof fetch = (input, init = {}) => {
  const original = init.signal || (input instanceof Request ? input.signal : undefined)
  const deadline = AbortSignal.timeout(10_000)
  return fetch(input, { ...init, cache: 'no-store', signal: original ? AbortSignal.any([original, deadline]) : deadline })
}

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: noStoreFetch },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            )
          } catch {}
        },
      },
    }
  )
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: { fetch: noStoreFetch },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}
