import { existsSync } from 'node:fs'
const HERE = new URL('./', import.meta.url)
export async function resolve(spec, ctx, next) {
  if (spec === 'react' || spec.startsWith('react/') || spec === 'react-dom' || spec.startsWith('react-dom/'))
    return { url: new URL('./react-stub4.mjs', HERE).href, shortCircuit: true }
  if (/useNutritionStore(\.js)?$/.test(spec) && !/store-hook-stub/.test(ctx.parentURL || ''))
    return { url: new URL('./store-hook-stub.mjs', HERE).href, shortCircuit: true }
  if (spec.endsWith('/lib') || spec === '../../lib' || /\/lib$/.test(spec))
    return { url: new URL('./store-stub.mjs', HERE).href, shortCircuit: true }
  if (spec.startsWith('.') && ctx.parentURL && !/\.(js|jsx|mjs|json|css)$/.test(spec)) {
    const base = new URL(spec, ctx.parentURL)
    for (const ext of ['.js', '.jsx']) { const c = new URL(base.href + ext); if (existsSync(c)) return { url: c.href, shortCircuit: true } }
  }
  return next(spec, ctx)
}
export async function load(url, ctx, next) {
  if (url.endsWith('.jsx')) return next(url, { ...ctx, format: 'module' })
  return next(url, ctx)
}
