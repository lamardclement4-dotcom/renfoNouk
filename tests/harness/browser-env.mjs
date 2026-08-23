// Node n a pas de DOM : on fournit le strict minimum lu au rendu.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size },
  key: (i) => [...store.keys()][i] ?? null,
}
globalThis.sessionStorage = globalThis.localStorage
globalThis.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
const el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [] })
globalThis.document = { documentElement: el(), body: el(), head: el(),
  createElement: el, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {} }
globalThis.window = { localStorage: globalThis.localStorage, matchMedia: globalThis.matchMedia,
  addEventListener() {}, removeEventListener() {}, location: { href: 'http://localhost/', origin: 'http://localhost' },
  navigator: { onLine: true, userAgent: 'node' }, document: globalThis.document, scrollTo() {}, innerWidth: 390, innerHeight: 844 }
try { globalThis.window.navigator = globalThis.navigator } catch { /* Node fournit deja navigator */ }
