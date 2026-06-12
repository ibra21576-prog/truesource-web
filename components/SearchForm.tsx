'use client'
import { useState } from 'react'

const VINTED_DOMAINS = [
  'www.vinted.de','www.vinted.at','www.vinted.com','www.vinted.fr',
  'www.vinted.nl','www.vinted.es','www.vinted.it','www.vinted.pl','www.vinted.co.uk',
]

interface Props {
  onCreated: () => void
}

export default function SearchForm({ onCreated }: Props) {
  const [query,    setQuery]    = useState('')
  const [platform, setPlatform] = useState('vinted')
  const [domain,   setDomain]   = useState('www.vinted.de')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  function handlePlatformChange(p: string) {
    setPlatform(p)
    if (p === 'vinted')       setDomain('www.vinted.de')
    else if (p === 'ebay')    setDomain('www.ebay.de')
    else if (p === 'kleinanzeigen') setDomain('www.kleinanzeigen.de')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), platform, domain, min_price: minPrice || null, max_price: maxPrice || null }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Fehler')
      }
      setQuery('')
      setMinPrice('')
      setMaxPrice('')
      onCreated()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="font-semibold text-white">Neue Suche</h2>

      <div>
        <label className="text-sm text-muted block mb-1">Suchbegriff</label>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="z.B. Nintendo Switch, Panini Hardcover…" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-muted block mb-1">Plattform</label>
          <select value={platform} onChange={e => handlePlatformChange(e.target.value)}>
            <option value="vinted">Vinted</option>
            <option value="ebay">eBay</option>
            <option value="kleinanzeigen">Kleinanzeigen</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-muted block mb-1">Domain</label>
          {platform === 'vinted' ? (
            <select value={domain} onChange={e => setDomain(e.target.value)}>
              {VINTED_DOMAINS.map(d => <option key={d} value={d}>{d.replace('www.', '')}</option>)}
            </select>
          ) : (
            <input value={domain} readOnly className="opacity-60 cursor-default" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-muted block mb-1">Min. Preis (€)</label>
          <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" min="0" />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1">Max. Preis (€)</label>
          <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="∞" min="0" />
        </div>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-900/30 rounded-lg p-2">{error}</div>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Wird erstellt…' : '+ Suche hinzufügen'}
      </button>
    </form>
  )
}
