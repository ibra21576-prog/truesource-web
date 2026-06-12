'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navigation from '@/components/Navigation'
import ItemCard from '@/components/ItemCard'

interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; search_query?: string
}

interface Search {
  id: string; query: string; platform: string; domain: string; enabled: boolean
}

export default function DashboardPage() {
  const [items,   setItems]   = useState<Item[]>([])
  const [searches, setSearches] = useState<Search[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState<Record<string, boolean>>({})
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const supabase = createClient()

  const loadFeed = useCallback(async () => {
    const { data } = await supabase
      .from('items')
      .select(`*, searches(query)`)
      .order('found_at', { ascending: false })
      .limit(60)
    if (data) {
      setItems(data.map((it: any) => ({ ...it, search_query: it.searches?.query })))
    }
    setLoading(false)
  }, [])

  const loadSearches = useCallback(async () => {
    const { data } = await supabase.from('searches').select('id,query,platform,domain,enabled').eq('enabled', true)
    if (data) setSearches(data)
  }, [])

  useEffect(() => {
    loadFeed()
    loadSearches()
    // Live updates
    const channel = supabase.channel('items-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items' }, loadFeed)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function refresh(searchId: string) {
    setScraping(s => ({ ...s, [searchId]: true }))
    setErrors(e => { const n = { ...e }; delete n[searchId]; return n })
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadFeed()
    } catch (e: any) {
      setErrors(s => ({ ...s, [searchId]: e.message }))
    } finally {
      setScraping(s => ({ ...s, [searchId]: false }))
    }
  }

  async function refreshAll() {
    for (const s of searches) await refresh(s.id)
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Feed</h1>
            <p className="text-muted text-sm">{items.length} Listings gefunden</p>
          </div>
          <button onClick={refreshAll} disabled={searches.length === 0}
            className="btn-primary flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
            Alle aktualisieren
          </button>
        </div>

        {/* Per-search refresh buttons */}
        {searches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {searches.map(s => (
              <div key={s.id} className="flex flex-col gap-1">
                <button onClick={() => refresh(s.id)} disabled={scraping[s.id]}
                  className={`btn-secondary text-sm flex items-center gap-2 ${scraping[s.id] ? 'opacity-60' : ''}`}>
                  {scraping[s.id] ? (
                    <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"/>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                    </svg>
                  )}
                  {s.query} · {s.platform}
                </button>
                {errors[s.id] && (
                  <span className="text-xs text-red-400">{errors[s.id]}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="text-center text-muted py-20">Lade…</div>
        ) : items.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-white font-medium mb-2">Noch keine Ergebnisse</p>
            <p className="text-muted text-sm">
              Erstell zuerst eine Suche, dann klick auf &quot;Alle aktualisieren&quot;.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  )
}
