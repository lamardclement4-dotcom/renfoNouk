// ============================================================
// Analyse de la musculation.
//
// Tout était enregistré, presque rien n'était lu. `db.exerciseHistory`
// ne gardait que deux choses par exercice : la dernière charge et le
// record. Impossible d'en tirer une progression, un volume, ou même de
// savoir si l'on stagne. Le RPE, saisi série par série, n'était relu
// nulle part. Et la suggestion de charge ajoutait 2,5 kg à l'aveugle —
// le même incrément sur une presse à cuisses que sur des élévations
// latérales, que la dernière série soit passée à RPE 6 ou arrachée à
// RPE 10.
//
// Ce module repart de `db.planningSessions`, qui conserve chaque série de
// chaque séance : c'est la seule source qui permette de suivre autre
// chose qu'un instantané.
//
// Repères d'entraînement d'usage courant, pas des prescriptions.
// ============================================================

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Le formulaire enregistre les champs vides via `parseFloat(v) || 0` :
// un RPE non renseigné vaut donc 0, qu'il faut lire comme « absent » et
// non comme un effort nul.
const optional = (v) => {
  const n = num(v)
  return n && n > 0 ? n : null
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

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

export const MUSCU_SPORTS = ['muscu', 'crossfit', 'callisthenie', 'gym', 'halterophilie']

// ─── Force maximale estimée ──────────────────────────────────
// Formule d'Epley. Elle perd toute fiabilité au-delà d'une douzaine de
// répétitions : on préfère ne rien renvoyer plutôt qu'un chiffre
// fabriqué. C'est ce qui permet de comparer 100 kg × 1 et 90 kg × 10,
// que le record en charge brute classait à l'envers.
export const MAX_REPS_FOR_1RM = 12

export function estimate1RM(charge, reps) {
  const w = num(charge)
  const r = num(reps)
  if (!w || w <= 0 || !r || r < 1 || r > MAX_REPS_FOR_1RM) return null
  if (r === 1) return Math.round(w * 10) / 10
  return Math.round(w * (1 + r / 30) * 10) / 10
}

// ─── Lecture des séances ─────────────────────────────────────
export function muscuSessions(db, { days = 90, today } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  return ((db && db.planningSessions) || [])
    .filter((s) => s && s.statut === 'realise' && s.date && s.date >= from && s.date <= ref
      && MUSCU_SPORTS.includes(s.sport) && Array.isArray(s.exercises) && s.exercises.length)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Chaque ligne de série, aplatie et normalisée. Les séries en mode durée
// (gainage) n'ont pas de répétitions : elles comptent comme séries
// travaillées mais ne peuvent pas entrer dans un tonnage.
export function setRows(db, opts) {
  const out = []
  for (const s of muscuSessions(db, opts)) {
    for (const ex of s.exercises || []) {
      if (!ex || !ex.name) continue
      for (const st of ex.sets || []) {
        if (!st) continue
        const series = num(st.series) || 1
        const isTime = (st.mode || 'reps') === 'duree'
        const reps = isTime ? null : optional(st.reps)
        const charge = num(st.charge) || 0
        out.push({
          date: s.date, sessionId: s.id || null, name: ex.name, group: ex.group || 'Autre',
          series, reps, charge, isTime,
          rpe: optional(st.rpe),
          tonnage: !isTime && reps ? series * reps * charge : 0,
        })
      }
    }
  }
  return out
}

// ─── Volume ──────────────────────────────────────────────────
// Deux mesures distinctes, qui ne disent pas la même chose : le tonnage
// (kg soulevés) et le nombre de séries. Les séries au poids du corps ne
// pèsent rien au tonnage mais comptent bien comme travail, et c'est le
// nombre de séries hebdomadaires par muscle qui sert de repère de
// programmation courant.
export function volumeByGroup(db, { days = 28, today } = {}) {
  const rows = setRows(db, { days, today })
  const by = {}
  for (const r of rows) {
    if (!by[r.group]) by[r.group] = { group: r.group, series: 0, tonnage: 0, exercises: new Set(), sessions: new Set() }
    by[r.group].series += r.series
    by[r.group].tonnage += r.tonnage
    by[r.group].exercises.add(r.name)
    by[r.group].sessions.add(r.date)
  }
  const weeks = days / 7
  return Object.values(by).map((g) => ({
    group: g.group,
    series: g.series,
    seriesPerWeek: Math.round(g.series / weeks * 10) / 10,
    tonnage: Math.round(g.tonnage),
    exercises: g.exercises.size,
    sessions: g.sessions.size,
  })).sort((a, b) => b.series - a.series)
}

// Repère de programmation d'usage courant : en dessous d'une dizaine de
// séries hebdomadaires, un muscle est peu sollicité ; au-delà d'une
// vingtaine, le rendement supplémentaire devient discutable et la
// récupération plus difficile.
export const SERIES_LOW = 10
export const SERIES_HIGH = 20

export function groupVerdict(seriesPerWeek) {
  if (seriesPerWeek < 4) return { level: 'low', text: 'très peu sollicité' }
  if (seriesPerWeek < SERIES_LOW) return { level: 'low', text: 'sous le repère habituel' }
  if (seriesPerWeek <= SERIES_HIGH) return { level: 'ok', text: 'dans la fourchette habituelle' }
  return { level: 'high', text: 'au-dessus de la fourchette habituelle' }
}

// ─── Équilibre entre familles ────────────────────────────────
// Un déséquilibre marqué entre tirage et poussée, ou entre haut et bas
// du corps, est le motif le plus banal — et le plus facile à ne pas voir
// quand on choisit ses exercices séance après séance.
export const PUSH_GROUPS = ['Pectoraux', 'Épaules', 'Triceps']
export const PULL_GROUPS = ['Dos', 'Biceps', 'Trapèzes']
export const LOWER_GROUPS = ['Quadriceps', 'Ischio-jamb.', 'Fessiers', 'Mollets', 'Adducteurs']
export const UPPER_GROUPS = [...PUSH_GROUPS, ...PULL_GROUPS, 'Avant-bras']

function sumSeries(vols, groups) {
  return vols.filter((v) => groups.includes(v.group)).reduce((a, v) => a + v.series, 0)
}

export function balance(db, { days = 28, today } = {}) {
  const vols = volumeByGroup(db, { days, today })
  if (!vols.length) return null
  const push = sumSeries(vols, PUSH_GROUPS)
  const pull = sumSeries(vols, PULL_GROUPS)
  const lower = sumSeries(vols, LOWER_GROUPS)
  const upper = sumSeries(vols, UPPER_GROUPS)
  const ratio = (a, b) => (b > 0 ? Math.round(a / b * 100) / 100 : null)
  const out = { push, pull, lower, upper, pushPull: ratio(push, pull), upperLower: ratio(upper, lower), flags: [] }
  if (push + pull >= 12) {
    if (out.pushPull != null && out.pushPull >= 1.6) out.flags.push({ id: 'push', text: `Tu fais ${push} séries de poussée pour ${pull} de tirage. Rééquilibrer vers le dos protège les épaules et la posture.` })
    else if (out.pushPull != null && out.pushPull <= 0.6) out.flags.push({ id: 'pull', text: `Tu fais ${pull} séries de tirage pour ${push} de poussée — l'écart inverse, moins fréquent, mérite aussi d'être noté.` })
  }
  if (upper + lower >= 12) {
    if (lower === 0) out.flags.push({ id: 'nolower', text: 'Aucune série pour le bas du corps sur la période.' })
    else if (out.upperLower != null && out.upperLower >= 2.5) out.flags.push({ id: 'upper', text: `${upper} séries pour le haut du corps contre ${lower} pour le bas : l'écart est net.` })
  }
  return out
}

// ─── Progression par exercice ────────────────────────────────
// Meilleure force estimée par séance, pour un exercice donné. C'est la
// série la plus lourde rapportée à ses répétitions qui compte, pas la
// charge brute : monter à 100 kg pour une répétition unique n'est pas un
// progrès sur 90 kg × 8.
export function exerciseSeries(db, name, { days = 180, today } = {}) {
  const rows = setRows(db, { days, today }).filter((r) => r.name === name && !r.isTime)
  const byDate = {}
  for (const r of rows) {
    const e = estimate1RM(r.charge, r.reps)
    if (!byDate[r.date]) byDate[r.date] = { date: r.date, best1RM: null, topCharge: 0, topReps: null, series: 0, tonnage: 0, rpe: [] }
    const d = byDate[r.date]
    d.series += r.series
    d.tonnage += r.tonnage
    if (r.rpe) d.rpe.push(r.rpe)
    if (e != null && (d.best1RM == null || e > d.best1RM)) { d.best1RM = e; d.topCharge = r.charge; d.topReps = r.reps }
  }
  return Object.values(byDate)
    .map((d) => ({ ...d, tonnage: Math.round(d.tonnage), rpe: d.rpe.length ? Math.round(d.rpe.reduce((a, b) => a + b, 0) / d.rpe.length * 10) / 10 : null }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Stagnation : au moins quatre séances, et aucun progrès de force estimée
// sur les trois dernières par rapport au meilleur d'avant. Trois séances
// ne suffisent pas à conclure — une mauvaise journée arrive.
export const STALL_SESSIONS = 3

export function exerciseProgress(db, name, opts) {
  const series = exerciseSeries(db, name, opts)
  const withMax = series.filter((s) => s.best1RM != null)
  if (!withMax.length) return null
  const first = withMax[0]
  const last = withMax[withMax.length - 1]
  const best = withMax.reduce((a, s) => (s.best1RM > a.best1RM ? s : a), withMax[0])
  const gain = Math.round((last.best1RM - first.best1RM) * 10) / 10
  const gainPct = first.best1RM > 0 ? Math.round(gain / first.best1RM * 1000) / 10 : null
  let stalled = false
  if (withMax.length >= STALL_SESSIONS + 1) {
    const recent = withMax.slice(-STALL_SESSIONS)
    const before = withMax.slice(0, -STALL_SESSIONS)
    const bestBefore = Math.max(...before.map((s) => s.best1RM))
    stalled = recent.every((s) => s.best1RM <= bestBefore)
  }
  return {
    name, series, sessions: withMax.length,
    first, last, best, gain, gainPct, stalled,
    daysSinceLast: null,
  }
}

// Tous les exercices suivis, du plus travaillé au moins travaillé.
export function trackedExercises(db, { days = 180, today } = {}) {
  const rows = setRows(db, { days, today })
  const by = {}
  for (const r of rows) {
    if (!by[r.name]) by[r.name] = { name: r.name, group: r.group, series: 0, dates: new Set() }
    by[r.name].series += r.series
    by[r.name].dates.add(r.date)
  }
  const ref = (today || todayISO())
  return Object.values(by).map((e) => {
    const dates = [...e.dates].sort()
    return {
      name: e.name, group: e.group, series: e.series,
      sessions: dates.length, last: dates[dates.length - 1],
      daysSinceLast: daysBetween(dates[dates.length - 1], ref),
    }
  }).sort((a, b) => b.sessions - a.sessions || b.series - a.series)
}

// ─── Suggestion de charge ────────────────────────────────────
// L'incrément dépend du mouvement — 2,5 kg sur une presse à cuisses ne
// représente presque rien, sur des élévations latérales c'est une grosse
// marche — et du RPE de la dernière fois, qui était collecté sans jamais
// servir.
const BIG_LOWER = ['Quadriceps', 'Ischio-jamb.', 'Fessiers', 'Adducteurs']
const SMALL_ISO = ['Biceps', 'Triceps', 'Avant-bras', 'Épaules', 'Trapèzes', 'Mollets']

export function loadStep(group) {
  if (BIG_LOWER.includes(group)) return 5
  if (SMALL_ISO.includes(group)) return 1
  return 2.5
}

export function suggestLoad(lastCharge, { rpe = null, group = null } = {}) {
  const w = num(lastCharge)
  if (!w || w <= 0) return null
  const step = loadStep(group)
  const r = optional(rpe)
  if (r == null) {
    return { charge: Math.round((w + step) * 10) / 10, step, reason: `+${step} kg, l'incrément habituel pour ce mouvement.` }
  }
  if (r >= 9.5) return { charge: w, step: 0, reason: `RPE ${r} la dernière fois, tu étais à la limite : garde la même charge et gagne d'abord des répétitions.` }
  if (r >= 8.5) return { charge: w, step: 0, reason: `RPE ${r} la dernière fois : consolide à cette charge avant de monter.` }
  if (r <= 6) return { charge: Math.round((w + step * 2) * 10) / 10, step: step * 2, reason: `RPE ${r} la dernière fois, c'était nettement trop léger : +${step * 2} kg.` }
  return { charge: Math.round((w + step) * 10) / 10, step, reason: `RPE ${r} la dernière fois : +${step} kg.` }
}

// Dernière performance sur un exercice, telle qu'elle sert à proposer la
// charge suivante. L'ancien code prenait `ex.sets[0]`, c'est-à-dire la
// PREMIÈRE série de la séance — souvent un échauffement — tout en
// appelant ça « dernière charge ». On retient la série la plus lourde.
export function lastPerformance(db, name, { days = 180, today } = {}) {
  const rows = setRows(db, { days, today }).filter((r) => r.name === name)
  if (!rows.length) return null
  const lastDate = rows[rows.length - 1].date
  const sameDay = rows.filter((r) => r.date === lastDate)
  const top = sameDay.reduce((a, r) => (r.charge > a.charge ? r : a), sameDay[0])
  return {
    date: lastDate, charge: top.charge, reps: top.reps, rpe: top.rpe, group: top.group,
    est1RM: estimate1RM(top.charge, top.reps),
    daysSince: daysBetween(lastDate, today || todayISO()),
  }
}

// ─── Synthèse ────────────────────────────────────────────────
export const IDLE_DAYS = 21

export function muscuAnalysis(db, { days = 28, today } = {}) {
  const ref = today || todayISO()
  const sessions = muscuSessions(db, { days, today: ref })
  const rows = setRows(db, { days, today: ref })
  const vols = volumeByGroup(db, { days, today: ref })
  const bal = balance(db, { days, today: ref })
  const tracked = trackedExercises(db, { days: 180, today: ref })
  const tonnage = Math.round(rows.reduce((a, r) => a + r.tonnage, 0))
  const totalSeries = rows.reduce((a, r) => a + r.series, 0)

  const stalls = []
  for (const t of tracked.slice(0, 12)) {
    const p = exerciseProgress(db, t.name, { days: 180, today: ref })
    if (p && p.stalled) stalls.push({ ...p, group: t.group })
  }
  const idle = tracked.filter((t) => t.daysSinceLast >= IDLE_DAYS && t.sessions >= 2)

  const tips = []
  if (!sessions.length) {
    tips.push(`Aucune séance de musculation enregistrée sur ${days} jours. Consigne tes séries pour que la progression et le volume par muscle deviennent lisibles.`)
  } else {
    const under = vols.filter((v) => groupVerdict(v.seriesPerWeek).level === 'low' && v.seriesPerWeek >= 1)
    const over = vols.filter((v) => groupVerdict(v.seriesPerWeek).level === 'high')
    if (bal && bal.flags.length) tips.push(bal.flags[0].text)
    if (stalls.length) {
      const s = stalls[0]
      tips.push(`${s.name} plafonne depuis ${STALL_SESSIONS} séances autour de ${s.best.best1RM} kg estimés. Faire varier les répétitions, le tempo ou insérer une semaine allégée débloque plus souvent qu'insister à la même charge.`)
    }
    if (over.length) tips.push(`${over[0].group} : ${over[0].seriesPerWeek} séries par semaine, au-dessus du repère habituel de ${SERIES_HIGH}. Le rendement supplémentaire y devient discutable.`)
    if (under.length && under.length <= 4) tips.push(`Peu de volume sur ${under.map((u) => u.group).join(', ')} (moins de ${SERIES_LOW} séries par semaine).`)
    if (idle.length) tips.push(`${idle[0].name} n'a pas été travaillé depuis ${idle[0].daysSinceLast} jours alors que tu l'avais suivi ${idle[0].sessions} fois.`)
    const noRpe = rows.length && rows.every((r) => !r.rpe)
    if (noRpe) tips.push('Tu ne renseignes pas le RPE : c’est lui qui permet d’ajuster la charge proposée à la séance suivante plutôt que d’ajouter un incrément fixe.')
  }
  if (!tips.length) tips.push('Volume réparti et progression en cours. Rien à ajuster.')

  return {
    days, sessions: sessions.length, totalSeries, tonnage,
    volumes: vols, balance: bal, tracked, stalls, idle, tips,
  }
}
