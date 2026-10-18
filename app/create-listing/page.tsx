'use client'
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useCallback, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { apiFetch } from '@/lib/api-client'

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
  { key: 'subito',        label: 'Subito',         url: 'https://www.subito.it/inserisci-annuncio.htm' },
  { key: 'tradera',       label: 'Tradera',        url: 'https://www.tradera.com/sell' },
  { key: 'willhaben',     label: 'willhaben',      url: 'https://www.willhaben.at/iad/newad' },
  { key: 'wallapop',      label: 'Wallapop',       url: 'https://es.wallapop.com/app/catalog/upload' },
  { key: 'olx',           label: 'OLX',            url: 'https://www.olx.pl/d/nowe-ogloszenie/' },
]

const PLAT_COLOR: Record<string, string> = {
  vinted: '#14b8a6', ebay: '#f59e0b', kleinanzeigen: '#f97316',
  marktplaats: '#d32f2f', shpock: '#e91e8c', craigslist: '#7c3aed',
  kijiji: '#6d28d9', gumtree: '#00b140', leboncoin: '#1565c0',
  subito: '#ef3b24', tradera: '#005b49', willhaben: '#e2001a',
  wallapop: '#13c1ac', olx: '#23e5db',
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
  const [mode, setMode] = useState<'photo' | 'manual'>('photo')
  const [preview,  setPreview]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [listing,  setListing]  = useState<Listing | null>(null)
  const [credits,  setCredits]  = useState<{ balance: number | null; unlimited: boolean } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadCredits = useCallback(async () => {
    const res = await apiFetch('/api/credits')
    if (res.ok) setCredits(await res.json())
  }, [])

  useEffect(() => { loadCredits() }, [loadCredits])

  async function handleFile(file: File) {
    setError(''); setListing(null)
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    try {
      const { base64, mimeType } = await compressImage(file)
      const res = await apiFetch('/api/listing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'NO_CREDITS') setError('No credits left this month.')
        else setError(data.error || 'The photo could not be analysed.')
        return
      }
      setListing(data)
      loadCredits()
    } catch (e: any) {
      setError(e.message || 'The photo could not be processed.')
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

  function choosePhotoMode() {
    setMode('photo')
    setError('')
    setPreview(null)
    setListing(null)
  }

  function startManualDraft() {
    setMode('manual')
    setError('')
    setPreview(null)
    setListing({
      product: 'manual',
      title: '',
      description: '',
      category: 'Manual draft',
      condition: 'Choose condition',
      suggestedPriceEur: 0,
      confidence: 'low',
      marketRefs: [],
    })
  }

  const noCredits = credits && !credits.unlimited && (credits.balance ?? 0) <= 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <div className="page">

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 38, flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow">AI listing assistant</div>
            <h1 style={{ fontSize: 40, fontWeight: 700, margin: 0, letterSpacing: '-0.045em', color: 'var(--text)' }}>
              Listing Studio
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text2)', marginTop: 10, lineHeight: 1.5 }}>
              Create a ready-to-post sales draft from a photo, or build it manually for free.
            </p>
          </div>
          {credits && (
            <div style={{
              padding: '9px 15px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: 'var(--card)', border: '1px solid var(--border2)',
              color: credits.unlimited ? 'var(--accent)' : noCredits ? 'var(--danger)' : 'var(--text2)',
              whiteSpace: 'nowrap',
            }}>
              {credits.unlimited ? 'Unlimited credits' : `${credits.balance} credit${credits.balance === 1 ? '' : 's'} left this month`}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 18 }}>
          <button
            onClick={choosePhotoMode}
            style={{
              padding: '20px 22px', textAlign: 'left', cursor: 'pointer', borderRadius: 11,
              background: mode === 'photo' ? 'rgba(124,58,237,0.07)' : 'var(--card)',
              border: `1px solid ${mode === 'photo' ? 'var(--accent)' : 'var(--border)'}`,
              color: 'var(--text)', boxShadow: 'var(--shadow-card)',
            }}
          >
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>AI photo draft</span>
            <strong style={{ display: 'block', fontSize: 17 }}>Generate from a photo</strong>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text3)', marginTop: 4 }}>Title, description and price suggestion in one step.</span>
          </button>
          <button
            onClick={startManualDraft}
            style={{
              padding: '20px 22px', textAlign: 'left', cursor: 'pointer', borderRadius: 11,
              background: mode === 'manual' ? 'rgba(124,58,237,0.07)' : 'var(--card)',
              border: `1px solid ${mode === 'manual' ? 'var(--accent)' : 'var(--border)'}`,
              color: 'var(--text)', boxShadow: 'var(--shadow-card)',
            }}
          >
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--success)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Free · no credits</span>
            <strong style={{ display: 'block', fontSize: 17 }}>Write it manually</strong>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text3)', marginTop: 4 }}>Use the editor and marketplace shortcuts without AI.</span>
          </button>
        </div>

        {/* Upload zone */}
        {mode === 'photo' ? <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className="glass-panel"
          style={{
            border: `1.5px dashed ${preview ? 'var(--border2)' : 'var(--border2)'}`,
            borderRadius: 10, padding: preview ? 0 : '56px 28px',
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
                {noCredits ? 'Contact support to get more credits.' : 'One credit per generated listing — 20 free every month'}
              </p>
            </>
          )}
        </div> : (
          <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, background: 'var(--card)' }}>
            <div>
              <strong style={{ fontSize: 15 }}>Manual draft ready</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text3)', fontSize: 13 }}>Fill in the editor below. This mode is completely free and uses no credits.</p>
            </div>
            <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>FREE MODE</span>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 13.5, color: 'var(--danger)', marginTop: 14 }}>{error}</p>
        )}

        {/* Result */}
        {listing && (
          <div className="anim-in" style={{ marginTop: 24 }}>
            {listing.product === 'unknown' ? (
              <div className="glass-panel" style={{ padding: '22px 24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--text2)' }}>Could not identify a clear product in this photo. Try a clearer, well-lit shot.</p>
              </div>
            ) : (
              <>
                <div className="glass-panel" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '24px', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {listing.category}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.24)', borderRadius: 4, padding: '1px 7px' }}>
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

                  {mode === 'manual' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <label>
                        <span className="label">Category</span>
                        <input value={listing.category === 'Manual draft' ? '' : listing.category} placeholder="e.g. Electronics" onChange={e => setListing({ ...listing, category: e.target.value })} />
                      </label>
                      <label>
                        <span className="label">Condition</span>
                        <select value={listing.condition} onChange={e => setListing({ ...listing, condition: e.target.value })}>
                          <option>Choose condition</option>
                          <option>New with tags</option>
                          <option>New without tags</option>
                          <option>Very good</option>
                          <option>Good</option>
                          <option>Satisfactory</option>
                        </select>
                      </label>
                    </div>
                  )}

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
                  <div className="glass-panel" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 22px', marginBottom: 18 }}>
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
