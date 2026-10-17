// Export Sante recent : distance, calories et FC des seances dans les
// lignes WorkoutStatistics ; et « Ma journee », lue au poignet.
import { readFileSync } from 'node:fs'
import { createHealthReader, toPatch } from '../../src/features/train/healthImport.js'
import { zoneDeFc } from '../../src/features/health/coeurIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

const lignes = [
  '<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="46.5" durationUnit="min" sourceName="Apple Watch" creationDate="2026-10-16 18:50:00 +0200" startDate="2026-10-16 18:02:00 +0200" endDate="2026-10-16 18:48:30 +0200">',
  ' <MetadataEntry key="HKIndoorWorkout" value="0"/>',
  ' <WorkoutEvent type="HKWorkoutEventTypeSegment" date="2026-10-16 18:02:00 +0200" duration="5" durationUnit="min"/>',
  ' <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" startDate="2026-10-16 18:02:00 +0200" endDate="2026-10-16 18:48:30 +0200" sum="512.6" unit="kcal"/>',
  ' <WorkoutStatistics type="HKQuantityTypeIdentifierDistanceWalkingRunning" startDate="2026-10-16 18:02:00 +0200" endDate="2026-10-16 18:48:30 +0200" sum="8.12" unit="km"/>',
  ' <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" startDate="2026-10-16 18:02:00 +0200" endDate="2026-10-16 18:48:30 +0200" average="152.4" minimum="98" maximum="181" unit="count/min"/>',
  ' <WorkoutRoute sourceName="Apple Watch"/>',
  '</Workout>',
  // Une ancienne ligne, fermee sur elle-meme, avec ses attributs.
  '<Workout workoutActivityType="HKWorkoutActivityTypeCycling" duration="60" durationUnit="min" totalDistance="25.3" totalDistanceUnit="km" totalEnergyBurned="610" sourceName="Apple Watch" startDate="2026-10-15 08:00:00 +0200" endDate="2026-10-15 09:00:00 +0200"/>',
  // Statistique orpheline (apres la fin de la seance) : ignoree.
  '<WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" average="99" maximum="120" unit="count/min"/>',
  '<Workout workoutActivityType="HKWorkoutActivityTypeSwimming" duration="1800" durationUnit="s" sourceName="Apple Watch" startDate="2026-10-14 07:00:00 +0200" endDate="2026-10-14 07:30:00 +0200">',
  ' <WorkoutStatistics type="HKQuantityTypeIdentifierDistanceSwimming" sum="1500" unit="m"/>',
  '</Workout>',
]
const lec = createHealthReader()
for (const l of lignes) lec.line(l)
const r = lec.result()
const course = r.workouts.find((w) => w.sport === 'course')
a(course && course.km === 8.12 && course.calories === 513 && course.fc === 152 && course.fcMax === 181, `course : 8,12 km, 513 kcal, FC 152 (max 181)`)
const velo = r.workouts.find((w) => w.sport === 'velo')
a(velo.km === 25.3 && velo.calories === 610 && velo.fc == null, 'ancien export : attributs lus, statistique orpheline ignoree')
const nage = r.workouts.find((w) => w.sport === 'natation')
a(nage.km === 1.5 && nage.seconds === 1800, 'natation : 1500 m -> 1,5 km')

const { patch } = toPatch(r, { sleepLog: {}, vitalsLog: {}, planningSessions: [], profilePhys: { age: 32 } }, { now: 1 })
const s = patch.planningSessions.find((x) => x.sport === 'course')
a(s.data.fc === 152 && s.data.fc_max === 181 && s.data.distance === 8.12 && s.data.calories === 513, 'seance importee avec sa FC : zone et intensite dans la charge')
const z = zoneDeFc({ profilePhys: { age: 32 }, planningSessions: patch.planningSessions, vitalsLog: {} }, '2026-10-17', s.data.fc)
a(z && z.max === 186 && z.pct === 82, `sa zone se calcule (FC max ${z && z.max}, ${z && z.pct} %)`)

// ─── « Ma journee » ───
const x = readFileSync(new URL('../../outils/raccourci/Ma-journee.plist', import.meta.url), 'utf8')
a(x.includes('lire_journee_montre') && x.includes('is.workflow.actions.showresult') && x.includes('<string>text/plain</string>') && !/filter\.health/.test(x), 'Ma journee : lit le point du jour et l affiche, sans lire Sante')
const sql = readFileSync(new URL('../../supabase/migrations/0012_journee_montre.sql', import.meta.url), 'utf8')
a(/returns "text\/plain"/.test(sql) && /encode\(extensions\.digest\(jeton, 'sha256'\), 'hex'\)/.test(sql) && !/update rappels_montre/.test(sql) && !/insert into/.test(sql), 'lecture seule, meme controle de cle')
a(/grant execute on function lire_journee_montre\(text\) to anon, authenticated;/.test(sql), 'ouverte a la cle, pas au public')
console.log('\nALL PASS')
