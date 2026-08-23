import { dowOf, sleepSeries, neededHours, sleepDebt, regularity, weekendCatchUp,
  sleepAfterTraining, sleepAnalysis, BASE_NEED }
  from '../../src/features/health/sleepIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const REF = '2026-03-20' // vendredi
const iso = (off) => { const d = new Date(Date.UTC(2026, 2, 20)); d.setUTCDate(d.getUTCDate() - off); return d.toISOString().slice(0, 10) }
const mk = (byOff) => { const l = {}; for (const [o, h] of Object.entries(byOff)) l[iso(Number(o))] = { hours: h }; return l }

// --- jour de semaine ---
a(dowOf('2026-03-20') === 4, '20 mars 2026 = vendredi (index 4)')
a(dowOf('2026-03-21') === 5, '21 mars = samedi')
a(dowOf('2026-03-23') === 0, '23 mars = lundi')

// --- serie ---
a(sleepSeries(null, { days: 14, today: REF }).length === 0, 'log absent -> vide')
a(sleepSeries({}, { days: 14, today: REF }).length === 0, 'log vide -> vide')
const s3 = sleepSeries(mk({ 0: 7, 1: 8, 2: 6 }), { days: 14, today: REF })
a(s3.length === 3, 'seules les nuits renseignees sont retenues')
a(s3[0].date < s3[2].date, 'serie chronologique croissante')
a(sleepSeries({ [iso(0)]: { hours: 0 } }, { days: 7, today: REF }).length === 0, 'nuit a 0 h ignoree')

// --- besoin selon la charge ---
a(neededHours(0) === BASE_NEED, `repos -> ${BASE_NEED} h`)
a(neededHours(200) === 8, 'faible volume -> 8 h')
a(neededHours(400) === 8.5, 'volume moyen -> 8,5 h')
a(neededHours(700) === 9, 'gros volume -> 9 h')
a(neededHours(null) === 8, 'volume inconnu -> base')

// --- dette ---
const short = sleepSeries(mk({ 0: 6, 1: 6, 2: 6, 3: 6, 4: 6, 5: 6, 6: 6 }), { days: 7, today: REF })
const d = sleepDebt(short, 8)
a(d.debt === 14 && d.net === 14, `7 nuits a 6 h contre 8 -> dette ${d.debt} h`)
a(d.mean === 6, 'moyenne correcte')
const mixed = sleepDebt(sleepSeries(mk({ 0: 9, 1: 6 }), { days: 7, today: REF }), 8)
a(mixed.debt === 2 && mixed.surplus === 1 && mixed.net === 1, `surplus deduit de la dette (net ${mixed.net})`)
a(sleepDebt([], 8) === null, 'aucune nuit -> null')
a(sleepDebt(short, 0) === null, 'besoin nul -> null')

// --- regularite ---
a(regularity(sleepSeries(mk({ 0: 7, 1: 7 }), { days: 7, today: REF })) === null, 'moins de 3 nuits -> null')
const steady = regularity(sleepSeries(mk({ 0: 8, 1: 8, 2: 8, 3: 8, 4: 8 }), { days: 7, today: REF }))
a(steady.sd === 0 && steady.level === 'ok', 'durees identiques -> regularite parfaite')
const erratic = regularity(sleepSeries(mk({ 0: 5, 1: 10, 2: 5, 3: 10, 4: 5 }), { days: 7, today: REF }))
a(erratic.sd > 1.5 && erratic.level === 'alert', `durees erratiques -> alerte (ecart-type ${erratic.sd})`)
a(Math.abs(erratic.mean - 7) < 0.1, `moyenne de 7 h malgre l irregularite (${erratic.mean}) : ce que la moyenne seule masque`)

// --- rattrapage du week-end ---
// offsets depuis vendredi 20 : 0=ven, 1=jeu, 2=mer, 3=mar, 4=lun, 5=dim, 6=sam
const cu = weekendCatchUp(sleepSeries(mk({ 0: 6, 1: 6, 2: 6, 3: 6, 4: 6, 5: 9, 6: 9 }), { days: 7, today: REF }))
a(cu && cu.weekday === 6 && cu.weekend === 9, `semaine ${cu.weekday} h / week-end ${cu.weekend} h`)
a(cu.gap === 3 && cu.flagged, 'rattrapage marque signale')
const noCu = weekendCatchUp(sleepSeries(mk({ 0: 8, 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 8 }), { days: 7, today: REF }))
a(noCu && !noCu.flagged, 'sommeil constant -> pas de rattrapage')
a(weekendCatchUp(sleepSeries(mk({ 0: 7, 1: 7 }), { days: 7, today: REF })) === null, 'trop peu de nuits -> null')

// --- sommeil apres seance ---
const sess = [{ date: iso(1), statut: 'realise' }, { date: iso(3), statut: 'realise' }]
const st = sleepAfterTraining(sleepSeries(mk({ 0: 6, 1: 8, 2: 6, 3: 8, 4: 8 }), { days: 7, today: REF }), sess)
a(st && st.nightsAfter === 2, '2 nuits suivant une seance')
a(st.afterTraining === 6 && st.afterRest === 8, `apres seance ${st.afterTraining} h vs ${st.afterRest} h au repos`)
a(st.diff === -2 && st.flagged, 'ecart signale')
a(sleepAfterTraining(sleepSeries(mk({ 0: 7, 1: 7, 2: 7, 3: 7 }), { days: 7, today: REF }), []) === null, 'aucune seance -> null')

// --- synthese ---
const full = sleepAnalysis({ sleepLog: mk({ 0: 6, 1: 6, 2: 6, 3: 6, 4: 6, 5: 6, 6: 6 }) }, { days: 7, today: REF, weeklyTrainingMins: 700 })
a(full.need === 9, 'besoin releve par la charge')
a(full.debt.net === 21, `dette calculee sur le besoin ajuste (${full.debt.net} h)`)
a(full.tips.some((t) => /dette/i.test(t)), 'conseil sur la dette')
a(full.tips.some((t) => /volume/i.test(t)), 'besoin majore explique')
a(sleepAnalysis({}, { days: 7, today: REF }).nights === 0, 'aucune donnee -> synthese vide sans casser')
a(sleepAnalysis(null, { days: 7, today: REF }).nights === 0, 'db nulle geree')
const good = sleepAnalysis({ sleepLog: mk({ 0: 8, 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 8 }) }, { days: 7, today: REF, weeklyTrainingMins: 0 })
a(good.tips.length === 1 && /rien a signaler/i.test(good.tips[0].normalize('NFD').replace(/[̀-ͯ]/g, '')), 'sommeil correct -> message neutre')
console.log('\nALL PASS')
