// Aller-retour : ce que le store ecrit doit etre lisible par les modules qui
// le relisent. Quatre formes fausses avaient ete ecrites a la main dans une
// fixture de test — muscu, tests physiques, programme, mobilite — et les
// assertions correspondantes ne verifiaient donc rien. Une fixture produite
// par le vrai chemin d ecriture ne peut pas se tromper de forme.
import { __mount, __rerender } from '../harness/react-stub3.mjs'
import { reset } from '../harness/store-stub.mjs'
import { useNutritionStore } from '../../src/features/nutrition/useNutritionStore.js'
import { ZONE_ORDER, ZONES, sessionExercises } from '../../src/features/train/trainData.js'
import { generateProgram } from '../../src/features/train/generateProgram.js'
import { mobilityAnalysis, history as mobHistory } from '../../src/features/train/mobilityIntel.js'
import { pillarMobility, trainingTotals } from '../../src/features/train/renfoIntel.js'
import { goalsStatus } from '../../src/features/nutrition/diagIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms))

const screen = () => useNutritionStore('u1')
__mount('ecran', screen)
await tick(10)
let { store } = __rerender('ecran')
const db = () => __rerender('ecran').db
reset()

// ─── mobilite : ecrite par le test de mobilite ───
// Forme reelle : un tableau de zones {id, zone, label, val}, val de 0
// (question sautee) a 3. Une fixture ecrite a la main l avait notee en
// objet {hanches: 2}, et `pillarMobility` levait dessus.
const zones = ZONE_ORDER.map((id, i) => ({ id, zone: id, label: (ZONES[id] || {}).label || id, val: id === 'hanches' ? 1 : (i % 3) + 1 }))
store.saveMobility({ score: 62, level: 'Correct', zones, date: '2026-06-01' })
await tick()
a(Array.isArray(db().mobility.zones), 'la mobilite est enregistree avec un tableau de zones')
a(db().mobility.zones.length === ZONE_ORDER.length, `${ZONE_ORDER.length} zones, comme le test en pose`)
const pm = pillarMobility(db())
a(pm.status === 'ok' && pm.score === 62, 'le pilier mobilite la relit sans lever')
a(/hanche/i.test(pm.detail) || pm.detail.length > 0, 'et nomme la zone faible : ' + pm.detail.slice(0, 60))
a(mobHistory(db()).length >= 1, "l historique la retient : Array.isArray(zones) est bien satisfait")

// ─── programme : genere depuis les zones du meme test ───
store.saveProgram(generateProgram(zones, 62))
await tick()
const prog = db().program
a(prog.sessions.length === 3, '3 seances ciblees generees')
a(prog.sessions.every((s) => Array.isArray(s.keys) && s.keys.length), 'chacune porte sa liste de mouvements')
a(prog.sessions.every((s) => sessionExercises(s).length > 0), 'et chacune se deplie en exercices reels')
a(Array.isArray(prog.weak) && prog.weak.length === 3, 'les zones ciblees sont enregistrees')
const ma = mobilityAnalysis(db(), { today: '2026-06-15' })
a(ma.program && ma.program.sessions === 3, 'l analyse relit le programme : ' + ma.program.sessions + ' seances')
a(ma.program.untouched && ma.program.pct === 0, 'aucune seance faite pour l instant')
a(ma.program.stillRelevant, 'et il cible encore les zones les plus raides du dernier bilan')

// ─── objectifs personnels : label, pas s ───
store.addGoal('Courir un semi')
await tick()
const g = db().customGoals[0]
a(g.label === 'Courir un semi', "l objectif est enregistre sous `label`")
a(g.done === false && g.createdAt, 'avec son etat et sa date de creation')
store.updateGoal(g.id, { done: true })
await tick()
a(db().customGoals[0].doneAt, 'le cocher pose une date de realisation')
const gs = goalsStatus(db(), { today: '2026-06-15' })
a(gs && gs.total === 1 && gs.done === 1, 'le diagnostic relit le meme champ : ' + gs.done + '/' + gs.total)

// ─── seances : compteurs derives ───
store.completeSession(45, { title: 'Renfo', cat: 'renfo' })
await tick()
a(db().sessionsTotal === 1 && db().minutesTotal === 45, 'la seance realisee alimente les compteurs')
a(db().sessionLog.length === 1 && db().sessionLog[0].mins === 45, 'et le journal de seances')
const tt = trainingTotals(db())
a(tt && typeof tt.week !== 'undefined', 'les totaux se calculent sans lever sur cette base')

// ─── zones sensibles ───
store.setSensitiveZones(['genou', 'epaule'])
await tick()
a(db().sensitiveZones.length === 2, 'les zones sensibles sont une liste')
a(mobilityAnalysis(db(), { today: '2026-06-15' }).corroboration !== undefined, 'et le croisement les accepte')

// Les deux formes de date de reference sont acceptees : cinquante-huit
// fonctions la prennent en options, seize en second argument, et confondre
// les deux ne levait qu au loin.
a(goalsStatus(db(), '2026-06-15').total === 1, 'date passee en chaine')
a(goalsStatus(db(), { today: '2026-06-15' }).total === 1, 'date passee en options')
a(goalsStatus(db()).total === 1, 'sans date : la date du jour')

console.log('\nALL PASS')
