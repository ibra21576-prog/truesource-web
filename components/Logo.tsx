import Image from 'next/image'
export default function Logo({ size = 40 }: { size?: number }) {
  const radius = Math.max(6, Math.round(size * 0.12))

  return (
    <span style={{
      width: size, height: size, display: 'inline-flex', overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      borderRadius: radius,
      background: '#000',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <Image
        src="/truesource-logo-original-compact.png" alt="TrueSource Flip" width={size} height={size}
        priority
        style={{ width: size, height: size, display: 'block', objectFit: 'cover' }}
      />
    </span>
  )
}
