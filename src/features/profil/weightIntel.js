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
export function weightSeries(log, days) {
  const byDay = {}
  for (const e of log || []) {
    if (!e || !e.date || !(Number(e.kg) > 0)) continue
    byDay[e.date] = Number(e.kg)
  }
  let out = Object.keys(byDay).sort().map((date) => ({ date, kg: byDay[date] }))
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
