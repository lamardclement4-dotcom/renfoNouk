// ============================================================
// Intelligence du planificateur.
//
// Le rapport charge aiguë / chronique ne compte que les séances déjà
// réalisées. Autrement dit, l'application sait dire après coup qu'une
// semaine a été trop lourde, mais jamais avant. On planifie à l'aveugle,
// alors que le planning contient précisément ce qu'on a l'intention de
// faire — et que c'est le seul moment où l'on peut encore changer d'avis.
//
// Ce module regarde la semaine à venir : ce qu'elle va coûter, comment
// elle est structurée, et si ce qui a été planifié les semaines passées a
// réellement été fait.
//
// La charge de séance suit la convention du reste de l'application :
// durée × intensité ressentie, avec RPE 5 pour neutre et le poids
// inchangé quand l'intensité n'est pas renseignée.
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

// `weatherIntel` ne dépend de rien : l'importer ici ne rompt pas
// l'indépendance du module.
import { loadMultiplier, heatAcclimation } from './weatherIntel'
import { warmupSummary, drillsFor, drillsSummary } from './drillsData'

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

// 0 = lundi … 6 = dimanche.
export function dowOf(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

export function mondayISO(iso) {
  return shiftISO(iso, -dowOf(iso))
}

// Dupliqué depuis renfoIntel plutôt qu'importé : ce module doit rester
// sans dépendance pour que renfoIntel puisse l'utiliser sans créer de
// cycle d'imports.
const DUREE_MINS = { '15 min': 15, '30 min': 30, '45 min': 45, '1 h': 60, '1 h 30': 90, '2 h': 120, '2 h 30': 150, '3 h': 180 }

export function dureeToMins(duree) {
  if (!duree) return 0
  if (DUREE_MINS[duree]) return DUREE_MINS[duree]
  const n = parseInt(duree, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export const NEUTRAL_RPE = 5

export function sessionRpe(s) {
  const r = num(s && s.data && s.data.rpe)
  return r && r > 0 ? r : null
}

// La charge réalisée est pondérée par les conditions depuis longtemps : une
// heure à 33 °C sollicite plus qu'une heure à 15 °C. La charge projetée, elle,
// ne l'était pas — et l'ACWR compare précisément les deux. Pendant une
// canicule, la charge chronique montait donc pendant que la projection restait
// au niveau des minutes brutes : le ratio paraissait plus bas qu'il n'était, et
// l'avertissement se taisait au moment où la chaleur rend la blessure plus
// probable. Les deux côtés de la comparaison sont désormais pondérés pareil.
export function sessionLoad(s, conditions, acclimation) {
  const mins = dureeToMins(s && s.duree)
  if (!mins) return 0
  const rpe = sessionRpe(s)
  // Sans conditions relevées, le multiplicateur vaut un : mieux vaut une
  // charge inchangée qu'une charge inventée.
  const wx = conditions ? loadMultiplier(conditions, { acclimation: acclimation || null }) : 1
  return Math.round(mins * (rpe ? rpe / NEUTRAL_RPE : 1) * wx)
}

// Une séance est dite exigeante au-delà de RPE 7, seuil usuel de
// séparation entre travail facile et travail dur. Sans RPE, la durée sert
// de repli : une sortie de deux heures est exigeante quoi qu'il arrive.
export const HARD_RPE = 7
export const HARD_MINS = 100

export function isHard(s) {
  const rpe = sessionRpe(s)
  if (rpe != null) return rpe >= HARD_RPE
  return dureeToMins(s && s.duree) >= HARD_MINS
}

// ─── Semaine planifiée ───────────────────────────────────────
export function weekSessions(db, { weekOf, today } = {}) {
  const ref = weekOf || today || todayISO()
  const monday = mondayISO(ref)
  const sunday = shiftISO(monday, 6)
  const all = (asList(db && db.planningSessions))
    .filter((s) => s && s.date && s.date >= monday && s.date <= sunday)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  return {
    monday, sunday, all,
    planned: all.filter((s) => s.statut === 'planifie'),
    done: all.filter((s) => s.statut === 'realise'),
  }
}

// ─── Charge projetée ─────────────────────────────────────────
// Le point central : ce que devient le rapport charge aiguë / chronique
// si l'on fait ce qui est prévu. Le calcul est le même qu'en
// rétrospective, mais les séances planifiées comptent comme si elles
// étaient faites.
export const ACWR_SWEET_LOW = 0.8
export const ACWR_SWEET_HIGH = 1.3
export const ACWR_DANGER = 1.5

export function loadInWindow(sessions, { from, to, includePlanned = false, weather = null, acclimation = null }) {
  let sum = 0
  for (const s of sessions || []) {
    if (!s || !s.date || s.date < from || s.date > to) continue
    const counts = s.statut === 'realise' || (includePlanned && s.statut === 'planifie')
    if (!counts) continue
    sum += sessionLoad(s, weather ? weather[s.date] : null, acclimation)
  }
  return Math.round(sum)
}

export function acwrVerdict(ratio) {
  if (ratio == null) return null
  if (ratio < ACWR_SWEET_LOW) return { level: 'low', text: 'sous la zone habituelle — la charge redescend' }
  if (ratio <= ACWR_SWEET_HIGH) return { level: 'ok', text: 'dans la zone habituelle' }
  if (ratio < ACWR_DANGER) return { level: 'warn', text: 'au-dessus de la zone habituelle' }
  return { level: 'alert', text: 'nettement au-dessus — progression trop rapide' }
}

// Charge projetée à la fin de la semaine en cours de planification.
export function projectedLoad(db, { weekOf, today } = {}) {
  const ref = today || todayISO()
  const sessions = asList(db && db.planningSessions)
  const week = weekSessions(db, { weekOf: weekOf || ref })
  // Fenêtre aiguë : les sept jours se terminant au dimanche de la semaine
  // planifiée. Fenêtre chronique : les 28 jours qui précèdent.
  const end = week.sunday
  const acuteFrom = shiftISO(end, -6)
  const chronicFrom = shiftISO(end, -27)
  // Les conditions relevées valent aussi pour les jours à venir : l'écran
  // Conditions permet d'enregistrer la prévision d'une date planifiée.
  const weather = (db && db.weatherLog) || {}
  // `loadMultiplier` lit `.factor` sur cet objet : lui passer le seul nombre
  // de jours ferait taire l'atténuation sans rien signaler.
  const acclimation = heatAcclimation(weather, new Date(ref + 'T12:00:00'))
  const win = { weather, acclimation }
  const acute = loadInWindow(sessions, { from: acuteFrom, to: end, includePlanned: true, ...win })
  const chronicTotal = loadInWindow(sessions, { from: chronicFrom, to: end, includePlanned: true, ...win })
  const chronicWeek = chronicTotal / 4
  if (chronicWeek <= 0) return { available: false, reason: 'pas assez d’historique' }
  const ratio = Math.round(acute / chronicWeek * 100) / 100

  // Ce que serait le ratio sans les séances encore à faire : l'écart entre
  // les deux dit ce que le planning ajoute réellement.
  const acuteDone = loadInWindow(sessions, { from: acuteFrom, to: end, includePlanned: false, ...win })
  const currentRatio = chronicWeek > 0 ? Math.round(acuteDone / chronicWeek * 100) / 100 : null

  return {
    available: true,
    ratio, currentRatio,
    acute, acuteDone,
    chronicWeek: Math.round(chronicWeek),
    plannedLoad: acute - acuteDone,
    verdict: acwrVerdict(ratio),
    week,
  }
}

// ─── Structure de la semaine ─────────────────────────────────
// Ce qui distingue une semaine bien construite d'un empilement de
// séances : des jours de repos, et des séances dures qui ne
// s'enchaînent pas.
export const MIN_REST_DAYS = 1
export const MAX_CONSECUTIVE = 5

export function weekStructure(db, { weekOf, today } = {}) {
  const week = weekSessions(db, { weekOf: weekOf || today })
  const byDay = {}
  for (const s of week.all) {
    if (!byDay[s.date]) byDay[s.date] = []
    byDay[s.date].push(s)
  }
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = shiftISO(week.monday, i)
    const items = byDay[date] || []
    days.push({
      date, dow: i, sessions: items,
      load: items.reduce((a, s) => a + sessionLoad(s), 0),
      hard: items.some(isHard),
      rest: items.length === 0,
    })
  }
  const restDays = days.filter((d) => d.rest).length
  // Plus longue série de jours travaillés d'affilée.
  let longest = 0, run = 0
  for (const d of days) { run = d.rest ? 0 : run + 1; if (run > longest) longest = run }
  // Jours durs collés.
  const backToBack = []
  for (let i = 1; i < days.length; i++) {
    if (days[i].hard && days[i - 1].hard) backToBack.push(days[i].date)
  }
  const hardDays = days.filter((d) => d.hard).length
  const totalLoad = days.reduce((a, d) => a + d.load, 0)

  const flags = []
  if (week.all.length >= 3 && restDays < MIN_REST_DAYS) {
    flags.push({ id: 'repos', level: 'warn', text: 'Aucun jour de repos complet dans la semaine.' })
  }
  if (longest > MAX_CONSECUTIVE) {
    flags.push({ id: 'enchaine', level: 'warn', text: `${longest} jours d'entraînement d'affilée sans coupure.` })
  }
  if (backToBack.length) {
    flags.push({ id: 'dur-dur', level: 'warn', text: `${backToBack.length} enchaînement${backToBack.length > 1 ? 's' : ''} de deux séances exigeantes sur deux jours consécutifs — l'alternance dur / facile laisse le corps encaisser.` })
  }
  return { ...week, days, restDays, longestStreak: longest, hardDays, backToBack, totalLoad, flags }
}

// ─── Monotonie et contrainte ─────────────────────────────────
// Repères de Foster : la monotonie est la charge quotidienne moyenne
// rapportée à sa dispersion. Une semaine où toutes les journées se
// ressemblent — même sans excès de volume — est moins bien tolérée qu'une
// semaine contrastée. La contrainte combine volume et monotonie.
//
// Ces deux mesures ne deviennent calculables que depuis que l'intensité
// est saisie pour tous les sports.
export const MONOTONY_HIGH = 2

export function monotony(days) {
  const loads = (days || []).map((d) => d.load)
  if (loads.length < 7) return null
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length
  if (mean <= 0) return null
  const sd = Math.sqrt(loads.reduce((a, l) => a + (l - mean) ** 2, 0) / loads.length)
  if (sd <= 0) {
    // Sept journées identiques : c'est le cas extrême, pas une division
    // impossible. On le signale plutôt que de renvoyer l'infini.
    return { value: null, mean: Math.round(mean), sd: 0, strain: null, level: 'alert', text: 'Toutes tes journées portent la même charge : aucune alternance dur / facile.' }
  }
  const value = Math.round(mean / sd * 100) / 100
  const weekly = Math.round(loads.reduce((a, b) => a + b, 0))
  const strain = Math.round(weekly * value)
  const level = value >= MONOTONY_HIGH ? 'warn' : 'ok'
  return {
    value, mean: Math.round(mean), sd: Math.round(sd), weekly, strain, level,
    text: level === 'warn'
      ? `Semaine très uniforme (monotonie ${String(value).replace('.', ',')}) : alterner journées dures et journées légères se tolère mieux qu'une charge constante, à volume égal.`
      : `Alternance correcte entre journées dures et légères (monotonie ${String(value).replace('.', ',')}).`,
  }
}

// ─── Respect du planning ─────────────────────────────────────
// Planifier n'a d'intérêt que si l'on peut savoir, après coup, ce qui a
// été tenu. Une séance passée restée « planifiée » n'a pas été faite.
export function adherence(db, { weeks = 4, today } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(mondayISO(ref), -7 * weeks)
  const to = shiftISO(ref, -1) // on ne juge pas le jour en cours
  const past = (asList(db && db.planningSessions)).filter((s) => s && s.date && s.date >= from && s.date <= to)
  if (!past.length) return null
  const done = past.filter((s) => s.statut === 'realise').length
  const missed = past.filter((s) => s.statut === 'planifie').length
  const total = done + missed
  if (!total) return null
  const pct = Math.round(done / total * 100)
  let level, text
  if (pct >= 85) { level = 'ok'; text = `${done} séances tenues sur ${total} planifiées.` }
  else if (pct >= 60) { level = 'info'; text = `${done} séances tenues sur ${total} — ${missed} sont restées au planning sans être faites.` }
  else { level = 'warn'; text = `${done} séances tenues sur ${total} : le planning est nettement plus ambitieux que ce qui se réalise. Le revoir à la baisse vaut mieux que le subir.` }
  return { done, missed, total, pct, weeks, level, text }
}

// ─── Objectif hebdomadaire ───────────────────────────────────
export function goalFit(db, { weekOf, today } = {}) {
  const target = num(db && db.goals && db.goals.weeklySessions)
  if (!target || target <= 0) return null
  const week = weekSessions(db, { weekOf: weekOf || today })
  const count = week.all.length
  const diff = count - target
  return {
    target, count, done: week.done.length, planned: week.planned.length, diff,
    level: diff === 0 ? 'ok' : diff > 0 ? 'over' : 'under',
    text: diff === 0
      ? `${count} séances au planning, exactement ton objectif hebdomadaire.`
      : diff > 0
        ? `${count} séances au planning pour un objectif de ${target}.`
        : `${count} séances au planning pour un objectif de ${target} — il en manque ${Math.abs(diff)}.`,
  }
}

// ─── Synthèse ────────────────────────────────────────────────
export function plannerAnalysis(db, { weekOf, today } = {}) {
  const ref = today || todayISO()
  const structure = weekStructure(db, { weekOf: weekOf || ref, today: ref })
  const load = projectedLoad(db, { weekOf: weekOf || ref, today: ref })
  const mono = monotony(structure.days)
  const adh = adherence(db, { today: ref })
  const goal = goalFit(db, { weekOf: weekOf || ref, today: ref })

  const tips = []
  if (!structure.all.length) {
    tips.push('Aucune séance au planning cette semaine. La planifier permet de voir sa charge avant de la faire, plutôt qu’après.')
  } else {
    if (load.available && load.verdict && (load.verdict.level === 'alert' || load.verdict.level === 'warn')) {
      tips.push(`Si tu fais tout ce qui est prévu, ton rapport charge aiguë / chronique finira à ${String(load.ratio).replace('.', ',')} — ${load.verdict.text}. Il est à ${String(load.currentRatio).replace('.', ',')} pour l'instant : ce sont les séances encore à faire qui l'y amènent.`)
    }
    for (const f of structure.flags) tips.push(f.text)
    if (mono && mono.level !== 'ok') tips.push(mono.text)
    if (goal && goal.level === 'under' && goal.diff <= -2) tips.push(goal.text)
    if (adh && adh.level === 'warn') tips.push(adh.text)
  }
  if (!tips.length) tips.push('Semaine cohérente : charge maîtrisée, alternance correcte et jours de repos présents.')

  return { structure, load, monotony: mono, adherence: adh, goal, tips }
}

// ─── Échauffement et éducatifs ──────────────────────────────
//
// Ils occupent le premier quart d'une séance et décident de la qualité du
// reste. Enregistrés sans être relus, ils ne servaient à rien : ce qui
// suit les relit.

export const WARMUP_MIN_MINS = 10

export function warmupHabit(db, { days = 28, today } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  const done = asList(db && db.planningSessions)
    .filter((s) => s && s.statut === 'realise' && s.date >= from && s.date <= ref)
  if (!done.length) return null
  let withWarmup = 0
  const hardWithout = []
  for (const s of done) {
    const w = warmupSummary(s.data && s.data.echauffement)
    if (w && w.mins >= WARMUP_MIN_MINS) withWarmup++
    // Une séance dure sans échauffement est le cas qui compte : c'est là
    // que le manque se paie, pas sur une sortie facile.
    else if (isHard(s)) hardWithout.push(s)
  }
  const pct = Math.round(withWarmup / done.length * 100)
  return {
    sessions: done.length, withWarmup, pct,
    hardWithout: hardWithout.length,
    level: hardWithout.length >= 2 ? 'warn' : pct < 50 ? 'info' : 'ok',
    text: hardWithout.length >= 2
      ? `${hardWithout.length} séances dures sans échauffement noté sur ${days} jours. C'est là que le manque se paie : sur une sortie facile, le corps a le temps de monter en température tout seul.`
      : pct < 50
        ? `Échauffement noté sur ${pct} % de tes séances. Dix minutes changent la qualité du reste, et ce qui n'est pas noté finit par ne plus être fait.`
        : null,
  }
}

export function drillHabit(db, { days = 56, today } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  const done = asList(db && db.planningSessions)
    .filter((s) => s && s.statut === 'realise' && s.date >= from && s.date <= ref && s.sport)
  if (!done.length) return null
  const bySport = {}
  for (const s of done) {
    if (!drillsFor(s.sport).length) continue
    if (!bySport[s.sport]) bySport[s.sport] = { sport: s.sport, sessions: 0, withDrills: 0, used: new Set() }
    const b = bySport[s.sport]
    b.sessions++
    const d = drillsSummary(s.sport, s.data && s.data.educatifs)
    if (d) { b.withDrills++; for (const l of d.labels) b.used.add(l) }
  }
  const items = Object.values(bySport)
    .filter((b) => b.sessions >= 3)
    .map((b) => {
      const all = drillsFor(b.sport)
      const never = all.filter((d) => !b.used.has(d.label))
      return {
        sport: b.sport, sessions: b.sessions, withDrills: b.withDrills,
        pct: Math.round(b.withDrills / b.sessions * 100),
        used: [...b.used], never: never.map((d) => d.label),
      }
    })
    .sort((a, b) => a.pct - b.pct)
  if (!items.length) return null
  const worst = items[0]
  return {
    items, worst,
    text: worst.pct === 0
      ? `Aucun éducatif noté en ${worst.sport} sur ${worst.sessions} séances. Ce sont les seuls exercices qui changent le geste plutôt que la condition.`
      : worst.never.length
        ? `En ${worst.sport}, ${worst.never.length} éducatifs ne sont jamais faits : ${worst.never.slice(0, 3).join(', ')}. Varier ce qu'on travaille vaut mieux que répéter ce qu'on sait déjà faire.`
        : null,
  }
}
