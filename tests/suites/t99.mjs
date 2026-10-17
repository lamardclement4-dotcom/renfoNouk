// Apple Watch, troisieme envoi : temperature au poignet, VO2max de la
// montre, recuperation cardiaque, FC de marche, pesees, pleine conscience,
// et les blocs d exercice qui proposent la seance a noter.
import { readFileSync } from 'node:fs'
import { lireDepot } from '../../src/features/health/montre.js'
import { toPatch, tempC, poidsKg } from '../../src/features/train/healthImport.js'
import { temperature, hausseThermique, vo2Montre, niveauVo2, recuperation, fcMarche, bilanCoeur, resumeCoeur } from '../../src/features/health/coeurIntel.js'
import { signauxCorps } from '../../src/features/health/formeContexte.js'
import { formeDuJour } from '../../src/features/health/sommeilForme.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-17'

// ─── Unites ───
a(tempC('36,12') === 36.12 && tempC('97,0') === 36.11 && tempC('20') === null, 'temperature en °C, °F convertie, absurde ecartee')
a(poidsKg('72,4', 'kg') === 72.4 && poidsKg('160', 'lb') === 72.6 && poidsKg('12', 'kg') === null, 'poids en kg, livres converties')

// ─── Depot du raccourci ───
const depot = [
  'temp;16 oct. 2026 à 23:40;36,12',
  'vo2;15 oct. 2026 à 18:30;47,3',
  'hrr;15 oct. 2026 à 19:05;31',
  'hrr;15 oct. 2026 à 07:40;27',
  'marche;16 oct. 2026 à 00:00;98',
  'poids;17 oct. 2026 à 07:10;72,4;kg',
  'poids;16 oct. 2026 à 07:05;160;lb',
  'zen;16 oct. 2026 à 21:00;16 oct. 2026 à 21:10',
  'zen;16 oct. 2026 à 07:00;16 oct. 2026 à 07:05',
  'exo;16 oct. 2026 à 18:02;16 oct. 2026 à 18:03;1',
  ...Array.from({ length: 40 }, (_, i) => { const m = 3 + i; return `exo;16 oct. 2026 à 18:${String(m).padStart(2, '0')};16 oct. 2026 à 18:${String(m + 1).padStart(2, '0')};1` }),
  'exo;16 oct. 2026 à 12:00;16 oct. 2026 à 12:01;1',
].join('\n')
const r = lireDepot(depot)
a(r.ecartees === 0, 'toutes les lignes lues (' + r.lues + ')')
a(r.temp[J] === 36.12, 'temperature de 23:40 rangee a la nuit du 17')
a(r.vo2['2026-10-15'] === 47.3 && r.hrr['2026-10-15'] === 29 && r.hrrN['2026-10-15'] === 2 && r.marche['2026-10-16'] === 98, 'VO2max, recuperation (moyenne de 2 seances), FC de marche')
a(r.poids[J] === 72.4 && r.poids['2026-10-16'] === 72.6, 'pesees : kg et livres')
a(r.zenMin['2026-10-16'] === 15 && r.zenN['2026-10-16'] === 2, 'pleine conscience : 15 min en 2 seances')
a(r.exoMin['2026-10-16'] === 42, 'minutes d exercice toujours sommees')
const bl = r.exoBlocs['2026-10-16']
a(bl.length === 1 && bl[0].debut === '18:02' && bl[0].fin === '18:43' && bl[0].min === 41, `bloc d exercice : ${bl[0].debut}–${bl[0].fin}, ${bl[0].min} min (la minute isolee de midi ecartee)`)

// ─── Rangement ───
const db0 = { sleepLog: {}, vitalsLog: {}, planningSessions: [], weightLog: [{ date: '2026-10-16', kg: 71.9 }], profilePhys: { poids: 71.9, age: 32 } }
const { patch, summary } = toPatch(r, db0, { source: 'montre' })
a(patch.vitalsLog[J].temp === 36.12 && patch.vitalsLog['2026-10-15'].vo2 === 47.3 && patch.vitalsLog['2026-10-15'].hrrN === 2, 'mesures rangees par jour')
a(patch.vitalsLog['2026-10-16'].zenMin === 15 && patch.vitalsLog['2026-10-16'].exoBlocs.length === 1, 'pleine conscience et blocs ranges')
a(summary.weightAdded === 1 && patch.weightLog.length === 2 && patch.weightLog.find((e) => e.date === '2026-10-16').kg === 71.9, 'pesee notee dans Renfo jamais remplacee, la nouvelle ajoutee')
a(patch.profilePhys && patch.profilePhys.poids === 72.4 && patch.profilePhys.age === 32, 'la pesee la plus recente fait le poids du profil')
const partiel = lireDepot('exo;16 oct. 2026 à 18:02;16 oct. 2026 à 18:20;18')
const p2 = toPatch(partiel, { ...db0, vitalsLog: patch.vitalsLog }, { source: 'montre' }).patch
a(p2.vitalsLog['2026-10-16'].exoBlocs[0].min === 41, 'un envoi qui voit moins d exercice ne remplace pas les blocs')
const sansPoids = toPatch(lireDepot('vo2;15 oct. 2026 à 18:30;47'), db0, {}).patch
a(!('weightLog' in sansPoids) && !('profilePhys' in sansPoids), 'sans pesee : ni poids ni profil touches')

