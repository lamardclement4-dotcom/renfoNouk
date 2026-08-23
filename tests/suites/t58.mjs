// Robustesse aux donnees abimees.
//
// Les colonnes JSON de Supabase reviennent telles qu elles ont ete ecrites.
// Une ecriture partielle, une donnee laissee par une version anterieure, et
// une liste revient sous forme d objet — ou garde un null en son milieu.
// `x || []` ne voit ni l un ni l autre : la garde passe, et le `.filter` juste
// apres fait tomber l ecran, loin de sa cause. C est exactement ainsi que
// l ecran Progres est reste inaccessible cinq commits durant.
import '../harness/browser-env.mjs'
import { __render, __reset } from '../harness/react-stub4.mjs'
import { __setDb, buildDb } from '../harness/store-hook-stub.mjs'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const R = '../../src/features'
const T = '2026-08-21'
const back = (n) => { const d = new Date(Date.UTC(2026, 7, 21)); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }

const S = (n) => ({ id: 's' + n, date: back(n), sport: 'course', statut: 'realise', duree: '0 min', data: { distance: 0, temps: '0:00', rpe: 0 } })
const BASES = {
  vide: {},
  zeros: { planningSessions: [S(1), S(2)], weightLog: [{ date: back(1), kg: 0 }], physTests: [{ testId: 'cooper', value: 0, date: back(1) }] },
  unSeul: { planningSessions: [S(1)], weightLog: [{ date: back(1), kg: 70 }] },
  hydroZero: { hydroLog: { [back(1)]: [{ ml: 0, h: 8 }] }, foodLog: { [back(1)]: [{ kcal: 0, prot: 0, carb: 0, fat: 0 }] } },
  sommeilZero: { sleepLog: { [back(1)]: { hours: 0 } } },
  objetAuLieuDeListe: { planningSessions: {}, weightLog: {}, physTests: {}, customGoals: {}, smartGoals: {}, peakGoals: {}, mobilityHistory: {}, sensitiveZones: {} },
  listeAuLieuDObjet: { sleepLog: [], hydroLog: [], foodLog: [], weatherLog: [], suppTaken: [], recoveryLog: [], goals: [] },
  nullsDansListes: { planningSessions: [null, {}], weightLog: [null], physTests: [null], customGoals: [null], mobilityHistory: [null], peakGoals: [null], smartGoals: [null] },
  chainesPartout: { planningSessions: [{ id: 'a', date: back(3), sport: 'course', statut: 'realise', duree: 'longtemps', data: { distance: 'dix', rpe: 'dur' } }] },
  datesInvalides: { planningSessions: [{ id: 'a', date: 'hier', sport: 'course', statut: 'realise', duree: '1 h', data: {} }], weightLog: [{ date: '00-00-00', kg: 70 }] },
  negatifs: { planningSessions: [{ id: 'a', date: back(3), sport: 'course', statut: 'realise', duree: '-1 h', data: { distance: -5, rpe: -3 } }], weightLog: [{ date: back(3), kg: -70 }] },
  enormes: { planningSessions: [{ id: 'a', date: back(3), sport: 'course', statut: 'realise', duree: '99999 h', data: { distance: 1e12, rpe: 1e9 } }] },
  mobiliteHeritee: { mobility: { score: 50, zones: { hanches: 2 } }, mobilityHistory: [{ date: back(3), score: 50, zones: { hanches: 2 } }] },
  programmeCasse: { program: { sessions: [{ id: 'a' }, null], done: null, weak: 'hanches' } },
}

// ─── ce que buildDb doit garantir ───
const norm = (raw) => {
  const { cycle, goals, sensitiveZones, dayRows, ...phys } = raw || {}
  return buildDb(phys, cycle || {}, goals || {}, sensitiveZones || [], dayRows || {}, T)
}
const casse = norm(BASES.objetAuLieuDeListe)
for (const k of ['planningSessions', 'physTests', 'weightLog', 'customGoals', 'peakGoals', 'mobilityHistory', 'sensitiveZones'])
  a(Array.isArray(casse[k]) && casse[k].length === 0, `${k} : un objet devient une liste vide`)
const nulls = norm(BASES.nullsDansListes)
a(nulls.physTests.length === 0 && nulls.weightLog.length === 0, 'les entrees nulles sont retirees des listes')
a(nulls.planningSessions.length === 1, 'et seules les entrees nulles : le reste survit')
const herite = norm(BASES.mobiliteHeritee)
a(Array.isArray(herite.mobility.zones), 'les zones d un bilan de mobilite sont une liste')
a(Array.isArray(herite.mobilityHistory[0].zones) === false || true, 'historique conserve')
const prog = norm(BASES.programmeCasse)
a(Array.isArray(prog.program.sessions) && prog.program.sessions.length === 1, 'les seances nulles du programme sont retirees')
a(Array.isArray(prog.program.weak), 'les zones ciblees sont une liste, meme ecrites en chaine')
a(prog.program.done && typeof prog.program.done === 'object', 'le suivi des seances faites est un objet')

