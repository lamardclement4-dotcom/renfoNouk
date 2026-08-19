// ============================================================
// Analyse de l'alimentation sur la durée.
//
// Chaque aliment était enregistré, et l'écran n'en tirait que deux
// choses : le total du jour face aux objectifs, et un graphe de calories
// sur sept jours. Or l'alimentation ne se juge pas sur une journée — un
// dimanche copieux ne dit rien — mais sur une moyenne, et sur ce qu'on
// n'a jamais affiché : les protéines rapportées au poids de corps, la
// régularité des apports, et la répartition entre macronutriments.
//
// Ce module ajoute aussi la notion de journée réellement renseignée. Une
// journée où l'on a noté un fruit puis oublié le reste vaut 90 kcal dans
// le journal : la compter comme une journée d'apport tire toutes les
// moyennes vers le bas, et fausse l'estimation du métabolisme qui s'en
// sert.
//
// Repères nutritionnels d'usage courant, pas une prescription
// diététique.
// ============================================================

// Affichage des décimales à la française : « 1,4 » et non « 1.4 ».
const fr = (v) => String(v).replace('.', ',')

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const todayISO = () => {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const shiftISO = (iso, delta) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + delta)
  return x.toISOString().slice(0, 10)
}

// ─── Journée renseignée ──────────────────────────────────────
// En dessous de ce seuil, la journée décrit un oubli de saisie plutôt
// qu'un apport réel. Un adulte sous 600 kcal sur une journée entière est
// l'exception ; dans un journal, c'est presque toujours une saisie
// interrompue.
export const MIN_LOGGED_KCAL = 600

export function loggedThreshold(targetKcal) {
  const t = num(targetKcal)
  if (t && t > 0) return Math.max(MIN_LOGGED_KCAL, Math.round(t * 0.5))
  return MIN_LOGGED_KCAL
}

export function dayTotals(entries) {
  const out = { k: 0, p: 0, g: 0, l: 0, fib: 0, items: 0 }
  for (const e of entries || []) {
    if (!e) continue
    out.k += num(e.k) || 0
    out.p += num(e.p) || 0
    out.g += num(e.g) || 0
    out.l += num(e.l) || 0
    out.fib += num(e.fib) || 0
    out.items++
  }
  return {
    k: Math.round(out.k), p: Math.round(out.p), g: Math.round(out.g),
    l: Math.round(out.l), fib: Math.round(out.fib * 10) / 10, items: out.items,
  }
}

// Journées de la fenêtre, avec la distinction entre journée complète et
// saisie partielle. Les deux sont renvoyées : masquer les partielles
// serait perdre l'information qu'il y a eu un oubli.
export function daySeries(db, { days = 28, today, targetKcal } = {}) {
  const ref = today || todayISO()
  const log = (db && db.foodLog) || {}
  const thr = loggedThreshold(targetKcal != null ? targetKcal : (db && db.foodTargets && db.foodTargets.kcal))
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftISO(ref, -i)
    const entries = log[date]
    if (!Array.isArray(entries) || !entries.length) continue
    const t = dayTotals(entries)
    if (t.k <= 0) continue
    out.push({ date, ...t, complete: t.k >= thr })
  }
  return out
}

// ─── Moyennes ────────────────────────────────────────────────
// Calculées sur les seules journées complètes : c'est ce que la moyenne
// prétend décrire.
export function averages(series) {
  const full = (series || []).filter((d) => d.complete)
  if (!full.length) return null
  const mean = (k) => Math.round(full.reduce((a, d) => a + d[k], 0) / full.length * 10) / 10
  return {
    days: full.length, partialDays: (series || []).length - full.length,
    kcal: Math.round(full.reduce((a, d) => a + d.k, 0) / full.length),
    prot: mean('p'), gluc: mean('g'), lip: mean('l'), fib: mean('fib'),
  }
}

