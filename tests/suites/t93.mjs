// Capture d ecran de sommeil : le texte lu par l OCR devient une nuit.
// Mises en page de Sante (FR, EN), Garmin, Samsung, Fitbit, Oura, Sleep
// Cycle, et textes abimes.
import { lireCaptureSommeil, dureeMinutes, heuresDe, qualiteDuScore, lignesDe, lectureIncomplete, fusionnerCaptures, plageAbimee, valeursDe } from '../../src/features/health/sommeilOcr.js'
import { OCR_REELS } from './t93fixture.mjs'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const voir = (r) => JSON.stringify(r && { total: r.total, coucher: r.coucher, lever: r.lever, phases: r.phases, score: r.score, fc: r.fcRepos, vfc: r.vfc, reveils: r.reveils, lit: r.lit, eff: r.efficacite })

a(dureeMinutes('7 h 32 min') === 452 && dureeMinutes('7h32') === 452 && dureeMinutes('7 hr 32 min') === 452 && dureeMinutes('7h 32m') === 452, 'durees : 7 h 32 sous toutes ses formes')
a(dureeMinutes('58 min') === 58 && dureeMinutes('1 h') === 60 && dureeMinutes('7 hrs 32 mins') === 452, 'minutes seules, heure ronde, pluriels anglais')
a(dureeMinutes('7:32') === null && dureeMinutes('7:32', { deuxPoints: true }) === 452, '« 7:32 » n est une duree que si l etiquette le dit')
a(heuresDe('23:14 – 06:58').join() === '23:14,06:58' && heuresDe('11:14 pm - 6:58 am').join() === '23:14,06:58' && heuresDe('coucher 23h14').join() === '23:14', 'heures d horloge, matin/soir anglais, « 23h14 »')
a(heuresDe('7 h 32 min').length === 0, 'une duree n est pas une heure')
a(lignesDe('7 h 3O min').join() === '7 h 30 min', 'O lu pour 0 dans un nombre : corrige')

// Sante, iOS en francais
const sante = lireCaptureSommeil(`Sommeil
Hier
TEMPS AU LIT
8 h 05 min
TEMPS DE SOMMEIL
7 h 32 min
23:14 – 07:19
Éveillé 12 min
Paradoxal 1 h 35 min
Principal 4 h 59 min
Profond 58 min`)
a(sante.total === 452 && sante.lit === 485 && sante.coucher === '23:14' && sante.lever === '07:19', 'Sante FR : 7 h 32, au lit 8 h 05, 23:14 → 07:19 — ' + voir(sante))
a(sante.phases.profond === 58 && sante.phases.paradoxal === 95 && sante.phases.leger === 299 && sante.phases.eveille === 12, 'Sante FR : les quatre phases')

// Sante, iOS en anglais
const health = lireCaptureSommeil(`Sleep
Time Asleep
6hr 48min
11:42 PM - 6:55 AM
Awake 15 min
REM 1 hr 22 min
Core 4 hr 6 min
Deep 1 hr 20 min`)
a(health.total === 408 && health.coucher === '23:42' && health.lever === '06:55' && health.phases.paradoxal === 82 && health.phases.profond === 80, 'Health EN : 6 h 48, 23:42 → 06:55, phases — ' + voir(health))

// Garmin Connect
const garmin = lireCaptureSommeil(`Score de sommeil
78
Bon
Durée du sommeil 7h 12m
Heure du coucher 23:05
Heure de réveil 06:40
Profond 1h 18m Léger 4h 01m
Paradoxal 1h 35m Éveil 18m
FC au repos 46 bpm
VFC moyenne 58 ms`)
a(garmin.total === 432 && garmin.score === 78 && garmin.coucher === '23:05' && garmin.lever === '06:40', 'Garmin : score 78, 7 h 12, coucher et reveil etiquetes — ' + voir(garmin))
a(garmin.phases.profond === 78 && garmin.phases.leger === 241 && garmin.phases.paradoxal === 95 && garmin.phases.eveille === 18, 'Garmin : phases sur deux colonnes')
a(garmin.fcRepos === 46 && garmin.vfc === 58, 'Garmin : FC au repos et VFC')

// Samsung Health
const samsung = lireCaptureSommeil(`Sommeil
7 h 50 min
Temps de sommeil réel
00:10 - 08:20
Score de sommeil 82
Réveils 3`)
a(samsung.total === 470 && samsung.coucher === '00:10' && samsung.lever === '08:20' && samsung.score === 82 && samsung.reveils === 3, 'Samsung : duree au-dessus de l etiquette, coucher apres minuit, reveils — ' + voir(samsung))

// Oura (anglais) : le score de recuperation n est pas le score de sommeil
const oura = lireCaptureSommeil(`Readiness score 64
Sleep score 81
Total sleep 7h 5m
Time in bed 8h 2m
Efficiency 88 %
Resting heart rate 52 bpm
HRV 41 ms`)
a(oura.score === 81 && oura.total === 425 && oura.lit === 482 && oura.efficacite === 88 && oura.fcRepos === 52 && oura.vfc === 41, 'Oura : score de sommeil (pas de forme), efficacite, FC, HRV — ' + voir(oura))

// Fitbit : pas d etiquette de duree, la somme des phases sert
const fitbit = lireCaptureSommeil(`Mardi 13 oct.
22:58 - 06:31
Éveillé 41 min
Paradoxal 1 h 28 min
Léger 3 h 52 min
Profond 1 h 06 min`)
a(fitbit.total === 386 && fitbit.coucher === '22:58', 'Fitbit : duree = somme des phases (6 h 26) — ' + voir(fitbit))

