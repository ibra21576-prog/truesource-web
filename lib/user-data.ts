const BUCKET = 'ts-settings'

export async function getUserSearchIds(supabase: any, userId: string): Promise<string[]> {
  // Database ownership survives a missing/outdated legacy storage index.
  const owned: string[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('searches').select('id').eq('user_id', userId).order('id').range(offset, offset + 499)
    if (error) throw new Error('Could not load your searches')
    owned.push(...(data || []).map((row: any) => row.id))
    if (!data || data.length < 500) break
  }
  try {
    const { data } = await supabase.storage.from(BUCKET).download(`user-data/${userId}/search-ids.json`)
    if (!data) return owned
    const value = JSON.parse(await data.text())
    return Array.isArray(value) ? [...new Set([...owned, ...value.filter(id => typeof id === 'string')])] as string[] : owned
  } catch {
    return owned
  }
}

export async function saveUserSearchIds(supabase: any, userId: string, ids: string[]) {
  const uniqueIds = [...new Set(ids)]
  const { error } = await supabase.storage.from(BUCKET).upload(
    `user-data/${userId}/search-ids.json`,
    Buffer.from(JSON.stringify(uniqueIds)),
    { contentType: 'application/json', upsert: true },
  )
  if (error) throw error
}

export async function ownsSearch(supabase: any, userId: string, searchId: string) {
  const ids = await getUserSearchIds(supabase, userId)
  return ids.includes(searchId)
}

// Keeps the database ownership columns in sync with the legacy per-user index.
// The index remains as a compatibility fallback for searches created before the
// ownership migration was introduced.
export async function claimLegacySearches(supabase: any, userId: string, ids: string[]) {
  if (!ids.length) return
  try {
    await supabase.from('searches').update({ user_id: userId }).in('id', ids).is('user_id', null)
    await supabase.from('items').update({ user_id: userId }).in('search_id', ids).is('user_id', null)
  } catch {}
}
