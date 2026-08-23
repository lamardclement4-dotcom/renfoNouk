// ============================================================
// Analyse approfondie des macronutriments.
//
// Ce qui existait s'arrêtait aux moyennes : tant de calories, tant de
// protéines, comparées à un objectif. C'est le strict nécessaire, et ça
// laisse de côté ce qui change vraiment quelque chose — quand on mange,
// et si l'apport suit l'entraînement.
//
// Quatre lectures s'ajoutent ici, toutes tirées de données déjà
// enregistrées, sans rien demander de plus :
//
//   la répartition des protéines dans la journée, parce que la synthèse
//   protéique répond à des prises réparties et non à un seul gros repas ;
//
//   la modulation des glucides selon la charge, qui distingue une
//   périodisation d'un apport plat ;
//
//   le sous-apport les jours de séance, signal de sous-alimentation qui
//   ne demande aucune table de dépense pour être vu ;
//
//   la dérive de chaque macro sur un mois, qu'une moyenne unique masque.
//
// Rien ici ne touche au réseau ni à l'écran.
// ============================================================

import { dayEntries, dayTotals, KCAL_PER_G } from './nutriIntel'
import { dayTypeFor } from './macroTargets'

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const r1 = (v) => Math.round(v * 10) / 10
const fr = (v) => String(v).replace('.', ',')

function todayISO() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function shiftISO(iso, delta) {
  const [y, m, d] = String(iso).split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + delta)
  return x.toISOString().slice(0, 10)
}

// ─── Répartition des protéines ──────────────────────────────
//
// La synthèse protéique musculaire répond à une dose par prise plutôt
// qu'au total de la journée : environ 0,3 à 0,4 g par kilo suffisent à la
// déclencher, et davantage en une fois n'ajoute pas grand-chose. Cent
// cinquante grammes pris pour l'essentiel au dîner ne valent donc pas les
// mêmes cent cinquante grammes répartis sur quatre prises. C'est le seul
// levier qui ne coûte rien : la même quantité, autrement placée.

export const MEALS = [
  { id: 'matin', label: 'Petit-déjeuner' },
  { id: 'midi', label: 'Déjeuner' },
  { id: 'soir', label: 'Dîner' },
  { id: 'collation', label: 'Collation' },
]

export const PROT_PER_MEAL_MIN = 0.3
export const CONCENTRATION_PCT = 45

export function mealOf(entry) {
  const m = entry && entry.meal
  return MEALS.some((x) => x.id === m) ? m : 'collation'
}

export function mealTotals(db, iso) {
  const out = {}
  for (const m of MEALS) out[m.id] = { id: m.id, label: m.label, k: 0, p: 0, g: 0, l: 0, items: 0 }
  for (const e of dayEntries(db, iso)) {
    // Une boisson n'a pas de repas : elle se prend dans la journée, pas à
    // table. La ranger d'office au petit-déjeuner fausserait la répartition.
    if (e.fromDrink) continue
    const t = out[mealOf(e)]
    t.k += num(e.k) || 0
    t.p += num(e.p) || 0
    t.g += num(e.g) || 0
    t.l += num(e.l) || 0
    t.items++
  }
  for (const m of MEALS) {
    const t = out[m.id]
    t.k = Math.round(t.k); t.p = r1(t.p); t.g = r1(t.g); t.l = r1(t.l)
  }
  return out
}

