const BUCKET = 'ts-settings'
const FREE_CREDITS = 5

function path(userId: string) {
  return `user-data/${userId}/credits.json`
}

async function readBalance(supabase: any, userId: string): Promise<number | null> {
  try {
    const { data } = await supabase.storage.from(BUCKET).download(path(userId))
    if (!data) return null
    const parsed = JSON.parse(await data.text())
    return typeof parsed.balance === 'number' ? parsed.balance : null
  } catch {
    return null
  }
}

async function writeBalance(supabase: any, userId: string, balance: number) {
  await supabase.storage.from(BUCKET).upload(
    path(userId),
    Buffer.from(JSON.stringify({ balance })),
    { contentType: 'application/json', upsert: true }
  )
}

export async function getCredits(supabase: any, userId: string): Promise<number> {
  const existing = await readBalance(supabase, userId)
  if (existing != null) return existing
  await writeBalance(supabase, userId, FREE_CREDITS)
  return FREE_CREDITS
}

// Atomically spend one credit. Returns false if balance was already 0.
export async function spendCredit(supabase: any, userId: string): Promise<boolean> {
  const balance = await getCredits(supabase, userId)
  if (balance <= 0) return false
  await writeBalance(supabase, userId, balance - 1)
  return true
}

export async function addCredits(supabase: any, userId: string, amount: number): Promise<number> {
  const balance = await getCredits(supabase, userId)
  const next = balance + amount
  await writeBalance(supabase, userId, next)
  return next
}
