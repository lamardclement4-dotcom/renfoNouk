// Analyse approfondie des macros : repartition des proteines, modulation des
// glucides selon la charge, sous-apport les jours de seance, derive sur le mois.
import { mealTotals, proteinPacing, carbPeriodization, fuelingOnTrainingDays,
  drift, calorieSpread, macroDeepAnalysis, MEALS,
  PROT_PER_MEAL_MIN, CONCENTRATION_PCT, CARB_MODULATION_PCT, UNDERFUEL_PCT, DRIFT_PCT, EVENING_HEAVY_PCT }
  from '../../src/features/nutrition/macroIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const T = '2026-08-21'
const back = (n) => { const d = new Date(Date.UTC(2026, 7, 21)); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
const E = (meal, k, p, g, l) => ({ n: meal, meal, k, p, g: g || 0, l: l || 0, fib: 0 })
const S = (date, duree, rpe) => ({ id: date + duree, date, sport: 'course', statut: 'realise', duree, data: { rpe } })

// ─── repartition par repas ───
const jour = { foodLog: { [back(1)]: [E('matin', 300, 10), E('midi', 700, 40), E('soir', 900, 90), E('collation', 200, 10)] } }
const mt = mealTotals(jour, back(1))
a(mt.soir.p === 90 && mt.matin.p === 10, 'les proteines sont ventilees par repas')
a(mt.midi.k === 700, 'les calories aussi')
a(MEALS.length === 4, 'quatre prises')
// Une boisson n a pas de repas : la ranger d office au petit-dejeuner
// fausserait la repartition.
const avecBoisson = { ...jour, hydroLog: { [back(1)]: [{ n: 'Bière', kcal: 200, prot: 2, carb: 16, alc: 20 }] } }
a(mealTotals(avecBoisson, back(1)).matin.k === 300, 'une boisson n est pas rangee dans un repas')

// ─── LE point : 150 g au diner ne valent pas 150 g repartis ───
const log = {}
for (let i = 1; i <= 10; i++) log[back(i)] = [E('matin', 300, 8), E('midi', 600, 25), E('soir', 900, 100), E('collation', 150, 7)]
const pac = proteinPacing({ foodLog: log }, { days: 14, today: T, weightKg: 75 })
a(pac.days === 10, '10 journees retenues')
a(pac.top.id === 'soir' && pac.top.pct > CONCENTRATION_PCT, `${pac.top.pct} % des proteines au diner`)
a(pac.concentrated, 'concentration signalee')
a(pac.threshold === 22.5, `seuil de ${pac.threshold} g par prise (${PROT_PER_MEAL_MIN} g/kg pour 75 kg)`)
a(pac.effective === 2, `${pac.effective} prises sur quatre atteignent ce seuil`)
a(/synth[èe]se prot[ée]ique r[ée]pond [àa] une dose par prise/.test(pac.text), 'et la raison est donnee')
a(!/\d+\.\d/.test(pac.text), 'ecriture francaise dans le conseil')
a(/71,4 %/.test(pac.text), 'le pourcentage aussi porte une virgule')

// bien reparti : rien a signaler
const bien = {}
for (let i = 1; i <= 10; i++) bien[back(i)] = [E('matin', 400, 30), E('midi', 600, 35), E('soir', 700, 35), E('collation', 200, 25)]
const pacOk = proteinPacing({ foodLog: bien }, { days: 14, today: T, weightKg: 75 })
a(!pacOk.concentrated && pacOk.effective === 4, 'quatre prises efficaces -> aucun reproche')
a(pacOk.text === null, 'et aucun conseil')
a(proteinPacing({}, { days: 14, today: T, weightKg: 75 }) === null, 'aucun repas note -> null')
a(proteinPacing({ foodLog: log }, { days: 14, today: T }).threshold === null, 'sans poids, pas de seuil par prise')

// ─── les glucides suivent-ils la charge ? ───
const plat = { foodLog: {}, planningSessions: [] }
for (let i = 1; i <= 20; i++) {
  plat.foodLog[back(i)] = [E('midi', 2200, 120, 250, 70)]
  if (i % 3 === 0) plat.planningSessions.push(S(back(i), '2 h', 6))
}
const cp = carbPeriodization(plat, { days: 28, today: T })
a(cp.available, 'assez de jours de chaque sorte')
a(!cp.modulated && Math.abs(cp.pct) < CARB_MODULATION_PCT, `${cp.pct} % d ecart : apport plat`)
a(/[àa] peu pr[èe]s pareil/.test(cp.text), 'signale comme non module')
a(/co[ûu]te le m[êe]me total/.test(cp.text), 'et la piste ne demande pas de manger plus')

const module_ = { foodLog: {}, planningSessions: [] }
for (let i = 1; i <= 20; i++) {
  const gros = i % 3 === 0
  module_.foodLog[back(i)] = [E('midi', gros ? 3000 : 2000, 120, gros ? 400 : 200, 70)]
  if (gros) module_.planningSessions.push(S(back(i), '2 h', 6))
}
const cpOk = carbPeriodization(module_, { days: 28, today: T })
a(cpOk.modulated && cpOk.pct >= CARB_MODULATION_PCT, `${cpOk.pct} % de glucides en plus les jours charges`)
a(/suivent la charge/.test(cpOk.text), 'et c est dit')
// deux jours de chaque sorte au minimum
const maigre = { foodLog: { [back(1)]: [E('midi', 2000, 100, 200, 60)] }, planningSessions: [] }
a(!carbPeriodization(maigre, { days: 28, today: T }).available, 'un seul jour -> aucune conclusion')

// ─── sous-apport les jours de seance ───
const sous = { foodLog: {}, planningSessions: [] }
for (let i = 1; i <= 20; i++) {
  const gros = i % 3 === 0
  sous.foodLog[back(i)] = [E('midi', gros ? 1700 : 2300, 110, gros ? 150 : 250, 60)]
  if (gros) sous.planningSessions.push(S(back(i), '2 h', 7))
}
const f = fuelingOnTrainingDays(sous, { days: 28, today: T })
a(f.level === 'warn' && f.pct < UNDERFUEL_PCT, `${f.pct} % de calories en moins les jours charges`)
a(/m[èe]ne au sous-apport/.test(f.text), 'le schema est nomme')
a(/rarement cherch[ée]e dans l.assiette/.test(f.text), 'et sa consequence dite')
a(fuelingOnTrainingDays(module_, { days: 28, today: T }).level === 'ok', 'un apport qui monte avec la charge -> rien a signaler')
a(fuelingOnTrainingDays(maigre, { days: 28, today: T }) === null, 'pas assez de donnees -> null')

// ─── derive sur le mois ───
const serie = []
for (let i = 0; i < 20; i++) serie.push({ date: back(20 - i), k: 2400, p: i < 10 ? 140 : 100, g: 250, complete: true })
const dr = drift(serie, { key: 'p', label: 'Protéines', unit: 'g' })
a(dr.level === 'warn' && dr.pct < -DRIFT_PCT, `${dr.pct} % : baisse detectee`)
a(dr.first === 140 && dr.last === 100, 'les deux moitiés du mois sont comparees')
a(/qu.une moyenne unique aurait masqu[ée]e/.test(dr.text), 'et la raison d etre du calcul est dite')
a(drift(serie, { key: 'k', label: 'Calories', unit: 'kcal' }).level === 'ok', 'les calories, elles, ne bougent pas')
a(drift(serie.slice(0, 4)) === null, 'moins de six journees completes -> null')

// ─── repartition des calories ───
const spread = calorieSpread({ foodLog: log }, { days: 14, today: T })
a(spread.items.length === 4 && spread.days === 10, 'quatre prises sur 10 jours')
const soir = spread.items.find((x) => x.id === 'soir')
a(soir.pct > EVENING_HEAVY_PCT === spread.eveningHeavy, 'la concentration du soir est coherente avec le seuil')

// ─── synthese ───
const deep = macroDeepAnalysis(sous, { days: 28, today: T, weightKg: 75, series: serie })
a(deep.tips.length >= 2, `${deep.tips.length} conseils`)
a(deep.tips.some((t) => /sous-apport/.test(t)), 'le sous-apport remonte en premier')
a(deep.tips.every((t) => !/undefined|NaN/.test(t)), 'aucun conseil malforme')
a(macroDeepAnalysis({}, { today: T }).tips.length === 0, 'base vide -> aucun conseil invente')
console.log('\nALL PASS')
