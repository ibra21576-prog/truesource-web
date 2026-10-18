import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getRequestSession } from '@/lib/session'
import { addCredits, spendCredit } from '@/lib/credits'
import { claimLegacySearches, getUserSearchIds } from '@/lib/user-data'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function getUser(req: NextRequest) {
  return getRequestSession(req)
}

const ALLOWED_LANGUAGES = new Set(['German', 'English', 'French', 'Italian', 'Dutch', 'Swedish'])

function buildPrompt(requestedLanguage: unknown) {
  const language = typeof requestedLanguage === 'string' && ALLOWED_LANGUAGES.has(requestedLanguage)
    ? requestedLanguage
    : 'German'

  return `You are a resale listing assistant. Look at this product photo and identify exactly what it is (brand, model, product type). Then write a marketplace listing in ${language}.

Respond with ONLY a JSON object, no markdown fences, no extra text, in this exact shape:
{
  "product": "short product name, e.g. Sony PlayStation 5 Slim",
  "title": "catchy listing title in ${language}, max 70 characters",
  "description": "3-5 sentence listing description in ${language}; mention visible condition, included accessories if visible, and what makes it appealing. Written to sell.",
  "category": "short product category in ${language}",
  "condition": "short condition label in ${language}, based only on what is visible",
  "suggestedPriceEur": <number, realistic resale price in EUR based on the item's condition and typical market value, no currency symbol>,
  "confidence": "high" | "medium" | "low"
}

If you cannot identify a clear resalable product in the image, set "product" to "unknown" and explain nothing else — still return valid JSON with your best guess.`
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI photo analysis is not configured yet.' }, { status: 503 })
  }

  const { imageBase64, mimeType, language } = await req.json()
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: 'No image was provided.' }, { status: 400 })
  }

  const isAdmin = user.userId === process.env.WHOP_OWNER_ID
  const supabase = createServiceClient()
  let charged = false

  const refundCredit = async () => {
    if (!charged) return
    charged = false
    try {
      await addCredits(supabase, user.userId, 1)
    } catch {
      console.error('[listing/generate] failed to refund AI credit')
    }
  }

  if (!isAdmin) {
    const ok = await spendCredit(supabase, user.userId)
    if (!ok) return NextResponse.json({ error: 'NO_CREDITS' }, { status: 402 })
    charged = true
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
            { type: 'text', text: buildPrompt(language) },
          ],
        }],
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!aiRes.ok) {
      console.error('[listing/generate] Anthropic error', aiRes.status)
      await refundCredit()
      return NextResponse.json({ error: 'AI analysis failed. Your credit was refunded.' }, { status: 502 })
    }

    const aiData = await aiRes.json()
    const rawText: string = aiData.content?.[0]?.text || ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      await refundCredit()
      return NextResponse.json({ error: 'The AI response could not be read. Your credit was refunded.' }, { status: 502 })
    }

    const listing = JSON.parse(jsonMatch[0])

    // Cross-reference our own scraped data: show real recent asking prices for
    // the same product across platforms, so the price suggestion isn't just a guess.
    let marketRefs: { platform: string; price: string; title: string }[] = []
    if (listing.product && listing.product !== 'unknown') {
      const searchIds = await getUserSearchIds(supabase, user.userId)
      await claimLegacySearches(supabase, user.userId, searchIds)
      const term = listing.product.split(' ').slice(0, 3).join(' ')
      const { data: refRows } = await supabase
        .from('items')
        .select('platform, price, title')
        .eq('user_id', user.userId)
        .in('search_id', searchIds.length ? searchIds : ['00000000-0000-0000-0000-000000000000'])
        .ilike('title', `%${term}%`)
        .not('price', 'is', null)
        .order('found_at', { ascending: false })
        .limit(6)
      marketRefs = refRows || []
    }

    return NextResponse.json({ ...listing, marketRefs })
  } catch {
    await refundCredit()
    console.error('[listing/generate] unexpected generation error')
    return NextResponse.json({ error: 'AI analysis failed. Your credit was refunded.' }, { status: 500 })
  }
}
