import { generateProgram } from '../../src/features/train/generateProgram.js'
// Rendu reel des ecrans : une variable non declaree, un champ lu sur un objet
// absent ou un appel qui leve font echouer ce test. C est le plus proche d une
// verification visuelle que l on puisse faire sans navigateur.
import { __render, __reset, __setState } from '../harness/react-stub4.mjs'
import { __setDb } from '../harness/store-hook-stub.mjs'
import RecordsSpace from '../../src/features/progress/RecordsSpace.jsx'
import ProgressSpace from '../../src/features/progress/ProgressSpace.jsx'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const T = '2026-06-15'
const back = (n) => { const [y,m,d]=T.split('-').map(Number); const x=new Date(Date.UTC(y,m-1,d)); x.setUTCDate(x.getUTCDate()-n); return x.toISOString().slice(0,10) }

// tout le texte de l arbre rendu, pour verifier que l ecran affiche vraiment
const text = (n) => {
  if (n == null || n === false) return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(text).join(' ')
  return text(n.children)
}
const render = (Comp, id) => __render(id, Comp, { userId: 'u1', onClose: () => {} })

const S = (off, sport, data, extra) => ({ id: sport+off, date: back(off), sport, statut: 'realise', duree: '1 h', data, ...(extra||{}) })
const ZVALS = [['hanches',1],['epaules',1],['core',2],['post',2],['nuque',3],['chevilles',3],['thoracique',3],['flechisseurs',3],['equilibre',3]]
const PROGRAM = { ...generateProgram(ZVALS.map(([id, val]) => ({ id, val })), 55), date: back(40) }
const ZONE_IDS = ['post', 'hanches', 'flechisseurs', 'thoracique', 'epaules', 'nuque', 'chevilles', 'core', 'equilibre']
const MOB_ZONES = (hipVal) => ZONE_IDS.map((id, i) => ({ id, zone: id, label: id, val: id === 'hanches' ? hipVal : (i % 3) + 1 }))
const RICH = {
  planningSessions: [
    S(30, 'course', { distance: 10, temps: '43:20', dplus: 40, cadence: 176 }),
    S(12, 'course', { distance: 21.1, temps: '1:38:00', dplus: 120 }),
    S(20, 'velo', { distance: 25, temps: '40:00', puissance: 235, cadence: 88, denivele: 150 }),
    S(18, 'velo', { distance: 60, temps: '2:00:00', puissance: 190, denivele: 600 }),
    S(9, 'natation', { distance: 1500, temps: '28:00', nage: 'crawl' }),
    S(8, 'natation', { distance: 400, temps: '7:00', nage: 'crawl' }),
    S(7, 'natation', { distance: 200, temps: '3:20', nage: 'brasse' }),
    S(6, 'natation', { distance: 800, temps: '14:30', nage: 'crawl' }),
    S(15, 'sprint', { perfs: [{ epreuve: '100', temps: '11.20', vent: 0.9, depart: 'blocs', reaction: 0.18 }] }),
    S(5, 'sprint', { perfs: [{ epreuve: '200', temps: '22.60', vent: 1.1 }] }),
    S(10, 'escalade', { ascents: [
      { grade: '7a', style: 'travail', scale: 'voie', angle: 'devers', lieu: 'salle', prises: ['reglette'] },
      { grade: '6c', style: 'avue', scale: 'voie', angle: 'dalle', lieu: 'falaise', prises: ['bac'] },
      { grade: '6B', style: 'flash', scale: 'bloc', angle: 'devers', lieu: 'salle', prises: ['bac'] },
    ] }),
    S(4, 'football', { buts: 2, passes: 1, minutes: 90, rpe: 7 }),
    S(3, 'golf', { score: 88, parcours: 18 }),
    { id: 'm1', date: back(30), sport: 'muscu', statut: 'realise', duree: '1 h', exercises: [
      { name: 'Développé couché', sets: [{ charge: 80, reps: 8, rpe: 7 }, { charge: 85, reps: 6, rpe: 8 }] },
      { name: 'Squat', sets: [{ charge: 100, reps: 5, rpe: 8 }] }] },
    { id: 'm2', date: back(10), sport: 'muscu', statut: 'realise', duree: '1 h', exercises: [
      { name: 'Développé couché', sets: [{ charge: 85, reps: 8, rpe: 7 }, { charge: 90, reps: 5, rpe: 9 }] },
      { name: 'Squat', sets: [{ charge: 110, reps: 5, rpe: 8 }] }] },
  ],
  physTests: [
    { testId: 'cooper', value: 2600, date: back(120) }, { testId: 'cooper', value: 2750, date: back(20) },
    { testId: 'squat30', value: 28, date: back(120) }, { testId: 'squat30', value: 31, date: back(20) },
    { testId: 'push30', value: 24, date: back(120) }, { testId: 'push30', value: 26, date: back(20) },
    { testId: 'gai_max', value: 120, date: back(120) }, { testId: 'gai_max', value: 95, date: back(20) },
  ],
  weightLog: [{ date: back(60), kg: 74.5 }, { date: back(30), kg: 73.8 }, { date: back(2), kg: 73.1 }],
  profilePhys: { poids: 73, taille: 178, age: 30, sexe: 'h' },
  // Forme reelle produite par le test de mobilite : un tableau de zones,
  // val de 0 (question sautee) a 3 (souple).
  mobility: { score: 68, level: 'Correct', date: back(5), zones: MOB_ZONES(3) },
  mobilityHistory: [
    { date: back(40), score: 62, zones: MOB_ZONES(1) },
    { date: back(20), score: 65, zones: MOB_ZONES(1) },
    { date: back(5), score: 68, zones: MOB_ZONES(3) },
  ],
  program: PROGRAM,
  suppPlan: ['vitd'], suppTaken: {},
}