export function proteinPacing(db, { days = 14, today, weightKg } = {}) {
  const ref = today || todayISO()
  const w = num(weightKg)
  const perMeal = {}
  for (const m of MEALS) perMeal[m.id] = { id: m.id, label: m.label, total: 0, hits: 0 }
  let daysCounted = 0
  let totalProt = 0
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftISO(ref, -i)
    const t = mealTotals(db, date)
    const dayProt = MEALS.reduce((a, m) => a + t[m.id].p, 0)
    if (dayProt <= 0) continue
    daysCounted++
    totalProt += dayProt
    for (const m of MEALS) {
      perMeal[m.id].total += t[m.id].p
      if (w && w > 0 && t[m.id].p >= w * PROT_PER_MEAL_MIN) perMeal[m.id].hits++
    }
  }
  if (!daysCounted) return null
  const items = MEALS.map((m) => {
    const s = perMeal[m.id]
    const mean = r1(s.total / daysCounted)
    return {
      id: m.id, label: m.label, mean,
      perKg: w && w > 0 ? Math.round(mean / w * 100) / 100 : null,
      pct: totalProt > 0 ? r1(s.total / totalProt * 100) : 0,
      hitDays: s.hits,
    }
  })
  const top = items.slice().sort((a, b) => b.pct - a.pct)[0]
  const effective = w && w > 0 ? items.filter((x) => x.mean >= w * PROT_PER_MEAL_MIN).length : null
  const concentrated = top && top.pct >= CONCENTRATION_PCT
  let text = null
  if (concentrated) {
    text = `${fr(top.pct)} % de tes protéines sont prises au ${top.label.toLowerCase()} (${fr(top.mean)} g en moyenne). La synthèse protéique répond à une dose par prise, autour de ${fr(PROT_PER_MEAL_MIN)} g/kg : la même quantité répartie sur trois ou quatre prises est mieux utilisée.`
  } else if (effective != null && effective < 3) {
    text = `${effective} prise${effective > 1 ? 's' : ''} sur quatre atteint le seuil de ${fr(PROT_PER_MEAL_MIN)} g/kg. Remonter une collation ou le petit-déjeuner coûte moins qu'augmenter le total.`
  }
  return { days: daysCounted, items, top, effective, concentrated, threshold: w ? r1(w * PROT_PER_MEAL_MIN) : null, text }
}

// ─── Les glucides suivent-ils la charge ? ───────────────────
//
// Manger la même chose un jour de repos et un jour de sortie longue est le
// défaut le plus courant, et il se voit sans aucune table de dépense : il
// suffit de comparer l'apport des jours chargés à celui des jours creux.

export const CARB_MODULATION_PCT = 15

export function carbPeriodization(db, { days = 28, today } = {}) {
  const ref = today || todayISO()
  const byType = { repos: [], normal: [], gros: [] }
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftISO(ref, -i)
    const entries = dayEntries(db, date)
    if (!entries.length) continue
    const t = dayTotals(entries)
    if (t.k <= 0) continue
    const type = dayTypeFor(db, date)
    byType[type].push({ date, gluc: t.g, kcal: t.k })
  }
  const mean = (list, key) => (list.length ? r1(list.reduce((a, x) => a + x[key], 0) / list.length) : null)
  const repos = { days: byType.repos.length, gluc: mean(byType.repos, 'gluc'), kcal: mean(byType.repos, 'kcal') }
  const gros = { days: byType.gros.length, gluc: mean(byType.gros, 'gluc'), kcal: mean(byType.gros, 'kcal') }
  // Deux jours de chaque sorte au minimum : en dessous, une seule journée
  // atypique déciderait de la conclusion.
  if (repos.days < 2 || gros.days < 2 || !repos.gluc || !gros.gluc) {
    return { available: false, repos, gros, reason: 'pas assez de jours de chaque sorte' }
  }
  const delta = r1(gros.gluc - repos.gluc)
  const pct = r1(delta / repos.gluc * 100)
  const modulated = pct >= CARB_MODULATION_PCT
  return {
    available: true, repos, gros, delta, pct, modulated,
    level: modulated ? 'ok' : 'info',
    text: modulated
      ? `Tes glucides suivent la charge : ${fr(gros.gluc)} g les jours de grosse séance contre ${fr(repos.gluc)} g les jours de repos, soit ${fr(pct)} % de plus.`
      : `Tu manges à peu près pareil les jours de grosse séance (${fr(gros.gluc)} g de glucides) et les jours de repos (${fr(repos.gluc)} g). Déplacer une partie des glucides des jours creux vers les jours chargés coûte le même total.`,
  }
}

// ─── Sous-apport les jours de séance ────────────────────────
//
// Un apport qui ne monte pas quand la charge monte est le signal de
// sous-alimentation le plus lisible sans mesurer la dépense. On ne prétend
// pas estimer des calories brûlées : on compare l'apport à lui-même.

export const UNDERFUEL_PCT = -5

