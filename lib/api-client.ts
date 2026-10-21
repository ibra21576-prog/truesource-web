export function sessionHref(path: string): string {
  if (typeof window === 'undefined' || !path.startsWith('/') || path.startsWith('//')) return path
  try {
    const token = new URLSearchParams(window.location.search).get('t') || sessionStorage.getItem('ts_token')
    if (!token) return path
    const url = new URL(path, window.location.origin)
    if (url.origin !== window.location.origin) return path
    url.searchParams.set('t', token)
    return url.pathname + url.search + url.hash
  } catch { return path }
}

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)

  if (typeof window !== 'undefined') {
    const urlToken = new URLSearchParams(window.location.search).get('t')
    if (urlToken) sessionStorage.setItem('ts_token', urlToken)
    const token = urlToken || sessionStorage.getItem('ts_token')
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  return fetch(input, { ...init, headers })
}
