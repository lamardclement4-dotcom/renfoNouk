// Import de l export Apple Sante. Sur iPhone, c est la seule voie : ni Web
// Bluetooth (Safari ne l a pas et ne l aura pas), ni API constructeur (secret
// client ou absence de CORS, et l application n a pas de serveur).
import { parseLine, dayOf, msOf, sportOfWorkout, mergeIntervals, totalHours,
  createHealthReader, createLineSplitter, readHealthText, toPatch, sameSession,
  SLEEP_TYPE, STEPS_TYPE, RESTING_HR_TYPE, DUP_MINUTES }
  from '../../src/features/train/healthImport.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── dates : le jour local, sans conversion ───
a(dayOf('2026-01-05 07:12:00 +0100') === '2026-01-05', 'le jour local se lit tel quel')
a(dayOf('pas une date') === null, 'texte invalide -> null')
// Convertir en UTC deplacerait une nuit d un jour : un reveil a 00h30 a Paris
// est le 5 janvier local, mais le 4 en temps universel.
a(dayOf('2026-01-05 00:30:00 +0100') === '2026-01-05', "un reveil apres minuit reste au jour local")
a(msOf('2026-01-05 07:00:00 +0100') === Date.parse('2026-01-05T07:00:00+01:00'), 'horodatage avec decalage lu correctement')
a(msOf('2026-01-05 07:00:00 +0530') === Date.parse('2026-01-05T07:00:00+05:30'), 'decalage a la demie aussi')
a(msOf('n importe quoi') === null, 'horodatage illisible -> null')

// ─── sports ───
a(sportOfWorkout('HKWorkoutActivityTypeRunning') === 'course', 'course')
a(sportOfWorkout('HKWorkoutActivityTypeTrailRunning') === 'trail', 'le trail avant la course')
a(sportOfWorkout('HKWorkoutActivityTypeCycling') === 'velo' && sportOfWorkout('HKWorkoutActivityTypeSwimming') === 'natation', 'velo et natation')
a(sportOfWorkout('HKWorkoutActivityTypeCurling') === null, 'un sport non couvert reste vide plutot que mal range')

// ─── recouvrement des segments de sommeil ───
// Montre et telephone ecrivent la meme nuit : additionner donnerait des nuits
// de quatorze heures.
a(totalHours([{ a: 0, b: 3600000 }, { a: 1800000, b: 5400000 }]) === 1.5, 'segments qui se recouvrent : fusionnes, pas additionnes')
a(totalHours([{ a: 0, b: 3600000 }, { a: 7200000, b: 10800000 }]) === 2, 'segments disjoints : additionnes')
a(mergeIntervals([{ a: 5, b: 1 }]).length === 0, 'un intervalle a l envers est ecarte')
a(totalHours([]) === 0, 'aucun segment -> zero')

// ─── lecture d une ligne ───
const rec = parseLine('<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2026-01-05 08:00:00 +0100" endDate="2026-01-05 09:00:00 +0100" value="1234"/>')
a(rec.kind === 'record' && rec.type === STEPS_TYPE && rec.value === '1234', 'enregistrement de pas lu')
const wk = parseLine('<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="45.5" durationUnit="min" totalDistance="8.4" totalDistanceUnit="km" totalEnergyBurned="512" sourceName="Apple Watch" startDate="2026-01-06 18:00:00 +0100" endDate="2026-01-06 18:45:00 +0100"/>')
a(wk.kind === 'workout' && wk.duration === 45.5 && wk.distance === 8.4, 'seance lue')
a(parseLine('<HealthData locale="fr_FR">') === null && parseLine('') === null, 'une ligne sans donnee est ignoree')

