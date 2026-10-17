import Navigation from '@/components/Navigation'

const features = [
  {
    title: 'Historical prices',
    description: 'See how prices developed over time instead of relying on a single listing.',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>
      </svg>
    ),
  },
  {
    title: 'Market range',
    description: 'Compare lowest, average, median and highest prices for matching products.',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
        <path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>
      </svg>
    ),
  },
  {
    title: 'Deal score',
    description: 'Understand at a glance whether a listing is cheap, fairly priced or expensive.',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 2 15 8l7 .9-5 4.8 1.3 6.8L12 17l-6.3 3.5L7 13.7 2 8.9 9 8z"/>
      </svg>
    ),
  },
]

export default function PriceInsightsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navigation />
      <main className="page">
        <section className="dashboard-hero" style={{ marginBottom: 18 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 9px', borderRadius: 999,
            background: 'rgba(124,58,237,0.08)', color: 'var(--accent)',
            border: '1px solid rgba(124,58,237,0.16)',
            fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            Coming soon
          </div>

          <div style={{ maxWidth: 690, marginTop: 28 }}>
            <div className="eyebrow">Product roadmap</div>
            <h1 style={{
              margin: 0, color: 'var(--text)', fontSize: 'clamp(38px, 5vw, 64px)',
              lineHeight: 0.98, letterSpacing: '-0.055em', fontWeight: 700,
            }}>
              Price Insights
            </h1>
            <p style={{ margin: '18px 0 0', color: 'var(--text2)', fontSize: 16, lineHeight: 1.65, maxWidth: 600 }}>
              Historical market data and intelligent deal ratings are planned for a future TrueSource update.
              The feature will launch when enough reliable pricing data is available.
            </p>
          </div>

          <div className="coming-soon-grid" style={{ marginTop: 38 }}>
            {[
              ['Lowest price', '—'],
              ['Average price', '—'],
              ['Highest price', '—'],
            ].map(([label, value]) => (
              <div className="coming-soon-metric" key={label}>
                <div style={{ color: 'var(--text3)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ marginTop: 16, color: 'var(--text)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.04em' }}>{value}</div>
                <div style={{ marginTop: 6, color: 'var(--text3)', fontSize: 12 }}>Waiting for market data</div>
              </div>
            ))}
          </div>
        </section>

        <section className="coming-soon-feature-grid">
          {features.map(feature => (
            <article className="card" key={feature.title} style={{ minHeight: 155 }}>
              <div style={{
                width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 9, background: 'rgba(124,58,237,0.08)', color: 'var(--accent)',
                border: '1px solid rgba(124,58,237,0.12)',
              }}>
                {feature.icon}
              </div>
              <h2 style={{ margin: '17px 0 6px', color: 'var(--text)', fontSize: 16, fontWeight: 700 }}>{feature.title}</h2>
              <p style={{ margin: 0, color: 'var(--text2)', fontSize: 13.5, lineHeight: 1.55 }}>{feature.description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
