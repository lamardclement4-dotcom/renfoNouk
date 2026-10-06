// Ouverture instantanee : la copie locale s affiche avant la reponse du
// serveur. Une saisie faite pendant cette attente ne part pas : elle est
// rejouee sur les donnees fraiches, et ecartee si elle avait ete composee
// sur une donnee modifiee ailleurs entre-temps.
import { __mount, __rerender } from '../harness/react-stub3.mjs'
import { reset, calls, pannes } from '../harness/store-stub.mjs'
import { useNutritionStore, resetStore, cleInstantane } from '../../src/features/nutrition/useNutritionStore.js'
import { STORAGE_PREFIX } from '../../src/features/nutrition/syncQueue.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms))
console.warn = () => {}
const memo = new Map()
globalThis.localStorage = { getItem: (k) => (memo.has(k) ? memo.get(k) : null), setItem: (k, v) => memo.set(k, String(v)), removeItem: (k) => memo.delete(k),
  key: (i) => [...memo.keys()][i] ?? null, get length() { return memo.size } }
const copie = (phys) => JSON.stringify({ v: 1, savedAt: '2026-10-05T08:00:00.000Z', userId: 'u1', phys, cycle: {}, goals: {}, sensitiveZones: [], dayRows: {}, rowIds: {} })
const serveur = (phys) => ({ phys, cycle: {}, goals: {}, sensitive_zones: [] })
const W1 = { date: '2026-10-01', kg: 71 }, W2 = { date: '2026-10-03', kg: 70.5 }, W3 = { date: '2026-10-05', kg: 70 }
let n = 0
async function ouvrir(physCopie, physServeur, delai = 80) {
  resetStore(); reset(); memo.clear()
  memo.set(cleInstantane('u1'), copie(physCopie))
  pannes.profil = serveur(physServeur); pannes.delai = delai; pannes.lecture = 0
  const nom = 'e' + (++n)
  __mount(nom, () => useNutritionStore('u1'))
  await tick(5)
  return nom
}

// ─── 1. affichage instantane ───
let e = await ouvrir({ weightLog: [W1] }, { weightLog: [W1] })
let r = __rerender(e)
a(r.loading === false && r.miseAJour === true && r.db.weightLog.length === 1, 'la copie s affiche avant la reponse du serveur')

// ─── 2. saisie pendant l attente, copie a jour : rejouee, envoyee une fois ───
r.store.set((s) => ({ weightLog: [...s.weightLog, W3] }))
await tick(5)
a(__rerender(e).db.weightLog.length === 2, 'la saisie apparait tout de suite a l ecran')
a(calls.phys.length === 0, 'mais rien ne part avant les donnees fraiches')
await tick(150)
r = __rerender(e)
a(r.miseAJour === false && r.conflits === 0, 'donnees fraiches recues, aucun conflit')
a(calls.phys.length === 1 && calls.phys[0].weightLog.length === 2, 'la saisie est envoyee une seule fois, composee sur les donnees fraiches')

// ─── 3. copie perimee, saisie « fonction » : rejouee sans rien perdre ───
e = await ouvrir({ weightLog: [W1] }, { weightLog: [W1, W2] })
__rerender(e).store.set((s) => ({ weightLog: [...s.weightLog, W3] }))
await tick(150)
r = __rerender(e)
a(r.db.weightLog.map((w) => w.kg).join() === '71,70.5,70', 'copie perimee : la pesee faite ailleurs est gardee et la nouvelle s y ajoute')
a(calls.phys.length === 1 && calls.phys[0].weightLog.length === 3 && r.conflits === 0, 'un seul envoi, avec les trois pesees')

// ─── 4. copie perimee, saisie « objet » composee sur l ancienne liste : ecartee ───
e = await ouvrir({ weightLog: [W1] }, { weightLog: [W1, W2] })
r = __rerender(e)
r.store.set({ weightLog: [...r.db.weightLog, W3] })
await tick(150)
r = __rerender(e)
a(r.conflits === 1, 'la saisie fondee sur une liste perimee est signalee en conflit')
a(calls.phys.length === 0 && r.db.weightLog.map((w) => w.kg).join() === '71,70.5', 'et elle n ecrase pas la pesee faite ailleurs')

// ─── 5. saisie « objet » sur une donnee inchangee : rejouee ───
e = await ouvrir({ weightLog: [W1], weightGoal: 68 }, { weightLog: [W1, W2], weightGoal: 68 })
__rerender(e).store.set({ weightGoal: 66 })
await tick(150)
r = __rerender(e)
a(r.conflits === 0 && r.db.weightGoal === 66 && r.db.weightLog.length === 2, 'une saisie sur une donnee inchangee est rejouee, le reste vient du serveur')
a(calls.phys.length === 1 && calls.phys[0].weightGoal === 66 && calls.phys[0].weightLog.length === 2, 'envoi unique, compose sur les donnees fraiches')

// ─── 6. ecriture d une session precedente : toujours envoyee ───
resetStore(); reset(); memo.clear()
memo.set(cleInstantane('u1'), copie({ weightLog: [W1] }))
memo.set(STORAGE_PREFIX + 'u1', JSON.stringify({ phys: { weightLog: [W1, W3] } }))
pannes.profil = serveur({ weightLog: [W1] }); pannes.delai = 60
__mount('prec', () => useNutritionStore('u1'))
await tick(5)
a(calls.phys.length === 0, 'session precedente : rien ne part pendant l attente')
await tick(150)
a(calls.phys.length === 1 && calls.phys[0].weightLog.length === 2, 'puis l ecriture en attente part, une fois')

// ─── 7. panne reseau pendant l attente : mode hors ligne, saisies gardees ───
resetStore(); reset(); memo.clear()
memo.set(cleInstantane('u1'), copie({ weightLog: [W1] }))
pannes.lecture = 1; pannes.message = 'TypeError: Failed to fetch'; pannes.delai = 60
__mount('panne', () => useNutritionStore('u1'))
await tick(5)
__rerender('panne').store.set((s) => ({ weightLog: [...s.weightLog, W3] }))
await tick(150)
r = __rerender('panne')
a(typeof r.horsLigne === 'string' && r.miseAJour === false, 'sans reseau, la copie devient le mode hors ligne')
a(calls.phys.length === 1 && calls.phys[0].weightLog.length === 2, 'et la saisie part (file reprise, en attente du reseau sinon)')

resetStore(); pannes.delai = 0; pannes.profil = null; pannes.lecture = 0
console.log('\nALL PASS')
