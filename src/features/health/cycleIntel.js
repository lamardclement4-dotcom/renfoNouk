// ============================================================
// Analyse du cycle sur plusieurs mois.
//
// L'écran enregistrait énergie, sommeil, douleurs, humeur, flux et
// symptômes jour après jour — sans jamais rien en relire. Toutes les
// prédictions reposaient sur une longueur de cycle saisie une fois pour
// toutes, que rien ne confrontait à la réalité observée.
//
// Ce module fait l'inverse : il part des règles réellement enregistrées,
// en déduit les longueurs de cycle vécues, et croise le ressenti quotidien
// avec la phase où il a été noté. C'est ce croisement qui donne une
// information — « tes crampes tombent sur les cinq jours précédant tes
// règles » — qu'aucune moyenne globale ne peut produire.
//
// Repères de suivi, pas un diagnostic. Un cycle irrégulier ou douloureux
// relève d'un avis médical, ce que le texte des conseils rappelle.
// ============================================================

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const shiftISO = (iso, delta) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + delta)
  return x.toISOString().slice(0, 10)
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

// ─── Règles réellement observées ─────────────────────────────
// Les jours de flux enregistrés forment des blocs. On tolère un trou d'un
// jour à l'intérieur d'un bloc : quelqu'un qui oublie de noter un jour ne
// doit pas voir ses règles comptées comme deux cycles distincts.
const MAX_GAP_WITHIN_PERIOD = 1

export function periodBlocks(track) {
  const days = Object.keys(track || {})
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && num((track[d] || {}).flux) > 0)
    .sort()
  const blocks = []
  for (const d of days) {
    const last = blocks[blocks.length - 1]
    if (last && daysBetween(last[last.length - 1], d) <= MAX_GAP_WITHIN_PERIOD + 1) last.push(d)
    else blocks.push([d])
  }
  return blocks
}

// Dates de début de règles, les blocs de flux complétés par les débuts
// saisis explicitement. Deux débuts à moins de dix jours d'écart désignent
// le même épisode : on ne garde que le plus ancien, sinon un bouton
// « mes règles ont commencé » pressé deux fois créerait un cycle fantôme
// de deux jours.
const MIN_CYCLE_DAYS = 10

export function periodStarts(cycle) {
  const c = cycle || {}
  const raw = periodBlocks(c.track).map((b) => b[0])
    .concat((c.periodStarts || []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))
  if (c.startDate && /^\d{4}-\d{2}-\d{2}$/.test(c.startDate)) raw.push(c.startDate)
  const sorted = [...new Set(raw)].sort()
  const out = []
  for (const d of sorted) {
    if (out.length && daysBetween(out[out.length - 1], d) < MIN_CYCLE_DAYS) continue
    out.push(d)
  }
  return out
}

// Longueur de chaque cycle vécu, du plus ancien au plus récent.
// Au-delà de 60 jours, l'écart traduit une période sans suivi plutôt
// qu'un cycle réel : le compter fausserait la moyenne.
const MAX_PLAUSIBLE_CYCLE = 60

export function cycleLengths(cycle) {
  const starts = periodStarts(cycle)
  const out = []
  for (let i = 1; i < starts.length; i++) {
    const len = daysBetween(starts[i - 1], starts[i])
    if (len >= MIN_CYCLE_DAYS && len <= MAX_PLAUSIBLE_CYCLE) out.push({ from: starts[i - 1], to: starts[i], len })
  }
  return out
}

