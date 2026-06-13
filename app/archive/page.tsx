'use client'
import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; search_query?: string; searches?: { query: string }
}

export default function ArchivePage() {
  const [items,    setItems]    = useState<Item[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [platform, setPlatform] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (platform) params.set('platform', platform)
    const res = await fetch(`/api/feed?${params}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.map((it: any) => ({ ...it, search_query: it.searches?.query })))
    }
    setLoading(false)
  }, [platform])

  useEffect(() => { load() }, [platform])

  async function clearAll() {
    if (!confirm('Gesamtes Archiv löschen?')) return
    await fetch('/api/feed', { method: 'DELETE' })
    setItems([])
  }

  const filtered = items.filter(it => {
    if (!search) return true
    const q = search.toLowerCase()
    return (it.title || '').toLowerCase().includes(q)
        || (it.search_query || '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Archiv</h1>
            <p className="text-muted text-sm">{filtered.length} von {items.length} Listings</p>
          </div>
          <button onClick={clearAll} className="btn-secondary text-sm text-red-400 hover:text-red-300">
            Alles löschen
          </button>
        </div>

        <div className="flex gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Suche im Archiv…" className="max-w-xs" />
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-44">
            <option value="">Alle Plattformen</option>
            <option value="vinted">Vinted</option>
            <option value="ebay">eBay</option>
            <option value="kleinanzeigen">Kleinanzeigen</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center text-muted py-20">Lade…</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-white font-medium mb-2">Keine Einträge</p>
            <p className="text-muted text-sm">Neue Listings werden hier automatisch gespeichert.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
