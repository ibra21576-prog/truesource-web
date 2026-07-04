import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { spendCredit } from '@/lib/credits'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function getUser(req: NextRequest) {
  const token = req.cookies.get('session')?.value
  if (!token) return null
  return verifySession(token)
}

const PROMPT = `You are a resale listing assistant. Look at this product photo and identify exactly what it is (brand, model, product type). Then write a marketplace listing for it in German.

Respond with ONLY a JSON object, no markdown fences, no extra text, in this exact shape:
{
  "product": "short product name, e.g. Sony PlayStation 5 Slim",
  "title": "catchy listing title in German, max 70 characters",
  "description": "3-5 sentence listing description in German, mention visible condition, included accessories if visible, and what makes it appealing. Written to sell.",
  "category": "product category in German, e.g. Konsolen & Games",
  "condition": "one of: Neu, Wie neu, Sehr gut, Gut, In Ordnung — based on what you see in the photo",
  "suggestedPriceEur": <number, realistic resale price in EUR based on the item's condition and typical market value, no currency symbol>,
  "confidence": "high" | "medium" | "low"
}

If you cannot identify a clear resalable product in the image, set "product" to "unknown" and explain nothing else — still return valid JSON with your best guess.`

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI-Erkennung ist noch nicht konfiguriert (ANTHROPIC_API_KEY fehlt).' }, { status: 503 })
  }

  const { imageBase64, mimeType } = await req.json()
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: 'Kein Bild übermittelt' }, { status: 400 })
  }

  const isAdmin = user.userId === process.env.WHOP_OWNER_ID
  const supabase = createServiceClient()

  if (!isAdmin) {
    const ok = await spendCredit(supabase, user.userId)
    if (!ok) return NextResponse.json({ error: 'NO_CREDITS' }, { status: 402 })
  }

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!aiRes.ok) {
      const t = await aiRes.text()
      console.error('[listing/generate] Anthropic error', aiRes.status, t)
      return NextResponse.json({ error: 'AI-Analyse fehlgeschlagen' }, { status: 502 })
    }

    const aiData = await aiRes.json()
    const rawText: string = aiData.content?.[0]?.text || ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'AI-Antwort konnte nicht gelesen werden' }, { status: 502 })

    const listing = JSON.parse(jsonMatch[0])

    // Cross-reference our own scraped data: show real recent asking prices for
    // the same product across platforms, so the price suggestion isn't just a guess.
    let marketRefs: { platform: string; price: string; title: string }[] = []
    if (listing.product && listing.product !== 'unknown') {
      const term = listing.product.split(' ').slice(0, 3).join(' ')
      const { data: refRows } = await supabase
        .from('items')
        .select('platform, price, title')
        .ilike('title', `%${term}%`)
        .not('price', 'is', null)
        .order('found_at', { ascending: false })
        .limit(6)
      marketRefs = refRows || []
    }

    return NextResponse.json({ ...listing, marketRefs })
  } catch (e: any) {
    console.error('[listing/generate]', e)
    return NextResponse.json({ error: e.message || 'Serverfehler' }, { status: 500 })
  }
}
