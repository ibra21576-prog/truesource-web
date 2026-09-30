import Image from 'next/image'
export default function Logo({ size = 40 }: { size?: number }) {
  const frame = size >= 60 ? 3 : 2
  const radius = Math.max(6, Math.round(size * 0.12))

  return (
    <span style={{
      width: size, height: size, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      padding: frame,
      borderRadius: radius,
      background: 'linear-gradient(145deg, #bd70c8, #7a3e84)',
      boxShadow: '0 0 0 1px rgba(157,82,170,0.24), 0 8px 28px rgba(122,62,132,0.42)',
    }}>
      <span style={{
        width: '100%', height: '100%', display: 'flex', overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
        borderRadius: Math.max(4, radius - frame), background: '#020203',
      }}>
        <Image
          src="/truesource-mark-v2.png" alt="TrueSource Flip" width={size} height={size}
          priority
          style={{ width: size, height: size, display: 'block', objectFit: 'contain', transform: 'scale(1.58)' }}
        />
      </span>
    </span>
  )
}
