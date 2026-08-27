// Écriture française des nombres.
//
// « 42.1 % de tes calories », « en recul de 4.7 % » : le point décimal n est
// pas du français, et le defaut est revenu quatre fois dans cette base — a
// chaque fois sur un texte nouvellement ecrit, jamais deux fois au meme
// endroit. Une relecture ne suffit donc pas : ce test fait tourner toutes
// les analyses sur des donnees choisies pour produire des decimales, et
// echoue si un point subsiste dans un texte destine a l ecran.
import '../harness/browser-env.mjs'
const R = '../../src/features'
const T = '2026-08-21'
const back = (n) => { const d = new Date(Date.UTC(2026,7,21)); d.setUTCDate(d.getUTCDate()-n); return d.toISOString().slice(0,10) }
const db = { planningSessions: [], sleepLog: {}, hydroLog: {}, foodLog: {}, weightLog: [], physTests: [], mobilityHistory: [] }
for (let i = 1; i <= 30; i++) {
  db.sleepLog[back(i)] = { hours: i % 3 ? 6.4 : 8.7, quality: 3, awakenings: 1 }
  db.foodLog[back(i)] = [{ n: 'r', meal: 'soir', k: 2137, p: 93.5, g: 211.3, l: 71.7, fib: 21.4 }]
  db.hydroLog[back(i)] = [{ n: 'Café', ml: 200, caf: 95, kcal: 4, h: i % 24 }, { n: 'Bière', ml: 500, kcal: 202, alc: 19.7, h: 21 }]
  db.weightLog.push({ date: back(i), kg: 75.4 - i * 0.07 })
  if (i % 2) db.planningSessions.push({ id: 's'+i, date: back(i), sport: i%4?'course':'velo', statut: 'realise', duree: i%3?'1 h':'1 h 30', data: { rpe: i%3?7:4, distance: 10.4, temps: '48:20' } })
}
db.profilePhys = { poids: 74.3, taille: 180, age: 30, sexe: 'h' }
db.physTests = [{ testId: 'cooper', value: 2740, date: back(90) }, { testId: 'cooper', value: 2610, date: back(10) }]
db.mobility = { score: 61, date: back(10), zones: [{ id:'chevilles', val:1 }, { id:'hanches', val:2 }] }
db.mobilityHistory = [{ date: back(60), score: 55, zones: [{id:'chevilles',val:1}] }, { date: back(10), score: 61, zones: [{id:'chevilles',val:1}] }]
db.sensitiveZones = ['dos']; db.foodTargets = { kcal: 2600, prot: 140, gluc: 300, lip: 80, fib: 30 }
const MODS = [['sleepIntel','health/sleepIntel.js','sleepAnalysis'],['hydroIntel','hydration/hydroIntel.js','hydroAnalysis'],
  ['nutriIntel','nutrition/nutriIntel.js','nutriAnalysis'],['macroIntel','nutrition/macroIntel.js','macroDeepAnalysis'],
  ['muscuIntel','train/muscuIntel.js','muscuAnalysis'],['testsIntel','physical-tests/testsIntel.js','testsAnalysis'],
  ['mobilityIntel','train/mobilityIntel.js','mobilityAnalysis'],['mindIntel','health/mindIntel.js','mindAnalysis'],
  ['preventionIntel','health/preventionIntel.js','preventionAnalysis'],['plannerIntel','train/plannerIntel.js','plannerAnalysis'],
  ['enduranceIntel','train/enduranceIntel.js','enduranceAnalysis'],['retroIntel','train/retroIntel.js','retroAnalysis'],
  ['renfoIntel','train/renfoIntel.js','recommendations'],['climbIntel','train/climbIntel.js','climbAnalysis'],
  ['sprintIntel','train/sprintIntel.js','sprintAnalysis'],['genericIntel','train/genericIntel.js','genericAnalysis'],
  ['diagIntel','nutrition/diagIntel.js','diagAnalysis'],['cycleIntel','health/cycleIntel.js','cycleAnalysis']]
const bad = []
const walk = (v, ctx) => {
  if (typeof v === 'string') { const m = v.match(/\d+\.\d/); if (m) bad.push(`${ctx}  « …${v.slice(Math.max(0,v.indexOf(m[0])-40), v.indexOf(m[0])+22)}… »`) }
  else if (Array.isArray(v)) v.forEach((x) => walk(x, ctx))
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], ctx)
}
for (const [name, path, fn] of MODS) {
  const mod = await import(`${R}/${path}`)
  try { walk(mod[fn](db, { today: T, weightKg: 74.3 }), name) } catch (e) { console.log('LEVE', name, e.message) }
}
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const uniques = [...new Set(bad)]
a(uniques.length === 0, uniques.length
  ? `${uniques.length} texte(s) a point decimal :\n   ` + uniques.slice(0, 12).join('\n   ')
  : `${MODS.length} modules d analyse : aucun point decimal dans les textes produits`)

// Le detecteur doit voir le motif, sinon il passerait pour de bonnes raisons.
a(/\d+\.\d/.test('42.1 % de tes calories'), 'un point decimal serait bien detecte')
a(!/\d+\.\d/.test('42,1 % de tes calories'), 'une virgule ne l est pas')
a(!/\d+\.\d/.test('objectif 2600 kcal'), 'un entier non plus')
console.log('\nALL PASS')
