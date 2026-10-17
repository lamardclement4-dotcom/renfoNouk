// Oxygene sanguin : du depot de la montre (ou de l export Sante) a la
// moyenne de la nuit, a la forme du jour et au bilan Coeur.
import { readFileSync } from 'node:fs'
import { lireDepot } from '../../src/features/health/montre.js'
import { toPatch, createHealthReader, spo2Pct, nuitSpo2, SPO2_TYPE } from '../../src/features/train/healthImport.js'
import { oxygene, bilanCoeur, resumeCoeur } from '../../src/features/health/coeurIntel.js'
import { signauxCorps } from '../../src/features/health/formeContexte.js'
import { formeDuJour } from '../../src/features/health/sommeilForme.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-17'

// ─── Valeurs et nuit ───
a(spo2Pct('0.97') === 97 && spo2Pct('97') === 97 && spo2Pct('96,5') === 96.5 && spo2Pct('1') === 100, 'fraction (export Sante) ou pourcentage (Raccourcis)')
a(spo2Pct('45') === null && spo2Pct('') === null && spo2Pct('abc') === null, 'valeur absurde ecartee')
a(nuitSpo2('2026-10-16 23:40:00 +0200') === '2026-10-17' && nuitSpo2('2026-10-17 04:10:00 +0200') === '2026-10-17', 'mesures de la nuit rangees au jour du reveil')
a(nuitSpo2('2026-10-17 15:00:00 +0200') === null && nuitSpo2('2026-10-17 11:59:00 +0200') === '2026-10-17', 'l apres-midi ne compte pas, la grasse matinee si')

// ─── Depot du Raccourci ───
const depot = [
  'spo2;16 oct. 2026 à 23:30;97 %',
  'spo2;17 oct. 2026 à 01:10;0,95',
  'spo2;17 oct. 2026 à 03:00;88',
  'spo2;17 oct. 2026 à 04:20;89',
  'spo2;17 oct. 2026 à 06:00;96',
  'spo2;17 oct. 2026 à 14:00;99',
  'spo2;17 oct. 2026 à 05:00;12',
].join('\n')
const r = lireDepot(depot)
a(r.lues === 6 && r.ecartees === 1, `6 lignes lues, la valeur absurde ecartee (${r.lues}/${r.ecartees})`)
a(r.spo2[J] === 93 && r.spo2N[J] === 5 && r.spo2Min[J] === 88 && r.spo2Bas[J] === 2, `nuit : moyenne ${r.spo2[J]}, ${r.spo2N[J]} mesures, plus basse ${r.spo2Min[J]}, ${r.spo2Bas[J]} sous 90`)

// ─── Export Sante (XML, fraction) ───
const lec = createHealthReader()
lec.line(`<Record type="${SPO2_TYPE}" sourceName="Apple Watch" unit="%" startDate="2026-10-16 02:00:00 +0200" endDate="2026-10-16 02:00:00 +0200" value="0.98"/>`)
lec.line(`<Record type="${SPO2_TYPE}" sourceName="Apple Watch" unit="%" startDate="2026-10-16 03:00:00 +0200" endDate="2026-10-16 03:00:00 +0200" value="0.96"/>`)
a(lec.result().spo2['2026-10-16'] === 97, 'export Sante : 0.98 et 0.96 -> 97 %')

// ─── Rangement : un envoi plus complet remplace, un envoi partiel non ───
const { patch } = toPatch(r, { sleepLog: {}, vitalsLog: {}, planningSessions: [] }, { source: 'montre' })
const e = patch.vitalsLog[J]
a(e.spo2 === 93 && e.spo2N === 5 && e.spo2Min === 88 && e.spo2Bas === 2, 'les quatre chiffres de la nuit sont ranges ensemble')
const partiel = lireDepot('spo2;17 oct. 2026 à 06:30;99')
const p2 = toPatch(partiel, { sleepLog: {}, vitalsLog: patch.vitalsLog, planningSessions: [] }, { source: 'montre' }).patch
a(p2.vitalsLog[J].spo2 === 93 && p2.vitalsLog[J].spo2Min === 88, 'un envoi qui voit moins de mesures ne remplace pas la nuit complete')