// ─── Temperature : normale, ecart, forme ───
const vit = {}
for (let k = 1; k < 30; k++) vit[decaler(J, -k)] = { temp: 35.9 + (k % 3) * 0.05 }
vit[J] = { temp: 36.65 }
const tp = temperature({ vitalsLog: vit }, J)
a(tp.normale === 35.95 && tp.ecart === 0.7 && tp.statut === 'haute' && /rhume|alcool/.test(tp.texte), `+${tp.ecart} °C : signale avec les causes courantes`)
a(temperature({ vitalsLog: { ...vit, [J]: { temp: 37.1 } } }, J).statut === 'fievre', '+1 °C et plus : ressemble a de la fievre')
a(bilanCoeur({ vitalsLog: vit }, J).alertes.some((x) => /Température de nuit \+0,7 °C/.test(x)), 'bilan Coeur : alerte temperature')
const log = {}
for (let k = 0; k < 8; k++) log[decaler(J, -k)] = { hours: 7.5, quality: 4 }
const aj = formeDuJour(log, J, { signaux: signauxCorps({ vitalsLog: vit }, J) }).ajustements.find((x) => x.id === 'temp')
a(aj && aj.pts === -4 && /\+0,7 °C sur ta normale/.test(aj.texte), 'forme : -4 a +0,7 °C (' + (aj && aj.texte) + ')')

// ─── Cycle : hausse thermique (trois au-dessus de six) ───
const vc = {}
const debut = '2026-09-28'
for (let i = 0; i < 20; i++) vc[decaler(debut, i)] = { temp: i < 13 ? 35.8 + (i % 2) * 0.05 : 36.15 + (i % 2) * 0.03 }
const hz = hausseThermique({ vitalsLog: vc }, debut, J)
a(hz.hausse === decaler(debut, 13) && hz.ovulation === decaler(debut, 12) && hz.ecart >= 0.3, `hausse le ${hz.hausse} (+${hz.ecart} °C), ovulation vers le ${hz.ovulation}`)
const plat = {}
for (let i = 0; i < 15; i++) plat[decaler(debut, i)] = { temp: 35.9 + (i % 3) * 0.04 }
a(hausseThermique({ vitalsLog: plat }, debut, J).hausse === null, 'temperature plate : pas de hausse inventee')
a(hausseThermique({}, debut, J) === null, 'sans montre : rien')

// ─── VO2max de la montre, recuperation, marche ───
const vv = {}
for (const [k, v] of [[100, 44], [80, 44.6], [20, 46.8], [3, 47.3]]) vv[decaler(J, -k)] = { vo2: v }
const vm = vo2Montre({ vitalsLog: vv }, J)
a(vm.valeur === 47.3 && vm.evolution === 2.8, `VO2max montre ${vm.valeur}, +${vm.evolution} en deux mois`)
a(niveauVo2(47.3, { profilePhys: { age: 32, sexe: 'h' } }) === 'Bien' && niveauVo2(47.3, { profilePhys: {} }) === null, 'niveau avec les normes Cooper (age, sexe), rien sans profil')
const rc0 = {}
for (let k = 3; k < 30; k += 3) rc0[decaler(J, -k)] = { hrr: 30 }
rc0[decaler(J, -1)] = { hrr: 19 }
const rc = recuperation({ vitalsLog: rc0 }, J)
a(rc.lente && rc.normale === 30 && /11 de moins que d’habitude/.test(rc.texte), 'recuperation plus lente que d habitude : signalee')
a(bilanCoeur({ vitalsLog: rc0 }, J).alertes.some((x) => /Récupération après ta séance/.test(x)), 'bilan : recuperation lente')
const mm = {}
for (let k = 0; k < 120; k++) mm[decaler(J, -k)] = { marche: k < 30 ? 96 : 101 }
const fmv = fcMarche({ vitalsLog: mm }, J)
a(fmv.m30 === 96 && fmv.evolution === -5, 'FC de marche : 96 sur 30 jours, -5 en deux mois')

// ─── Quelle VO2max fait foi ───
const tous = { vitalsLog: vv, profilePhys: { age: 32, sexe: 'h' }, physTests: [{ testId: 'cooper', date: '2026-01-10', value: 2600 }] }
const rv = resumeCoeur(tous, J).vo2
a(rv.source === 'montre' && rv.valeur === 47.3 && rv.niveau === 'Bien', 'test de plus de six mois : la montre passe devant')
const recent = { ...tous, physTests: [{ testId: 'cooper', date: '2026-09-20', value: 2600 }] }
a(resumeCoeur(recent, J).vo2.source === 'test', 'test recent : il passe devant la montre')

// ─── Migration 0011 ───
const sql = readFileSync(new URL('../../supabase/migrations/0011_montre_activite.sql', import.meta.url), 'utf8')
a(/create or replace function deposer_activite_montre\(/.test(sql) && /returns "text\/plain"/.test(sql), 'troisieme porte, reponse en texte simple')
a(/grant execute on function deposer_activite_montre\(text(, jsonb){13}\) to anon, authenticated;/.test(sql) && /perform deposer_mesures_montre\(jeton, propre\)/.test(sql), 'meme controle de cle et quota que les autres envois')
// Le raccourci envoie ce troisieme lot apres les deux autres.
const py = readFileSync(new URL('../../outils/raccourci/construire_raccourci.py', import.meta.url), 'utf8')
const iSig = py.indexOf('envoi("signaux"'), iAct = py.indexOf('envoi("activite"')
a(iSig > 0 && iAct > iSig && ['Sleep Wrist Temperature', 'VO2 Max', 'Heart Rate Recovery, 1 min', 'Walking Heart Rate Average', 'Weight', 'Mindful Session'].every((x) => py.indexOf(`"${x}"`) > iSig), 'raccourci : le troisieme envoi part apres la nuit et les signaux')
console.log('\nALL PASS')
