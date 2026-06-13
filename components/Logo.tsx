export default function Logo({ size = 40 }: { size?: number }) {
  const id = `g${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3bf0c5"/>
          <stop offset="60%" stopColor="#5b7cf7"/>
          <stop offset="100%" stopColor="#8b5cf6"/>
        </linearGradient>
        <filter id={`shadow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3bf0c5" floodOpacity="0.4"/>
        </filter>
      </defs>
      {/* Background */}
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} filter={`url(#shadow-${size})`}/>
      <rect width="40" height="40" rx="11" fill="rgba(0,0,0,0.15)"/>
      {/* Top flip arrow (right) */}
      <path d="M11 17.5C11 13.9 15 11 20 11C24.5 11 27.5 13 29 15.5"
        stroke="white" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.95"/>
      <path d="M26.5 12L29 15.5L25.5 17"
        stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.95"/>
      {/* Bottom flip arrow (left) */}
      <path d="M29 22.5C29 26.1 25 29 20 29C15.5 29 12.5 27 11 24.5"
        stroke="white" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.95"/>
      <path d="M13.5 28L11 24.5L14.5 23"
        stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.95"/>
    </svg>
  )
}
