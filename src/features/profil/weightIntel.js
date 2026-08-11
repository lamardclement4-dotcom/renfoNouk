// ============================================================
// Analyse du suivi de poids. Séparé de l'écran pour être testable sans
// rendu : toutes les fonctions sont pures et tolèrent un historique vide
// ou incohérent.
// ============================================================

const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

export function dayDiff(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

// Pesées triées, dédoublonnées par jour (la dernière du jour fait foi) et
// bornées à une fenêtre optionnelle.
// L'entrée entière est conservée, pas seulement le poids : la composition
// corporelle et les mensurations lues sur la balance vivent dans le même
// enregistrement et seraient perdues par une projection sur {date, kg}.
export function weightSeries(log, days) {
  const byDay = {}
  for (const e of log || []) {
    if (!e || !e.date || !(Number(e.kg) > 0)) continue
    byDay[e.date] = { ...e, date: e.date, kg: Number(e.kg) }
  }
  let out = Object.keys(byDay).sort().map((date) => byDay[date])
  if (days > 0 && out.length) {
    const limit = new Date(); limit.setDate(limit.getDate() - days)
    const from = iso(limit)
    out = out.filter((e) => e.date >= from)
  }
  return out
}

// Moyenne mobile exponentielle. Le poids du jour varie de près d'un kilo
// selon l'hydratation et le transit : la courbe brute est donc trop
// bruitée pour juger d'une progression, seule la tendance lissée l'est.
// L'alpha est corrigé du nombre de jours écoulés, sinon deux pesées
// espacées d'un mois compteraient comme deux jours consécutifs.
export function trendLine(series, halfLifeDays = 10) {
  if (!series.length) return []
  const out = [{ date: series[0].date, kg: series[0].kg }]
  for (let i = 1; i < series.length; i++) {
    const gap = Math.max(1, dayDiff(series[i - 1].date, series[i].date))
    const alpha = 1 - Math.pow(0.5, gap / halfLifeDays)
    const prev = out[i - 1].kg
    out.push({ date: series[i].date, kg: prev + alpha * (series[i].kg - prev) })
  }
  return out
}

// Pente en kg/semaine par moindres carrés sur la fenêtre demandée.
// Renvoie null tant qu'il n'y a pas deux jours distincts : une pente sur
// un seul point, ou sur plusieurs pesées du même jour, n'a pas de sens.
export function weeklyRate(series, windowDays = 28) {
  if (!series || series.length < 2) return null
  const last = series[series.length - 1].date
  const pts = series.filter((e) => dayDiff(e.date, last) <= windowDays)
  if (pts.length < 2) return null
  const xs = pts.map((e) => dayDiff(pts[0].date, e.date))
  if (xs[xs.length - 1] === xs[0]) return null
  const n = pts.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = pts.reduce((a, e) => a + e.kg, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (pts[i].kg - my); den += (xs[i] - mx) ** 2 }
  if (den === 0) return null
  return Math.round((num / den) * 7 * 100) / 100
}

// Part du chemin parcourue vers l'objectif, bornée à 0-100 %.
export function goalProgress(series, goal) {
  if (!series.length || !(goal > 0)) return null
  const start = series[0].kg
  const now = series[series.length - 1].kg
  if (Math.abs(goal - start) < 0.05) return Math.abs(now - goal) < 0.05 ? 100 : null
  return Math.max(0, Math.min(100, Math.round((start - now) / (start - goal) * 100)))
}

// Date d'atteinte estimée au rythme actuel. Null si le rythme est nul, ou
// s'il éloigne de l'objectif — annoncer une échéance serait faux.
export function projectGoal(currentKg, goal, rate) {
  if (!(goal > 0) || !rate || !Number.isFinite(rate)) return null
  const remaining = goal - currentKg
  if (Math.abs(remaining) < 0.05) return { days: 0, date: iso(new Date()) }
  if (Math.sign(remaining) !== Math.sign(rate)) return null
  const weeks = remaining / rate
  const days = Math.round(weeks * 7)
  if (!Number.isFinite(days) || days <= 0 || days > 3650) return null
  const d = new Date(); d.setDate(d.getDate() + days)
  return { days, date: iso(d) }
}

// Repères usuels : jusqu'à ~1 % du poids par semaine le rythme est
// considéré comme soutenable ; au-delà, la perte se fait de plus en plus
// aux dépens de la masse maigre. On ne signale donc qu'à partir de 1 %,
// et on n'alerte qu'au-delà de 1,5 % — sanctionner 0,7 % reviendrait à
// décourager un rythme pourtant recommandé.
export function rateVerdict(rate, currentKg) {
  if (rate == null || !(currentKg > 0)) return null
  if (Math.abs(rate) < 0.05) return { level: 'stable', text: 'Poids stable' }
  const pct = Math.abs(rate) / currentKg * 100
  const dir = rate < 0 ? 'Perte' : 'Prise'
  if (pct > 1.5) return { level: 'alert', text: `${dir} très rapide (${pct.toFixed(1)} % / sem.) — au-delà de 1,5 % la masse musculaire trinque.` }
  if (pct > 1) return { level: 'warn', text: `${dir} soutenue (${pct.toFixed(1)} % / sem.) — à surveiller.` }
  return { level: 'ok', text: `${dir} progressive (${pct.toFixed(1)} % / sem.) — rythme durable.` }
}

export function bmi(kg, heightCm) {
  const m = Number(heightCm) / 100
  if (!(kg > 0) || !(m > 0)) return null
  const v = kg / (m * m)
  if (!Number.isFinite(v)) return null
  const value = Math.round(v * 10) / 10
  const label = v < 18.5 ? 'Insuffisance pondérale' : v < 25 ? 'Corpulence normale' : v < 30 ? 'Surpoids' : 'Obésité'
  return { value, label }
}

// Synthèse consommée par l'écran.
export function weightAnalysis(log, { goal, heightCm, windowDays = 28 } = {}) {
  const series = weightSeries(log, 0)
  if (!series.length) return { series: [], trend: [], count: 0 }
  const trend = trendLine(series)
  const current = series[series.length - 1].kg
  const smoothed = Math.round(trend[trend.length - 1].kg * 10) / 10
  const rate = weeklyRate(series, windowDays)
  const kgs = series.map((e) => e.kg)
  return {
    series,
    trend,
    count: series.length,
    current,
    smoothed,
    first: series[0],
    last: series[series.length - 1],
    min: Math.min(...kgs),
    max: Math.max(...kgs),
    totalDelta: Math.round((current - series[0].kg) * 10) / 10,
    rate,
    verdict: rateVerdict(rate, current),
    progress: goalProgress(series, goal),
    projection: projectGoal(smoothed, goal, rate),
    bmi: bmi(current, heightCm),
  }
}

// ============================================================
// Analyse avancée : composition, dépense énergétique, plateau.
// ============================================================

// Énergie contenue dans un kilo de tissu adipeux. Valeur usuelle retenue
// pour convertir une variation de poids en balance calorique.
export const KCAL_PER_KG = 7700

// Masse grasse et masse maigre en kg, dérivées du pourcentage mesuré par
// la balance. C'est la décomposition qui compte : perdre du poids en
// perdant du muscle n'est pas une réussite, et le poids seul ne le dit
// pas.
export function compositionSeries(log) {
  return weightSeries(log, 0)
    .filter((e) => e.fatPct != null)
    .map((e) => {
      const fatKg = Math.round(e.kg * e.fatPct) / 100
      return { date: e.date, kg: e.kg, fatPct: e.fatPct, fatKg, leanKg: Math.round((e.kg - fatKg) * 10) / 10 }
    })
}

// Rythmes séparés de la masse grasse et de la masse maigre, en kg/semaine.
// Le verdict distingue les quatre situations réellement différentes
// qu'un simple « -2 kg » confond.
export function bodyRates(log, windowDays = 56) {
  const comp = compositionSeries(log)
  if (comp.length < 2) return null
  const fatRate = weeklyRate(comp.map((e) => ({ date: e.date, kg: e.fatKg })), windowDays)
  const leanRate = weeklyRate(comp.map((e) => ({ date: e.date, kg: e.leanKg })), windowDays)
  if (fatRate == null && leanRate == null) return null
  const f = fatRate || 0, l = leanRate || 0
  const flat = (v) => Math.abs(v) < 0.05
  let verdict
  if (flat(f) && flat(l)) verdict = { level: 'stable', text: 'Composition stable.' }
  else if (f < 0 && l >= -0.05) verdict = { level: 'ok', text: 'Tu perds du gras en préservant la masse maigre — c’est le scénario visé.' }
  else if (f < 0 && l < -0.05) verdict = { level: 'warn', text: 'Tu perds du gras mais aussi de la masse maigre : vérifie les protéines et garde du renforcement.' }
  else if (f > 0.05 && l > 0.05) verdict = { level: 'warn', text: 'Prise mixte : muscle et gras augmentent tous les deux.' }
  else if (f > 0.05 && l <= 0) verdict = { level: 'alert', text: 'La masse grasse augmente pendant que la masse maigre baisse.' }
  else verdict = { level: 'ok', text: 'Tu gagnes de la masse maigre sans prise de gras notable.' }
  return { fatRate, leanRate, verdict, from: comp[0], to: comp[comp.length - 1], count: comp.length }
}

// Balance énergétique quotidienne impliquée par la variation de poids.
// Négative = déficit.
export function impliedBalance(rateKgPerWeek) {
  if (rateKgPerWeek == null || !Number.isFinite(rateKgPerWeek)) return null
  return Math.round(rateKgPerWeek * KCAL_PER_KG / 7)
}

// Dépense énergétique réelle estimée, en croisant les calories réellement
// consommées et la variation de poids observée sur la même période.
// Cette valeur vaut mieux qu'une formule théorique : elle est mesurée sur
// l'individu. Elle n'a toutefois de sens que si le journal alimentaire est
// suffisamment rempli — d'où le nombre de jours couverts et le niveau de
// confiance renvoyés, plutôt qu'un chiffre présenté comme acquis.
export function estimateTDEE(log, foodLog, { windowDays = 28, minDays = 10 } = {}) {
  const series = weightSeries(log, 0)
  if (series.length < 2) return null
  const rate = weeklyRate(series, windowDays)
  if (rate == null) return null
  const last = series[series.length - 1].date
  const days = []
  for (const [date, entries] of Object.entries(foodLog || {})) {
    if (!Array.isArray(entries) || entries.length === 0) continue
    const d = dayDiff(date, last)
    if (d < 0 || d > windowDays) continue
    const kcal = entries.reduce((a, e) => a + (Number(e && e.k) || 0), 0)
    if (kcal > 0) days.push(kcal)
  }
  if (days.length < minDays) return { insufficient: true, loggedDays: days.length, minDays }
  const meanIntake = Math.round(days.reduce((a, b) => a + b, 0) / days.length)
  const balance = impliedBalance(rate)
  const tdee = Math.round(meanIntake - balance)
  if (!(tdee > 800) || tdee > 8000) return { insufficient: true, loggedDays: days.length, minDays, implausible: true }
  return {
    tdee,
    meanIntake,
    balance,
    loggedDays: days.length,
    windowDays,
    confidence: days.length >= windowDays * 0.8 ? 'haute' : days.length >= windowDays * 0.5 ? 'moyenne' : 'faible',
  }
}

// Plateau : tendance quasi plate sur la période, alors qu'un objectif
// suppose un mouvement. On l'annonce seulement avec assez de recul, sinon
// deux semaines calmes suffiraient à crier au blocage.
export function detectPlateau(log, { weeks = 3, goal = 0 } = {}) {
  if (!(goal > 0)) return null
  const series = weightSeries(log, 0)
  if (series.length < 3) return null
  const last = series[series.length - 1]
  const span = dayDiff(series[0].date, last.date)
  if (span < weeks * 7) return null
  const rate = weeklyRate(series, weeks * 7)
  if (rate == null) return null
  const remaining = goal - last.kg
  if (Math.abs(remaining) < 0.5) return null
  if (Math.abs(rate) >= 0.1) return null
  return { weeks, rate, remaining: Math.round(remaining * 10) / 10 }
}

// Export CSV de l'historique, pour sortir ses données de l'app.
export function toCsv(log) {
  const cols = ['date', 'kg', 'fatPct', 'musclePct', 'waterPct', 'boneKg', 'visceral', 'bmi', 'metabolicAge', 'waist', 'hip', 'chest', 'arm', 'thigh']
  const rows = weightSeries(log, 0)
  const head = cols.join(',')
  const body = rows.map((e) => cols.map((c) => (e[c] == null ? '' : e[c])).join(','))
  return [head, ...body].join('\n')
}