// Régularité. Le repère d'usage retient 21 à 35 jours comme fourchette
// habituelle, et un écart de plus de sept à neuf jours entre le cycle le
// plus court et le plus long comme signe d'irrégularité.
export function cycleStats(cycle) {
  const lens = cycleLengths(cycle).map((c) => c.len)
  if (!lens.length) return null
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length
  const min = Math.min(...lens)
  const max = Math.max(...lens)
  const spread = max - min
  const stats = {
    count: lens.length,
    mean: Math.round(mean * 10) / 10,
    min, max, spread,
    lengths: lens,
  }
  if (lens.length < 3) {
    stats.level = 'unknown'
    stats.text = `${lens.length} cycle${lens.length > 1 ? 's' : ''} complet${lens.length > 1 ? 's' : ''} enregistré${lens.length > 1 ? 's' : ''} : il en faut au moins trois pour juger de la régularité.`
    return stats
  }
  if (spread <= 4) { stats.level = 'ok'; stats.text = `Cycles réguliers (${min} à ${max} jours) : les prédictions de l’application seront fiables.` }
  else if (spread <= 8) { stats.level = 'ok'; stats.text = `Variation modérée (${min} à ${max} jours), ce qui reste dans l’ordinaire.` }
  else { stats.level = 'warn'; stats.text = `Tes cycles varient de ${spread} jours (${min} à ${max}) : les prédictions resteront approximatives. Si cela dure, c’est à évoquer avec un professionnel de santé.` }
  if (mean < 21 || mean > 35) {
    stats.level = 'warn'
    stats.text += ` Ta moyenne de ${stats.mean} jours sort de la fourchette habituelle de 21 à 35 jours.`
  }
  return stats
}

// Écart entre la longueur déclarée dans les réglages et celle réellement
// observée. Sans ce rapprochement, une valeur saisie une fois pilote
// indéfiniment des prédictions que les faits contredisent.
export function lengthDrift(cycle) {
  const stats = cycleStats(cycle)
  if (!stats || stats.count < 2) return null
  const declared = num((cycle || {}).cycleLen) || 28
  const observed = Math.round(stats.mean)
  const diff = observed - declared
  if (Math.abs(diff) < 2) return null
  return { declared, observed, diff, text: `Tu as réglé ${declared} jours, mais tes ${stats.count} derniers cycles font ${observed} jours en moyenne.` }
}

// ─── Ressenti croisé avec la phase ───────────────────────────
export const PHASE_IDS = ['menstruation', 'folliculaire', 'ovulation', 'luteale']

export const PHASE_LABELS = {
  menstruation: 'Menstruation',
  folliculaire: 'Folliculaire',
  ovulation: 'Ovulation',
  luteale: 'Lutéale',
}

// Phase d'une date donnée, calée sur le début de règles qui la précède.
// Rattacher chaque jour à son cycle réel plutôt qu'à une projection depuis
// une date unique évite que le décalage accumulé sur plusieurs mois ne
// range les symptômes dans la mauvaise phase.
export function phaseOfDate(iso, cycle) {
  const starts = periodStarts(cycle)
  if (!starts.length) return null
  let start = null
  for (const s of starts) { if (s <= iso) start = s; else break }
  if (!start) return null
  const stats = cycleStats(cycle)
  const len = stats && stats.count >= 2 ? Math.round(stats.mean) : (num((cycle || {}).cycleLen) || 28)
  const pl = num((cycle || {}).periodLen) || 5
  const day = daysBetween(start, iso) + 1
  if (day > len + 15) return null // suivi interrompu : rien à en conclure
  if (day <= pl) return { phase: 'menstruation', day, len, start }
  if (day <= Math.round(len * 0.46)) return { phase: 'folliculaire', day, len, start }
  if (day <= Math.round(len * 0.57)) return { phase: 'ovulation', day, len, start }
  return { phase: 'luteale', day, len, start }
}

// Chaque jour suivi, enrichi de sa phase et du nombre de jours restant
// avant les règles suivantes.
export function trackedDays(cycle) {
  const c = cycle || {}
  const track = c.track || {}
  const starts = periodStarts(c)
  const out = []
  for (const iso of Object.keys(track).sort()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue
    const e = track[iso] || {}
    const p = phaseOfDate(iso, c)
    if (!p) continue
    // Jours restant avant le début de règles suivant, quand il est connu.
    const next = starts.find((s) => s > iso)
    out.push({
      date: iso, phase: p.phase, day: p.day,
      daysToPeriod: next ? daysBetween(iso, next) : null,
      energy: num(e.energy), sleep: num(e.sleep), pain: num(e.pain),
      mood: num(e.mood), flux: num(e.flux),
      symptoms: Array.isArray(e.symptoms) ? e.symptoms : [],
    })
  }
  return out
}

