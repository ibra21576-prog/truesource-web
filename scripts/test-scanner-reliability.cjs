const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')

function load(file, dependencies = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, require: id => dependencies[id] || require(id),
    Date, Error, JSON, Blob, AbortSignal, AbortController, setTimeout, clearTimeout,
  })
  return exports
}

async function main() {
  const health = load('lib/scraper/health.ts')
  assert.equal(health.scanFailure(new Error('429 secret'), 1).delay, 180000)
  assert.equal(health.scanFailure(new Error('429'), 100).delay, 1800000)
  assert.equal(health.scanFailure(new Error('LOGIN_REQUIRED'), 1).status, 'connection_required')
  assert.ok(!health.scanFailure(new Error('secret credential'), 1).message.includes('secret'))
  let state = null, saves = 0, claims = 0, fetches = 0, fail = true, claimed = true
  const runner = load('lib/scraper/run.ts', {
    './index': {},
    './claim': { claimScan: async () => { claims++; return claimed } },
    './save': { saveNewItems: async () => { saves++; if (fail) throw new Error('database unavailable'); return 1 } },
    './health': {
      ...health,
      readScanHealth: async () => state,
      writeScanHealth: async (_db, _id, value) => { state = JSON.parse(JSON.stringify(value)) },
    },
  })
  const search = { id: 'a', platform: 'subito', query: 'PS5', domain: 'it' }
  const fetcher = async () => { fetches++; return [{ id: 'product' }] }
  await assert.rejects(runner.runSearchScan({}, search, fetcher), /Retrying automatically/)
  assert.equal(state.status, 'retrying')
  assert.equal(state.lastSuccessAt, null)
  assert.equal(state.failures, 1)
  assert.equal((await runner.runSearchScan({}, search, fetcher)).skipped, true)
  assert.equal(claims, 1, 'Backoff must not claim another scan')
  assert.equal(fetches, 1, 'Backoff must not hit the marketplace')
  state.nextRetryAt = new Date(0).toISOString()
  fail = false
  const result = await runner.runSearchScan({}, search, fetcher)
  assert.equal(result.saved, 1)
  assert.equal(state.status, 'ok')
  assert.equal(state.failures, 0)
  assert.ok(state.lastSuccessAt)
  assert.equal(state.nextRetryAt, null)
  claimed = false
  assert.equal((await runner.runSearchScan({}, search, fetcher)).skipped, true)
  assert.equal(saves, 2, 'Duplicate claims must not save or fetch')
  assert.notEqual(runner.scanGroupKey(search), runner.scanGroupKey({ ...search, max_price: 50 }))
  assert.notEqual(runner.scanGroupKey({ ...search, platform: 'vinted', user_id: 'one' }),
    runner.scanGroupKey({ ...search, platform: 'vinted', user_id: 'two' }))

  const budget = load('lib/scraper/request-budget.ts')
  await assert.rejects(budget.withRequestBudget(async () => {
    const signal = budget.requestSignal(5000)
    await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }))
    // Even an adapter swallowing an abort cannot turn it into success.
    return []
  }, 20), /timed out/)
  const parallel = await Promise.allSettled([
    budget.withRequestBudget(() => new Promise(resolve => setTimeout(() => resolve([]), 40)), 10),
    budget.withRequestBudget(() => new Promise(resolve => setTimeout(() => resolve([1]), 20)), 1000),
  ])
  assert.equal(parallel[0].status, 'rejected')
  assert.equal(parallel[1].status, 'fulfilled', 'One search deadline must not cancel another')
  const files = new Map()
  const bucket = {
    download: async path => files.has(path) ? { data: new Blob([files.get(path)]) } : { error: { statusCode: '404' } },
    upload: async (path, blob, options) => {
      if (!options.upsert && files.has(path)) return { error: { statusCode: '409', message: 'Already exists' } }
      // Reserve synchronously so parallel uploads have atomic create semantics.
      files.set(path, '')
      files.set(path, await blob.text())
      return {}
    },
    remove: async paths => { paths.forEach(path => files.delete(path)); return {} },
  }
  const query = {
    update() { return this }, eq() { return this }, neq() { return this }, is() { return this },
    select: async () => ({ error: { message: "Could not find the 'last_scraped_at' column" } }),
  }
  const db = { from: () => query, storage: { from: () => bucket } }
  const claim = load('lib/scraper/claim.ts', { './cadence': { cooldownFor: () => 60000 } })
  const reservations = await Promise.all([claim.claimScan(db, search), claim.claimScan(db, search)])
  assert.equal(reservations.filter(Boolean).length, 1, 'Legacy storage must permit only one concurrent scan')
  assert.equal(await claim.claimScan(db, { ...search, enabled: false }), false)

  const many = Array.from({ length: 1003 }, (_, id) => ({ ...search, id: String(id) }))
  const visited = []
  const paged = {
    select() { return this }, neq() { return this }, order() { return this },
    range: async (start, end) => ({ data: many.slice(start, end + 1) }),
  }
  const scheduler = load('lib/scheduler.ts', {
    '@/lib/supabase/server': { createServiceClient: () => ({ from: () => paged, storage: { from: () => bucket } }) },
    '@/lib/scraper': { fetchItems: async () => [] },
    '@/lib/scraper/run': {
      scanGroupKey: runner.scanGroupKey,
      runSearchScan: async (_db, item) => {
        visited.push(item.id)
        if (item.id === '4') throw new Error('Simulated isolated failure')
        return { skipped: false, diagnostics: {}, fetched: 0, saved: 0 }
      },
    },
  })
  const cycle = await scheduler.runScrapeCycle()
  assert.equal(visited.length, 1003, 'All pages must be processed, not only the first 1000 searches')
  assert.equal(cycle.processed, 1002)
  assert.equal(cycle.errors, 1, 'One search failure must not stop other customers')
  console.log('Scanner recovery, backoff, account isolation, atomic claims, deadlines and 1000+ search pagination passed')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
