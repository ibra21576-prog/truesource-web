import Image from 'next/image'
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Image
        src="/truesource-mark-v2.png" alt="TrueSource Flip" width={size} height={size}
        priority
        style={{ width: size, height: size, display: 'block', objectFit: 'contain', transform: 'scale(1.55)' }}
      />
    </span>
  )
}
