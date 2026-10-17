import { createServiceClient } from '@/lib/supabase/server'
import { EMBEDDING_MODEL, historyContentHash } from './history'

type Extractor = (
  text: string | string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array; dims: number[] }>

let extractorPromise: Promise<Extractor> | null = null

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = import('@huggingface/transformers').then(async ({ pipeline }) => {
      const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL)
      return extractor as unknown as Extractor
    })
  }
  return extractorPromise
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []
  const extractor = await getExtractor()
  const tensor = await extractor(texts, { pooling: 'mean', normalize: true })
  const dimensions = tensor.dims.at(-1) ?? 384
  const values = Array.from(tensor.data)

  return texts.map((_, index) =>
    values.slice(index * dimensions, (index + 1) * dimensions),
  )
}

export async function enrichMarketHistory(limit = 24) {
  const supabase = createServiceClient()
  const safeLimit = Math.max(1, Math.min(limit, 100))
  const { data, error } = await supabase
    .from('market_history')
    .select('id,title,platform,content_hash')
    .is('embedding', null)
    .not('title', 'is', null)
    .order('last_seen_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    throw new Error(`Price intelligence database is not ready: ${error.message}`)
  }

  const rows = (data ?? []).filter(row => typeof row.title === 'string' && row.title.trim())
  if (!rows.length) return { enriched: 0, model: EMBEDDING_MODEL }

  const embeddings = await embedTexts(
    rows.map(row => `${row.platform}: ${row.title}`),
  )

  const updates = rows.map((row, index) => ({
    content_hash: row.content_hash || historyContentHash(row.title, row.platform),
    embedding_model: EMBEDDING_MODEL,
    embedding: embeddings[index],
    embedded_at: new Date().toISOString(),
  }))

  const writeResults = await Promise.all(rows.map((row, index) =>
    supabase.from('market_history').update(updates[index]).eq('id', row.id),
  ))
  const writeError = writeResults.find(result => result.error)?.error
  if (writeError) throw new Error(`Could not store embeddings: ${writeError.message}`)
  return { enriched: updates.length, model: EMBEDDING_MODEL }
}

