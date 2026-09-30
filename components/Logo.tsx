import Image from 'next/image'
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size, display: 'inline-flex', overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      borderRadius: Math.round(size * 0.28), background: '#000',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
    }}>
      <Image
        src="/truesource-logo-purple.png" alt="TrueSource Flip" width={size} height={size}
        style={{ width: size, height: size, display: 'block', transform: 'scale(2.42)' }}
      />
    </span>
  )
}
