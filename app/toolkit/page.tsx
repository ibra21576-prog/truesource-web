'use client'
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react'
import Navigation from '@/components/Navigation'
import { apiFetch } from '@/lib/api-client'

function money(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(Number.isFinite(value) ? value : 0)
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function NumberField({ label, value, onChange, suffix = '€' }: { label: string; value: number; onChange: (value: number) => void; suffix?: string }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="label">{label}</span>
      <div style={{ position: 'relative' }}>
        <input type="number" min="0" step="0.01" value={value} onChange={event => onChange(Number(event.target.value))} style={{ paddingRight: 42 }} />
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 13 }}>{suffix}</span>
      </div>
    </label>
  )
}

export default function ToolkitPage() {
  const [buyPrice, setBuyPrice] = useState(120)
  const [sellPrice, setSellPrice] = useState(220)
  const [shipping, setShipping] = useState(7)
  const [fees, setFees] = useState(10)
  const [other, setOther] = useState(0)
  const [marketPrice, setMarketPrice] = useState(260)
  const [dealPrice, setDealPrice] = useState(180)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrPreview, setOcrPreview] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [ocrLanguage, setOcrLanguage] = useState<'eng' | 'deu'>('eng')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrError, setOcrError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [barcodeError, setBarcodeError] = useState('')
  const [scanningBarcode, setScanningBarcode] = useState(false)

  const result = useMemo(() => {
    const platformFees = sellPrice * (fees / 100)
    const totalCost = buyPrice + shipping + platformFees + other
    const profit = sellPrice - totalCost
    const roi = buyPrice > 0 ? (profit / buyPrice) * 100 : 0
    const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0
    const breakEven = fees < 100 ? (buyPrice + shipping + other) / (1 - fees / 100) : 0
    return { platformFees, totalCost, profit, roi, margin, breakEven }
  }, [buyPrice, sellPrice, shipping, fees, other])

  const deal = useMemo(() => {
    const discount = marketPrice > 0 ? ((marketPrice - dealPrice) / marketPrice) * 100 : 0
    const label = discount >= 30 ? 'Strong deal' : discount >= 15 ? 'Good deal' : discount >= 5 ? 'Fair price' : 'Low margin'
    const color = discount >= 30 ? 'var(--success)' : discount >= 15 ? 'var(--accent)' : discount >= 5 ? 'var(--warning)' : 'var(--danger)'
    return { discount, label, color, potential: marketPrice - dealPrice }
  }, [marketPrice, dealPrice])

  async function exportCsv() {
    setExporting(true)
    setExportError('')
    try {
      const rows: any[] = []
      let before = ''
      for (let page = 0; page < 1000; page++) {
        const response = await apiFetch(`/api/feed?limit=500${before ? `&before=${encodeURIComponent(before)}` : ''}`)
        if (!response.ok) throw new Error('Export could not be created')
        const batch = await response.json()
        rows.push(...batch)
        if (batch.length < 500) break
        before = batch[batch.length - 1].found_at
      }

      const header = ['platform', 'title', 'price', 'url', 'search', 'found_at', 'posted_at']
      const lines = rows.map(row => [
        row.platform,
        row.title,
        row.price,
        row.url,
        Array.isArray(row.searches) ? row.searches[0]?.query : row.searches?.query,
        row.found_at,
        row.posted_at,
      ].map(csvCell).join(','))
      const csv = `\uFEFF${header.join(',')}\r\n${lines.join('\r\n')}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `truesource-listings-${new Date().toISOString().slice(0, 10)}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      setExportError(error.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  function chooseOcrFile(file?: File) {
    setOcrError('')
    setOcrText('')
    setBarcode('')
    setBarcodeError('')
    setOcrProgress(0)
    if (!file) { setOcrFile(null); setOcrPreview(''); return }
    if (!file.type.startsWith('image/')) { setOcrError('Please choose an image file.'); return }
    if (file.size > 12 * 1024 * 1024) { setOcrError('The image must be smaller than 12 MB.'); return }
    setOcrFile(file)
    const reader = new FileReader()
    reader.onload = () => setOcrPreview(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  async function scanPhoto() {
    if (!ocrFile || scanning) return
    setScanning(true)
    setOcrError('')
    setOcrText('')
    setOcrProgress(0)
    setOcrStatus('Loading local OCR…')
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(ocrLanguage, undefined, {
        logger: message => {
          if (typeof message.progress === 'number') setOcrProgress(Math.round(message.progress * 100))
          if (message.status) setOcrStatus(message.status.replace(/_/g, ' '))
        },
      })
      try {
        const result = await worker.recognize(ocrFile)
        const text = result.data.text.trim()
        setOcrText(text)
        if (!text) setOcrError('No readable text found. Try a sharper, well-lit photo.')
      } finally {
        await worker.terminate()
      }
    } catch {
      setOcrError('Text recognition could not start. Check your connection and try again.')
    } finally {
      setScanning(false)
      setOcrStatus('')
    }
  }

  async function scanBarcode() {
    if (!ocrPreview || scanningBarcode) return
    setScanningBarcode(true)
    setBarcode('')
    setBarcodeError('')
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const result = await reader.decodeFromImageUrl(ocrPreview)
      setBarcode(result.getText())
    } catch {
      setBarcodeError('No barcode or QR code found. Try a straight, sharp photo with the full code visible.')
    } finally {
      setScanningBarcode(false)
    }
  }

  function openSearch(value: string) {
    if (!value.trim()) return
    window.location.assign(`/searches?q=${encodeURIComponent(value.trim())}`)
  }

  const suggestedKeywords = useMemo(() => {
    const blocked = new Set(['the', 'and', 'for', 'with', 'und', 'der', 'die', 'das', 'von', 'für', 'made'])
    const words = ocrText.replace(/[^a-zA-Z0-9ÄÖÜäöüß-]+/g, ' ').split(/\s+/).filter(word => word.length >= 3 && !blocked.has(word.toLowerCase()))
    return Array.from(new Set(words.map(word => word.replace(/^-+|-+$/g, '')))).filter(Boolean).slice(0, 10).join(' ')
  }, [ocrText])

  const panel: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-card)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <main className="page">
        <div style={{ marginBottom: 34 }}>
          <div className="eyebrow">Free reseller utilities</div>
          <h1 style={{ fontSize: 40, fontWeight: 700, margin: 0, letterSpacing: '-0.045em' }}>Reseller Toolkit</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15, marginTop: 10 }}>Check a deal, calculate profit, read product labels and export your TrueSource data.</p>
        </div>

        <section className="toolkit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 18, alignItems: 'start' }}>
          <div style={panel}>
            <div className="section-label">Profit calculator</div>
            <h2 style={{ fontSize: 22, margin: '5px 0 18px' }}>Know your real profit</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NumberField label="Purchase price" value={buyPrice} onChange={setBuyPrice} />
              <NumberField label="Selling price" value={sellPrice} onChange={setSellPrice} />
              <NumberField label="Shipping" value={shipping} onChange={setShipping} />
              <NumberField label="Platform fee" value={fees} onChange={setFees} suffix="%" />
              <NumberField label="Other costs" value={other} onChange={setOther} />
            </div>
            <div style={{ marginTop: 20, padding: 18, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>Net profit</span>
                <strong style={{ fontSize: 27, color: result.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{money(result.profit)}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14 }}>
                {[['ROI', `${result.roi.toFixed(1)}%`], ['Margin', `${result.margin.toFixed(1)}%`], ['Break-even', money(result.breakEven)]].map(([label, value]) => (
                  <div key={label}><small style={{ color: 'var(--text3)', display: 'block' }}>{label}</small><b style={{ fontSize: 14 }}>{value}</b></div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <div style={panel}>
              <div className="section-label">Deal checker</div>
              <h2 style={{ fontSize: 22, margin: '5px 0 18px' }}>Is it worth buying?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <NumberField label="Listing price" value={dealPrice} onChange={setDealPrice} />
                <NumberField label="Typical market price" value={marketPrice} onChange={setMarketPrice} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginTop: 18, padding: 16, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div><strong style={{ color: deal.color }}>{deal.label}</strong><div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 3 }}>Potential spread {money(deal.potential)}</div></div>
                <div style={{ fontSize: 25, fontWeight: 750, color: deal.color }}>{deal.discount.toFixed(1)}%</div>
              </div>
            </div>

            <div style={panel}>
              <div className="section-label">Your data</div>
              <h2 style={{ fontSize: 22, margin: '5px 0 8px' }}>Export your archive</h2>
              <p style={{ color: 'var(--text2)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>Download all of your own listings as a spreadsheet-ready CSV. Other members’ data is never included.</p>
              <button className="btn-primary" onClick={exportCsv} disabled={exporting} style={{ width: '100%' }}>{exporting ? 'Preparing export…' : 'Download CSV export'}</button>
              {exportError && <p style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 9 }}>{exportError}</p>}
            </div>

            <div style={panel}>
              <div className="section-label">Open-source OCR</div>
              <h2 style={{ fontSize: 22, margin: '5px 0 8px' }}>Photo Text Scanner</h2>
              <p style={{ color: 'var(--text2)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 15 }}>Read model names, product codes and label text from a photo. Processing runs in your browser; the image is not uploaded to TrueSource.</p>
              <label className="ocr-dropzone">
                {ocrPreview ? <img src={ocrPreview} alt="Selected product label" /> : <span><b>Choose product photo</b><small>JPG, PNG or WebP · maximum 12 MB</small></span>}
                <input type="file" accept="image/*" capture="environment" onChange={event => chooseOcrFile(event.target.files?.[0])} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 9, marginTop: 10 }} className="ocr-actions">
                <select aria-label="Text language" value={ocrLanguage} onChange={event => setOcrLanguage(event.target.value as 'eng' | 'deu')}><option value="eng">English</option><option value="deu">Deutsch</option></select>
                <button className="btn-primary" onClick={scanPhoto} disabled={!ocrFile || scanning}>{scanning ? `${ocrProgress}% · Scanning` : 'Extract text from photo'}</button>
              </div>
              <button className="btn-secondary" onClick={scanBarcode} disabled={!ocrFile || scanningBarcode} style={{ width: '100%', marginTop: 9 }}>{scanningBarcode ? 'Scanning barcode…' : 'Scan barcode or QR code'}</button>
              {scanning && <div style={{ marginTop: 10 }}><div style={{ height: 5, overflow: 'hidden', borderRadius: 5, background: 'var(--surface)' }}><span style={{ display: 'block', width: `${ocrProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width .2s' }} /></div><small style={{ display: 'block', marginTop: 5, color: 'var(--text3)', textTransform: 'capitalize' }}>{ocrStatus}</small></div>}
              {ocrError && <p style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 10 }}>{ocrError}</p>}
              {barcodeError && <p style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 10 }}>{barcodeError}</p>}
              {barcode && <div style={{ marginTop: 12, padding: 12, borderRadius: 9, background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.18)' }}><span className="label">Detected code</span><strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{barcode}</strong><div style={{ display: 'flex', gap: 7, marginTop: 10 }}><button className="btn-secondary" onClick={() => navigator.clipboard.writeText(barcode)}>Copy</button><button className="btn-primary" onClick={() => openSearch(barcode)}>Search this code</button></div></div>}
              {ocrText && <div style={{ marginTop: 14 }}><span className="label">Detected text</span><textarea value={ocrText} onChange={event => setOcrText(event.target.value)} rows={6} /><div style={{ marginTop: 9, padding: 11, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}><span className="label">Suggested search keywords</span><p style={{ margin: 0, fontSize: 13, overflowWrap: 'anywhere' }}>{suggestedKeywords || 'No clear product keywords detected.'}</p></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 9 }} className="ocr-result-actions"><button className="btn-secondary" onClick={() => navigator.clipboard.writeText(suggestedKeywords || ocrText)}>Copy keywords</button><button className="btn-primary" onClick={() => openSearch(suggestedKeywords || ocrText)}>Create search</button></div></div>}
              <p style={{ color: 'var(--text3)', fontSize: 10.5, margin: '12px 0 0' }}>Local processing with Tesseract.js (Apache-2.0) and ZXing for JS (MIT).</p>
            </div>
          </div>
        </section>
        <style>{`.ocr-dropzone{position:relative;min-height:150px;display:grid;place-items:center;overflow:hidden;border:1px dashed var(--border2);border-radius:10px;background:var(--surface);cursor:pointer;text-align:center}.ocr-dropzone:hover{border-color:var(--accent)}.ocr-dropzone input{position:absolute;inset:0;opacity:0;cursor:pointer}.ocr-dropzone img{width:100%;height:190px;object-fit:contain}.ocr-dropzone b,.ocr-dropzone small{display:block}.ocr-dropzone small{margin-top:5px;color:var(--text3);font-size:11px}@media(max-width:520px){.toolkit-grid{grid-template-columns:1fr!important}.toolkit-grid .glass-panel{padding:18px!important}.toolkit-grid .glass-panel>div[style*="grid-template-columns"]{grid-template-columns:1fr!important}.ocr-actions,.ocr-result-actions{grid-template-columns:1fr!important}}`}</style>
      </main>
    </div>
  )
}
