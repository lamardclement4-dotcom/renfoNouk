import { parseTime, fmtTime, fmtPace, RUN_DISTANCES, runEfforts, runRecords, riegel,
  runPredictions, runVolume, runCadence, runAnalysis,
  bikeEfforts, ftpEstimate, intensityFactor, trainingStress, bikeAnalysis,
  swimEfforts, criticalSpeed, strokeSplit, swimAnalysis, enduranceAnalysis,
  VOLUME_STEP_PCT, CADENCE_LOW, RIEGEL_MAX_RATIO, FLAT_DPLUS_PER_KM }
  from '../../src/features/train/enduranceIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const T = '2026-06-15'
const back = (n) => { const [y, m, d] = T.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d)); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10) }
const R = (off, data, sport) => ({ id: 'r' + off + (data.distance || ''), date: back(off), sport: sport || 'course', statut: 'realise', duree: '1 h', data })

// ─── temps et allures ───
a(parseTime('18:30') === 1110, '18:30 = 1110 s')
a(parseTime('1:35:00') === 5700, '1:35:00 = 5700 s')
a(parseTime('') === null && parseTime(null) === null, 'temps vide -> null')
a(parseTime('abc') === null && parseTime('12') === null, 'format invalide -> null')
a(parseTime('-5:00') === null, 'valeur negative refusee')
a(fmtTime(1110) === '18:30' && fmtTime(5700) === '1:35:00', 'aller-retour du format')
a(fmtTime(null) === null, 'duree absente -> null')
a(fmtPace(272) === "4'32\"", "allure formatee 4'32\"")
a(fmtPace(240) === "4'00\"", 'secondes sur deux chiffres')
a(fmtPace(0) === null, 'allure nulle -> null')

// ─── course : efforts et records ───
a(runEfforts({}, { today: T }).length === 0, 'aucune sortie')
const db = { planningSessions: [
  R(10, { distance: 10, temps: '44:00', denivele: 30, cadence: 172 }),
  R(40, { distance: 10.2, temps: '46:00', denivele: 20 }),
  R(60, { distance: 5, temps: '21:00', denivele: 10 }),
  R(90, { distance: 21.1, temps: '1:40:00', denivele: 120 }),
  R(20, { distance: 10, temps: '41:00', denivele: 600 }), // trop vallonnee
  R(5, { distance: 12 }),                                  // sans temps
] }
const eff = runEfforts(db, { today: T })
a(eff.length === 5, `${eff.length} sorties chronometrees (celle sans temps exclue)`)
a(eff.every((e) => e.pace > 0), 'allure calculee pour chacune')

const recs = runRecords(eff)
a(recs.length === 3, `records sur ${recs.length} distances`)
const r10 = recs.find((r) => r.id === '10k')
a(r10.time === '44:00', `record 10 km : ${r10.time}`)
a(r10.attempts === 2, 'les deux 10 km plats comparés, celui à 600 m de D+ écarté')
// LE point : la tolerance de distance
a(Math.abs(10.2 - 10) <= RUN_DISTANCES.find((d) => d.id === '10k').tol, 'un 10,2 km compte comme un 10 km')
a(recs.find((r) => r.id === 'semi').time === '1:40:00', 'record semi-marathon')
a(!recs.find((r) => r.id === 'marathon'), 'aucun marathon couru -> pas de record fabrique')

// ─── prediction de Riegel ───
a(riegel(1110, 5, 10) > 1110 * 2, 'doubler la distance coute plus que doubler le temps')
a(riegel(0, 5, 10) === null && riegel(1110, 0, 10) === null, 'entrees nulles gerees')
a(riegel(1110, 5, 42.2) === null, `extrapolation au-dela d un facteur ${RIEGEL_MAX_RATIO} refusee`)
a(riegel(2640, 10, 21.1) !== null, '10 km -> semi reste dans les bornes')
const preds = runPredictions(recs)
a(preds.length > 0, `${preds.length} projections`)
a(preds.every((p) => p.time && p.paceLabel), 'chaque projection porte temps et allure')
a(runPredictions([]).length === 0, 'sans record -> aucune projection')

// ─── volume ───
const flat = { planningSessions: [] }
for (let w = 0; w < 6; w++) for (const d of [0, 3]) flat.planningSessions.push(R(w * 7 + d, { distance: 10, temps: '50:00' }))
const vf = runVolume(runEfforts(flat, { today: T }), { today: T })
a(vf.weeks.length === 8, '8 semaines decrites')
a(vf.jump === null, 'volume regulier -> aucun saut signale')
// hausse brutale
const spike = { planningSessions: [
  R(8, { distance: 10, temps: '50:00' }),
  R(0, { distance: 20, temps: '1:40:00' }), R(2, { distance: 20, temps: '1:40:00' }),
] }
const vs = runVolume(runEfforts(spike, { today: T }), { today: T })
a(vs.jump && vs.jump.pct > VOLUME_STEP_PCT * 1.5, `hausse de ${vs.jump.pct} % signalee`)
a(/tendons et les os s.adaptent moins vite/.test(vs.jump.text), 'avec la raison')

// ─── cadence ───
a(runCadence([]) === null, 'moins de 3 mesures -> null')
const lowC = [{ cadence: 158 }, { cadence: 160 }, { cadence: 156 }]
a(runCadence(lowC).level === 'info' && runCadence(lowC).mean < CADENCE_LOW, `cadence ${runCadence(lowC).mean} sous le repere`)
a(runCadence([{ cadence: 176 }, { cadence: 178 }, { cadence: 174 }]).level === 'ok', 'cadence correcte')

