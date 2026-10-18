'use client'

import Link from 'next/link'
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

  const panel: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-card)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <main className="page">
        <div style={{ marginBottom: 34 }}>
          <div className="eyebrow">Free reseller utilities</div>
          <h1 style={{ fontSize: 40, fontWeight: 700, margin: 0, letterSpacing: '-0.045em' }}>Reseller Toolkit</h1>
          <p style={{ color: 'var(--text2)', fontSize: 15, marginTop: 10 }}>Check a deal, calculate the real profit and export your own TrueSource data.</p>
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 18, alignItems: 'start' }}>
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

            <Link href="/create-listing" style={{ ...panel, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
              <div><div className="section-label">Listing Studio</div><strong style={{ fontSize: 17 }}>Turn a photo into a listing</strong><p style={{ color: 'var(--text3)', fontSize: 12.5, margin: '4px 0 0' }}>Generate a title, description and price suggestion.</p></div>
              <span style={{ fontSize: 24, color: 'var(--accent)' }}>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