// Régularité des apports. Une moyenne correcte peut recouvrir une
// alternance de journées très basses et très hautes, que la moyenne seule
// ne montre jamais.
export function consistency(series) {
  const full = (series || []).filter((d) => d.complete)
  if (full.length < 4) return null
  const mean = full.reduce((a, d) => a + d.k, 0) / full.length
  const sd = Math.sqrt(full.reduce((a, d) => a + (d.k - mean) ** 2, 0) / full.length)
  const cv = mean > 0 ? Math.round(sd / mean * 1000) / 10 : null
  let level, text
  if (cv == null) { level = 'unknown'; text = '' }
  else if (cv < 15) { level = 'ok'; text = `Apports réguliers d’un jour à l’autre (±${Math.round(sd)} kcal).` }
  else if (cv < 25) { level = 'ok'; text = `Variation modérée d’un jour à l’autre (±${Math.round(sd)} kcal), ce qui est ordinaire.` }
  else { level = 'warn'; text = `Apports très variables (±${Math.round(sd)} kcal autour de ${Math.round(mean)}) : la moyenne cache des journées très basses et très hautes.` }
  return { sd: Math.round(sd), mean: Math.round(mean), cv, level, text }
}

// ─── Protéines rapportées au poids ───────────────────────────
// Le chiffre le plus actionnable pour quelqu'un qui s'entraîne, et le
// seul que l'écran n'affichait pas : 120 g de protéines ne veulent pas
// dire la même chose à 55 kg qu'à 95 kg.
export const PROT_MIN_ACTIVE = 1.4
export const PROT_MAX_USEFUL = 2.2

export function proteinPerKg(avg, weightKg) {
  const w = num(weightKg)
  if (!avg || !w || w <= 0) return null
  const perKg = Math.round(avg.prot / w * 100) / 100
  let level, text
  if (perKg < 1) { level = 'low'; text = `${fr(perKg)} g/kg : nettement sous le repère de ${fr(PROT_MIN_ACTIVE)} g/kg retenu pour quelqu’un qui s’entraîne régulièrement.` }
  else if (perKg < PROT_MIN_ACTIVE) { level = 'low'; text = `${fr(perKg)} g/kg : sous le repère de ${fr(PROT_MIN_ACTIVE)} g/kg pour un entraînement régulier.` }
  else if (perKg <= PROT_MAX_USEFUL) { level = 'ok'; text = `${fr(perKg)} g/kg : dans la fourchette de ${fr(PROT_MIN_ACTIVE)} à ${fr(PROT_MAX_USEFUL)} g/kg.` }
  else { level = 'high'; text = `${fr(perKg)} g/kg : au-delà de ${fr(PROT_MAX_USEFUL)} g/kg, le supplément n’apporte pas grand-chose de plus.` }
  return { perKg, weightKg: w, level, text, targetMin: Math.round(w * PROT_MIN_ACTIVE), targetMax: Math.round(w * PROT_MAX_USEFUL) }
}

// ─── Répartition des macronutriments ─────────────────────────
// En part des calories, pas en grammes : c'est ainsi que se lisent les
// fourchettes de référence, et ça évite de comparer des grammes de
// lipides à des grammes de glucides qui ne pèsent pas le même nombre de
// calories.
export const KCAL_PER_G = { p: 4, g: 4, l: 9 }
export const MACRO_RANGES = { p: [10, 35], g: [45, 65], l: [20, 35] }
export const MACRO_LABELS = { p: 'Protéines', g: 'Glucides', l: 'Lipides' }

export function macroSplit(avg) {
  if (!avg) return null
  const kp = avg.prot * KCAL_PER_G.p
  const kg = avg.gluc * KCAL_PER_G.g
  const kl = avg.lip * KCAL_PER_G.l
  const total = kp + kg + kl
  if (total <= 0) return null
  const pct = (v) => Math.round(v / total * 1000) / 10
  const out = { p: pct(kp), g: pct(kg), l: pct(kl), fromMacros: Math.round(total) }
  out.items = ['p', 'g', 'l'].map((k) => {
    const [lo, hi] = MACRO_RANGES[k]
    const v = out[k]
    return { key: k, label: MACRO_LABELS[k], pct: v, lo, hi, level: v < lo ? 'low' : v > hi ? 'high' : 'ok' }
  })
  // Écart entre les calories déduites des macros et celles enregistrées :
  // un écart marqué trahit des aliments dont les macros sont incomplètes.
  out.declaredKcal = avg.kcal
  out.gap = avg.kcal > 0 ? Math.round((total - avg.kcal) / avg.kcal * 1000) / 10 : null
  return out
}

