import { cooldownFor } from './cadence'

export async function claimScan(supabase: any, search: any): Promise<boolean> {
  if (search.enabled === false) return false
  const now = Date.now()
  const cooldown = cooldownFor(search.platform, search.id)
  if (now - (Date.parse(search.last_scraped_at) || 0) < cooldown) return false
  let query = supabase.from('searches').update({ last_scraped_at: new Date(now).toISOString() })
    .eq('id', search.id).neq('enabled', false)
  query = search.last_scraped_at ? query.eq('last_scraped_at', search.last_scraped_at) : query.is('last_scraped_at', null)
  const { data, error } = await query.select('id')
  if (!error) return !!data?.length
  if (!error.message?.includes("'last_scraped_at' column")) throw new Error('Could not reserve scan')

  // Legacy databases: atomic create-only storage claims shared by every trigger.
  // Checking the previous slot preserves the full cooldown across slot edges.
  const bucket = supabase.storage.from('ts-settings')
  const slot = Math.floor(now / cooldown)
  const path = (value: number) => `scan-claims/${search.id}/${value}.json`
  const previous = await bucket.download(path(slot - 1))
  if (previous.data) {
    const stamp = JSON.parse(await previous.data.text())
    if (now - stamp.at < cooldown) return false
  } else if (previous.error && !['404', '400'].includes(String(previous.error.statusCode))) {
    throw new Error('Could not read scan reservation')
  }
  const result = await bucket.upload(path(slot), new Blob([JSON.stringify({ at: now })], { type: 'application/json' }), { upsert: false, cacheControl: '0' })
  if (result.error) {
    if (['409', '400'].includes(String(result.error.statusCode)) && /exist|duplicate/i.test(result.error.message)) return false
    throw new Error('Could not reserve scan')
  }
  // Only obsolete claim files are removed; listings and customer data stay intact.
  await bucket.remove([path(slot - 2), path(slot - 3)])
  return true
}
