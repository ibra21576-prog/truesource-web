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

function platformClass(p: string) {
  if (p === 'ebay') return 'badge-ebay'
  if (p === 'kleinanzeigen') return 'badge-kleinanzeigen'
  return 'badge-vinted'
}

function platformLabel(p: string) {
  if (p === 'ebay') return 'eBay'
  if (p === 'kleinanzeigen') return 'Kleinanzeigen'
  return 'Vinted'
}

export default function ItemCard({ item }: { item: Item }) {
  return (
    <a href={item.url || '#'} target="_blank" rel="noopener noreferrer"
      className="card flex gap-3 hover:border-accent/40 transition-colors group">
      {/* Thumbnail */}
      <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-surface flex items-center justify-center">
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-accent font-bold text-base">{item.price || '—'}</span>
          <span className={`badge ${platformClass(item.platform)} shrink-0`}>
            {platformLabel(item.platform)}
          </span>
        </div>
        <p className="text-sm text-white line-clamp-2 leading-snug mb-1 group-hover:text-accent transition-colors">
          {item.title || '(kein Titel)'}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted truncate">{item.search_query}</span>
          <span className="text-xs text-muted shrink-0">{timeAgo(item.found_at)}</span>
        </div>
      </div>
    </a>
  )
}
