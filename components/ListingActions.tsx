'use client'

import { useRef, useState } from 'react'
import SessionLink from './SessionLink'

export default function ListingActions({ itemId, saved, onSave, onHide }: {
  itemId: string; saved: boolean; onSave: () => Promise<void>; onHide: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  async function save() {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError('')
    try { await onSave() }
    catch { setError('Could not save. Please try again.') }
    finally { busy.current = false; setSaving(false) }
  }
  const star = <svg aria-hidden="true" width="16" height="16" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>
  return <div className="listing-actions">
    <div className="listing-actions-row">
      {saved
        ? <SessionLink className="listing-action is-saved" href="/deals" title="Saved — open Deal Board">{star}<span>Saved</span></SessionLink>
        : <button type="button" className="listing-action" onClick={save} disabled={saving} aria-label="Save to Deal Board">{star}<span>{saving ? 'Saving…' : 'Save'}</span></button>}
      <SessionLink className="listing-action listing-analyze" href={`/items/${itemId}`} title="Analyze this listing">Analyze <span aria-hidden="true">↗</span></SessionLink>
      <button type="button" className="listing-action listing-hide" onClick={onHide} aria-label="Hide listing" title="Hide listing">×</button>
    </div>
    {error && <p role="alert" className="listing-action-error">{error}</p>}
  </div>
}
