import Image from 'next/image'
export default function Logo({ size = 40 }: { size?: number }) {
  return <Image src="/logo.png" alt="TrueSource Flip" width={size} height={size} style={{ borderRadius: Math.round(size * 0.22) }} />
}