export function fuelingOnTrainingDays(db, { days = 28, today } = {}) {
  const p = carbPeriodization(db, { days, today })
  if (!p.available) return null
  const delta = r1(p.gros.kcal - p.repos.kcal)
  const pct = r1(delta / p.repos.kcal * 100)
  if (pct > UNDERFUEL_PCT) return { level: 'ok', pct, delta, text: null }
  return {
    level: 'warn', pct, delta,
    text: `Tu manges ${fr(Math.abs(delta))} kcal de moins les jours de grosse séance que les jours de repos. C'est le schéma qui mène au sous-apport : la fatigue s'installe, la force stagne, et la cause est rarement cherchée dans l'assiette.`,
  }
}

// ─── Dérive sur le mois ─────────────────────────────────────
//
// Une moyenne sur quatre semaines cache une baisse continue. On compare
// donc les deux moitiés de la période, macro par macro.

export const DRIFT_PCT = 12

export function drift(series, { key = 'p', label = 'Protéines', unit = 'g' } = {}) {
  const full = (series || []).filter((d) => d.complete)
  if (full.length < 6) return null
  const half = Math.floor(full.length / 2)
  const mean = (list) => list.reduce((a, d) => a + (num(d[key]) || 0), 0) / list.length
  const first = mean(full.slice(0, half))
  const last = mean(full.slice(-half))
  if (first <= 0) return null
  const pct = r1((last - first) / first * 100)
  if (Math.abs(pct) < DRIFT_PCT) return { key, label, pct, first: Math.round(first), last: Math.round(last), level: 'ok', text: null }
  const down = pct < 0
  return {
    key, label, pct, first: Math.round(first), last: Math.round(last),
    level: down ? 'warn' : 'info',
    text: `${label} : ${Math.round(first)} ${unit} par jour sur la première moitié du mois, ${Math.round(last)} ${unit} sur la seconde — ${down ? 'une baisse' : 'une hausse'} de ${fr(Math.abs(pct))} %, qu'une moyenne unique aurait masquée.`,
  }
}

// ─── Répartition des calories dans la journée ───────────────

export const EVENING_HEAVY_PCT = 45

export function calorieSpread(db, { days = 14, today } = {}) {
  const ref = today || todayISO()
  const acc = {}
  for (const m of MEALS) acc[m.id] = 0
  let total = 0
  let counted = 0
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftISO(ref, -i)
    const t = mealTotals(db, date)
    const day = MEALS.reduce((a, m) => a + t[m.id].k, 0)
    if (day <= 0) continue
    counted++
    total += day
    for (const m of MEALS) acc[m.id] += t[m.id].k
  }
  if (!counted || total <= 0) return null
  const items = MEALS.map((m) => ({ id: m.id, label: m.label, pct: r1(acc[m.id] / total * 100), mean: Math.round(acc[m.id] / counted) }))
  const soir = items.find((x) => x.id === 'soir')
  return {
    days: counted, items,
    eveningHeavy: soir && soir.pct >= EVENING_HEAVY_PCT,
    text: soir && soir.pct >= EVENING_HEAVY_PCT
      ? `${fr(soir.pct)} % de tes calories sont prises au dîner. Ce n'est pas une faute en soi, mais avancer une partie de l'apport laisse plus d'énergie disponible aux heures où tu t'entraînes.`
      : null,
  }
}

// ─── Synthèse ───────────────────────────────────────────────

export function macroDeepAnalysis(db, { days = 28, today, weightKg, series } = {}) {
  const ref = today || todayISO()
  const pacing = proteinPacing(db, { days: Math.min(days, 14), today: ref, weightKg })
  const carbs = carbPeriodization(db, { days, today: ref })
  const fuel = fuelingOnTrainingDays(db, { days, today: ref })
  const spread = calorieSpread(db, { days: Math.min(days, 14), today: ref })
  const drifts = series
    ? [
      drift(series, { key: 'p', label: 'Protéines', unit: 'g' }),
      drift(series, { key: 'k', label: 'Calories', unit: 'kcal' }),
      drift(series, { key: 'g', label: 'Glucides', unit: 'g' }),
    ].filter((d) => d && d.text)
    : []
  const tips = []
  if (fuel && fuel.text) tips.push(fuel.text)
  if (pacing && pacing.text) tips.push(pacing.text)
  if (carbs.available && !carbs.modulated) tips.push(carbs.text)
  for (const d of drifts) tips.push(d.text)
  if (spread && spread.text) tips.push(spread.text)
  return { pacing, carbs, fuel, spread, drifts, tips }
}

export { KCAL_PER_G }
