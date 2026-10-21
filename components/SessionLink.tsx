'use client'

import { useEffect, useState, type ComponentProps } from 'react'
import { sessionHref } from '@/lib/api-client'

// Preserve iframe sessions when third-party cookies are unavailable.
export default function SessionLink({ href, ...props }: ComponentProps<'a'> & { href: string }) {
  const [destination, setDestination] = useState(href)
  useEffect(() => { setDestination(sessionHref(href)) }, [href])
  return <a {...props} href={destination} referrerPolicy="no-referrer" />
}
