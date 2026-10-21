const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
function load(path, dependencies = {}, globals = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: id => dependencies[id] || require(id), URL, URLSearchParams, ...globals })
  return exports
}
const window = { location: { origin: 'https://example.test', search: '?t=iframe-token' } }
const sessionStorage = { getItem: () => 'stored-token' }
const { sessionHref } = load('lib/api-client.ts', {}, { window, sessionStorage })
assert.equal(sessionHref('/items/123'), '/items/123?t=iframe-token')
assert.equal(sessionHref('/deals?filter=saved#list'), '/deals?filter=saved&t=iframe-token#list')
assert.equal(sessionHref('https://marketplace.test/item'), 'https://marketplace.test/item')
assert.equal(sessionHref('//marketplace.test/item'), '//marketplace.test/item')
window.location.search = ''
assert.equal(sessionHref('/items/123'), '/items/123?t=stored-token')
sessionStorage.getItem = () => null
assert.equal(sessionHref('/items/123'), '/items/123')

const hooks = []
let cursor = 0
const react = {
  useState(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = initial; return [hooks[index], value => { hooks[index] = value }] },
  useRef(initial) { const index = cursor++; return hooks[index] ||= { current: initial } },
}
const SessionLink = () => null
const Actions = load('components/ListingActions.tsx', { react, './SessionLink': { default: SessionLink } }).default
function render(props) { cursor = 0; return Actions(props) }
function nodes(element) { return !element || typeof element !== 'object' ? [] : [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)] }
async function main() {
  let calls = 0, release
  const props = { itemId: '123', saved: false, onHide() {}, onSave: () => { calls++; return new Promise(resolve => { release = resolve }) } }
  const tree = render(props)
  assert.equal(nodes(tree).find(n => n.type === SessionLink).props.href, '/items/123')
  const button = nodes(tree).find(n => n.props['aria-label'] === 'Save to Deal Board')
  const pending = button.props.onClick()
  await button.props.onClick()
  assert.equal(calls, 1, 'Rapid clicks must not create duplicate requests')
  assert.equal(nodes(render(props)).find(n => n.props['aria-label'] === 'Save to Deal Board').props.disabled, true)
  release(); await pending
  const savedTree = render({ ...props, saved: true })
  assert.ok(nodes(savedTree).some(n => n.type === SessionLink && n.props.href === '/deals'), 'Saved star must remain actionable')
  const failing = { ...props, onSave: async () => { throw Error('offline') } }
  await nodes(render(failing)).find(n => n.props['aria-label'] === 'Save to Deal Board').props.onClick()
  assert.ok(nodes(render(failing)).some(n => n.props.role === 'alert'), 'Save failures must be visible')
  console.log('Listing actions: iframe navigation, no external token leakage, double clicks, saved navigation and error feedback passed')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
