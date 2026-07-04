'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Navigation from '@/components/Navigation'

interface MarketRef { platform: string; price: string; title: string }
interface Listing {
  product: string
  title: string
  description: string
  category: string
  condition: string
  suggestedPriceEur: number
  confidence: 'high' | 'medium' | 'low'
  marketRefs: MarketRef[]
}

const PLATFORMS = [
  { key: 'vinted',        label: 'Vinted',        url: 'https://www.vinted.de/items/new' },
  { key: 'ebay',          label: 'eBay',           url: 'https://www.ebay.de/sl/sell' },
  { key: 'kleinanzeigen', label: 'Kleinanzeigen',  url: 'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html' },
  { key: 'marktplaats',   label: 'Marktplaats',    url: 'https://www.marktplaats.nl/p/plaats-advertentie' },
  { key: 'shpock',        label: 'Shpock',         url: 'https://www.shpock.com/en-gb/upload' },
]

const PLAT_COLOR: Record<string, string> = {
  vinted: '#14b8a6', ebay: '#f59e0b', kleinanzeigen: '#f97316',
  marktplaats: '#d32f2f', shpock: '#e91e8c', craigslist: '#7c3aed',
  kijiji: '#6d28d9', gumtree: '#00b140', leboncoin: '#1565c0',
}

// Downscale + compress in the browser before upload — keeps the request small
// and well under serverless payload limits.
function compressImage(file: File, maxDim = 1024, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => { img.src = reader.result as string }
    reader.onerror = reject
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas unsupported'))
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function CreateListingPage() {
  const [preview,  setPreview]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [listing,  setListing]  = useState<Listing | null>(null)
  const [credits,  setCredits]  = useState<{ balance: number | null; unlimited: boolean } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadCredits = useCallback(async () => {
    const res = await fetch('/api/credits')
    if (res.ok) setCredits(await res.json())
  }, [])

  useEffect(() => { loadCredits() }, [loadCredits])

  async function handleFile(file: File) {
    setError(''); setListing(null)
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    try {
      const { base64, mimeType } = await compressImage(file)
      const res = await fetch('/api/listing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'NO_CREDITS') setError('Keine Credits mehr übrig.')
        else setError(data.error || 'Analyse fehlgeschlagen')
        return
      }
      setListing(data)
      loadCredits()
    } catch (e: any) {
      setError(e.message || 'Fehler beim Verarbeiten des Bildes')
    } finally {
      setLoading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function fullListingText(l: Listing) {
    return `${l.title}\n\n${l.description}\n\nPreis: ${l.suggestedPriceEur}€ · Zustand: ${l.condition}`
  }

  function openPlatform(p: typeof PLATFORMS[number]) {
    if (listing) copyText(p.key, fullListingText(listing))
    window.open(p.url, '_blank')
  }

  const noCredits = credits && !credits.unlimited && (credits.balance ?? 0) <= 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page" style={{ maxWidth: 760 }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: 'var(--text)' }}>
              Create Listing
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>
              Photo in, ready-to-post listing out — title, description and price, generated automatically.
            </p>
          </div>
          {credits && (
            <div style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--card)', border: '1px solid var(--border2)',
              color: credits.unlimited ? 'var(--accent)' : noCredits ? 'var(--danger)' : 'var(--text2)',
              whiteSpace: 'nowrap',
            }}>
              {credits.unlimited ? 'Unlimited credits' : `${credits.balance} credit${credits.balance === 1 ? '' : 's'} left`}
            </div>
          )}
        </div>

        {/* Upload zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `1.5px dashed ${preview ? 'var(--border2)' : 'var(--border2)'}`,
            borderRadius: 14, padding: preview ? 0 : '48px 24px',
            textAlign: 'center', cursor: noCredits ? 'not-allowed' : 'pointer',
            background: 'var(--card)', overflow: 'hidden',
            opacity: noCredits ? 0.5 : 1,
            transition: 'border-color 0.15s',
          }}
        >
          <input
            ref={fileRef} type="file" accept="image/*" hidden
            disabled={!!noCredits}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {preview ? (
            <div style={{ position: 'relative' }}>
              <img src={preview} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block', background: 'var(--surface)' }} />
              {loading && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(7,7,10,0.72)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                }}>
                  <span className="spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border2)', borderTop: '2px solid var(--accent)', display: 'inline-block' }} />
                  <p style={{ fontSize: 13.5, color: 'var(--text2)' }}>Analyzing photo…</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <svg width="30" height="30" fill="none" stroke="var(--text3)" strokeWidth="1.6" strokeLinecap="round" viewBox="0 0 24 24" style={{ margin: '0 auto 14px' }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 5 }}>
                {noCredits ? 'No credits left' : 'Drop a photo here, or click to upload'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>
                {noCredits ? 'Contact support to get more credits.' : 'One credit per generated listing'}
              </p>
            </>
          )}
        </div>

        {error && (
          <p style={{ fontSize: 13.5, color: 'var(--danger)', marginTop: 14 }}>{error}</p>
        )}

        {/* Result */}
        {listing && (
          <div className="anim-in" style={{ marginTop: 24 }}>
            {listing.product === 'unknown' ? (
              <div style={{ padding: '20px 22px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--text2)' }}>Could not identify a clear product in this photo. Try a clearer, well-lit shot.</p>
              </div>
            ) : (
              <>
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {listing.category}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'rgba(20,201,180,0.08)', border: '1px solid rgba(20,201,180,0.2)', borderRadius: 4, padding: '1px 7px' }}>
                      {listing.condition}
                    </span>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label className="label">Title</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={listing.title} onChange={e => setListing({ ...listing, title: e.target.value })} style={{ fontWeight: 600 }} />
                      <button onClick={() => copyText('title', listing.title)} className="btn-secondary" style={{ fontSize: 12.5, padding: '0 14px', flexShrink: 0 }}>
                        {copiedKey === 'title' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label className="label">Description</label>
                    <textarea
                      value={listing.description}
                      onChange={e => setListing({ ...listing, description: e.target.value })}
                      rows={5}
                      style={{ resize: 'vertical', lineHeight: 1.6 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                      <button onClick={() => copyText('desc', listing.description)} className="btn-secondary" style={{ fontSize: 12.5, padding: '5px 14px' }}>
                        {copiedKey === 'desc' ? 'Copied' : 'Copy description'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Suggested price</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="number"
                        value={listing.suggestedPriceEur}
                        onChange={e => setListing({ ...listing, suggestedPriceEur: Number(e.target.value) })}
                        style={{ width: 140, fontWeight: 700, fontSize: 18 }}
                      />
                      <span style={{ fontSize: 14, color: 'var(--text3)' }}>EUR</span>
                    </div>
                  </div>
                </div>

                {/* Market reference */}
                {listing.marketRefs.length > 0 && (
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                    <p className="section-label" style={{ marginBottom: 10 }}>Recent asking prices for this product</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {listing.marketRefs.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                          <span className={`badge badge-${r.platform}`}>{r.platform}</span>
                          <span style={{ color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                          <span style={{ fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>{r.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Platform redirect buttons */}
                <div>
                  <p className="section-label">Post it to</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {PLATFORMS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => openPlatform(p)}
                        style={{
                          padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                          background: 'var(--card)', border: `1px solid ${PLAT_COLOR[p.key]}44`,
                          color: PLAT_COLOR[p.key], display: 'flex', alignItems: 'center', gap: 7,
                        }}
                      >
                        {copiedKey === p.key ? 'Copied — opening…' : p.label}
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10, lineHeight: 1.6 }}>
                    Clicking a platform copies the full listing text to your clipboard and opens their listing page — just paste and upload your photo.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
