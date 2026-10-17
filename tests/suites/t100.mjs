// Depuis la montre : « Noter ma seance » et « J ai bu » (raccourcis lances
// au poignet), et les signes vitaux de la nuit face a ta plage habituelle.
import { readFileSync } from 'node:fs'
import { lireDepot, sportMontre, quantiteMl, resumeReleve } from '../../src/features/health/montre.js'
import { toPatch } from '../../src/features/train/healthImport.js'
import { signesVitaux, bilanCoeur } from '../../src/features/health/coeurIntel.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-17'

// ─── Libelles de la montre ───
a(sportMontre('Course') === 'course' && sportMontre('Vélo') === 'velo' && sportMontre('Tennis / padel') === 'raquette' && sportMontre('Cross-training') === 'crossfit', 'sports de la montre -> calendrier')
a(sportMontre('Curling') === null, 'sport inconnu : ecarte plutot que devine')
a(quantiteMl('500 ml (une gourde)') === 500 && quantiteMl('1 L') === 1000 && quantiteMl('0,75 l') === 750 && quantiteMl('33 cl') === 330, 'quantites : ml, L, cl')
a(quantiteMl('5 L') === null && quantiteMl('beaucoup') === null, 'quantite absurde ecartee')

// ─── Depot ───
const depot = [
  'seance;17 oct. 2026 à 18:47;Course;45;7 · dur',
  'seance;17 oct. 2026 à 07:30;Natation;30;4 · modéré',
  'seance;17 oct. 2026 à 08:00;Curling;30;5 · moyen',
  'eau;17 oct. 2026 à 10:15;500 ml (une gourde)',
  'eau;17 oct. 2026 à 15:02;1 L',
].join('\n')
const r = lireDepot(depot)
a(r.lues === 4 && r.ecartees === 1, `4 lignes lues, le sport inconnu ecarte (${r.lues}/${r.ecartees})`)
const c = r.seancesMontre[0]
a(c.date === J && c.heure === '18:02' && c.sport === 'course' && c.min === 45 && c.rpe === 7, 'seance : debut = fin - duree (18:02), effort 7')
a(r.eauMontre.length === 2 && r.eauMontre[0].ml === 500 && r.eauMontre[0].heure === '10:15', 'eau : quantite et heure')

// ─── Rangement ───
const db = { sleepLog: {}, vitalsLog: {}, planningSessions: [{ id: 'x', date: J, heure: '07:00', sport: 'natation', statut: 'realise', duree: '30 min', data: {} }], hydroLog: { [J]: [{ id: 'd1', ml: 250 }] } }
const { patch, summary } = toPatch(r, db, { source: 'montre' })
const nouvelle = patch.planningSessions.find((s) => s.source === 'montre')
a(summary.seancesMontre === 1 && nouvelle.sport === 'course' && nouvelle.statut === 'realise' && nouvelle.duree === '45 min' && nouvelle.data.rpe === 7, 'seance de course ajoutee, realisee, avec son effort')
a(patch.planningSessions.filter((s) => s.sport === 'natation').length === 1, 'natation deja notee a 07:00 : pas de doublon (a 15 min pres)')
a(patch.hydroLog[J].length === 3 && patch.hydroLog[J][0].id === 'd1' && summary.eauMontre === 1500, 'eau ajoutee au jour, sans toucher aux boissons notees')
a(patch.hydroLog[J][1].cat === 'eaux' && patch.hydroLog[J][1].ml === 500 && patch.hydroLog[J][1].kcal === 0, 'une entree d eau comme celles d Hydratation')
const encore = toPatch(r, { ...db, planningSessions: patch.planningSessions, hydroLog: patch.hydroLog }, { source: 'montre' })
a(encore.summary.seancesMontre === 0 && !encore.patch.hydroLog, 'le meme depot relu ne double rien')
a(/1 séance notée/.test(resumeReleve(summary)) && /1,5 L d’eau/.test(resumeReleve(summary)), 'releve annonce : ' + resumeReleve(summary))
const sansMontre = toPatch(lireDepot('fc;17 oct. 2026 à 08:00;50'), db, {})
a(!('hydroLog' in sansMontre.patch), 'sans eau de la montre : Hydratation pas touchee')

// ─── Signes vitaux ───
const vit = {}, log = {}
for (let k = 1; k <= 28; k++) {
  const d = decaler(J, -k)
  vit[d] = { restingHr: 55 + (k % 3), hrv: 50 + (k % 5), resp: 14 + (k % 2) * 0.4, spo2: 96.5 + (k % 3) * 0.3, temp: 35.9 + (k % 4) * 0.05 }
  log[d] = { hours: 7.2 + (k % 3) * 0.2 }
}
vit[J] = { restingHr: 56, hrv: 52, resp: 14.2, spo2: 96.8, temp: 35.95 }
log[J] = { hours: 7.4 }
const ok = signesVitaux({ vitalsLog: vit, sleepLog: log }, J)
a(ok.lignes.length === 6 && ok.horsPlage === 0 && /dans ta plage/.test(ok.texte), 'nuit ordinaire : tout dans ta plage')
const pouls = ok.lignes.find((l) => l.id === 'pouls')
a(pouls.bas === 55 && pouls.haut === 57 && pouls.mesures === 28, 'plage : 10e-90e centile des 28 nuits')
const malade = { vitalsLog: { ...vit, [J]: { restingHr: 63, hrv: 38, resp: 16.5, spo2: 96.8, temp: 36.5 } }, sleepLog: log }
const sv = signesVitaux(malade, J)
a(sv.horsPlage === 4 && /4 signes hors de ta plage/.test(sv.texte) && /maladie/.test(sv.texte), '4 signes hors plage : debut de maladie evoque')
a(sv.lignes.find((l) => l.id === 'vfc').hors === 'bas' && sv.lignes.find((l) => l.id === 'temp').hors === 'haut', 'sens de l ecart')
const bruit = { vitalsLog: { ...vit, [J]: { ...vit[J], temp: 36.12 } }, sleepLog: log }
a(signesVitaux(bruit, J).lignes.find((l) => l.id === 'temp').hors === null, 'a peine au-dessus (bruit de mesure) : pas signale')
a(bilanCoeur(malade, J).niveau === 'incomplete', 'bilan : recuperation incomplete')
const deux = { vitalsLog: { ...vit, [J]: { ...vit[J], resp: 16.5, spo2: 94.5 } }, sleepLog: log }
a(bilanCoeur(deux, J).alertes.some((x) => /2 signes vitaux hors de ta plage/.test(x)), 'deux signes hors plage : dit dans le bilan')
a(signesVitaux({}, J) === null, 'sans montre : rien')

// ─── Les raccourcis de la montre ───
for (const [f, nom, ligne] of [['Noter-ma-seance', 'Noter ma séance', 'seance;'], ['J-ai-bu', 'J’ai bu', 'eau;']]) {
  const x = readFileSync(new URL(`../../outils/raccourci/${f}.plist`, import.meta.url), 'utf8')
  a(x.includes(`<string>${nom}</string>`) && x.includes('is.workflow.actions.choosefromlist') && x.includes('deposer_mesures_montre') && x.includes(`<string>${ligne}`) && x.includes('CurrentDate'), `${nom} : choix sur la montre, ligne « ${ligne} » datee, deposee avec la cle`)
  a(!/filter\.health/.test(x), `${nom} : aucune lecture de Sante (marche au poignet)`)
}
console.log('\nALL PASS')