// ─── agregation ───
const XML = `<?xml version="1.0"?>
<HealthData locale="fr_FR">
 <Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2026-01-04 23:00:00 +0100" endDate="2026-01-05 03:00:00 +0100"/>
 <Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisAsleepDeep" startDate="2026-01-05 03:00:00 +0100" endDate="2026-01-05 06:30:00 +0100"/>
 <Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisInBed" startDate="2026-01-04 22:30:00 +0100" endDate="2026-01-05 07:00:00 +0100"/>
 <Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisInBed" startDate="2026-01-05 23:00:00 +0100" endDate="2026-01-06 07:00:00 +0100"/>
 <Record type="${STEPS_TYPE}" unit="count" startDate="2026-01-05 08:00:00 +0100" endDate="2026-01-05 09:00:00 +0100" value="1200"/>
 <Record type="${STEPS_TYPE}" unit="count" startDate="2026-01-05 12:00:00 +0100" endDate="2026-01-05 13:00:00 +0100" value="3300"/>
 <Record type="${RESTING_HR_TYPE}" unit="count/min" startDate="2026-01-05 06:00:00 +0100" endDate="2026-01-05 06:00:00 +0100" value="52"/>
 <Record type="${RESTING_HR_TYPE}" unit="count/min" startDate="2026-01-05 07:00:00 +0100" endDate="2026-01-05 07:00:00 +0100" value="54"/>
 <Workout workoutActivityType="HKWorkoutActivityTypeCycling" duration="90" durationUnit="min" totalDistance="42000" totalDistanceUnit="m" totalEnergyBurned="810" sourceName="Apple Watch" startDate="2026-01-06 09:00:00 +0100" endDate="2026-01-06 10:30:00 +0100"/>
</HealthData>`
const out = readHealthText(XML)
a(out.sleep['2026-01-05'].hours === 7.5, `nuit du 4 au 5 : ${out.sleep['2026-01-05'].hours} h de sommeil reel, attribuees au jour du reveil`)
a(out.sleep['2026-01-05'].fromInBed === false, "le temps au lit (8,5 h) n a pas ete retenu : « au lit » n est pas « endormi »")
a(out.sleep['2026-01-06'].hours === 8 && out.sleep['2026-01-06'].fromInBed === true, 'faute de sommeil mesure, le temps au lit sert de repli — et c est signale')
a(out.steps['2026-01-05'] === 4500, 'les pas du jour sont additionnes')
a(out.restingHr['2026-01-05'] === 53, 'la frequence au repos est moyennee')
a(out.workouts.length === 1 && out.workouts[0].sport === 'velo', 'une sortie velo')
a(out.workouts[0].km === 42, 'distance convertie de metres en kilometres')
a(out.workouts[0].seconds === 5400 && out.workouts[0].calories === 810, 'duree en secondes, calories')
a(out.workouts[0].time === '09:00', 'heure de depart')

// ─── lecture en flux ───
// L export pese couramment plusieurs centaines de megaoctets : le charger d un
// bloc ferait tomber l onglet. Une balise coupee entre deux morceaux ne doit
// pas etre perdue.
const reader = createHealthReader()
const split = createLineSplitter(reader.line)
const morceaux = []
for (let i = 0; i < XML.length; i += 37) morceaux.push(XML.slice(i, i + 37))
a(morceaux.length > 10, `${morceaux.length} morceaux de 37 caracteres, coupant les balises n importe ou`)
for (const m of morceaux) split.chunk(m)
split.end()
const flux = reader.result()
a(flux.sleep['2026-01-05'].hours === 7.5, 'lecture en flux : meme resultat qu en un bloc')
a(flux.steps['2026-01-05'] === 4500 && flux.workouts.length === 1, 'aucune ligne perdue a la jointure des morceaux')
a(flux.seen === out.seen && flux.seen === 9, `${flux.seen} enregistrements retenus des deux facons`)

