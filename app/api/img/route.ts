import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

// Whitelisted image CDN domains
const ALLOWED = [
  'media.kijiji.ca',
  'images.craigslist.org',
  'img.kleinanzeigen.de',
  'i.ebayimg.com',
  'images1.vinted.com',
  'images2.vinted.com',
  'images3.vinted.com',
  'photos.ztat.net',
  'img.gumtree.com',
  'thumbs.gumtree.com',
  'img.shpock.com',
  'media.shpock.com',
  'img.marktplaats.com',
  'images.marktplaats.com',
  'img.leboncoin.fr',
  'origin-image.leboncoin.fr',
]

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return new NextResponse('missing url', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return new NextResponse('invalid url', { status: 400 })
  }

  // Security: only proxy whitelisted image CDNs
  const allowed = ALLOWED.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))
  if (!allowed) return new NextResponse('forbidden', { status: 403 })

  // Kijiji's media API 404s on the legacy galleryLargeV2 rule. Normalise any
  // Kijiji image rule to a valid high-res JPEG so old DB rows render too.
  let target = raw
  if (parsed.hostname === 'media.kijiji.ca') {
    target = parsed.searchParams.has('rule')
      ? raw.replace(/rule=[^&]+/, 'rule=kijijica-960-jpg')
      : raw + (raw.includes('?') ? '&' : '?') + 'rule=kijijica-960-jpg'
  }

  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: `https://${parsed.hostname}/`,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return new NextResponse('upstream error', { status: 502 })

    const buf = await res.arrayBuffer()
    const ct = res.headers.get('Content-Type') || 'image/jpeg'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return new NextResponse('fetch failed', { status: 502 })
  }
}