// Moyenne d'une métrique par phase. Les phases sans donnée ne sont pas
// renvoyées : afficher « — » pour trois phases sur quatre ne renseigne
// personne.
export function metricByPhase(days, key, { minDays = 2 } = {}) {
  const out = []
  for (const phase of PHASE_IDS) {
    const vals = days.filter((d) => d.phase === phase && d[key] != null && d[key] > 0).map((d) => d[key])
    if (vals.length < minDays) continue
    out.push({ phase, label: PHASE_LABELS[phase], n: vals.length, mean: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 })
  }
  return out
}

// Phases où une métrique est la plus basse et la plus haute, avec l'écart.
// C'est ce contraste, pas la valeur absolue, qui permet d'adapter
// l'entraînement à sa propre physiologie plutôt qu'à une moyenne théorique.
export function metricContrast(days, key, { minPhases = 2, minGap = 0.6 } = {}) {
  const byPhase = metricByPhase(days, key)
  if (byPhase.length < minPhases) return null
  const sorted = [...byPhase].sort((a, b) => a.mean - b.mean)
  const low = sorted[0]
  const high = sorted[sorted.length - 1]
  const gap = Math.round((high.mean - low.mean) * 10) / 10
  return { low, high, gap, byPhase, significant: gap >= minGap }
}

// Fréquence de chaque symptôme par phase, rapportée au nombre de jours
// suivis dans cette phase — sans quoi une phase davantage renseignée
// paraîtrait systématiquement plus symptomatique.
export function symptomsByPhase(days, { minOccurrences = 2 } = {}) {
  const totals = {}
  const counts = {}
  for (const d of days) {
    totals[d.phase] = (totals[d.phase] || 0) + 1
    for (const s of d.symptoms) {
      if (!counts[s]) counts[s] = {}
      counts[s][d.phase] = (counts[s][d.phase] || 0) + 1
    }
  }
  const out = []
  for (const s of Object.keys(counts)) {
    const total = Object.values(counts[s]).reduce((a, b) => a + b, 0)
    if (total < minOccurrences) continue
    const phases = PHASE_IDS
      .filter((p) => counts[s][p] && totals[p])
      .map((p) => ({ phase: p, label: PHASE_LABELS[p], n: counts[s][p], pct: Math.round(counts[s][p] / totals[p] * 100) }))
      .sort((a, b) => b.pct - a.pct)
    if (!phases.length) continue
    out.push({ symptom: s, total, phases, top: phases[0] })
  }
  return out.sort((a, b) => b.total - a.total)
}

// ─── Syndrome prémenstruel ───────────────────────────────────
// Les jours prémenstruels ne se déduisent pas d'une phase théorique mais
// de la distance au début de règles suivant, qui est un fait enregistré.
export const PMS_WINDOW_DAYS = 5

export function pmsPattern(days, { minWindow = 3, minOther = 3 } = {}) {
  const known = days.filter((d) => d.daysToPeriod != null)
  const win = known.filter((d) => d.daysToPeriod >= 1 && d.daysToPeriod <= PMS_WINDOW_DAYS)
  const other = known.filter((d) => d.daysToPeriod > PMS_WINDOW_DAYS)
  if (win.length < minWindow || other.length < minOther) return null
  const rate = (arr) => arr.reduce((a, d) => a + d.symptoms.length, 0) / arr.length
  const meanOf = (arr, k) => {
    const v = arr.filter((d) => d[k] != null && d[k] > 0).map((d) => d[k])
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null
  }
  const symptomsWin = Math.round(rate(win) * 10) / 10
  const symptomsOther = Math.round(rate(other) * 10) / 10
  const moodWin = meanOf(win, 'mood')
  const moodOther = meanOf(other, 'mood')
  const painWin = meanOf(win, 'pain')
  const painOther = meanOf(other, 'pain')
  const flagged = (symptomsWin - symptomsOther >= 1)
    || (moodWin != null && moodOther != null && moodOther - moodWin >= 0.8)
    || (painWin != null && painOther != null && painWin - painOther >= 0.8)
  // Symptômes nettement plus fréquents dans la fenêtre que hors d'elle.
  const topSymptoms = (() => {
    const cnt = {}
    for (const d of win) for (const s of d.symptoms) cnt[s] = (cnt[s] || 0) + 1
    return Object.keys(cnt)
      .map((s) => ({ symptom: s, pct: Math.round(cnt[s] / win.length * 100) }))
      .filter((x) => x.pct >= 40)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4)
  })()
  return {
    windowDays: win.length, otherDays: other.length,
    symptomsWin, symptomsOther,
    moodWin, moodOther, painWin, painOther,
    topSymptoms, flagged,
  }
}