// ─── Écart aux objectifs ─────────────────────────────────────
export function vsTargets(avg, targets) {
  if (!avg || !targets) return null
  const cmp = (val, target, key, label, unit) => {
    const t = num(target)
    if (!t || t <= 0) return null
    const delta = Math.round((val - t) * 10) / 10
    const pct = Math.round(delta / t * 1000) / 10
    return { key, label, unit, value: val, target: t, delta, pct, level: Math.abs(pct) <= 10 ? 'ok' : pct > 0 ? 'over' : 'under' }
  }
  return [
    cmp(avg.kcal, targets.kcal, 'kcal', 'Calories', 'kcal'),
    cmp(avg.prot, targets.prot, 'prot', 'Protéines', 'g'),
    cmp(avg.gluc, targets.gluc, 'gluc', 'Glucides', 'g'),
    cmp(avg.lip, targets.lip, 'lip', 'Lipides', 'g'),
    cmp(avg.fib, targets.fib || 30, 'fib', 'Fibres', 'g'),
  ].filter(Boolean)
}

// ─── Assiduité du journal ────────────────────────────────────
// Une moyenne sur quatre journées renseignées en un mois ne décrit rien.
// Le dire vaut mieux que présenter le chiffre comme s'il valait.
export function logging(series, days) {
  const total = (series || []).length
  const full = (series || []).filter((d) => d.complete).length
  const pct = days > 0 ? Math.round(full / days * 100) : 0
  let level, text
  if (full === 0) { level = 'none'; text = 'Aucune journée complète enregistrée.' }
  else if (pct < 30) { level = 'low'; text = `${full} journées complètes sur ${days} : les moyennes ci-dessous ne portent que sur ces journées-là.` }
  else if (pct < 70) { level = 'mid'; text = `${full} journées complètes sur ${days}.` }
  else { level = 'ok'; text = `${full} journées complètes sur ${days} — suivi assidu.` }
  return { days, logged: total, full, partial: total - full, pct, level, text }
}

// ─── Synthèse ────────────────────────────────────────────────
export function nutriAnalysis(db, { days = 28, today } = {}) {
  const targets = (db && db.foodTargets) || null
  const series = daySeries(db, { days, today, targetKcal: targets && targets.kcal })
  const avg = averages(series)
  const log = logging(series, days)
  const weightKg = db && db.profilePhys ? num(db.profilePhys.poids) : null
  const prot = proteinPerKg(avg, weightKg)
  const split = macroSplit(avg)
  const cons = consistency(series)
  const gaps = vsTargets(avg, targets)

  const tips = []
  if (!avg) {
    tips.push(`Aucune journée complète sur ${days} jours. Une journée n’est comptée que si elle dépasse ${MIN_LOGGED_KCAL} kcal : en dessous, c’est une saisie interrompue, et la faire entrer dans une moyenne la fausserait.`)
  } else {
    if (log.partial >= 3) tips.push(`${log.partial} journées n’ont été renseignées qu’en partie : elles sont écartées des moyennes plutôt que de les tirer vers le bas.`)
    if (prot && prot.level === 'low') tips.push(`${prot.text} À ton poids, cela ferait ${prot.targetMin} à ${prot.targetMax} g par jour.`)
    if (cons && cons.level === 'warn') tips.push(cons.text)
    if (split) {
      const off = split.items.filter((m) => m.level !== 'ok')
      if (off.length) {
        const m = off[0]
        tips.push(`${m.label} : ${m.pct} % de tes calories, ${m.level === 'low' ? 'sous' : 'au-dessus de'} la fourchette de référence (${m.lo}–${m.hi} %).`)
      }
      if (split.gap != null && split.gap <= -12) {
        tips.push(`Les macronutriments enregistrés ne couvrent que ${Math.round(100 + split.gap)} % des calories du journal : certains aliments ont des valeurs incomplètes.`)
      }
    }
    if (gaps) {
      const bad = gaps.filter((g) => g.level !== 'ok')
      if (bad.length) {
        const g = bad[0]
        tips.push(`${g.label} : ${g.value} ${g.unit} en moyenne contre ${g.target} visés (${g.pct > 0 ? '+' : ''}${g.pct} %).`)
      }
    } else if (!targets) {
      tips.push('Aucun objectif défini : les moyennes existent mais rien ne permet de dire si elles conviennent.')
    }
    if (log.level === 'low') tips.push(log.text)
  }
  if (!tips.length) tips.push('Apports réguliers et conformes à tes objectifs. Rien à ajuster.')

  return { days, series, averages: avg, logging: log, protein: prot, split, consistency: cons, gaps, targets, tips }
}