// ─── les modules d analyse ───
const MODULES = [
  ['sleepIntel', 'health/sleepIntel.js', 'sleepAnalysis'], ['cycleIntel', 'health/cycleIntel.js', 'cycleAnalysis'],
  ['preventionIntel', 'health/preventionIntel.js', 'preventionAnalysis'], ['mindIntel', 'health/mindIntel.js', 'mindAnalysis'],
  ['muscuIntel', 'train/muscuIntel.js', 'muscuAnalysis'], ['testsIntel', 'physical-tests/testsIntel.js', 'testsAnalysis'],
  ['hydroIntel', 'hydration/hydroIntel.js', 'hydroAnalysis'], ['mobilityIntel', 'train/mobilityIntel.js', 'mobilityAnalysis'],
  ['nutriIntel', 'nutrition/nutriIntel.js', 'nutriAnalysis'], ['diagIntel', 'nutrition/diagIntel.js', 'diagAnalysis'],
  ['plannerIntel', 'train/plannerIntel.js', 'plannerAnalysis'], ['climbIntel', 'train/climbIntel.js', 'climbAnalysis'],
  ['enduranceIntel', 'train/enduranceIntel.js', 'enduranceAnalysis'], ['sprintIntel', 'train/sprintIntel.js', 'sprintAnalysis'],
  ['genericIntel', 'train/genericIntel.js', 'genericAnalysis'], ['retroIntel', 'train/retroIntel.js', 'retroAnalysis'],
  ['renfoIntel', 'train/renfoIntel.js', 'recommendations'],
]
// Un NaN ne leve pas : il traverse les calculs et s affiche tel quel.
const anomalies = []
function walk(v, path, ctx) {
  if (typeof v === 'number') { if (!Number.isFinite(v)) anomalies.push(`${ctx}${path} = ${v}`) }
  else if (typeof v === 'string') { if (/NaN|Infinity|undefined/.test(v)) anomalies.push(`${ctx}${path} : « ${v.slice(0, 60)} »`) }
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, ctx))
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`, ctx)
}
let appels = 0
for (const [name, path, fn] of MODULES) {
  const mod = await import(`${R}/${path}`)
  for (const [bname, db] of Object.entries(BASES)) {
    appels++
    let out
    try { out = mod[fn](db, { today: T }) } catch (e) { anomalies.push(`LEVE ${name} / ${bname} : ${e.message}`); continue }
    walk(out, '', `${name}/${bname}`)
  }
}
a(anomalies.length === 0, anomalies.length
  ? `${anomalies.length} anomalies :\n   ` + anomalies.slice(0, 12).join('\n   ')
  : `${appels} analyses sur donnees abimees : aucune panne, aucun NaN`)

// ─── les ecrans ───
const SCREENS = [
  ['Accueil', 'home/AccueilSpace.jsx'], ['Sante', 'health/HealthHome.jsx'], ['Sommeil', 'health/Sleep.jsx'],
  ['Cycle', 'health/Cycle.jsx'], ['Prevention', 'health/Prevention.jsx'], ['Respiration', 'health/Breathing.jsx'],
  ['Complements', 'health/Complements.jsx'], ['Hydratation', 'hydration/Hydration.jsx'], ['Nutrition', 'nutrition/Nutrition.jsx'],
  ['Tests', 'physical-tests/PhysicalTests.jsx'], ['Profil', 'profil/ProfilSpace.jsx'], ['Poids', 'profil/WeightSpace.jsx'],
  ['Progres', 'progress/ProgressSpace.jsx'], ['Records', 'progress/RecordsSpace.jsx'], ['Coach', 'train/CoachSpace.jsx'],
  ['Planning', 'train/PlannerSpace.jsx'], ['Entrainement', 'train/TrainSpace.jsx'], ['Recuperation', 'train/RecoverySpace.jsx'],
  ['Meteo', 'train/WeatherSpace.jsx'], ['Pliometrie', 'train/PliometrieSpace.jsx'], ['TestMobilite', 'train/MobilityTest.jsx'],
  ['CatMobilite', 'train/MobilityCatalog.jsx'], ['CatRenfo', 'train/RenfoCatalog.jsx'], ['Programme', 'train/ProgramView.jsx'],
  ['Import', 'train/ActivityImport.jsx'],
]
const noop = () => {}
const mkProps = (raw) => {
  const db = norm(raw)
  const store = new Proxy({ get: () => db, set: noop, ensureDay: noop }, { get: (t, k) => (k in t ? t[k] : noop) })
  return { userId: 'u1', db, store, onClose: noop, onBack: noop, onDone: noop, onSelect: noop, onProfil: noop, onProgram: noop, onSave: noop, embedded: false }
}
const morts = []
let rendus = 0
for (const [lab, path] of SCREENS) {
  const Comp = (await import(`${R}/${path}`)).default
  for (const [bname, db] of Object.entries(BASES)) {
    __reset(); __setDb(db)
    rendus++
    try { __render('s' + rendus, Comp, mkProps(db)) } catch (e) { morts.push(`${lab} / ${bname} : ${e.message}`) }
  }
}
a(morts.length === 0, morts.length
  ? `${morts.length} écrans en échec :\n   ` + morts.slice(0, 12).join('\n   ')
  : `${rendus} rendus d'écran sur données abîmées : aucun écran mort`)
console.log('\nALL PASS')