// ─── Fiabilité des prédictions ───────────────────────────────
// Pour chaque cycle achevé, l'écart entre la date que l'application aurait
// annoncée (début précédent + longueur alors connue) et la date réelle.
export function predictionAccuracy(cycle) {
  const lens = cycleLengths(cycle)
  if (lens.length < 2) return null
  const declared = num((cycle || {}).cycleLen) || 28
  const errors = []
  for (let i = 1; i < lens.length; i++) {
    const known = lens.slice(0, i).map((c) => c.len)
    const predicted = Math.round(known.reduce((a, b) => a + b, 0) / known.length)
    errors.push({ actual: lens[i].len, predicted, error: lens[i].len - predicted })
  }
  const mae = Math.round(errors.reduce((a, e) => a + Math.abs(e.error), 0) / errors.length * 10) / 10
  const declaredMae = Math.round(lens.reduce((a, c) => a + Math.abs(c.len - declared), 0) / lens.length * 10) / 10
  return { errors, mae, declaredMae, n: errors.length, betterThanDeclared: mae < declaredMae }
}

// ─── Synthèse ────────────────────────────────────────────────
export function cycleAnalysis(cycle) {
  const c = cycle || {}
  const starts = periodStarts(c)
  const days = trackedDays(c)
  const stats = cycleStats(c)
  const drift = lengthDrift(c)
  const energy = metricContrast(days, 'energy')
  const pain = metricContrast(days, 'pain')
  const sleep = metricContrast(days, 'sleep')
  const symptoms = symptomsByPhase(days)
  const pms = pmsPattern(days)
  const accuracy = predictionAccuracy(c)

  const tips = []
  if (starts.length < 2) {
    tips.push('Enregistre le premier jour de tes règles à chaque cycle : c’est ce qui permet à l’application de caler ses prédictions sur ta réalité plutôt que sur une moyenne théorique.')
  }
  if (drift) tips.push(`${drift.text} Mettre le réglage à jour rendra les prédictions plus justes.`)
  if (stats && stats.level === 'warn') tips.push(stats.text)
  if (energy && energy.significant) {
    tips.push(`Ton énergie est la plus basse en phase ${energy.low.label.toLowerCase()} (${String(energy.low.mean).replace('.', ',')}/5) et la plus haute en phase ${energy.high.label.toLowerCase()} (${String(energy.high.mean).replace('.', ',')}/5) : place tes séances les plus dures sur cette seconde fenêtre.`)
  }
  if (pain && pain.significant) {
    tips.push(`Tes douleurs culminent en phase ${pain.high.label.toLowerCase()} (${String(pain.high.mean).replace('.', ',')}/5 contre ${String(pain.low.mean).replace('.', ',')} ailleurs) : allège le volume et privilégie la mobilité sur ces jours-là.`)
  }
  if (pms && pms.flagged) {
    const list = pms.topSymptoms.map((s) => s.symptom.toLowerCase()).join(', ')
    tips.push(`Un motif prémenstruel ressort sur les ${PMS_WINDOW_DAYS} jours précédant tes règles${list ? ` (${list})` : ''} : anticiper une semaine plus légère à ce moment vaut mieux que la subir.`)
  }
  if (accuracy && accuracy.n >= 2 && accuracy.mae > 3) {
    tips.push(`Les prédictions se trompent en moyenne de ${String(accuracy.mae).replace('.', ',')} jours : à considérer comme un ordre de grandeur, pas une date.`)
  }
  if (!tips.length) tips.push('Continue à noter ton ressenti : les tendances par phase apparaîtront au fil des cycles.')

  return {
    starts, days, nights: days.length, stats, drift,
    energy, pain, sleep, symptoms, pms, accuracy, tips,
  }
}