// ─── robustesse ───
a(readHealthText('').seen === 0, 'fichier vide -> rien, sans lever')
a(readHealthText('<HealthData></HealthData>').seen === 0, 'export sans enregistrement')
a(readHealthText(`<Record type="${SLEEP_TYPE}" value="Asleep" startDate="cassé" endDate="cassé"/>`).sleep['2026-01-05'] === undefined, 'dates illisibles -> nuit ignoree, pas inventee')
a(Object.keys(readHealthText(`<Record type="HKQuantityTypeIdentifierHeartRate" value="72" startDate="2026-01-05 08:00:00 +0100" endDate="2026-01-05 08:00:00 +0100"/>`).sleep).length === 0,
  'les mesures cardiaques a la seconde sont ignorees : des millions de lignes sans usage ici')

// ─── fusion : ne rien ecraser en silence ───
const base = {
  sleepLog: { '2026-01-05': { hours: 6.5, quality: 3, awakenings: 2 } },
  planningSessions: [{ id: 'deja', date: '2026-01-06', heure: '09:15', sport: 'velo', statut: 'realise', duree: '1 h 30', ressenti: 4, notes: 'jambes lourdes', data: {} }],
}
const { patch, summary } = toPatch(out, base, { now: 1 })
a(patch.sleepLog['2026-01-05'].hours === 6.5, "une nuit deja notee n est pas ecrasee : elle porte une qualite et des reveils que l export ignore")
a(patch.sleepLog['2026-01-05'].quality === 3, 'et ses champs manuels survivent')
a(summary.sleepKept === 1, 'la nuit conservee est comptee')
a(patch.sleepLog['2026-01-06'].hours === 8 && patch.sleepLog['2026-01-06'].source === 'sante', 'la nuit manquante est comblee, et sa provenance notee')
a(summary.sleepAdded === 1 && summary.sleepFromBed === 1, 'une nuit ajoutee, dont une deduite du temps au lit')

a(summary.skippedSessions === 1 && summary.addedSessions === 0, 'la sortie velo de 9 h existait deja a 9 h 15 : pas de doublon')
a(patch.planningSessions.length === 1 && patch.planningSessions[0].notes === 'jambes lourdes', 'la seance existante garde ses notes')
a(patch.vitalsLog['2026-01-05'].steps === 4500 && patch.vitalsLog['2026-01-05'].restingHr === 53, 'pas et frequence au repos enregistres')

// sur une base vide, tout entre
const vierge = toPatch(out, {}, { now: 2 })
a(vierge.summary.addedSessions === 1 && vierge.summary.sleepAdded === 2, 'base vierge : tout est importe')
a(vierge.patch.planningSessions[0].duree === '1 h 30' && vierge.patch.planningSessions[0].data.distance === 42, 'duree et distance de la seance')
a(vierge.patch.planningSessions[0].data.temps === '1:30:00', 'et son temps')

// ─── detection de doublon ───
const w = { date: '2026-01-06', time: '09:00', sport: 'velo' }
a(sameSession({ date: '2026-01-06', heure: '09:15', sport: 'velo' }, w), `${DUP_MINUTES} min d ecart au plus : meme seance`)
a(!sameSession({ date: '2026-01-06', heure: '18:00', sport: 'velo' }, w), 'le soir : une autre seance')
a(!sameSession({ date: '2026-01-07', heure: '09:00', sport: 'velo' }, w), 'un autre jour : une autre seance')
a(!sameSession({ date: '2026-01-06', heure: '09:00', sport: 'course' }, w), 'un autre sport : une autre seance')
a(sameSession({ date: '2026-01-06', sport: 'velo' }, w), 'sans heure de part ou d autre, le jour et le sport suffisent')

// un sport qu Apple nomme mais que l application ne couvre pas
const curling = readHealthText('<Workout workoutActivityType="HKWorkoutActivityTypeCurling" duration="60" durationUnit="min" startDate="2026-02-01 10:00:00 +0100" endDate="2026-02-01 11:00:00 +0100"/>')
const cp = toPatch(curling, {}, { now: 3 })
a(cp.summary.unknownSport === 1 && cp.summary.addedSessions === 0, "un sport non couvert n est pas range au hasard : il est compte et laisse de cote")

console.log('\nALL PASS')