// ─── velo ───
a(bikeEfforts({}, { today: T }).length === 0, 'aucune sortie velo')
const bike = { planningSessions: [
  R(5, { distance: 40, temps: '1:10:00', puissance: 210, puissance_norm: 225, cadence: 88 }, 'velo'),
  R(12, { distance: 30, temps: '1:00:00', puissance: 195, puissance_norm: 200 }, 'velo'),
  R(20, { distance: 60, temps: '2:30:00', puissance: 170, puissance_norm: 180 }, 'velo'),
] }
const be = bikeEfforts(bike, { today: T })
a(be.length === 3, '3 sorties velo')
a(be[0].speed > 0, 'vitesse moyenne calculee')
const ftp = ftpEstimate(be, 72)
a(ftp && ftp.ftp > 0, `puissance seuil estimee a ${ftp.ftp} W`)
a(ftp.wPerKg > 0, `${ftp.wPerKg} W/kg a 72 kg`)
a(/Estimation grossi[èe]re/.test(ftp.text), 'la limite de la methode est dite')
a(ftpEstimate([], 72) === null, 'aucune sortie exploitable -> null')
a(ftpEstimate(be, null).wPerKg === null, 'sans poids -> pas de W/kg fabrique')
// sortie trop longue ou trop courte exclue
a(ftpEstimate([{ np: 400, sec: 300 }], 70) === null, 'effort de 5 min hors bornes')
a(intensityFactor(225, 225) === 1, 'IF de 1 au seuil')
a(intensityFactor(225, 0) === null && intensityFactor(null, 225) === null, 'IF incalculable -> null')
a(trainingStress(3600, 225, 225) === 100, 'une heure au seuil = 100 points')
a(trainingStress(1800, 225, 225) === 50, 'une demi-heure au seuil = 50')
a(trainingStress(3600, 0, 225) === null, 'sans puissance -> null')
const ba = bikeAnalysis(bike, { today: T, weightKg: 72 })
a(ba.scored.length === 3 && ba.totalTss > 0, `charge cycliste totale ${ba.totalTss}`)
a(ba.withPower === 3, '3 sorties avec puissance')

// ─── natation ───
a(swimEfforts({}, { today: T }).length === 0, 'aucune seance de nage')
const swim = { planningSessions: [
  R(5, { distance: 2000, temps: '38:00', longueurs: 40, bassin: '50', nages: ['Crawl'] }, 'natation'),
  R(12, { distance: 400, temps: '6:40', nages: ['Crawl'] }, 'natation'),
  R(20, { distance: 1500, temps: '29:00', nages: ['Crawl'] }, 'natation'),
  R(27, { distance: 1200, temps: '23:30', nages: ['Crawl'] }, 'natation'),
] }
const se = swimEfforts(swim, { today: T })
a(se.length === 4 && se[0].pace100 > 0, `allure aux 100 m calculee (${se[0].pace100} s)`)
const css = criticalSpeed(se)
a(css && css.pace100 > 0, `allure critique ${css.paceLabel} aux 100 m`)
a(/repere pour caler tes series|repère pour caler tes séries/.test(css.text), 'et son usage explique')
a(criticalSpeed([se[0]]) === null, 'une seule distance -> null')
// deux distances trop proches
const close = [{ meters: 1000, sec: 900 }, { meters: 1200, sec: 1090 }]
a(criticalSpeed(close) === null, 'distances trop voisines -> pente non fiable, on ne conclut pas')
const only = strokeSplit(se)
a(only && only.only, 'une seule nage detectee')
a(/Varier les nages/.test(only.text), 'et la raison donnee')
const varied = strokeSplit([{ nages: ['Crawl', 'Dos'] }, { nages: ['Brasse', 'Crawl'] }])
a(varied && !varied.only, 'nages variees -> aucun reproche')
a(strokeSplit([]) === null, 'pas assez de donnees -> null')
const sa = swimAnalysis(swim, { today: T })
a(sa.totalMeters === 5100 && sa.bestPace, `${sa.totalMeters} m nages, meilleure allure ${sa.bestPace.label}`)

// ─── synthese ───
a(enduranceAnalysis(null, { today: T }).tips.length > 0, 'db nulle -> synthese sans crash')
a(/Aucune sortie chronom[ée]tr[ée]e/.test(enduranceAnalysis({}, { today: T }).tips[0]), 'aucune donnee -> invitation')
const full = enduranceAnalysis({ planningSessions: [...db.planningSessions, ...bike.planningSessions, ...swim.planningSessions] }, { today: T, weightKg: 72 })
a(full.tips.some((t) => /tu vaudrais environ/.test(t)), 'projection de course remontee')
a(full.tips.some((t) => /D.apr[èe]s ton/.test(t)), 'et dit sur quelle performance elle se fonde')
a(full.tips.some((t) => /une projection, pas une promesse/.test(t)), 'et presentee comme telle')
a(full.tips.some((t) => /Puissance seuil estim[ée]e/.test(t)), 'puissance seuil remontee')
a(full.tips.some((t) => /Allure critique/.test(t)), 'allure critique remontee')
console.log('\nALL PASS')
