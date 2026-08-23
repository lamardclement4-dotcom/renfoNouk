// Plusieurs composants montés en même temps, chacun avec ses hooks.
const comps = new Map()
let cur = null
export function __mount(id, fn) {
  if (!comps.has(id)) comps.set(id, { states: [], si: 0 })
  return __render(id, fn)
}
export function __render(id, fn) {
  const c = comps.get(id); c.si = 0; cur = c; c.fn = fn
  const out = fn(); cur = null; return out
}
export function __rerender(id) { const c = comps.get(id); return __render(id, c.fn) }
export const useState = (init) => {
  const c = cur, i = c.si++
  if (!(i in c.states)) c.states[i] = typeof init === 'function' ? init() : init
  return [c.states[i], (v) => { c.states[i] = typeof v === 'function' ? v(c.states[i]) : v }]
}
export const useEffect = (f, deps) => {
  const c = cur, key = 'e' + c.si++
  const prev = c[key]
  const same = prev && deps && prev.length === deps.length && prev.every((d, i) => d === deps[i])
  if (!same) { c[key] = deps; f() }
}
export const useCallback = (f) => f
export const useMemo = (f) => f()
export const useRef = (init) => { const c = cur, i = 'r' + c.si++; if (!(i in c)) c[i] = { current: init }; return c[i] }
export const createElement = () => null
export default { useState, useEffect, useCallback, useMemo, useRef, createElement }
