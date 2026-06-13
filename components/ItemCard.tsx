interface Item {
  id: string; item_id: string; platform: string; domain: string
  title?: string; price?: string; url?: string; image?: string | null
  found_at: string; first_scan?: boolean; search_query?: string
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000)     return 'gerade eben'
  if (diff < 3600000)   return `${Math.round(diff / 60000)} Min.`
  if (diff < 86400000)  return `${Math.round(diff / 3600000)} Std.`
  if (diff < 604800000) return `${Math.round(diff / 86400000)} Tagen`
  return new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

const PLATFORM: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  vinted:        { label: 'Vinted',        color: '#2dd4bf', bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.2)',  dot: '#2dd4bf' },
  ebay:          { label: 'eBay',          color: '#fbbf24', bg: 'rgba(234,179,8,0.1)',    border: 'rgba(234,179,8,0.18)',  dot: '#fbbf24' },
  kleinanzeigen: { label: 'Kleinanzeigen', color: '#fb923c', bg: 'rgba(249,115,22,0.1)',   border: 'rgba(249,115,22,0.18)', dot: '#fb923c' },
}

const PLATFORM_ACCENT: Record<string, string> = {
  vinted: '#2dd4bf', ebay: '#fbbf24', kleinanzeigen: '#fb923c',
}

export default function ItemCard({ item }: { item: Item }) {
  const plat = PLATFORM[item.platform] ?? PLATFORM.vinted
  const accent = PLATFORM_ACCENT[item.platform] ?? '#2dd4bf'
  const isNew = item.first_scan === false

  return (
    <a href={item.url || '#'} target="_blank" rel="noopener noreferrer"
      className="animate-slide-up"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        borderRadius: 18,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.25)',
        textDecoration: 'none',
        transition: 'all 0.25s',
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = `${accent}33`
        el.style.boxShadow = `0 0 0 1px ${accent}18, 0 8px 36px rgba(0,0,0,0.4), inset 0 1px 0 ${accent}12`
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = 'rgba(255,255,255,0.07)'
        el.style.boxShadow = '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 20px rgba(0,0,0,0.25)'
        el.style.transform = 'translateY(0)'
      }}>

      {/* Platform color strip */}
      <div style={{ width: 4, alignSelf: 'stretch', background: `linear-gradient(180deg, ${accent}, ${accent}44)`, flexShrink: 0 }} />

      {/* Thumbnail */}
      <div style={{
        width: 84, height: 84, flexShrink: 0, margin: '12px',
        borderRadius: 14, overflow: 'hidden',
        background: `linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`,
        border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.image ? (
          <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            referrerPolicy="no-referrer"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Row 1: price + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 20,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #3bf0c5 0%, #22c55e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            {item.price || '—'}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
            background: plat.bg, color: plat.color, border: `1px solid ${plat.border}`,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: plat.dot, boxShadow: `0 0 5px ${plat.dot}` }} />
            {plat.label}
          </span>
          {isNew && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(59,240,197,0.15), rgba(139,92,246,0.15))',
              color: '#3bf0c5', border: '1px solid rgba(59,240,197,0.2)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }} className="animate-pulse-soft">
              ✦ NEU
            </span>
          )}
        </div>

        {/* Row 2: title */}
        <p style={{
          fontSize: 13.5, fontWeight: 500, color: '#c0d0e8', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          transition: 'color 0.2s',
        }}>
          {item.title || '(kein Titel)'}
        </p>

        {/* Row 3: meta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          {item.search_query && (
            <span style={{ fontSize: 11, color: '#3a5470', display: 'flex', alignItems: 'center', gap: 4, maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {item.search_query}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#3a5470', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {timeAgo(item.found_at)}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div style={{ padding: '0 18px', color: '#2a3f5a', flexShrink: 0, transition: 'color 0.2s, transform 0.2s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </a>
  )
}
