interface Item {
  id: string
  item_id: string
  platform: string
  domain: string
  title?: string
  price?: string
  url?: string
  image?: string | null
  found_at: string
  first_scan?: boolean
  search_query?: string
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000)    return 'gerade eben'
  if (diff < 3600000)  return `${Math.round(diff / 60000)} Min.`
  if (diff < 86400000) return `${Math.round(diff / 3600000)} Std.`
  if (diff < 604800000) return `${Math.round(diff / 86400000)} Tage`
  return new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function platformInfo(p: string) {
  if (p === 'ebay') return { label: 'eBay', cls: 'badge-ebay', dot: '#fbbf24' }
  if (p === 'kleinanzeigen') return { label: 'Kleinanzeigen', cls: 'badge-kleinanzeigen', dot: '#fb923c' }
  return { label: 'Vinted', cls: 'badge-vinted', dot: '#2dd4bf' }
}

export default function ItemCard({ item }: { item: Item }) {
  const plat = platformInfo(item.platform)
  const isNew = item.first_scan === false

  return (
    <a href={item.url || '#'} target="_blank" rel="noopener noreferrer"
      className="card card-hover flex gap-4 group animate-fade-in"
      style={{ textDecoration: 'none' }}>

      {/* Thumbnail */}
      <div className="shrink-0 rounded-xl overflow-hidden" style={{
        width: 88, height: 88,
        background: 'linear-gradient(135deg, #0d1421, #111827)',
        border: '1px solid #1e2d42',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.image ? (
          <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            referrerPolicy="no-referrer"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2a3f5a" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Top row: price + badges */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-bold text-lg" style={{
              background: 'linear-gradient(135deg, #3bf0c5, #22c55e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {item.price || '— €'}
            </span>
            <span className={`badge ${plat.cls}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: plat.dot }} />
              {plat.label}
            </span>
            {isNew && (
              <span className="badge badge-new">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                NEU
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-medium leading-snug line-clamp-2 transition-colors group-hover:text-accent"
            style={{ color: '#c8d8ec' }}>
            {item.title || '(kein Titel)'}
          </p>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs truncate max-w-[50%]" style={{ color: '#4a6a88' }}>
            {item.search_query && (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: 3 }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {item.search_query}
              </>
            )}
          </span>
          <span className="text-xs shrink-0 flex items-center gap-1" style={{ color: '#4a6a88' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {timeAgo(item.found_at)}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0"
        style={{ color: '#3bf0c5' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </a>
  )
}
