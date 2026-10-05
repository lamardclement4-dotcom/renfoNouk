// Mode hors ligne : l app s ouvre sur la derniere copie connue des donnees
// quand le serveur est injoignable faute de reseau, accepte les saisies (la
// file les enverra), et revient aux donnees du serveur des qu il repond.
import { __mount, __rerender } from '../harness/react-stub3.mjs'
import { reset, calls, pannes } from '../harness/store-stub.mjs'
import { useNutritionStore, resetStore, cleInstantane, lireInstantane, estPanneReseau } from '../../src/features/nutrition/useNutritionStore.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms))
console.warn = () => {}
const memo = new Map()
globalThis.localStorage = {
  getItem: (k) => (memo.has(k) ? memo.get(k) : null), setItem: (k, v) => memo.set(k, String(v)), removeItem: (k) => memo.delete(k),
  key: (i) => [...memo.keys()][i] ?? null, get length() { return memo.size },
}
const PROFIL = { phys: { weightLog: [{ date: '2026-09-01', kg: 71 }, { date: '2026-09-20', kg: 70 }], onboardingDone: true }, cycle: {}, goals: {}, sensitive_zones: [] }

a(estPanneReseau({ message: 'TypeError: Failed to fetch' }) && estPanneReseau({ message: 'Load failed' }) && estPanneReseau(new TypeError('NetworkError when attempting to fetch resource.')), 'pannes reseau reconnues (Chrome, Safari, Firefox)')
a(!estPanneReseau({ message: 'permission denied for table profiles' }), 'une erreur de droits n est pas une panne reseau')

// ─── 1. en ligne : la copie se constitue ───
resetStore(); reset(); pannes.profil = PROFIL
__mount('enligne', () => useNutritionStore('u1'))
await tick()
let r = __rerender('enligne')
a(r.loading === false && r.horsLigne === null, 'en ligne : donnees du serveur')
r.store.set({ weightGoal: 68 })
await tick(500)
const copie = lireInstantane('u1')
a(copie && copie.phys.weightLog.length === 2 && copie.phys.weightGoal === 68, 'une copie a jour est gardee sur l appareil, saisie comprise')

// ─── 2. reouverture sans reseau : on ouvre sur la copie ───
const texte = memo.get(cleInstantane('u1'))
resetStore(); reset()
a(!memo.has(cleInstantane('u1')), 'la deconnexion efface la copie (telephone prete, partage)')
memo.set(cleInstantane('u1'), texte)
pannes.lecture = 1; pannes.message = 'TypeError: Failed to fetch'
__mount('horsligne', () => useNutritionStore('u1'))
await tick()
r = __rerender('horsligne')
a(r.loading === false && typeof r.horsLigne === 'string', 'sans reseau : l app s ouvre sur la copie, datee')
a(r.db.weightLog.length === 2 && r.db.weightGoal === 68, 'avec les dernieres donnees connues')
r.store.set({ weightGoal: 66 })
await tick()
a(calls.phys.length === 1 && calls.phys[0].weightLog.length === 2 && calls.phys[0].weightGoal === 66, 'une saisie hors ligne se compose sur la copie, sans rien perdre de l historique')
r.retryLoad()
await tick()
r = __rerender('horsligne')
a(r.horsLigne === null && r.loadError === null, 'le serveur repond : retour aux donnees du serveur')

// ─── 3. erreur serveur (pas reseau) : pas de copie, ecritures bloquees ───
resetStore(); reset()
memo.set(cleInstantane('u1'), texte)
pannes.lecture = 1; pannes.message = 'permission denied for table profiles'
__mount('droits', () => useNutritionStore('u1'))
await tick()
r = __rerender('droits')
a(r.loading === true, 'erreur de droits : on n ouvre pas sur une copie peut-etre perimee')
r.store.set({ weightGoal: 60 })
await tick()
a(calls.phys.length === 0, 'et rien ne s ecrit')

// ─── 4. la copie d un autre compte n est jamais utilisee ───
resetStore(); reset()
memo.set(cleInstantane('u2'), texte)
pannes.lecture = 1; pannes.message = 'Failed to fetch'
__mount('autre', () => useNutritionStore('u2'))
await tick()
r = __rerender('autre')
a(r.loading === true, 'une copie au nom d un autre compte est ignoree')
resetStore()
pannes.profil = null; pannes.lecture = 0; pannes.message = 'Failed to fetch'
console.log('\nALL PASS')
