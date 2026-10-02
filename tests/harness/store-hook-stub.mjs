// Le stub reconstruit le db avec le vrai `buildDb` : si la forme change dans
// l application, le test rend la nouvelle forme, pas une copie perimee.
import { buildDb } from '../../src/features/nutrition/useNutritionStore.js'
const TODAY = '2026-06-15'
export { buildDb }
let phys = {}, cycle = {}, goals = {}, zones = [], rows = {}
// La derniere ecriture demandee par un ecran. Sans elle, un test ne peut que
// verifier qu un bouton existe, pas qu il ecrit ce qu il doit ecrire.
let dernierSet = null
export const __lastSet = () => dernierSet
export function __setDb(d) {
  const { cycle: c, goals: g, sensitiveZones: z, dayRows: r, ...rest } = d || {}
  phys = rest; cycle = c || {}; goals = g || {}; zones = z || []; rows = r || {}
}
export function useNutritionStore() {
  return {
    db: buildDb(phys, cycle, goals, zones, rows, TODAY),
    store: { set: (p) => { dernierSet = typeof p === 'function' ? p(buildDb(phys, cycle, goals, zones, rows, TODAY)) : p }, get: () => buildDb(phys, cycle, goals, zones, rows, TODAY), ensureDay: () => {} },
    loading: false,
    sync: { state: 'idle', pending: 0, lastError: null },
    retrySync: () => {},
  }
}
export default useNutritionStore
