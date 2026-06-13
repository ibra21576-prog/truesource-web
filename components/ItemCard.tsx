interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; first_scan?: boolean; search_query?: string
}

function timeAgo(ts: string) {
  const d = Date.now() - new Date(ts).getTime()
  if (d < 60000)    return 'just now'
  if (d < 3600000)  return `${Math.round(d/60000)}m ago`
  if (d < 86400000) return `${Math.round(d/3600000)}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
}

const P: Record<string, { label: string; color: string }> = {
  vinted:        { label: 'Vinted',        color: '#3df5c8' },
  ebay:          { label: 'eBay',          color: '#fbbf24' },
  kleinanzeigen: { label: 'Kleinanzeigen', color: '#fb923c' },
}

export default function ItemCard({ item }: { item: Item }) {
  const p = P[item.platform] ?? P.vinted
  const isNew = item.first_scan === false

  return (
    <a href={item.url || '#'} target="_blank" rel="noopener noreferrer" className="anim-in"
      style={{
        display: 'flex', alignItems: 'stretch',
        background: 'var(--card)', border: '1.5px solid var(--border)',
        borderRadius: 12, overflow: 'hidden', textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s', cursor: 'pointer',
      }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = p.color+'55'; el.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.transform = 'translateY(0)' }}
    >
      {/* Platform color bar */}
      <div style={{ width: 3, background: p.color, flexShrink: 0 }} />

      {/* Thumbnail */}
      <div style={{
        width: 80, height: 80, flexShrink: 0, alignSelf: 'center', margin: '12px 14px 12px 12px',
        borderRadius: 10, overflow: 'hidden', background: 'var(--surface)',
        border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.image
          ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              referrerPolicy="no-referrer"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          : <svg width="22" height="22" fill="none" stroke="var(--border2)" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        }
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, padding: '14px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {item.price || '—'}
          </span>
          <span className={`badge badge-${item.platform}`}>{p.label}</span>
          {isNew && <span className="badge badge-new pulse" style={{ fontSize: 10 }}>✦ NEW</span>}
        </div>

        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {item.title || '(no title)'}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {item.search_query && (
            <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              {item.search_query}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {timeAgo(item.found_at)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 16, color: 'var(--border2)', flexShrink: 0 }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </a>
  )
}
