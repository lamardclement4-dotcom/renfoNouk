// Suppression annulable : l action s applique, « Annuler » restaure
// exactement ce qu elle a change, sans defaire le reste.
import { __mount, __rerender } from '../harness/react-stub3.mjs'
import { reset, pannes } from '../harness/store-stub.mjs'
import { useNutritionStore, resetStore } from '../../src/features/nutrition/useNutritionStore.js'
import { ecouterAnnonces, fermerAnnonce } from '../../src/annonces.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms))
console.warn = () => {}
let annonce = null
ecouterAnnonces((x) => { annonce = x })
const W1 = { date: '2026-10-01', kg: 71 }, W2 = { date: '2026-10-03', kg: 70.5 }
resetStore(); reset()
pannes.profil = { phys: { weightLog: [W1, W2], weightGoal: 68, routines: [{ id: 'r1', name: 'Matin' }] }, cycle: {}, goals: {}, sensitive_zones: [] }
__mount('e', () => useNutritionStore('u1'))
await tick()
let r = __rerender('e')
a(r.db.weightLog.length === 2, 'depart : deux pesees')

r.store.annulable('Pesée supprimée', () => r.store.set({ weightLog: [W1] }))
await tick()
r = __rerender('e')
a(r.db.weightLog.length === 1, 'la suppression s applique tout de suite')
a(annonce && annonce.texte === 'Pesée supprimée' && typeof annonce.annuler === 'function', 'une annonce propose Annuler')

r.store.set({ weightGoal: 66 })
await tick()
annonce.annuler()
await tick()
r = __rerender('e')
a(r.db.weightLog.length === 2 && r.db.weightLog[1].kg === 70.5, 'Annuler remet la pesee supprimee')
a(r.db.weightGoal === 66, 'sans defaire ce qui a ete modifie entre-temps')
a(annonce && annonce.texte === 'Annulé' && !annonce.annuler, 'et le confirme')

// journee : un aliment retire puis remis
const auj = new Date().toISOString().slice(0, 10)
r.store.set({ foodLog: { [auj]: [{ id: 'a', n: 'Riz' }, { id: 'b', n: 'Pomme' }] } })
await tick()
r = __rerender('e')
r.store.annulable('Aliment retiré du journal', () => r.store.set((s) => ({ foodLog: { ...s.foodLog, [auj]: s.foodLog[auj].filter((x) => x.id !== 'b') } })))
await tick()
a(__rerender('e').db.foodLog[auj].length === 1, 'un aliment retire du journal')
annonce.annuler()
await tick()
a(__rerender('e').db.foodLog[auj].map((x) => x.n).join() === 'Riz,Pomme', 'Annuler le remet a sa place')

// routines : liste dans le profil
r = __rerender('e')
r.store.annulable('Routine supprimée', () => r.store.set({ routines: [] }))
await tick()
annonce.annuler()
await tick()
a(__rerender('e').db.routines.length === 1, 'une routine supprimee revient aussi')
fermerAnnonce()
resetStore(); pannes.profil = null
console.log('\nALL PASS')
