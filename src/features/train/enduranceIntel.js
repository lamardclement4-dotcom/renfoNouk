// ============================================================
// Course, vélo et natation : ce que les chiffres déjà saisis
// permettent de calculer et qui ne l'était pas.
//
// Ces trois disciplines enregistrent distance, temps, puissance ou
// longueurs depuis toujours — et l'application n'en tirait qu'une allure
// affichée à côté de la séance. Aucun record par distance, aucune
// estimation de potentiel, aucune progression de volume, aucune
// prédiction. Le chiffre était noté, jamais relu.
//
// Chaque discipline a sa logique propre, d'où trois sections distinctes
// plutôt qu'une moyenne commune : on ne compare pas une allure au
// kilomètre à une puissance en watts.
//
// Repères d'entraînement d'usage courant, pas des prescriptions.
// ============================================================

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

// `x || []` ne protège que de `null` et `undefined`. Une liste stockée en
// base peut revenir sous une autre forme — écriture partielle, donnée écrite
// par une version antérieure — et l'objet passe alors la garde pour faire
// échouer le `.filter` juste après. L'écran entier meurt, loin de sa cause.
function asList(v) {
  return Array.isArray(v) ? v.filter((x) => x != null) : []
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

// « 18:30 » vaut dix-huit minutes trente, « 1:35:00 » une heure
// trente-cinq. Le champ est libre, les deux formes coexistent dans les
// séances déjà enregistrées.
export function parseTime(t) {
  if (t == null || t === '') return null
  const parts = String(t).trim().split(':').map((x) => parseInt(x, 10))
  if (parts.some((x) => !Number.isFinite(x) || x < 0)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

export function fmtTime(sec) {
  const s = num(sec)
  if (s == null || s < 0) return null
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = Math.round(s % 60)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return h > 0 ? `${h}:${p(m)}:${p(ss)}` : `${m}:${p(ss)}`
}

// Allure au format usuel « 4'32" ».
export function fmtPace(secPerKm) {
  const s = num(secPerKm)
  if (s == null || s <= 0) return null
  const m = Math.floor(s / 60)
  const ss = Math.round(s % 60)
  return `${m}'${ss < 10 ? '0' : ''}${ss}"`
}

function sessionsOf(db, sports, { days, today }) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  return (asList(db && db.planningSessions))
    .filter((s) => s && s.statut === 'realise' && s.date && s.date >= from && s.date <= ref && sports.includes(s.sport))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ============================================================
// COURSE
// ============================================================
export const RUN_SPORTS = ['course', 'demi', 'fond', 'trail', 'sprint']

// Distances de référence, avec la tolérance qui permet de reconnaître une
// sortie « autour de dix kilomètres » comme un dix kilomètres. Sans elle,
// un 9,8 km ne serait jamais comparé à un 10,2 km alors que c'est la même
// performance.
export const RUN_DISTANCES = [
  { id: '5k', label: '5 km', km: 5, tol: 0.4 },
  { id: '10k', label: '10 km', km: 10, tol: 0.7 },
  { id: 'semi', label: 'Semi-marathon', km: 21.1, tol: 1.2 },
  { id: 'marathon', label: 'Marathon', km: 42.2, tol: 2 },
]

export function runEfforts(db, { days = 365, today } = {}) {
  const out = []
  for (const s of sessionsOf(db, RUN_SPORTS, { days, today })) {
    const km = num(s.data && s.data.distance)
    const sec = parseTime(s.data && s.data.temps)
    if (!km || km <= 0 || !sec || sec <= 0) continue
    out.push({
      date: s.date, sport: s.sport, km, sec,
      pace: Math.round(sec / km),
      denivele: num(s.data && s.data.denivele) || 0,
      cadence: num(s.data && s.data.cadence),
      fc: num(s.data && s.data.fc),
      type: (s.data && s.data.seance_type) || null,
    })
  }
  return out
}

// Meilleur temps par distance de référence. Le dénivelé exclut les
// sorties trop vallonnées d'un record : comparer un dix kilomètres plat à
// un dix kilomètres à 400 m de D+ n'aurait pas de sens.
export const FLAT_DPLUS_PER_KM = 15

export function runRecords(efforts) {
  const out = []
  for (const d of RUN_DISTANCES) {
    const cands = efforts.filter((e) => Math.abs(e.km - d.km) <= d.tol && e.denivele <= d.km * FLAT_DPLUS_PER_KM)
    if (!cands.length) continue
    const best = cands.reduce((m, e) => (e.pace < m.pace ? e : m), cands[0])
    out.push({
      ...d, date: best.date, km: best.km, sec: best.sec, pace: best.pace,
      time: fmtTime(best.sec), paceLabel: fmtPace(best.pace), attempts: cands.length,
    })
  }
  return out
}

// Formule de Riegel : prédiction d'un temps sur une autre distance à
// partir d'une performance connue. L'exposant 1,06 est la valeur usuelle.
// Elle perd sa validité quand on extrapole trop loin — d'où le garde-fou.
export const RIEGEL_EXP = 1.06
export const RIEGEL_MAX_RATIO = 4

export function riegel(knownSec, knownKm, targetKm) {
  const t = num(knownSec); const k = num(knownKm); const g = num(targetKm)
  if (!t || !k || !g || t <= 0 || k <= 0 || g <= 0) return null
  const ratio = g > k ? g / k : k / g
  if (ratio > RIEGEL_MAX_RATIO) return null
  return Math.round(t * Math.pow(g / k, RIEGEL_EXP))
}

export function runPredictions(records) {
  if (!records.length) return []
  // On part de la performance la plus récente parmi les records, plutôt
  // que de la plus longue : elle décrit mieux la forme actuelle.
  const base = records.reduce((m, r) => (r.date > m.date ? r : m), records[0])
  return RUN_DISTANCES
    .filter((d) => Math.abs(d.km - base.km) > 0.5)
    .map((d) => {
      const sec = riegel(base.sec, base.km, d.km)
      return sec == null ? null : { ...d, sec, time: fmtTime(sec), pace: Math.round(sec / d.km), paceLabel: fmtPace(Math.round(sec / d.km)) }
    })
    .filter(Boolean)
    .map((p) => ({ ...p, from: { label: base.label, time: base.time } }))
}

// Progression du volume hebdomadaire. Le repère d'usage veut une hausse
// d'environ 10 % par semaine : au-delà, l'adaptation ne suit pas.
export const VOLUME_STEP_PCT = 10

export function runVolume(efforts, { weeks = 8, today } = {}) {
  const ref = today || todayISO()
  const out = []
  for (let w = weeks - 1; w >= 0; w--) {
    const end = shiftISO(ref, -7 * w)
    const start = shiftISO(end, -6)
    const items = efforts.filter((e) => e.date >= start && e.date <= end)
    out.push({
      start, end,
      km: Math.round(items.reduce((a, e) => a + e.km, 0) * 10) / 10,
      sessions: items.length,
      denivele: items.reduce((a, e) => a + e.denivele, 0),
    })
  }
  const withKm = out.filter((w) => w.km > 0)
  let jump = null
  if (out.length >= 2) {
    const last = out[out.length - 1]
    const prev = out[out.length - 2]
    if (prev.km > 0) {
      const pct = Math.round((last.km - prev.km) / prev.km * 100)
      if (pct > VOLUME_STEP_PCT * 1.5) {
        jump = { pct, from: prev.km, to: last.km, level: 'warn', text: `Ton volume de course est passé de ${prev.km} à ${last.km} km d'une semaine à l'autre, soit +${pct} %. Le repère d'usage est d'environ ${VOLUME_STEP_PCT} % : au-delà, les tendons et les os s'adaptent moins vite que le souffle.` }
      }
    }
  }
  return { weeks: out, mean: withKm.length ? Math.round(withKm.reduce((a, w) => a + w.km, 0) / withKm.length * 10) / 10 : 0, jump }
}

// Cadence de foulée. Une cadence basse allonge la foulée et augmente
// l'impact à chaque appui ; le repère courant se situe autour de 170 à
// 180 pas par minute.
export const CADENCE_LOW = 165

export function runCadence(efforts) {
  const withC = efforts.filter((e) => e.cadence && e.cadence > 0)
  if (withC.length < 3) return null
  const mean = Math.round(withC.reduce((a, e) => a + e.cadence, 0) / withC.length)
  return {
    mean, count: withC.length,
    level: mean < CADENCE_LOW ? 'info' : 'ok',
    text: mean < CADENCE_LOW
      ? `Cadence moyenne de ${mean} pas/min, sous le repère habituel de ${CADENCE_LOW}. Augmenter légèrement la cadence raccourcit la foulée et réduit l'impact à chaque appui.`
      : `Cadence moyenne de ${mean} pas/min, dans la fourchette habituelle.`,
  }
}

export function runAnalysis(db, { days = 365, today } = {}) {
  const efforts = runEfforts(db, { days, today })
  const records = runRecords(efforts)
  return {
    efforts, records,
    predictions: runPredictions(records),
    volume: runVolume(efforts, { today }),
    cadence: runCadence(efforts),
  }
}

// ============================================================
// VÉLO
// ============================================================
export const BIKE_SPORTS = ['velo', 'vtt']

export function bikeEfforts(db, { days = 365, today } = {}) {
  const out = []
  for (const s of sessionsOf(db, BIKE_SPORTS, { days, today })) {
    const sec = parseTime(s.data && s.data.temps)
    const km = num(s.data && s.data.distance)
    const power = num(s.data && s.data.puissance)
    const np = num(s.data && s.data.puissance_norm)
    if (!sec && !km && !power) continue
    out.push({
      date: s.date, sport: s.sport, sec, km,
      power, np: np || power,
      cadence: num(s.data && s.data.cadence),
      fc: num(s.data && s.data.fc),
      denivele: num(s.data && s.data.denivele) || 0,
      speed: km && sec ? Math.round(km / (sec / 3600) * 10) / 10 : null,
    })
  }
  return out
}

// La puissance seuil se déduit classiquement d'un effort maximal de vingt
// minutes, dont on retient 95 %. Faute de données par seconde, on part de
// la meilleure puissance moyenne enregistrée sur une sortie d'environ
// vingt minutes à une heure, ce qui reste une estimation grossière — et
// c'est dit.
export const FTP_FACTOR_20MIN = 0.95
export const FTP_MIN_SEC = 1200
export const FTP_MAX_SEC = 3900

export function ftpEstimate(efforts, weightKg) {
  const cands = efforts.filter((e) => e.np && e.sec && e.sec >= FTP_MIN_SEC && e.sec <= FTP_MAX_SEC)
  if (!cands.length) return null
  const best = cands.reduce((m, e) => (e.np > m.np ? e : m), cands[0])
  // Un effort d'une heure vaut déjà la puissance seuil ; on n'applique le
  // facteur que pour les efforts courts.
  const factor = best.sec <= 2100 ? FTP_FACTOR_20MIN : 1
  const ftp = Math.round(best.np * factor)
  const w = num(weightKg)
  return {
    ftp, from: best, factor,
    wPerKg: w && w > 0 ? Math.round(ftp / w * 100) / 100 : null,
    confidence: cands.length >= 3 ? 'moyenne' : 'faible',
    text: `Puissance seuil estimée à ${ftp} W à partir de ta meilleure sortie de ${Math.round(best.sec / 60)} min. Estimation grossière : un vrai test se fait sur un effort maximal calibré.`,
  }
}

// Charge d'entraînement cycliste : l'intensité rapportée au seuil, puis le
// produit durée × intensité². C'est la mesure de référence du milieu, et
// elle n'existait pas faute de puissance seuil.
export function intensityFactor(np, ftp) {
  const n = num(np); const f = num(ftp)
  if (!n || !f || f <= 0) return null
  return Math.round(n / f * 100) / 100
}

export function trainingStress(sec, np, ftp) {
  const s = num(sec); const iF = intensityFactor(np, ftp)
  if (!s || iF == null || s <= 0) return null
  return Math.round(s * iF * iF / 3600 * 100)
}

export function bikeAnalysis(db, { days = 365, today, weightKg = null } = {}) {
  const efforts = bikeEfforts(db, { days, today })
  const ftp = ftpEstimate(efforts, weightKg)
  const scored = ftp
    ? efforts.filter((e) => e.np && e.sec).map((e) => ({ ...e, if: intensityFactor(e.np, ftp.ftp), tss: trainingStress(e.sec, e.np, ftp.ftp) }))
    : []
  const totalTss = scored.reduce((a, e) => a + (e.tss || 0), 0)
  const bestSpeed = efforts.filter((e) => e.speed).reduce((m, e) => (!m || e.speed > m.speed ? e : m), null)
  return {
    efforts, ftp, scored,
    totalTss: Math.round(totalTss),
    meanTss: scored.length ? Math.round(totalTss / scored.length) : null,
    bestSpeed,
    withPower: efforts.filter((e) => e.power).length,
  }
}

// ============================================================
// NATATION
// ============================================================
export const SWIM_SPORTS = ['natation']

export function swimEfforts(db, { days = 365, today } = {}) {
  const out = []
  for (const s of sessionsOf(db, SWIM_SPORTS, { days, today })) {
    const m = num(s.data && s.data.distance)
    const sec = parseTime(s.data && s.data.temps)
    if (!m || m <= 0) continue
    out.push({
      date: s.date, meters: m, sec,
      pace100: sec && sec > 0 ? Math.round(sec / (m / 100)) : null,
      best100: parseTime(s.data && s.data.temps_100),
      longueurs: num(s.data && s.data.longueurs),
      bassin: (s.data && s.data.bassin) || null,
      nages: Array.isArray(s.data && s.data.nages) ? s.data.nages : [],
      materiel: Array.isArray(s.data && s.data.materiel) ? s.data.materiel : [],
    })
  }
  return out
}

// Vitesse critique : allure théoriquement soutenable, déduite de deux
// distances nagées à fond. C'est le repère qui sert à caler les séries,
// et il demande deux efforts assez différents pour être fiable.
export const CSS_MIN_RATIO = 1.5

export function criticalSpeed(efforts) {
  const timed = efforts.filter((e) => e.sec && e.sec > 0 && e.meters > 0)
  if (timed.length < 2) return null
  // Effort le plus court et le plus long, à condition qu'ils soient
  // suffisamment distincts : deux distances voisines donneraient une pente
  // absurde.
  const sorted = [...timed].sort((a, b) => a.meters - b.meters)
  const short = sorted[0]
  const long = sorted[sorted.length - 1]
  if (long.meters / short.meters < CSS_MIN_RATIO) return null
  const speed = (long.meters - short.meters) / (long.sec - short.sec)
  if (!Number.isFinite(speed) || speed <= 0) return null
  const pace100 = Math.round(100 / speed)
  return {
    speed: Math.round(speed * 100) / 100,
    pace100, paceLabel: fmtPace(pace100),
    from: { short: short.meters, long: long.meters },
    text: `Allure critique estimée à ${fmtPace(pace100)} aux 100 m, déduite de tes efforts sur ${short.meters} et ${long.meters} m. C'est le repère pour caler tes séries.`,
  }
}

export function strokeSplit(efforts) {
  const all = efforts.flatMap((e) => e.nages)
  if (all.length < 4) return null
  const by = {}
  for (const n of all) by[n] = (by[n] || 0) + 1
  const items = Object.keys(by).map((n) => ({ nage: n, count: by[n], pct: Math.round(by[n] / all.length * 100) })).sort((a, b) => b.count - a.count)
  const only = items.length === 1
  return {
    items, only,
    text: only
      ? `Tu ne nages qu'en ${items[0].nage.toLowerCase()}. Varier les nages répartit la charge sur d'autres groupes musculaires et corrige des déséquilibres que le crawl seul entretient.`
      : `Nages travaillées : ${items.map((x) => `${x.nage.toLowerCase()} ${x.pct} %`).join(', ')}.`,
  }
}

export function swimAnalysis(db, { days = 365, today } = {}) {
  const efforts = swimEfforts(db, { days, today })
  const timed = efforts.filter((e) => e.pace100)
  const best = timed.length ? timed.reduce((m, e) => (e.pace100 < m.pace100 ? e : m), timed[0]) : null
  const totalM = efforts.reduce((a, e) => a + e.meters, 0)
  return {
    efforts, css: criticalSpeed(efforts), strokes: strokeSplit(efforts),
    bestPace: best ? { pace100: best.pace100, label: fmtPace(best.pace100), date: best.date, meters: best.meters } : null,
    totalMeters: totalM,
    sessions: efforts.length,
  }
}

// ============================================================
// SYNTHÈSE
// ============================================================
export function enduranceAnalysis(db, { days = 365, today, weightKg = null } = {}) {
  const run = runAnalysis(db, { days, today })
  const bike = bikeAnalysis(db, { days, today, weightKg })
  const swim = swimAnalysis(db, { days, today })

  const tips = []
  if (run.volume.jump) tips.push(run.volume.jump.text)
  if (run.predictions.length) {
    // La projection qui sert est celle d'une distance jamais courue : dire
    // à quelqu'un son temps prévu sur un dix kilomètres qu'il a déjà fait
    // n'apprend rien. À défaut, on prend la plus longue.
    const raced = new Set(run.records.map((r) => r.id))
    const unraced = run.predictions.filter((p) => !raced.has(p.id))
    const pick = (unraced.length ? unraced : run.predictions).reduce((m, p) => (p.km > m.km ? p : m), (unraced.length ? unraced : run.predictions)[0])
    tips.push(`D'après ton ${pick.from.label} en ${pick.from.time}, tu vaudrais environ ${pick.time} sur ${pick.label.toLowerCase()} — une projection, pas une promesse : elle suppose un volume adapté à la distance.`)
  }
  if (run.cadence && run.cadence.level !== 'ok') tips.push(run.cadence.text)
  if (bike.ftp) tips.push(bike.ftp.text)
  if (swim.css) tips.push(swim.css.text)
  if (swim.strokes && swim.strokes.only) tips.push(swim.strokes.text)
  if (!tips.length) {
    const any = run.efforts.length || bike.efforts.length || swim.efforts.length
    tips.push(any
      ? 'Rien à signaler côté endurance : volume progressif et repères cohérents.'
      : 'Aucune sortie chronométrée enregistrée. Noter distance et temps suffit à obtenir records, allures de référence et projections.')
  }
  return { run, bike, swim, tips }
}