// Sleep Cycle
const cycle = lireCaptureSommeil(`Qualité de sommeil 74%
Au lit 23:40
Réveil 07:00
Endormi 7 h 01 min`)
a(cycle.score === 74 && cycle.total === 421 && cycle.coucher === '23:40' && cycle.lever === '07:00', 'Sleep Cycle : qualite en %, « au lit 23:40 » = coucher, duree endormi — ' + voir(cycle))

// Garde-fous
const incoherent = lireCaptureSommeil(`Temps de sommeil 8 h 10 min
02:30 - 06:00`)
a(incoherent.total === 490 && incoherent.coucher === null && incoherent.alertes.length === 1, 'heures qui contredisent la duree : ecartees, et dit')
const phaseFausse = lireCaptureSommeil(`Temps de sommeil 6 h 10 min
Profond 9 h 10 min`)
a(phaseFausse.phases.profond === null, 'phase plus longue que la nuit : ecartee')
a(lireCaptureSommeil('Bonjour, rien a voir ici') === null && lireCaptureSommeil('') === null, 'capture sans sommeil : rien d invente')
const bruit = lireCaptureSommeil(`12:47 4G 87%
Temps de sommeil
7 h 20 min`)
a(bruit.total === 440 && bruit.coucher === null, 'heure de la barre d etat ignoree')
a(qualiteDuScore(90) === 5 && qualiteDuScore(72) === 4 && qualiteDuScore(30) === 1 && qualiteDuScore(null) === null, 'score de l app -> qualite sur 5')

// ─── Textes abimes par un vrai OCR ───
a(dureeMinutes('7 + 32 min') === 452 && dureeMinutes('8105 min') === 485 && dureeMinutes('58 min') === 58, '« h » lu « + » ou fondu en « 1 » : 7 h 32, 8 h 05')
a(plageAbimee('2314-07119').join() === '23:14,07:19' && plageAbimee('11.14 pm - 6:58 am').join() === '23:14,06:58' && plageAbimee('12 - 15') === null, 'plage aux deux-points manges')
a(valeursDe('1h 18m 4h 01m').length === 2 && valeursDe('06:40 46 bpm').join('|') === '06:40|46 bpm', 'valeurs d une rangee, dans l ordre')
const colonnes = lireCaptureSommeil(`Durée du sommai Heure du coucher
7h 12m 23:05
Hours de révai FC au repos
06:40 46 bpm
Protond Léger
1h 18m 4h 01m
Paradoxal Eval
1h 35m 18m
VEC moyenne
58 ms`)
a(colonnes.total === 432 && colonnes.coucher === '23:05' && colonnes.lever === '06:40' && colonnes.fcRepos === 46 && colonnes.vfc === 58, 'colonnes lues en rangees, etiquettes abimees : ' + voir(colonnes))
a(colonnes.phases.profond === 78 && colonnes.phases.leger === 241 && colonnes.phases.paradoxal === 95 && colonnes.phases.eveille === 18, 'chaque valeur a sa colonne')
const epars = lireCaptureSommeil(`Score de sommeil
78
Bon
Durée du sommeil
Heure du coucher
7h 12m
23:05
Profond
Léger
1h 18m
4h 01m
VFC moyenne
ms`)
a(epars.score === 78 && epars.total === 432 && epars.coucher === '23:05' && epars.phases.profond === 78 && epars.phases.leger === 241 && epars.vfc === null, 'lecture eparse : etiquettes puis valeurs, appariees dans l ordre ; VFC sans nombre : vide — ' + voir(epars))

for (const [nom, [t6, t11]] of Object.entries(OCR_REELS)) {
  const r1 = lireCaptureSommeil(t6), r2 = lireCaptureSommeil(t11)
  const r = lectureIncomplete(r1) ? fusionnerCaptures(r1, r2) : r1
  if (nom === 'sante') a(r.total === 452 && r.coucher === '23:14' && r.lever === '07:19' && r.phases.profond === 58 && r.phases.paradoxal === 95 && r.phases.leger === 299 && r.phases.eveille === 12, 'vrai OCR, capture style Sante : tout est lu — ' + voir(r))
  if (nom === 'garmin') {
    a(lectureIncomplete(r1) && r1.manques.includes('score'), 'vrai OCR, Garmin : le score vu sans valeur declenche la seconde lecture')
    a(r.score === 78 && r.total === 432 && r.coucher === '23:05' && r.lever === '06:40' && r.fcRepos === 46 && r.vfc === 58 && r.phases.leger === 241, 'vrai OCR, capture style Garmin : les deux lectures fusionnees — ' + voir(r))
  }
}
const f1 = fusionnerCaptures({ total: 400, coucher: '23:00', lever: null, phases: { profond: null, paradoxal: null, leger: null, eveille: null }, alertes: [], manques: [] }, { total: 380, coucher: '22:00', lever: '06:00', phases: { profond: 60, paradoxal: null, leger: null, eveille: null }, alertes: [], manques: [] })
a(f1.total === 400 && f1.coucher === '22:00' && f1.lever === '06:00' && f1.phases.profond === 60, 'fusion : la premiere lecture fait foi, les heures vont par paire')
console.log('\nALL PASS')
