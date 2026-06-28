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
  vinted:        { label: 'Vinted',        color: '#14b8a6' },
  ebay:          { label: 'eBay',          color: '#f59e0b' },
  kleinanzeigen: { label: 'Kleinanzeigen', color: '#f97316' },
  gumtree:       { label: 'Gumtree',       color: '#00b140' },
  kijiji:        { label: 'Kijiji',        color: '#6d28d9' },
  craigslist:    { label: 'Craigslist',    color: '#7c3aed' },
  shpock:        { label: 'Shpock',        color: '#e91e8c' },
  marktplaats:   { label: 'Marktplaats',   color: '#d32f2f' },
  leboncoin:     { label: 'Leboncoin',     color: '#1565c0' },
}

const IMG_HOSTS = [
  'media.kijiji.ca',
  'images.craigslist.org',
  'img.kleinanzeigen.de',
  'i.ebayimg.com',
  'images1.vinted.com', 'images2.vinted.com', 'images3.vinted.com',
  'photos.ztat.net',
  'img.gumtree.com', 'thumbs.gumtree.com',
  'img.shpock.com', 'media.shpock.com',
  'img.marktplaats.com', 'images.marktplaats.com',
  'img.leboncoin.fr', 'origin-image.leboncoin.fr',
]

function proxyImg(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const h = new URL(url).hostname
    if (IMG_HOSTS.some(d => h === d || h.endsWith('.' + d))) {
      return `/api/img?url=${encodeURIComponent(url)}`
    }
  } catch {}
  return url
}

function resolveUrl(url: string | undefined, domain: string): string {
  if (!url) return '#'
  if (url.startsWith('http')) return url
  return `https://${domain}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function ItemCard({ item, variant = 'list' }: { item: Item; variant?: 'list' | 'grid' }) {
  const p = P[item.platform] ?? P.vinted
  // first_scan = true means brand-new listing (never seen before)
  const isNew = item.first_scan === true
  const href = resolveUrl(item.url, item.domain || (item.platform === 'ebay' ? 'www.ebay.de' : item.platform === 'kleinanzeigen' ? 'www.kleinanzeigen.de' : 'www.vinted.de'))
  const imgSrc = proxyImg(item.image)

  if (variant === 'grid') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="anim-in"
        style={{
          display: 'flex', flexDirection: 'column',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
          textDecoration: 'none',
          transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border2)'
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border)'
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
        }}
      >
        {/* Image */}
        <div style={{
          width: '100%', paddingTop: '72%', position: 'relative',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {imgSrc
            ? <img
                src={imgSrc}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => {
                  const img = e.target as HTMLImageElement
                  img.style.display = 'none'
                }}
              />
            : <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="28" height="28" fill="none" stroke="var(--border2)" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
          }
          {/* Badges overlay */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', gap: 5, flexWrap: 'wrap',
          }}>
            <span className={`badge badge-${item.platform}`}>{p.label}</span>
            {isNew && <span className="badge badge-new" style={{ fontSize: 10.5 }}>New</span>}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <span style={{
            fontSize: 20, fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {item.price || '—'}
          </span>

          <p style={{
            fontSize: 13, fontWeight: 400, color: 'var(--text2)',
            lineHeight: 1.5, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            margin: 0, flex: 1,
          }}>
            {item.title || '(no title)'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
            {item.search_query && (
              <span style={{
                fontSize: 11, color: 'var(--text3)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 3, maxWidth: '60%',
              }}>
                <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {item.search_query}
              </span>
            )}
            <span style={{
              fontSize: 11, color: 'var(--text3)', flexShrink: 0, marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {timeAgo(item.found_at)}
            </span>
          </div>
        </div>
      </a>
    )
  }

  // List variant
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="anim-in"
      style={{
        display: 'flex', alignItems: 'stretch',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--border2)'
        el.style.transform = 'translateY(-1px)'
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--border)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 80, height: 80, flexShrink: 0, alignSelf: 'center',
        margin: '14px 14px 14px 14px',
        borderRadius: 8, overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {imgSrc
          ? <img
              src={imgSrc}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          : <svg width="20" height="20" fill="none" stroke="var(--border2)" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
        }
      </div>

      {/* Content */}
      <div style={{
        flex: 1, minWidth: 0, padding: '14px 0',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
      }}>
        {/* Price + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 18, fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            {item.price || '—'}
          </span>
          <span className={`badge badge-${item.platform}`}>{p.label}</span>
          {isNew && (
            <span className="badge badge-new" style={{ fontSize: 10.5 }}>
              New
            </span>
          )}
        </div>

        {/* Title */}
        <p style={{
          fontSize: 14, fontWeight: 400, color: 'var(--text2)',
          lineHeight: 1.5, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          margin: 0,
        }}>
          {item.title || '(no title)'}
        </p>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {item.search_query && (
            <span style={{
              fontSize: 12, color: 'var(--text3)',
              display: 'flex', alignItems: 'center', gap: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%',
            }}>
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {item.search_query}
            </span>
          )}
          <span style={{
            fontSize: 12, color: 'var(--text3)', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {timeAgo(item.found_at)}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div style={{
        display: 'flex', alignItems: 'center', paddingRight: 16,
        color: 'var(--border2)', flexShrink: 0,
      }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </a>
  )
}