// ─── Analyse : normale, baisse, chutes repetees ───
const vit = {}
for (let k = 1; k < 30; k++) vit[decaler(J, -k)] = { spo2: 97, spo2N: 10, spo2Min: 95, spo2Bas: 0 }
vit[J] = { spo2: 94.6, spo2N: 9, spo2Min: 92, spo2Bas: 0 }
const o = oxygene({ vitalsLog: vit }, J)
a(o.source === 'montre' && o.normale === 97 && o.ecart === 2.4 && o.statut === 'baisse', `baisse de ${o.ecart} point sous la normale : signalee`)
a(/rhume|nez bouché/.test(o.texte), 'avec les causes courantes, sans alarmer')
const b = bilanCoeur({ vitalsLog: vit }, J)
a(b.alertes.some((x) => /Oxygène la nuit à 94,6 %/.test(x)), 'le bilan Coeur le dit : ' + b.alertes.join(' | '))

const vit2 = { ...vit }
for (const k of [0, 2, 5, 9]) vit2[decaler(J, -k)] = { spo2: 95, spo2N: 10, spo2Min: 86, spo2Bas: 3 }
const o2 = oxygene({ vitalsLog: vit2 }, J)
a(o2.statut === 'repete' && o2.nuitsBasses === 4 && /médecin/.test(o2.texte) && /apnée/.test(o2.texte), '4 nuits avec chutes sur 14 : conseil d en parler a un medecin')
a(o2.marques.length === 4, 'les nuits avec chutes sont marquees sur la courbe')
const vit3 = { ...vit, [J]: { spo2: 97.2, spo2N: 8, spo2Min: 89, spo2Bas: 1 } }
a(oxygene({ vitalsLog: vit3 }, J).statut === 'normal', 'une seule mesure sous 90 % (bracelet ?) : pas d alerte')

// Saisie ponctuelle seule : pas melangee aux nuits
const saisi = { sleepLog: { [J]: { spo2: 98 } } }
const os = oxygene(saisi, J)
a(os.source === 'saisie' && os.derniere.v === 98 && os.statut === 'normal', 'mesure ponctuelle saisie : lue a part')
a(oxygene({}, J) === null && resumeCoeur({}, J).o2 === null, 'sans mesure : rien')

// ─── Forme du jour ───
const sig = signauxCorps({ vitalsLog: vit }, J)
a(sig.spo2.valeur === 94.6 && sig.spo2.normale === 97, 'signaux du corps : oxygene de la nuit et normale')
const log = { [J]: { hours: 7.5, quality: 4 } }
for (let k = 1; k < 8; k++) log[decaler(J, -k)] = { hours: 7.5, quality: 4 }
const f = formeDuJour(log, J, { signaux: sig })
const aj = f.ajustements.find((x) => x.id === 'spo2')
a(aj && aj.pts === -3 && /2,4 points sous ta normale \(97 %\)/.test(aj.texte), 'forme : -3 pour 2,4 points sous la normale (' + (aj && aj.texte) + ')')
const fBas = formeDuJour(log, J, { signaux: signauxCorps({ vitalsLog: { ...vit, [J]: { spo2: 91, spo2N: 9, spo2Min: 87, spo2Bas: 4 } } }, J) })
const ajBas = fBas.ajustements.find((x) => x.id === 'spo2')
a(ajBas.pts === -6 && /4 mesures sous 90 %/.test(ajBas.texte) && /pas d’intensité/.test(fBas.consigne), 'forme : 91 % -> -6, et pas d intensite aujourd hui')

// ─── Migration 0010 ───
const sql = readFileSync(new URL('../../supabase/migrations/0010_montre_oxygene.sql', import.meta.url), 'utf8')
a(/drop function if exists deposer_signaux_montre\(text(, jsonb){9}\)/.test(sql), 'l ancienne version (10 parametres) est retiree : pas d appel ambigu')
a(/spo2_dates jsonb default null, spo2 jsonb default null/.test(sql), 'oxygene facultatif : le raccourci version 4 marche toujours')
a(/grant execute on function deposer_signaux_montre\(text(, jsonb){11}\) to anon, authenticated;/.test(sql) && !/to public/.test(sql), 'droits poses explicitement')
console.log('\nALL PASS')
