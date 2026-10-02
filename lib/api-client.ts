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
