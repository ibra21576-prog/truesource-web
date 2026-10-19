const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const compiled = ts.transpileModule(fs.readFileSync('lib/scraper/save.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const exportsObject = {}
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require: id => id.includes('/history') ? { recordMarketHistory: async () => {} } : { parseMarketplacePrice: () => ({ amount: 10, currency: 'EUR' }) },
  Date, Set, Map, Number,
})
async function run(fail, invalidDate = false) {
  const calls = []
  const db = { from(table) {
    let write = false
    const query = {
      select() { return query }, eq() { return query }, in() { return query },
      upsert() { write = true; calls.push(table); return query },
      then(resolve, reject) {
        return Promise.resolve(write && table === 'items'
          ? fail ? { error: { message: 'temporary database failure' } } : { data: [{ id: 'row', item_id: 'listing', price: '10' }] }
          : { data: [] }).then(resolve, reject)
      },
    }
    return query
  } }
  const action = exportsObject.saveNewItems(db, { id: 'search', user_id: 'owner' }, [{ id: 'listing', title: 'Test', platform: 'subito', price: '10', postedAt: invalidDate ? 'invalid' : new Date().toISOString() }])
  if (fail) {
    await assert.rejects(action, /temporary database failure/)
    assert.equal(calls.includes('seen_ids'), false, 'Failed inserts must remain retryable')
  } else {
    assert.equal(await action, 1)
    assert.ok(calls.indexOf('items') < calls.indexOf('seen_ids'), 'Save before marking seen')
  }
}
;(async () => { await run(true); await run(false); await run(false, true); console.log('Save failure, retry order and invalid date checks passed') })().catch(error => { console.error(error); process.exitCode = 1 })
