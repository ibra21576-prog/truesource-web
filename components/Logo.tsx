import Image from 'next/image'
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size, display: 'inline-flex', overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      borderRadius: Math.max(6, Math.round(size * 0.12)),
      background: '#020203',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.035)',
    }}>
      <Image
        src="/truesource-mark-v2.png" alt="TrueSource Flip" width={size} height={size}
        priority
        style={{ width: size, height: size, display: 'block', objectFit: 'contain', transform: 'scale(1.55)' }}
      />
    </span>
  )
}
