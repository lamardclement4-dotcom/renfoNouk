// createElement construit un vrai noeud : les enfants sont evalues (donc une
// variable non declaree leve), et l arbre reste inspectable pour les assertions.
const comps = new Map()
let cur = null
export function __render(id, fn, props) {
  if (!comps.has(id)) comps.set(id, { states: [], si: 0 })
  const c = comps.get(id); c.si = 0; cur = c
  try { return fn(props || {}) } finally { cur = null }
}
export function __reset() { comps.clear() }
// Force un etat (l onglet actif) pour rendre chaque onglet, pas seulement le premier.
export function __setState(id, i, v) { const c = comps.get(id); if (c) c.states[i] = v }
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
export function createElement(type, props, ...children) {
  // Un composant fonction imbrique est rendu pour de vrai : c est la que se
  // cachent les erreurs (FlowSpace, SegTabs, Ring...).
  const flat = children.flat(Infinity)
  if (typeof type === 'function') {
    const sub = { ...(props || {}), children: flat.length === 1 ? flat[0] : flat }
    let out = null
    try { out = __render('sub:' + (type.name || 'anon') + ':' + (cur ? cur.si : 0), type, sub) } catch (e) { throw e }
    return { type: type.name || 'anon', props: props || {}, children: [out] }
  }
  return { type, props: props || {}, children: flat }
}
export const Fragment = 'Fragment'
// React.lazy : le rendu de ce harnais est synchrone, il ne peut pas attendre
// un import dynamique. Le composant paresseux devient donc un noeud marqueur
// — l arbre reste inspectable et rien ne leve. Ce que ces suites cherchent
// (un ecran mort, une variable non declaree) reste vu par ailleurs : la
// liste SCREENS rend chaque ecran directement, sans passer par le parent.
export const lazy = (factory) => {
  const Lazy = (props) => ({ type: 'lazy', props: props || {}, children: [] })
  Lazy.__factory = factory
  Lazy.displayName = 'Lazy'
  return Lazy
}
// Suspense ne fait que laisser passer ses enfants.
export const Suspense = (props) => (props && props.children) || null
export default { useState, useEffect, useCallback, useMemo, useRef, createElement, Fragment, lazy, Suspense }