for (const [label, db] of [['db vide', {}], ['db riche', RICH]]) {
  __reset(); __setDb(db)
  let out = null
  try { out = render(RecordsSpace, 'rec') } catch (e) { throw new Error('FAIL: RecordsSpace leve sur ' + label + ' -> ' + e.message + '\n' + (e.stack||'').split('\n').slice(1,4).join('\n')) }
  a(out, 'RecordsSpace rend un arbre (' + label + ')')
  __reset(); __setDb(db)
  try { out = render(ProgressSpace, 'prog') } catch (e) { throw new Error('FAIL: ProgressSpace leve sur ' + label + ' -> ' + e.message + '\n' + (e.stack||'').split('\n').slice(1,4).join('\n')) }
  a(out, 'ProgressSpace rend un arbre (' + label + ')')
}

// contenu reellement affiche
__reset(); __setDb(RICH)
const pt = text(render(ProgressSpace, 'prog'))
a(/Records personnels/.test(pt), 'le bloc Records personnels est affiche')
a(/Tout voir/.test(pt), 'et son entree vers l ecran complet')
a(/Entra[îi]nement/.test(pt), 'le bloc Entrainement est revenu')
a(/Programme correctif/.test(pt), 'le bloc Programme correctif aussi')
a(/Compl[ée]ments/.test(pt), 'et le bloc Complements')
// les quatre onglets, pas seulement celui par defaut
__reset(); __setDb(RICH)
render(RecordsSpace, 'rec')
for (const [tab, attendu] of [['endurance', /Course [àa] pied/], ['perf', /100 m|escalade|bloc|7a/i], ['force', /D[ée]velopp[ée] couch[ée]/], ['autres', /Football|Golf|buts|score/i]]) {
  __setState('rec', 0, tab)
  let out = null
  try { out = render(RecordsSpace, 'rec') } catch (e) { throw new Error('FAIL: onglet ' + tab + ' leve -> ' + e.message) }
  const s = text(out)
  a(s.length > 120, 'onglet ' + tab + ' : ' + s.length + ' caracteres rendus')
  a(attendu.test(s), 'onglet ' + tab + ' affiche bien ses records')
}
// et le velo, qui n apparaissait pas avec une sortie trop longue pour la puissance seuil
__setState('rec', 0, 'endurance')
a(/Puissance seuil|V[ée]lo|W\b/.test(text(render(RecordsSpace, 'rec'))), 'le velo apparait dans l onglet endurance')
console.log('\nALL PASS')
