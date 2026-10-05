// Une lecture ratee a l ouverture ne doit jamais passer pour un profil
// vide. Chaque ecriture renvoie la colonne phys entiere : un profil pris
// pour vide, puis complete d une seule saisie, effacait tout l historique.
import { __mount, __rerender } from '../harness/react-stub3.mjs'
import { reset, calls, pannes } from '../harness/store-stub.mjs'
import { useNutritionStore, resetStore } from '../../src/features/nutrition/useNutritionStore.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms))
const avertissements = []
console.warn = (...x) => avertissements.push(x.join(' '))

for (const jette of [false, true]) {
  const cas = jette ? 'exception reseau' : 'erreur renvoyee par Supabase'
  resetStore(); reset()
  pannes.lecture = 1; pannes.jette = jette
  pannes.profil = { phys: { weightLog: [{ date: '2026-01-01', kg: 70 }], onboardingDone: true }, cycle: {}, goals: {}, sensitive_zones: [] }
  __mount('e' + jette, () => useNutritionStore('u-' + jette))
  await tick()
  let r = __rerender('e' + jette)
  a(r.loading === true, cas + ' : on reste en chargement, le profil n est pas pris pour vide')
  a(typeof r.loadError === 'string' && r.loadError.length > 0, cas + ' : l echec est signale (' + r.loadError + ')')
  r.store.set({ weightGoal: 65 })
  r.store.completeSession(30)
  await tick()
  a(calls.phys.length === 0 && calls.inserts.length === 0 && calls.updates.length === 0, cas + ' : aucune ecriture tant que les vraies donnees ne sont pas la')
  a(avertissements.some((w) => /pas encore charg/.test(w)), cas + ' : l ecriture refusee est tracee')

  r.retryLoad()
  await tick()
  r = __rerender('e' + jette)
  a(r.loading === false && r.loadError === null, cas + ' : le nouvel essai charge les donnees')
  a(r.db.weightLog.length === 1, cas + ' : l historique reel est bien la')
  r.store.set({ weightGoal: 65 })
  await tick()
  a(calls.phys.length === 1 && calls.phys[0].weightLog && calls.phys[0].weightLog.length === 1 && calls.phys[0].weightGoal === 65,
    cas + ' : la saisie s ajoute a l historique au lieu de l ecraser')
}
resetStore()
pannes.profil = null

// ─── garde d ecran : fichier d ecran disparu apres une mise en ligne ───
const { estErreurDeChargement, rechargerUneFois } = await import('../../src/rechargement.js')
a(estErreurDeChargement(new TypeError('Failed to fetch dynamically imported module: https://x/assets/Nutrition-abc.js')), 'Chrome : module dynamique introuvable reconnu')
a(estErreurDeChargement(new TypeError('Importing a module script failed.')), 'Safari : reconnu aussi')
a(estErreurDeChargement(new Error('error loading dynamically imported module')), 'Firefox : reconnu aussi')
a(!estErreurDeChargement(new TypeError("Cannot read properties of undefined (reading 'map')")), 'une vraie erreur de rendu n est pas prise pour une mise a jour')
const memo = new Map()
globalThis.sessionStorage = { getItem: (k) => memo.get(k) ?? null, setItem: (k, v) => memo.set(k, v) }
let recharges = 0
globalThis.window = { ...(globalThis.window || {}), location: { reload: () => { recharges++ } } }
a(rechargerUneFois() === true && recharges === 1, 'premiere fois : l app se recharge')
a(rechargerUneFois() === false && recharges === 1, 'seconde fois dans la minute : pas de rechargement en boucle')
globalThis.sessionStorage = { getItem: () => { throw new Error('bloque') }, setItem: () => { throw new Error('bloque') } }
a(rechargerUneFois() === false && recharges === 1, 'stockage bloque : on s abstient plutot que de risquer une boucle')
console.log('\nALL PASS')
