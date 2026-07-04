const BUCKET = 'ts-settings'
const MONTHLY_CREDITS = 20

function path(userId: string) {
  return `user-data/${userId}/credits.json`
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface CreditFile { balance: number; refreshedAt: string }

async function readFile(supabase: any, userId: string): Promise<CreditFile | null> {
  try {
    const { data } = await supabase.storage.from(BUCKET).download(path(userId))
    if (!data) return null
    const parsed = JSON.parse(await data.text())
    if (typeof parsed.balance !== 'number' || !parsed.refreshedAt) return null
    return parsed
  } catch {
    return null
  }
}

async function writeFile(supabase: any, userId: string, file: CreditFile) {
  await supabase.storage.from(BUCKET).upload(
    path(userId),
    Buffer.from(JSON.stringify(file)),
    { contentType: 'application/json', upsert: true }
  )
}

// Credits reset to MONTHLY_CREDITS on first access each calendar month — a
// simple, cheap proxy for "subscription still active" without hitting the
// Whop API on every request (the 24h login session already re-verifies
// membership periodically via OAuth).
export async function getCredits(supabase: any, userId: string): Promise<number> {
  const now = new Date()
  const existing = await readFile(supabase, userId)

  if (!existing || monthKey(new Date(existing.refreshedAt)) !== monthKey(now)) {
    const fresh: CreditFile = { balance: MONTHLY_CREDITS, refreshedAt: now.toISOString() }
    await writeFile(supabase, userId, fresh)
    return fresh.balance
  }
  return existing.balance
}

// Atomically spend one credit. Returns false if balance was already 0.
export async function spendCredit(supabase: any, userId: string): Promise<boolean> {
  const now = new Date()
  const existing = await readFile(supabase, userId)
  const monthCurrent = existing && monthKey(new Date(existing.refreshedAt)) === monthKey(now)

  const balance = monthCurrent ? existing!.balance : MONTHLY_CREDITS
  if (balance <= 0) return false

  await writeFile(supabase, userId, { balance: balance - 1, refreshedAt: monthCurrent ? existing!.refreshedAt : now.toISOString() })
  return true
}

// Admin-only top-up — adds on top of whatever the customer currently has,
// without resetting their monthly refresh anchor.
export async function addCredits(supabase: any, userId: string, amount: number): Promise<number> {
  const now = new Date()
  const existing = await readFile(supabase, userId)
  const monthCurrent = existing && monthKey(new Date(existing.refreshedAt)) === monthKey(now)

  const balance = (monthCurrent ? existing!.balance : MONTHLY_CREDITS) + amount
  const refreshedAt = monthCurrent ? existing!.refreshedAt : now.toISOString()
  await writeFile(supabase, userId, { balance, refreshedAt })
  return balance
}
