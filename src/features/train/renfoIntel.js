// ============================================================
// RenfoIntel — moteur de score santé / recommandations / stats
// d'entraînement, porté depuis l'ancienne app (moteur de règles
// déterministe, pas une IA). Adapté à notre persistance Supabase :
// les fonctions qui lisaient `renfo_planning_sessions_v2` en
// localStorage lisent désormais db.planningSessions / db.exerciseHistory.
// L'ACWR (charge aiguë/chronique) est désormais calculable depuis que le
// Calendrier persiste db.planningSessions en base (fini le sondage
// localStorage de l'ancienne app) — voir acwrRisk() plus bas.
// recommendations() reprend d'abord fidèlement l'ancienne app (nutrition/
// hydratation/sommeil/prévention/mobilité/tests × charge réelle ACWR,
// ressenti des séances, cycle, Pic de forme), puis va plus loin avec des
// règles inédites, rendues possibles par nos données réelles persistées :
// croisement sport pratiqué × zone de mobilité faible (SPORTS[].focus),
// tendance semaine vs semaine précédente (comble le trou avant que l'ACWR
// ait 14 jours d'historique), régression de charge sur un exercice suivi
// (db.exerciseHistory) et déséquilibre entre sports pratiqués.
// ============================================================
import { SPORTS } from './trainData'
import { TESTS_DEF } from '../physical-tests/PhysicalTests'
import { testsAnalysis } from '../physical-tests/testsIntel'
import { computePeakPlan } from './PeakSpace'
import { cycleInfo } from '../health/Cycle'
import { cycleAnalysis, PMS_WINDOW_DAYS } from '../health/cycleIntel'
import { painDuration, bilanFreshness, preventionAnalysis, RECO as PREVENTION_RECO, PAIN_SUBACUTE_DAYS, PAIN_CHRONIC_DAYS } from '../health/preventionIntel'
import { mindAnalysis, breathSessions } from '../health/mindIntel'
import { muscuAnalysis, groupVerdict, SERIES_HIGH } from './muscuIntel'
import { hydroAnalysis } from '../hydration/hydroIntel'
import { mobilityAnalysis } from './mobilityIntel'
import { plannerAnalysis } from './plannerIntel'
import { climbAnalysis } from './climbIntel'
import { diagAnalysis } from '../nutrition/diagIntel'
import { nutriAnalysis } from '../nutrition/nutriIntel'
import { weightSeries, weeklyRate } from '../profil/weightIntel'
import { feelsLike, extraHydrationMlPerHour, loadMultiplier, heatAcclimation } from './weatherIntel'
import { sleepSeries, sleepDebt, neededHours, sleepAnalysis } from '../health/sleepIntel'

function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : (def || 0) }
function round(v) { return Math.round(v) }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function todayISO() {
  const d = new Date()
  const p = (n) => n < 10 ? '0' + n : '' + n
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function weightKg(db) {
  const w = num((db.profilePhys || {}).poids, 0)
  return w > 0 ? w : 70
}

export function hydricTargetMl(db) {
  const sp = db.hydroSport || {}
  const rate = sp.intensite === 'leger' ? 400 : sp.intensite === 'intense' ? 800 : 600
  let base = 30 * weightKg(db)
  const effort = num(sp.min, 0) / 60 * rate
  // Conditions relevées du jour : elles priment sur le réglage manuel
  // « climat chaud », qui reste le repli quand aucune météo n'est saisie.
  const wx = (db.weatherLog || {})[todayISO()]
  const feels = wx ? feelsLike(wx) : null
  const extra = feels != null ? extraHydrationMlPerHour(feels) * (num(sp.min, 0) / 60) : 0
  if (feels == null && sp.climat === 'chaud') base *= 1.1
  return round((base + effort + extra) / 50) * 50
}

export function hydroDay(db, iso) {
  const log = (db.hydroLog || {})[iso] || []
  let ml = 0, caf = 0
  for (const e of log) { ml += num(e.ml, 0) * (e.factor != null ? num(e.factor, 1) : 1); caf += num(e.caf, 0) }
  return { ml: round(ml), caf: round(caf), entries: log.length }
}

export function nutritionDay(db, iso) {
  const log = (db.foodLog || {})[iso] || []
  const t = { k: 0, p: 0, g: 0, l: 0, entries: log.length }
  for (const e of log) { t.k += num(e.k, 0); t.p += num(e.p, 0); t.g += num(e.g, 0); t.l += num(e.l, 0) }
  return t
}

// Jours écoulés depuis la dernière séance de récupération guidée
// enregistrée (module Récupération). null si aucune trace dans les 30
// derniers jours.
function daysSinceLastRecovery(db, iso) {
  const log = db.recoveryLog || {}
  const d0 = new Date(iso + 'T00:00:00')
  for (let k = 0; k <= 30; k++) {
    const dk = new Date(d0); dk.setDate(dk.getDate() - k)
    const isoK = todayISOFrom(dk)
    if (log[isoK] && log[isoK].length > 0) return k
  }
  return null
}
function todayISOFrom(d) {
  const p = (n) => n < 10 ? '0' + n : '' + n
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

// Minutes de séance planning correspondant à un libellé de durée pilule
// (identique à LOAD_BY_DUREE mais en vraies minutes, pas un score de charge).
const DUREE_MINS = { '15 min': 15, '30 min': 30, '45 min': 45, '1 h': 60, '1 h 30': 90, '2 h': 120, '2 h 30': 150, '3 h': 180 }
export function dureeToMins(duree) {
  if (!duree) return 0
  if (DUREE_MINS[duree]) return DUREE_MINS[duree]
  const n = parseInt(duree, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Minutes d'entraînement sur les sept derniers jours glissants.
// weekRetro() raisonne en semaine calendaire, ce qui fait tomber le volume
// à zéro le lundi matin alors que la charge de la veille pèse encore sur
// la récupération. La fenêtre glissante donne la charge réellement subie.
export function rolling7Mins(db, today) {
  const ref = today || todayISO()
  const from = (() => {
    const [y, m, d] = ref.split('-').map(Number)
    const x = new Date(Date.UTC(y, m - 1, d))
    x.setUTCDate(x.getUTCDate() - 6)
    return x.toISOString().slice(0, 10)
  })()
  const inRange = (d) => d >= from && d <= ref
  let mins = 0
  for (const s of (db && db.planningSessions) || []) {
    if (!s || s.statut !== 'realise' || !s.date || !inRange(s.date)) continue
    mins += dureeToMins(s.duree)
  }
  for (const e of (db && db.sessionLog) || []) {
    if (!e || !e.date || !inRange(e.date)) continue
    mins += num(e.mins, 0)
  }
  return mins
}

export function mondayOf(d) {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - day + (day === 0 ? -6 : 1))
  r.setHours(0, 0, 0, 0)
  return r
}

// Minutes réalisées par jour L→D pour la semaine de `refDate` (par défaut :
// celle en cours) + séances planifiées restantes. `refDate` permet de
// rejouer n'importe quelle semaine passée pour une rétrospective.
export function plannerWeekData(db, refDate = new Date()) {
  const sessions = db.planningSessions || []
  const monday = mondayOf(refDate)
  const week = [0, 0, 0, 0, 0, 0, 0]
  let count = 0, planned = 0
  for (const s of sessions) {
    if (!s || !s.date) continue
    const d = new Date(s.date + 'T00:00:00')
    const diffDays = Math.round((d - monday) / 86400000)
    if (diffDays < 0 || diffDays > 6) continue
    if (s.statut === 'realise') {
      const mins = dureeToMins(s.duree)
      if (mins > 0) { week[diffDays] += mins; count++ }
    } else if (s.statut === 'planifie') {
      planned++
    }
  }
  return { week, total: week.reduce((a, b) => a + b, 0), count, planned }
}

// Stats d'entraînement affichées sur Accueil/Progrès (streak, "cette
// semaine", total séances/minutes). La semaine vient de weekRetro, qui
// fusionne les deux sources de séance réalisée en se basant sur leurs
// dates réelles (Calendrier + lecteur intégré). db.week n'est PAS utilisé
// ici : ce compteur n'est indexé que par jour de la semaine et n'est
// jamais remis à zéro au changement de semaine, donc il cumulait
// indéfiniment les minutes de toutes les semaines passées sur les 7
// mêmes cases.
export function trainingTotals(db) {
  const week = weekRetro(db).week
  const sessions = db.planningSessions || []
  let allCount = 0, allMins = 0
  for (const s of sessions) {
    if (!s || s.statut !== 'realise' || !s.date) continue
    allCount++
    allMins += dureeToMins(s.duree)
  }
  return {
    week,
    sessionsTotal: (db.sessionsTotal || 0) + allCount,
    minutesTotal: (db.minutesTotal || 0) + allMins,
    streak: db.streak || 0,
    record: db.record || 0,
  }
}

// Couleurs/libellés des séances programme/catalogue (db.sessionLog), pour
// les afficher à côté des sports du Calendrier dans la rétrospective —
// valeurs alignées sur MODULE_TINTS (kit.jsx) sans importer le kit UI
// dans ce module purement logique.
const CAT_META = {
  mobilite: { label: 'Mobilité', color: '#6f8fa6' },
  renfo: { label: 'Renforcement', color: '#bf6a40' },
  fullbody: { label: 'Full body', color: '#bd923f' },
  plyo: { label: 'Pliométrie', color: '#a85a36' },
  recup: { label: 'Récupération', color: 'var(--c-success)' },
}

// Rétrospective complète d'une semaine (celle de refDate par défaut) :
// fusionne les séances du Calendrier (planningSessions, dates exactes)
// et les séances programme/catalogue jouées via le lecteur (sessionLog)
// en une liste chronologique + répartition par sport/type + total par
// jour — la base de la vraie rétrospective (comparaisons, détail).
export function weekRetro(db, refDate = new Date()) {
  const monday = mondayOf(refDate)
  const mondayMs = monday.getTime()
  const week = [0, 0, 0, 0, 0, 0, 0]
  const items = []
  const bySportMap = {}

  // `group` sert de clé de regroupement dans la répartition (catégorie ou
  // sport), `label` est ce qu'on affiche dans la liste chronologique — pour
  // une séance du lecteur c'est son titre, sinon les deux sont identiques.
  // Sans cette distinction, deux séances de renfo aux titres différents
  // apparaissaient comme deux catégories distinctes dans la répartition.
  const addMins = (group, label, color, date, mins, source) => {
    const dayIdx = Math.round((new Date(date + 'T00:00:00').getTime() - mondayMs) / 86400000)
    if (dayIdx < 0 || dayIdx > 6 || mins <= 0) return
    week[dayIdx] += mins
    items.push({ date, mins, label, color, source })
    if (!bySportMap[group]) bySportMap[group] = { mins: 0, color }
    bySportMap[group].mins += mins
  }

  for (const s of db.planningSessions || []) {
    if (!s || s.statut !== 'realise' || !s.date) continue
    const meta = sportMeta(s.sport)
    addMins(meta.label, meta.label, meta.color, s.date, dureeToMins(s.duree), 'planner')
  }
  for (const e of db.sessionLog || []) {
    if (!e || !e.date) continue
    const meta = CAT_META[e.cat] || { label: 'Séance', color: '#999' }
    addMins(meta.label, e.title || meta.label, meta.color, e.date, num(e.mins, 0), 'player')
  }

  items.sort((a, b) => a.date.localeCompare(b.date))
  const total = week.reduce((a, b) => a + b, 0)
  const bySport = Object.keys(bySportMap)
    .map((label) => ({ label, mins: bySportMap[label].mins, color: bySportMap[label].color, pct: total ? Math.round(bySportMap[label].mins / total * 100) : 0 }))
    .sort((a, b) => b.mins - a.mins)

  return { monday, week, total, count: items.length, items, bySport }
}

// Rétrospective sur plusieurs semaines (la plus ancienne en premier),
// pour une comparaison / mini-graphe de tendance sur la durée.
export function weeksTrend(db, count = 8) {
  const thisMonday = mondayOf(new Date())
  const out = []
  for (let i = count - 1; i >= 0; i--) {
    const monday = new Date(thisMonday.getTime() - i * 7 * 86400000)
    const r = weekRetro(db, monday)
    out.push({ offset: -i, monday, total: r.total, count: r.count })
  }
  return out
}

function fmtWeekRangeFr(monday) {
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6)
  const d = (dt) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `${d(monday)} au ${d(sunday)}`
}

// Rétrospective hebdomadaire complète — entraînement, nutrition,
// hydratation, compléments — pour le message affiché sur Accueil chaque
// lundi. Porte sur la semaine qui vient de se terminer (lundi-dimanche
// précédent), pas celle en cours qui ne fait que commencer.
export function mondayRetro(db) {
  const thisMonday = mondayOf(new Date())
  const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000)
  const prevMonday = new Date(thisMonday.getTime() - 14 * 86400000)

  const training = weekRetro(db, lastMonday)
  const trainingPrev = weekRetro(db, prevMonday)

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastMonday.getTime() + i * 86400000)
    const p = (n) => n < 10 ? '0' + n : '' + n
    days.push(d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()))
  }

  let kcalSum = 0, protSum = 0, nutriDays = 0
  let mlSum = 0, cafSum = 0, hydroDays = 0
  const plan = db.suppPlan || []
  let suppPossible = 0, suppTakenCount = 0
  for (const iso of days) {
    const n = nutritionDay(db, iso)
    if (n.entries > 0) { kcalSum += n.k; protSum += n.p; nutriDays++ }
    const h = hydroDay(db, iso)
    if (h.entries > 0) { mlSum += h.ml; cafSum += h.caf; hydroDays++ }
    if (plan.length) {
      suppPossible += plan.length
      suppTakenCount += ((db.suppTaken || {})[iso] || []).filter((id) => plan.includes(id)).length
    }
  }

  const t = db.foodTargets || {}
  const kcalTarget = num(t.kcal, 0) || num(t.k, 0)
  const protTarget = num(t.prot, 0) || num(t.p, 0)
  const hydroTarget = hydricTargetMl(db)

  const nutrition = nutriDays ? { avgKcal: round(kcalSum / nutriDays), avgProt: round(protSum / nutriDays), kcalTarget, protTarget, days: nutriDays } : null
  const hydration = hydroDays ? { avgMl: round(mlSum / hydroDays), avgCaf: round(cafSum / hydroDays), target: hydroTarget, days: hydroDays } : null
  const supplements = plan.length ? { pct: suppPossible ? round(suppTakenCount / suppPossible * 100) : 0, planLen: plan.length } : null

  const weekLabel = fmtWeekRangeFr(lastMonday)
  const lines = []

  if (training.count > 0) {
    const deltaPct = trainingPrev.total ? Math.round((training.total - trainingPrev.total) / trainingPrev.total * 100) : null
    const top = training.bySport[0]
    let s = `Semaine du ${weekLabel} : ${training.count} séance${training.count > 1 ? 's' : ''}, ${training.total} min`
    if (deltaPct != null) s += ` (${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs la semaine d'avant)`
    if (top) s += `, principalement en ${top.label.toLowerCase()} (${top.pct}%)`
    lines.push(s + '.')
  } else {
    lines.push(`Semaine du ${weekLabel} : aucune séance enregistrée — repos complet, ou séances non loguées ?`)
  }

  if (nutrition) {
    let s = `Nutrition : ${nutrition.avgKcal} kcal/jour en moyenne`
    if (nutrition.kcalTarget) s += ` (objectif ${nutrition.kcalTarget})`
    s += ` sur ${nutrition.days}/7 jours logués.`
    if (nutrition.protTarget && nutrition.avgProt < nutrition.protTarget * 0.8) {
      s += ` Apport protéique en retard (${nutrition.avgProt} / ${nutrition.protTarget} g) — à surveiller la semaine prochaine.`
    } else if (nutrition.protTarget) {
      s += ` Protéines dans la cible (${nutrition.avgProt} / ${nutrition.protTarget} g).`
    }
    lines.push(s)
  } else {
    lines.push('Nutrition : rien de logué cette semaine.')
  }

  if (hydration) {
    let s = `Hydratation : ${hydration.avgMl} ml/jour en moyenne (objectif ${hydration.target} ml)`
    s += hydration.avgMl >= hydration.target ? ', objectif tenu.' : `, ${Math.round((1 - hydration.avgMl / hydration.target) * 100)}% en dessous de la cible.`
    if (hydration.avgCaf >= 300) s += ` Caféine moyenne élevée (${hydration.avgCaf} mg/j).`
    lines.push(s)
  } else {
    lines.push('Hydratation : rien de logué cette semaine.')
  }

  if (supplements) {
    lines.push(`Compléments : ${supplements.pct}% d'observance sur ton plan de ${supplements.planLen} complément${supplements.planLen > 1 ? 's' : ''}.`)
  }

  return { weekLabel, training, trainingPrev, nutrition, hydration, supplements, lines }
}

// --- PILIERS (score 0-100, ou null si donnée absente) ---

export function pillarHydration(db, iso) {
  const d = hydroDay(db, iso)
  if (d.entries === 0) return { id: 'hydration', label: 'Hydratation', score: null, status: 'absent', detail: "Aucune boisson enregistrée aujourd'hui." }
  const target = hydricTargetMl(db) || 2000
  const ratio = d.ml / target
  const score = ratio <= 1 ? ratio * 100 : ratio <= 1.5 ? 100 : clamp(100 - (ratio - 1.5) * 60, 40, 100)
  return { id: 'hydration', label: 'Hydratation', score: round(clamp(score, 0, 100)), status: 'ok', detail: `${d.ml} / ${target} ml`, extra: { ml: d.ml, target, caf: d.caf } }
}

export function pillarNutrition(db, iso) {
  const t = db.foodTargets
  const d = nutritionDay(db, iso)
  if (d.entries === 0) return { id: 'nutrition', label: 'Nutrition', score: null, status: 'absent', detail: "Aucun aliment enregistré aujourd'hui." }
  const kcalTarget = t ? (num(t.kcal, 0) || num(t.k, 0)) : 0
  const protTarget = t ? (num(t.prot, 0) || num(t.p, 0)) : 0
  if (!t || !kcalTarget) return { id: 'nutrition', label: 'Nutrition', score: null, status: 'no-target', detail: 'Définis tes objectifs caloriques pour activer le score.', extra: { kcal: round(d.k), prot: round(d.p) } }
  const kRatio = d.k / kcalTarget
  const pRatio = protTarget ? d.p / protTarget : 1
  const kScore = kRatio <= 1 ? kRatio * 100 : clamp(100 - (kRatio - 1) * 80, 40, 100)
  const pScore = clamp(pRatio * 100, 0, 100)
  const score = round(clamp(kScore * 0.5 + pScore * 0.5, 0, 100))
  return { id: 'nutrition', label: 'Nutrition', score, status: 'ok', detail: `${round(d.k)} / ${round(kcalTarget)} kcal`, extra: { kcal: round(d.k), kcalTarget: round(kcalTarget), prot: round(d.p), protTarget: round(protTarget) } }
}

export function pillarSleep(db) {
  const s = db.sleepLog && db.sleepLog[todayISO()]
  if (!s || !num(s.hours, 0)) return { id: 'sleep', label: 'Sommeil', score: null, status: 'absent', detail: 'Tap pour enregistrer ton sommeil.' }
  const h = num(s.hours, 0)
  let dScore
  if (h >= 7 && h <= 9) dScore = 100
  else if (h >= 6) dScore = 70 + (h - 6) * 30
  else if (h >= 5) dScore = 40 + (h - 5) * 30
  else dScore = clamp(h / 5 * 40, 0, 40)
  if (h > 9) dScore = clamp(100 - (h - 9) * 10, 80, 100)
  dScore = clamp(dScore, 0, 100)
  const qScore = s.quality ? clamp((s.quality / 5) * 100, 0, 100) : null
  let score = qScore != null ? round(dScore * 0.7 + qScore * 0.3) : round(dScore)
  let detail = `${h} h`
  if (s.quality) detail += ` · qualité ${s.quality}/5`
  const rt = db.sleepRoutine
  if (rt && rt.enabled && rt.bedtime && rt.wake) {
    const toMin = (t) => { const a = ('' + t).split(':'); return (parseInt(a[0], 10) || 0) * 60 + (parseInt(a[1], 10) || 0) }
    let diff = toMin(rt.wake) - toMin(rt.bedtime); if (diff <= 0) diff += 1440
    const target = diff / 60
    const gap = Math.abs(h - target)
    if (gap > 1) {
      const pen = clamp((gap - 1) * 10, 0, 30)
      score = round(clamp(score - pen, 0, 100))
      detail += ` · hors routine (−${round(pen)})`
    } else {
      detail += ' · routine ✓'
    }
  }
  const aw = num(s.awakenings, 0)
  if (aw > 1) {
    const awPen = clamp((aw - 1) * 5, 0, 15)
    score = round(clamp(score - awPen, 0, 100))
    detail += ` · ${aw} réveils`
  } else if (aw === 1) {
    detail += ' · 1 réveil'
  }
  // Une bonne nuit isolée ne solde pas une semaine de restriction : la
  // dette accumulée sur la quinzaine pèse aussi sur le score, sans quoi le
  // pilier afficherait 100 au lendemain de six nuits à cinq heures.
  const series = sleepSeries(db.sleepLog, { days: 14, today: todayISO() })
  const need = neededHours(rolling7Mins(db))
  const debt = sleepDebt(series, need)
  let debtPen = 0
  if (debt && series.length >= 4 && debt.net > 2) {
    debtPen = round(clamp((debt.net - 2) * 2, 0, 20))
    score = round(clamp(score - debtPen, 0, 100))
    // Le besoin relevé par la charge doit être dit, sinon une pénalité
    // tombant sur des nuits de huit heures paraît arbitraire.
    detail += ` · dette ${debt.net} h sur ${debt.nights} nuits${need > 8 ? ` (besoin ${need} h vu ta charge)` : ''} (−${debtPen})`
  }
  return { id: 'sleep', label: 'Sommeil', score, status: 'ok', detail, extra: { hours: h, quality: s.quality || null, awakenings: aw, debt: debt || null, debtPen } }
}

export function pillarMobility(db) {
  const m = db.mobility
  if (!m || m.score == null) return { id: 'mobility', label: 'Mobilité / Prévention', score: null, status: 'absent', detail: 'Fais le test de mobilité pour activer le score.' }
  const weak = (m.zones || []).filter((z) => z.val > 0 && z.val < 2).map((z) => z.label)
  return { id: 'mobility', label: 'Mobilité / Prévention', score: round(clamp(num(m.score, 0), 0, 100)), status: 'ok', detail: (m.level || '') + (weak.length ? ` · zones faibles : ${weak.join(', ')}` : ''), extra: { weak } }
}

export function pillarPrevention(db) {
  const p = db.prevention
  if (!p || p.score == null) return { id: 'prevention', label: 'Prévention', score: null, status: 'absent', detail: 'Fais le bilan de prévention pour activer ce score.' }
  const base = clamp(100 - num(p.score, 0), 0, 100)
  // La durée de la douleur était stockée mais jamais relue : une gêne de
  // trois jours et une gêne de six semaines pesaient exactement pareil,
  // alors que c'est justement l'installation dans le temps qui doit
  // faire réagir.
  const pd = painDuration(db)
  let painPenalty = 0
  if (p.pain && p.pain.active) {
    painPenalty = p.pain.urgent ? 40 : 20
    if (pd && !p.pain.urgent) {
      if (pd.days >= PAIN_CHRONIC_DAYS) painPenalty = 35
      else if (pd.days >= PAIN_SUBACUTE_DAYS) painPenalty = 27
    }
  }
  // Un bilan de quatre mois décrivait une situation révolue tout en
  // pilotant le score comme s'il était frais. On ne l'invalide pas, on
  // rapproche son score de la neutralité à mesure qu'il vieillit.
  const fresh = bilanFreshness(db)
  let score = round(clamp(base - painPenalty, 0, 100))
  if (fresh.level === 'stale') score = round(score + (60 - score) * 0.5)
  else if (fresh.level === 'aging') score = round(score + (60 - score) * 0.25)
  let detail = `Risque ${(p.level || '').toLowerCase()}`
  if (p.pain && p.pain.active) {
    detail += p.pain.urgent ? ' · douleur à surveiller de près'
      : pd ? ` · douleur au ${pd.region} depuis ${pd.days} j` : ' · douleur active'
  }
  if (fresh.level === 'stale' || fresh.level === 'aging') detail += ` · bilan vieux de ${fresh.days} j`
  return { id: 'prevention', label: 'Prévention', score, status: 'ok', detail, extra: { level: p.level, pain: p.pain || null, date: p.date, painDays: pd ? pd.days : null, freshness: fresh } }
}

// Charge d'entraînement de la semaine en cours. weekRetro fusionne déjà
// Calendrier + lecteur intégré sur les dates réelles — utiliser db.week
// ici gonflait la charge avec les minutes de toutes les semaines passées
// (compteur indexé par jour de semaine, jamais remis à zéro).
export function pillarLoad(db) {
  const plannerData = plannerWeekData(db)
  const mergedWeek = weekRetro(db).week
  const sum = mergedWeek.reduce((a, b) => a + b, 0)

  if (sum === 0) {
    return { id: 'load', label: "Charge d'entraîn.", score: null, status: 'absent', detail: plannerData.planned > 0 ? `${plannerData.planned} séance(s) planifiée(s)` : 'Aucune séance cette semaine.', extra: { plannerCount: 0, plannerPlanned: plannerData.planned } }
  }
  const g = db.goals || {}
  let target = num(g.dailyMin, 10) * num(g.weeklySessions, 4)
  if (!target) target = 120
  const ratio = sum / target
  let score
  if (ratio < 0.8) score = ratio / 0.8 * 80
  else if (ratio <= 1.2) score = 100
  else score = clamp(100 - (ratio - 1.2) * 70, 30, 100)
  const maxDay = Math.max(...mergedWeek.map((m) => num(m, 0)))
  const spike = sum > 0 && maxDay / sum > 0.6 && sum > target * 0.5
  return { id: 'load', label: "Charge d'entraîn.", score: round(clamp(score, 0, 100)), status: 'ok', detail: `${sum} / ${target} min`, extra: { weekMin: sum, targetMin: target, ratio, spike, plannerCount: plannerData.count, plannerPlanned: plannerData.planned } }
}

// Niveau utilisateur déduit du profil (ou fixé manuellement via
// profilePhys.levelOverride) — sert de repère d'expérience sur le Profil,
// et fournit les seuils acwrWarn/acwrAlert utilisés par acwrRisk().
const LEVEL_PRESETS = {
  debutant: { id: 'debutant', label: 'Débutant', acwrWarn: 1.20, acwrAlert: 1.35 },
  intermediaire: { id: 'intermediaire', label: 'Intermédiaire', acwrWarn: 1.30, acwrAlert: 1.50 },
  confirme: { id: 'confirme', label: 'Confirmé', acwrWarn: 1.40, acwrAlert: 1.60 },
}

export function inferUserLevel(db) {
  const override = db.profilePhys && db.profilePhys.levelOverride
  if (override && LEVEL_PRESETS[override]) {
    return { ...LEVEL_PRESETS[override], manual: true }
  }
  const g = db.goals || {}
  const mob = db.mobility || null
  const total = trainingTotals(db).sessionsTotal
  const perWeek = g.weeklySessions || 3
  const mobScore = mob && mob.score != null ? mob.score : null
  if (total < 20 || perWeek < 3) return { ...LEVEL_PRESETS.debutant, manual: false }
  if (total >= 80 && perWeek >= 5 && (mobScore == null || mobScore >= 60)) return { ...LEVEL_PRESETS.confirme, manual: false }
  return { ...LEVEL_PRESETS.intermediaire, manual: false }
}

// ACWR (charge aiguë 7j / charge chronique moyenne 28j) — Gabbett 2016 (Br J
// Sports Med) et littérature ultérieure ; zone repère 0.8–1.3, risque accru
// au-delà de ~1.5. Indicateur statistique de population, pas un diagnostic
// individuel (Impellizzeri et al.). Nécessite ≥14 jours d'historique réalisé.
export function acwrRisk(db) {
  const sessions = db.planningSessions || []
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const nowMs = now.getTime()
  // Charge pondérée par les conditions : une heure à 33 °C sollicite plus
  // qu'une heure à 15 °C. Compter des minutes brutes sous-estimerait
  // l'effort réel et laisserait passer une montée de charge dangereuse
  // pendant une canicule. L'acclimatation atténue la pondération.
  const weather = db.weatherLog || {}
  const acclim = heatAcclimation(weather, now)
  function minsInWindow(daysBack) {
    const startMs = nowMs - daysBack * 86400000
    let sum = 0
    for (const s of sessions) {
      if (!s || s.statut !== 'realise' || !s.date) continue
      const t = new Date(s.date + 'T00:00:00').getTime()
      if (t > nowMs || t <= startMs) continue
      const c = weather[s.date]
      // La charge ne comptait que les minutes : une heure de récupération
      // et une heure de match pesaient pareil. Le RPE, désormais saisi pour
      // tous les sports, permet la charge de séance au sens usuel — durée ×
      // intensité ressentie. On la ramène à l'échelle des minutes (RPE 5 =
      // neutre) pour ne pas changer d'ordre de grandeur, et on retombe sur
      // les minutes seules quand l'intensité n'est pas renseignée : mieux
      // vaut une charge inchangée qu'une charge inventée.
      const rpe = Number(s.data && s.data.rpe)
      const intensity = Number.isFinite(rpe) && rpe > 0 ? rpe / 5 : 1
      sum += dureeToMins(s.duree) * intensity * (c ? loadMultiplier(c, { acclimation: acclim }) : 1)
    }
    return Math.round(sum)
  }
  const hasAny = sessions.some((s) => s && s.statut === 'realise' && s.date)
  if (!hasAny) return { available: false, reason: 'no_data' }
  const oldestMs = sessions.reduce((min, s) => {
    if (!s || s.statut !== 'realise' || !s.date) return min
    const t = new Date(s.date + 'T00:00:00').getTime()
    return (min == null || t < min) ? t : min
  }, null)
  const daysOfHistory = oldestMs != null ? Math.floor((nowMs - oldestMs) / 86400000) : 0
  if (daysOfHistory < 14) return { available: false, reason: 'not_enough_history', daysOfHistory }
  const acuteMin = minsInWindow(7)
  const chronicTotal = minsInWindow(28)
  const chronicAvgWeek = chronicTotal / 4
  if (chronicAvgWeek <= 0) return { available: false, reason: 'no_chronic_load' }
  const ratio = acuteMin / chronicAvgWeek
  const ratioR = Math.round(ratio * 100) / 100
  const ul = inferUserLevel(db)
  let level, color, advice
  if (ratio < 0.8) {
    level = 'Sous-charge'; color = 'var(--c-carb)'
    advice = ul.id === 'debutant'
      ? 'Charge basse — normal au démarrage. Augmente progressivement (+10 % max / semaine).'
      : "Charge récente plus basse que d'habitude — marge pour reprendre progressivement."
  } else if (ratio <= ul.acwrWarn) {
    level = 'Zone optimale'; color = 'var(--c-success)'
    advice = `Charge cohérente avec ton profil ${ul.label.toLowerCase()} — progression bien maîtrisée.`
  } else if (ratio <= ul.acwrAlert) {
    level = 'Vigilance'; color = 'var(--c-warn)'
    advice = ul.id === 'debutant'
      ? "Hausse rapide pour un profil débutant — ton corps a besoin de plus de temps pour s'adapter. Insère un jour de repos."
      : ul.id === 'confirme'
        ? 'Charge élevée mais dans ta zone de tolérance. Surveille : fatigue, raideurs, qualité du sommeil.'
        : 'Charge sensiblement plus haute que ta moyenne. Surveille fatigue et douleurs, priorise le sommeil.'
  } else {
    level = 'Vigilance renforcée'; color = '#c4503a'
    advice = (ul.id === 'debutant'
      ? "Charge en forte hausse pour un profil débutant — laisse plus de temps à l'adaptation. Réduis le volume et repose-toi 1–2 jours."
      : ul.id === 'confirme'
        ? 'Augmentation marquée, même pour un profil confirmé. Bascule en récupération active cette semaine.'
        : 'Augmentation marquée et rapide de la charge.')
      + ' Cet indicateur est corrélationnel (preuve modérée, débattue dans la recherche récente) — combine-le avec tes sensations : douleur, fatigue, qualité du sommeil.'
  }
  return { available: true, ratio: ratioR, acuteMin: Math.round(acuteMin), chronicAvgWeek: Math.round(chronicAvgWeek), level, color, advice, userLevel: ul }
}

function acwrLevelFor(ratio, ul) {
  if (ratio < 0.8) return { level: 'Sous-charge', color: 'var(--c-carb)' }
  if (ratio <= ul.acwrWarn) return { level: 'Zone optimale', color: 'var(--c-success)' }
  if (ratio <= ul.acwrAlert) return { level: 'Vigilance', color: 'var(--c-warn)' }
  return { level: 'Vigilance renforcée', color: '#c4503a' }
}

// "Si je fais aussi cette séance-là (extraMins), ma charge deviendrait…" —
// reprend l'acuteMin/chronicAvgWeek déjà calculés par acwrRisk et les
// seuils du même profil utilisateur, pour prévenir AVANT de valider une
// séance plutôt que de constater le surmenage après coup.
export function projectedAcwr(db, extraMins) {
  const current = acwrRisk(db)
  if (!current.available || !extraMins) return null
  const ratio = Math.round((current.acuteMin + extraMins) / current.chronicAvgWeek * 100) / 100
  const { level, color } = acwrLevelFor(ratio, current.userLevel)
  return { ratio, level, color, currentRatio: current.ratio, currentLevel: current.level, worsened: level !== current.level && (level === 'Vigilance' || level === 'Vigilance renforcée') }
}

// Combien de jours consécutifs (jusqu'à et y compris `dateISO`) ont déjà
// une séance "réalisée" — pour repérer un enchaînement sans repos au
// moment même où on planifie une séance de plus sur la pile.
export function consecutiveDaysBefore(db, dateISO) {
  const sessions = db.planningSessions || []
  const doneDates = new Set(sessions.filter((s) => s && s.statut === 'realise' && s.date).map((s) => s.date))
  let n = 0
  let d = new Date(dateISO + 'T00:00:00')
  while (n < 21) {
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    if (iso === dateISO || doneDates.has(iso)) { n++; d.setDate(d.getDate() - 1) } else break
  }
  return n
}

// Volume cible pour une nouvelle séance si un objectif Pic de forme est en
// affûtage — applique targetVolumePct (déjà calculé par computePeakPlan) à
// la durée "habituelle" fournie par l'appelant (ex : dernière séance du
// même sport), pour suggérer directement une durée réduite plutôt que de
// laisser l'utilisateur deviner le pourcentage à appliquer.
export function taperSuggestedMins(plan, usualMins) {
  if (!plan || plan.phase !== 'taper' || plan.targetVolumePct == null || !usualMins) return null
  return Math.max(5, Math.round(usualMins * plan.targetVolumePct / 100 / 5) * 5)
}

// Prêt pour le jour J ? Croise le plan Pic de forme (calendaire, calculé
// par computePeakPlan) avec les VRAIES données d'entraînement/récup pour
// donner un score de préparation et des alertes concrètes — jusqu'ici le
// plan ne regardait que la date, jamais si l'affûtage était vraiment
// respecté ou si la charge réelle mettait l'objectif en danger.
export function peakReadiness(db, plan) {
  const flags = []
  let score = 100

  const acwr = acwrRisk(db)
  if (acwr.available) {
    if ((plan.phase === 'base' || plan.phase === 'build') && acwr.level === 'Vigilance renforcée') {
      flags.push({ level: 'alert', text: `Charge en zone "vigilance renforcée" (ratio ${acwr.ratio}) pendant ta phase de ${plan.phase === 'base' ? 'développement général' : 'développement spécifique'} — risque d'arriver à l'affûtage déjà fatigué.` })
      score -= 30
    } else if ((plan.phase === 'base' || plan.phase === 'build') && acwr.level === 'Vigilance') {
      flags.push({ level: 'warn', text: `Charge en zone "vigilance" (ratio ${acwr.ratio}) — surveille fatigue et sommeil pour ne pas arriver épuisé à l'affûtage.` })
      score -= 15
    } else if (plan.phase === 'taper' && (acwr.level === 'Vigilance' || acwr.level === 'Vigilance renforcée')) {
      flags.push({ level: 'alert', text: `Tu entres en affûtage avec une charge encore élevée (ratio ${acwr.ratio}) — laisse vraiment le corps récupérer d'ici le jour J.` })
      score -= 25
    }
  }

  let taperCompliance = null
  if (plan.phase === 'taper' && plan.targetVolumePct != null && plan.taperStartISO) {
    const thisWeek = weekRetro(db).total
    const taperMonday = mondayOf(new Date(plan.taperStartISO + 'T00:00:00'))
    let refSum = 0, refCount = 0
    for (let i = 1; i <= 4; i++) {
      const wk = weekRetro(db, new Date(taperMonday.getTime() - i * 7 * 86400000))
      if (wk.total > 0) { refSum += wk.total; refCount++ }
    }
    if (refCount > 0) {
      const refAvg = refSum / refCount
      const actualPct = refAvg > 0 ? Math.round(thisWeek / refAvg * 100) : 0
      taperCompliance = { actualPct, targetPct: plan.targetVolumePct, refAvg: round(refAvg), thisWeek }
      const gap = actualPct - plan.targetVolumePct
      if (gap > 20) {
        flags.push({ level: 'warn', text: `Volume cette semaine à ${actualPct}% de ta charge habituelle (${thisWeek} / ~${round(refAvg)} min), alors que l'affûtage recommande de viser ${plan.targetVolumePct}% — réduis encore pour arriver frais.` })
        score -= 25
      } else if (gap < -40) {
        flags.push({ level: 'info', text: `Volume déjà très réduit (${actualPct}% vs ${plan.targetVolumePct}% recommandé) — pas la peine de couper davantage, garde un minimum d'activité pour rester affûté.` })
        score -= 5
      }
    }
  }

  if (db.mobility && db.mobility.score != null && db.mobility.score < 60) {
    flags.push({ level: 'info', text: `Mobilité à ${db.mobility.score}/100 — des zones raides peuvent limiter ton geste le jour J.` })
    score -= 12
  }

  const sleepDates = Object.keys(db.sleepLog || {}).sort().slice(-7)
  let sleepSum = 0, sleepN = 0
  for (const d of sleepDates) { const e = (db.sleepLog || {})[d]; if (e && typeof e.hours === 'number') { sleepSum += e.hours; sleepN++ } }
  const sleepAvg = sleepN ? round(sleepSum / sleepN * 10) / 10 : null
  if (sleepAvg != null && sleepAvg < 7) {
    flags.push({ level: 'info', text: `Sommeil moyen ${sleepAvg} h sur les 7 derniers jours enregistrés — sous la fourchette optimale (7–9 h) pour bien récupérer.` })
    score -= 10
  }

  return { score: clamp(score, 0, 100), flags, acwr, taperCompliance, sleepAvg }
}

export function pillars(db, iso) {
  iso = iso || todayISO()
  return [pillarHydration(db, iso), pillarNutrition(db, iso), pillarSleep(db), pillarLoad(db), pillarMobility(db), pillarPrevention(db)]
}

// Score global : moyenne des piliers actifs (poids égal), renormalisée
// sur les piliers réellement actifs.
export function globalScore(db, iso) {
  const ps = pillars(db, iso)
  const active = ps.filter((p) => p.score != null)
  if (active.length === 0) return { score: null, active: 0, total: ps.length, pillars: ps }
  const sum = active.reduce((a, p) => a + p.score, 0)
  return { score: round(sum / active.length), active: active.length, total: ps.length, pillars: ps }
}

// --- Stats d'entraînement (planning + historique d'exercices Supabase) ---
const PALETTE = ['#e07b54', 'var(--c-carb)', 'var(--c-success)', 'var(--c-warn)', '#7a6fa5', '#4a8aa5', '#a5704a', '#9a7ab5', '#c4503a', 'var(--c-success)']
function sportMeta(id) {
  const sp = SPORTS.find((s) => s.id === id)
  const idx = SPORTS.findIndex((s) => s.id === id)
  return { label: sp ? sp.label : (id || 'Autre'), color: PALETTE[(idx < 0 ? 0 : idx) % PALETTE.length] }
}

export function trainingStats(db) {
  const empty = { hasData: false, weekSessions: 0, weekKm: 0, monthSessions: 0, monthKm: 0, sports: [], records: [], perche: 0, courseTrend: [], courseTrendMax: 0 }
  const sessions = db.planningSessions || []
  const exHist = db.exerciseHistory || {}
  if (!sessions.length) return empty

  const now = new Date(); now.setHours(0, 0, 0, 0)
  const monday = mondayOf(now)
  const mondayMs = monday.getTime()
  const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')

  let weekSessions = 0, weekKm = 0, monthSessions = 0, monthKm = 0
  const counts = {}
  let perche = 0
  const distOf = (s) => (s.data && s.data.distance ? num(s.data.distance, 0) : 0)

  for (const s of sessions) {
    if (!s || s.statut !== 'realise' || !s.date) continue
    counts[s.sport] = (counts[s.sport] || 0) + 1
    const ms = new Date(s.date + 'T00:00:00').getTime()
    if (ms >= mondayMs) { weekSessions++; if (s.sport === 'course') weekKm += distOf(s) }
    if (s.date.slice(0, 7) === ym) { monthSessions++; if (s.sport === 'course') monthKm += distOf(s) }
    if (s.sport === 'perche' && s.data && s.data.hauteur) perche = Math.max(perche, num(s.data.hauteur, 0))
  }

  const totalSports = Object.values(counts).reduce((a, b) => a + b, 0)
  const sports = Object.keys(counts).map((k) => ({ id: k, label: sportMeta(k).label, color: sportMeta(k).color, count: counts[k], pct: totalSports ? Math.round(counts[k] / totalSports * 100) : 0 })).sort((a, b) => b.count - a.count)

  const records = Object.keys(exHist).filter((n) => exHist[n] && exHist[n].record)
    .map((n) => ({ name: n, charge: num(exHist[n].record.charge, 0), last: exHist[n].last ? num(exHist[n].last.charge, 0) : null }))
    .sort((a, b) => b.charge - a.charge).slice(0, 6)

  const trend = []
  const todayDow = (now.getDay() + 6) % 7
  for (let w = 7; w >= 0; w--) {
    const ws = new Date(now); ws.setDate(now.getDate() - todayDow - w * 7)
    const wsMs = ws.getTime(); const weMs = wsMs + 7 * 86400000
    let km = 0
    for (const ss of sessions) {
      if (!ss || ss.statut !== 'realise' || ss.sport !== 'course' || !ss.date) continue
      const t = new Date(ss.date + 'T00:00:00').getTime()
      if (t >= wsMs && t < weMs) km += distOf(ss)
    }
    trend.push(Math.round(km * 10) / 10)
  }
  const trendMax = trend.reduce((a, b) => Math.max(a, b), 0)

  return { hasData: totalSports > 0, weekSessions, weekKm: Math.round(weekKm * 10) / 10, monthSessions, monthKm: Math.round(monthKm), sports, records, perche, courseTrend: trend, courseTrendMax: trendMax }
}

// Recommandations : ne se déclenchent que si la donnée existe (aucune
// donnée fabriquée). Version complète — croise nutrition/hydratation,
// charge réelle (ACWR), sommeil, prévention/douleur, mobilité, tests
// physiques, planning (ressenti, séances à venir), cycle, compléments
// et Pic de forme pour des conseils aussi précis que possible sur ce
// qui est réellement mesurable dans l'app.
export function recommendations(db) {
  const iso = todayISO()
  const recos = []
  const push = (level, ic, text, action) => recos.push({ level, icon: ic, text, action })

  // --- Protéines ---
  const nut = pillarNutrition(db, iso)
  if (nut.status === 'ok' && nut.extra.protTarget && nut.extra.prot < nut.extra.protTarget * 0.7) {
    push('warn', 'apple', `Ta consommation de protéines est trop faible pour ton objectif (${nut.extra.prot} / ${nut.extra.protTarget} g).`, 'nutrition')
  }

  // --- Hydratation / caféine ---
  const hyd = pillarHydration(db, iso)
  if (hyd.status === 'ok' && hyd.extra.ml < hyd.extra.target * 0.6) {
    push('warn', 'drop', `Hydratation en retard : ${hyd.extra.ml} / ${hyd.extra.target} ml aujourd'hui.`, 'hydratation')
  }
  if (hyd.status === 'ok' && hyd.extra.caf >= 320) {
    push(hyd.extra.caf >= 400 ? 'alert' : 'warn', 'bolt', `Ta consommation de caféine (${hyd.extra.caf} mg) est proche de la limite recommandée (400 mg/j).`, 'hydratation')
  }

  // --- Charge d'entraînement : ACWR (historique réel) prioritaire sur le
  // simple ratio hebdo/objectif, qui se déclenchait trop facilement seul.
  const load = pillarLoad(db)
  const acwr = acwrRisk(db)
  if (acwr.available) {
    const ul2 = acwr.userLevel
    if (acwr.ratio > ul2.acwrAlert) {
      push('warn', 'chart', ul2.id === 'debutant'
        ? "Ta charge augmente trop vite pour ton niveau débutant — réduis le volume et insère un jour de repos."
        : ul2.id === 'confirme'
          ? 'Charge très élevée même pour ton niveau confirmé — semaine de récupération active conseillée.'
          : "Ta charge d'entraînement augmente trop rapidement cette semaine.", 'planner')
    } else if (acwr.ratio > ul2.acwrWarn && load.status === 'ok' && load.extra.spike) {
      push('warn', 'chart', 'Grosse séance isolée : pense à équilibrer ta charge sur la semaine.', 'planner')
    }
  } else if (load.status === 'ok' && load.extra.spike) {
    push('warn', 'chart', 'Grosse séance isolée : pense à équilibrer ta charge sur la semaine.', 'planner')
  }
  if (load.extra && load.extra.plannerPlanned > 0 && load.extra.plannerCount === 0) {
    push('info', 'calendar', `${load.extra.plannerPlanned} séance(s) planifiée(s) cette semaine — pense à les marquer comme réalisées.`, 'planner')
  }

  // --- Aucun jour de repos cette semaine (nouveau) : ne peut se déclencher
  // que quand les 7 jours (lun→dim) ont déjà une séance réalisée, donc
  // naturellement en fin de semaine — pas de faux positif en milieu de semaine.
  const weekPlanner = plannerWeekData(db)
  if (weekPlanner.week.every((m) => m > 0)) {
    push('warn', 'leaf', `Aucun jour de repos cette semaine (séance réalisée les 7 jours, ${weekPlanner.total} min au total) — la récupération fait partie de la progression, prévois une coupure.`, 'planner')
  }

  // --- Objectif hebdo de séances non atteint, repère seulement en fin de
  // semaine (jeudi ou plus tard) pour éviter de rappeler l'objectif trop tôt.
  const dowNow = (new Date().getDay() + 6) % 7
  const g2 = db.goals || {}
  if (dowNow >= 3 && g2.weeklySessions && weekPlanner.count < g2.weeklySessions) {
    push('info', 'calendar', `${weekPlanner.count} / ${g2.weeklySessions} séances réalisées cette semaine — il reste ${7 - dowNow} jour(s) pour atteindre ton objectif.`, 'planner')
  }

  // --- Sommeil ---
  const slp = pillarSleep(db)
  if (slp.status === 'ok' && slp.extra.hours) {
    const h = slp.extra.hours
    if (h < 6) push('alert', 'moon', `Seulement ${h.toFixed(1)} h de sommeil cette nuit — en-dessous de 6 h, récupération et performances chutent significativement (AASM).`, 'sommeil')
    else if (h < 7) push('warn', 'moon', `${h.toFixed(1)} h de sommeil cette nuit — vise 7–9 h pour une récupération optimale.`, 'sommeil')
  }

  // --- Dette de sommeil chronique (nouveau) : moyenne des 3 dernières nuits
  // renseignées < 6h30 — un signal plus fiable qu'une seule nuit isolée,
  // qui peut être une exception ponctuelle.
  const sleepLog = db.sleepLog || {}
  const last3Nights = []
  for (let k = 0; k <= 2; k++) {
    const dk = new Date(new Date(iso + 'T00:00:00')); dk.setDate(dk.getDate() - k)
    const isoK = todayISOFrom(dk)
    const s = sleepLog[isoK]
    if (s && num(s.hours, 0) > 0) last3Nights.push(num(s.hours, 0))
  }
  if (last3Nights.length === 3) {
    const avg3 = last3Nights.reduce((a, b) => a + b, 0) / 3
    if (avg3 < 6.5) {
      push('alert', 'moon', `Moyenne de ${avg3.toFixed(1)} h de sommeil sur les 3 dernières nuits — dette de sommeil qui s'installe, pas juste une mauvaise nuit isolée. Priorise le repos avant que ça n'affecte tes séances.`, 'sommeil')
    }
  }

  // --- Hydratation, caféine et sucres ---
  // L'horodatage de chaque boisson n'était lu nulle part, et la
  // préférence de coupure du soir n'était comparée à rien.
  const hydAna = hydroAnalysis(db, { days: 28, today: iso, targetMl: hydricTargetMl(db) })
  if (hydAna.series.length >= 5) {
    if (hydAna.vsSleep && hydAna.vsSleep.flagged) {
      push('warn', 'cup', `Les nuits qui suivent une caféine après ${hydAna.cutoff} h sont plus courtes ou moins bonnes que les autres dans ton propre historique (${hydAna.vsSleep.hoursLate} h et qualité ${hydAna.vsSleep.qualityLate}/5, contre ${hydAna.vsSleep.hoursOther} h et ${hydAna.vsSleep.qualityOther}/5).`, 'hydratation')
    } else if (hydAna.lateCaffeine && hydAna.lateCaffeine.level === 'warn') {
      push('info', 'cup', `${hydAna.lateCaffeine.text} Avec une demi-vie d'environ six heures, il en reste ${hydAna.lateCaffeine.meanResidual} mg en moyenne au coucher.`, 'hydratation')
    }
    if (hydAna.adherence && hydAna.adherence.level === 'alert') {
      push('warn', 'drop', hydAna.adherence.text + ' Une moyenne correcte peut masquer une majorité de journées en dessous.', 'hydratation')
    }
    if (hydAna.distribution && hydAna.distribution.level === 'warn') {
      push('info', 'drop', hydAna.distribution.text, 'hydratation')
    }
    if (hydAna.sugar && hydAna.sugar.level === 'warn') {
      push('info', 'drop', hydAna.sugar.text, 'hydratation')
    }
  }

  // --- Irrégularité et rattrapage du week-end ---
  // Deux signaux que la moyenne des nuits ne peut pas produire : quelqu'un
  // à 7,5 h de moyenne peut alterner 5 h et 10 h, ce qu'aucune des règles
  // ci-dessus ne voit. Et ce sont des leviers plus actionnables qu'une
  // injonction à « dormir plus ».
  const sleepAna = sleepAnalysis(db, { days: 14, today: iso, weeklyTrainingMins: rolling7Mins(db, iso) })
  if (sleepAna.regularity && sleepAna.regularity.level === 'alert') {
    push('warn', 'moon', `Tes nuits varient fortement d'une nuit à l'autre (±${String(sleepAna.regularity.sd).replace('.', ',')} h autour de ${String(sleepAna.regularity.mean).replace('.', ',')} h) — stabiliser tes horaires de coucher pèse autant que rallonger une nuit.`, 'sommeil')
  }
  if (sleepAna.catchUp && sleepAna.catchUp.flagged) {
    push('info', 'moon', `Tu dors ${String(sleepAna.catchUp.gap).replace('.', ',')} h de plus le week-end qu'en semaine — le besoin est là toute la semaine, c'est l'occasion de dormir qui manque.`, 'sommeil')
  }
  if (sleepAna.afterTraining && sleepAna.afterTraining.flagged) {
    push('info', 'moon', `Tu dors ${String(Math.abs(sleepAna.afterTraining.diff)).replace('.', ',')} h de moins les nuits qui suivent une séance — regarde l'horaire de tes entraînements tardifs et la caféine en fin de journée.`, 'sommeil')
  }

  // --- Prévention / douleur ---
  const prev = pillarPrevention(db)
  const prevAna = preventionAnalysis(db, { today: iso, acwr })
  if (prev.status === 'ok' && prev.extra.pain && prev.extra.pain.active) {
    // La durée change la conduite à tenir : passé trois semaines, ce n'est
    // plus « adapte tes séances », c'est « fais-la voir ».
    const pd = prevAna.pain
    push(prev.extra.pain.urgent || (pd && pd.level === 'alert') ? 'alert' : 'warn', 'shield',
      prev.extra.pain.urgent
        ? 'Douleur signalée comme préoccupante lors de ton dernier bilan de prévention — arrête les impacts et consulte un professionnel de santé.'
        : pd ? pd.text
          : 'Douleur active signalée dans ton bilan de prévention — adapte tes séances tant qu\'elle n\'est pas résolue.', 'prevention')
    if (acwr.available && (acwr.level === 'Vigilance' || acwr.level === 'Vigilance renforcée')) {
      push('alert', 'shield', 'Douleur active et charge d\'entraînement élevée en même temps — combinaison à risque, priorise la récupération avant de reprendre l\'intensité.', 'prevention')
    }
  } else if (prev.status === 'absent') {
    push('info', 'shield', 'Tu n\'as pas encore fait ton bilan de prévention — utile pour repérer tes facteurs de risque de blessure avant qu\'ils ne posent problème.', 'prevention')
  } else if (prev.status === 'ok' && prevAna.freshness.level !== 'fresh') {
    push('info', 'shield', `${prevAna.freshness.text} Le score de prévention s'appuie dessus, donc il vieillit avec lui.`, 'prevention')
  }
  // Une zone qui revient n'appelle pas la même réponse qu'une première
  // gêne : le questionnaire posait la question, l'application peut
  // maintenant y répondre à partir des épisodes enregistrés.
  if (prevAna.recurrent.length) {
    const r = prevAna.recurrent[0]
    push('warn', 'shield', `Le ${r.label} t'a déjà gêné ${r.episodes} fois${r.totalDays ? ` (${r.totalDays} jours cumulés)` : ''} — une zone qui récidive demande un renforcement ciblé et un avis professionnel, pas seulement du repos entre deux épisodes.`, 'prevention')
  }
  // Le questionnaire demande si la charge a augmenté ; les séances
  // enregistrées le mesurent. Quand la mesure contredit la déclaration,
  // le dire vaut mieux que laisser le score reposer sur un souvenir.
  if (prevAna.loadCheck && prevAna.loadCheck.level === 'warn') {
    push('warn', 'shield', prevAna.loadCheck.text, 'prevention')
  }
  // Un point faible qui traverse plusieurs bilans est le seul sur lequel
  // rien n'a bougé — donc celui qui mérite l'effort.
  const stuck = prevAna.tags.persistent.find((t) => t.bilans >= 3)
  if (stuck) {
    push('info', 'shield', `Ce point ressort sur tes ${stuck.bilans} derniers bilans de prévention : ${(PREVENTION_RECO[stuck.tag] || stuck.tag)}`, 'prevention')
  }

  // --- Diagnostic nutrition et objectifs personnels ---
  // Les cinq scores par pilier n'étaient jamais comparés dans le temps, et
  // deux d'entre eux — hydratation, récupération — portent sur des choses
  // que l'application mesure par ailleurs. C'est le seul endroit où le
  // déclaratif et le mesuré peuvent se contredire.
  const diagAna = diagAnalysis(db, {
    today: iso,
    hydro: hydAna,
    sleep: sleepAna,
  })
  for (const c of diagAna.contradictions) {
    push(c.level === 'warn' ? 'warn' : 'info', 'apple', c.text, 'nutrition')
  }
  if (diagAna.hidden && diagAna.hidden.masked) {
    push('info', 'apple', `Ton score de diagnostic n'a bougé que de ${diagAna.hidden.globalDelta > 0 ? '+' : ''}${diagAna.hidden.globalDelta} points, mais il recouvre des mouvements opposés : ${diagAna.hidden.up.map((m) => m.label.toLowerCase()).join(', ')} en progrès, ${diagAna.hidden.down.map((m) => m.label.toLowerCase()).join(', ')} en recul.`, 'nutrition')
  }
  if (diagAna.goals && diagAna.goals.stale.length) {
    push('info', 'target', `${diagAna.goals.stale.length} objectif${diagAna.goals.stale.length > 1 ? 's personnels traînent' : ' personnel traîne'} depuis plus de deux mois — le reformuler ou l'abandonner vaut mieux que le laisser courir.`, 'planner')
  }

  // --- Mobilité ---
  const mob = pillarMobility(db)
  if (mob.status === 'ok' && mob.extra.weak.length) {
    const ankle = mob.extra.weak.some((l) => /cheville/i.test(l))
    push('info', 'target', ankle
      ? 'Ta mobilité de cheville limite potentiellement tes performances — ajoute des exercices ciblés.'
      : `Zones de mobilité à travailler : ${mob.extra.weak.join(', ')}.`, 'mobility')
  }
  // Le détail par zone n'était jamais relu, ni le programme généré à
  // partir de ces zones — pourtant tous deux conservés.
  const mobAna = mobilityAnalysis(db, { today: iso })
  if (mobAna.corroboration.length) {
    const c = mobAna.corroboration[0]
    push('warn', 'target', `${c.label} ressort dans ${c.count} sources indépendantes (${c.sources.join(', ')}) — un signal bien plus solide qu'une mesure isolée, et une zone à traiter en priorité.`, 'mobility')
  }
  if (mobAna.hidden && mobAna.hidden.masked) {
    push('info', 'target', `Ton score de mobilité n'a bougé que de ${mobAna.hidden.globalDelta > 0 ? '+' : ''}${mobAna.hidden.globalDelta} points, mais il recouvre des mouvements opposés : ${mobAna.hidden.up.map((m) => m.label.toLowerCase()).join(', ')} en progrès, ${mobAna.hidden.down.map((m) => m.label.toLowerCase()).join(', ')} en recul.`, 'mobility')
  }
  if (mobAna.stuck.length) {
    push('warn', 'target', `${mobAna.stuck[0].label} reste raide sur tes derniers bilans : insister avec la même routine n'a rien changé, il vaut mieux varier l'approche ou faire évaluer la zone.`, 'mobility')
  }
  if (mobAna.program && mobAna.program.untouched && mobAna.program.ageDays >= 14) {
    push('info', 'target', `Ton programme de mobilité a ${mobAna.program.ageDays} jours et aucune de ses ${mobAna.program.sessions} séances n'a été faite.`, 'mobility')
  } else if (mobAna.program && !mobAna.program.stillRelevant) {
    push('info', 'target', "Ton programme de mobilité cible des zones qui ne sont plus tes plus raides d'après ton dernier test — le régénérer le remettra en phase.", 'mobility')
  }
  if (mob.status === 'ok' && mobAna.freshness.level !== 'fresh') {
    push('info', 'target', mobAna.freshness.text, 'mobility')
  }

  // --- Croisement sport × mobilité (nouveau, au-delà de l'ancienne app) :
  // si une zone faible au test de mobilité correspond à une zone-clé du/des
  // sport(s) pratiqués (SPORTS[].focus), le signal est bien plus précis
  // qu'un simple "zones à travailler" générique.
  if (mob.status === 'ok' && mob.extra.weak.length) {
    const userSportIds = (db.profilePhys && db.profilePhys.sports) || []
    const userSports = SPORTS.filter((sp) => userSportIds.includes(sp.id))
    outer: for (const sp of userSports) {
      const focusLower = (sp.focus || '').toLowerCase()
      for (const wl of mob.extra.weak) {
        const words = wl.toLowerCase().split(/[^a-zàâäéèêëïîôöùûüç]+/).filter((w) => w.length > 3)
        if (words.some((w) => focusLower.includes(w))) {
          push('warn', 'target', `En ${sp.label}, ${wl.toLowerCase()} est une zone clé de la discipline (${sp.focus.toLowerCase()}) — c'est justement ta zone la plus raide au test de mobilité. Priorise les exercices ciblés avant que ça ne devienne limitant.`, 'mobility')
          break outer
        }
      }
    }
  }

  // --- Sport pratiqué sans jamais avoir fait le test de mobilité (nouveau) :
  // invitation ciblée citant la zone-clé du premier sport du profil, plutôt
  // qu'un rappel générique.
  if (mob.status === 'absent') {
    const userSportIds3 = (db.profilePhys && db.profilePhys.sports) || []
    const firstSport = SPORTS.find((sp) => userSportIds3.includes(sp.id) && sp.focus)
    if (firstSport) {
      push('info', 'target', `Tu pratiques le ${firstSport.label.toLowerCase()} mais tu n'as pas encore fait le test de mobilité — utile pour repérer si tes zones-clés (${firstSport.focus.toLowerCase()}) sont limitantes.`, 'mobility')
    }
  }

  // --- Combo sommeil + charge : signal renforcé quand les deux se dégradent ---
  const sleepLow = slp.status === 'ok' && slp.extra.hours && slp.extra.hours < 7
  const loadHigh = (acwr.available && (acwr.level === 'Vigilance' || acwr.level === 'Vigilance renforcée')) || (load.status === 'ok' && load.extra.ratio > 1.3)
  if (sleepLow && loadHigh) {
    push('alert', 'shield', "Sommeil insuffisant et charge d'entraînement élevée en même temps — combinaison qui augmente le risque de blessure et de baisse de performance.", 'sommeil')
  }

  // --- Tests physiques : points faibles précis (pas juste "fais un test") ---
  const tests = db.physTests || []
  if (tests.length === 0) {
    push('info', 'route', 'Tu n\'as encore fait aucun test physique — utile pour cibler tes séances de renfo et mobilité selon tes vrais points faibles.', 'tests')
  } else {
    const byId = {}
    tests.forEach((t) => { if (!byId[t.testId] || t.date > byId[t.testId].date) byId[t.testId] = t })
    const pp = db.profilePhys || {}
    const sexe = pp.sexe === 'f' ? 'f' : 'h'
    const age = Number(pp.age) || 30
    const TEST_LABELS = { gai_max: 'gainage (stabilité du core)', souplesse: 'souplesse', squat30: 'force des jambes', push30: 'force du haut du corps', cooper: 'endurance aérobie' }
    const weak = []
    const weakTestIds = []
    Object.keys(byId).forEach((tid) => {
      const def = TESTS_DEF.find((d) => d.id === tid)
      if (!def) return
      const lv = def.interpret(byId[tid].value, sexe, age)
      if (lv.score <= 2) { weak.push(TEST_LABELS[tid] || tid); weakTestIds.push(tid) }
    })
    if (weak.length) {
      push('warn', 'chart', `Tests physiques : niveau faible en ${weak.join(', ')}. Tes séances de renfo et mobilité devraient cibler ces zones en priorité.`, 'tests')
    }

    // Seule la dernière valeur était regardée. Un test en recul net d'un
    // passage à l'autre, ou une mesure vieille de six mois affichée comme
    // si elle décrivait l'état actuel, passaient inaperçus.
    // Le contexte change le sens d'un recul : après trois semaines sans
    // courir il est attendu, pendant une hausse de volume il alerte. Et les
    // tests au poids du corps bougent mécaniquement quand le poids change.
    const tAna = testsAnalysis(db, {
      sexe, age, today: iso,
      trainingMins: rolling7Mins(db, iso),
      trainingMinsPrev: rolling7Mins(db, todayISOFrom(new Date(new Date(iso + 'T12:00:00').getTime() - 7 * 86400000))),
      weightDelta: (() => {
        const series = weightSeries(db.weightLog, 0)
        if (series.length < 2) return null
        const last = series[series.length - 1]
        // Poids au moment de l'avant-dernier passage du test, pour comparer
        // ce qui a changé entre les deux mesures.
        const prevTest = (db.physTests || []).filter((t) => t && t.date).sort((a, b) => a.date.localeCompare(b.date))
        if (prevTest.length < 2) return null
        const ref = prevTest[prevTest.length - 2].date
        const near = series.filter((e) => e.date <= ref)
        if (!near.length) return null
        return Math.round((last.kg - near[near.length - 1].kg) * 10) / 10
      })(),
    })
    if (tAna.regressions.length) {
      const r = tAna.regressions[0]
      push('warn', 'chart', `${r.label} en recul de ${Math.abs(r.change.pct)} % depuis ton passage précédent (${r.change.prev.value} → ${r.last.value} ${r.unit}) — au-delà de ${r.change.floor} %, ce n'est plus du bruit de mesure.`, 'tests')
    }
    if (tAna.improved.length) {
      const i = tAna.improved[0]
      push('info', 'chart', `${i.label} : ${i.change.delta > 0 ? '+' : '−'}${Math.abs(i.change.delta)} ${i.unit} depuis ton passage précédent${i.isBest ? ", c'est ton meilleur résultat" : ''}.`, 'tests')
    }
    if (tAna.next) {
      push('info', 'chart', `Test à refaire : ${tAna.next.label.toLowerCase()} (${tAna.next.reason}). Un test physique ne vaut que par sa répétition.`, 'tests')
    }

    // --- Croisement test physique × zone de mobilité (nouveau) : quand un
    // test faible ET la zone de mobilité correspondante sont faibles tous
    // les deux, le signal est corroboré par deux mesures indépendantes.
    const TEST_ZONE_MAP = { gai_max: ['core'], souplesse: ['post', 'flechisseurs'], push30: ['epaules'], squat30: ['hanches', 'chevilles'] }
    if (mob.status === 'ok' && weakTestIds.length) {
      const weakZoneIds = (db.mobility.zones || []).filter((z) => z.val > 0 && z.val < 2).map((z) => z.id)
      outerTz: for (const tid of weakTestIds) {
        const zoneIds = TEST_ZONE_MAP[tid] || []
        for (const zid of zoneIds) {
          if (weakZoneIds.includes(zid)) {
            const zoneLabel = (db.mobility.zones.find((z) => z.id === zid) || {}).label || zid
            push('warn', 'chart', `${TEST_LABELS[tid]} faible ET ${zoneLabel.toLowerCase()} raide au test de mobilité — deux mesures indépendantes qui pointent vers la même zone, signal plus fiable qu'un seul test isolé.`, 'tests')
            break outerTz
          }
        }
      }
    }

    const lastDate = tests.reduce((max, t) => (!max || t.date > max) ? t.date : max, null)
    if (lastDate) {
      const days = Math.floor((new Date(iso + 'T00:00:00') - new Date(lastDate + 'T00:00:00')) / 86400000)
      if (days > 60) push('info', 'route', `Ton dernier test physique date de ${days} jours — refais-en un pour voir ta progression et ajuster tes séances.`, 'tests')
    }
  }

  // --- Régression de charge sur un exercice suivi (nouveau) : la dernière
  // séance est nettement sous le record (≥20%) et récente (≤14 jours) —
  // signal de fatigue/deload sur ce mouvement précis plutôt qu'un ressenti
  // global.
  const exHist = db.exerciseHistory || {}
  for (const name of Object.keys(exHist)) {
    const h = exHist[name]
    if (!h.record || !h.last || !h.last.charge || !h.last.date) continue
    const daysSinceLast = Math.floor((new Date(iso + 'T00:00:00') - new Date(h.last.date + 'T00:00:00')) / 86400000)
    if (daysSinceLast <= 14 && h.last.charge < h.record.charge * 0.8) {
      push('info', 'dumbbell', `${name} : dernière charge ${h.last.charge} kg, nettement sous ton record de ${h.record.charge} kg — normal après une pause, mais surveille si ça persiste sur plusieurs séances.`, 'planner')
      break
    }
  }

  // --- Musculation : volume, équilibre et stagnation ---
  // Les séries étaient enregistrées une par une sans jamais être relues :
  // rien ne disait si un muscle était délaissé, si la poussée écrasait le
  // tirage, ni si un mouvement plafonnait.
  // La muscu ne voyait ni le sommeil, ni les protéines, ni le poids : elle
  // concluait « varie les répétitions » alors que la cause est souvent
  // ailleurs. On lui passe le contexte des autres modules.
  const nutAna = nutriAnalysis(db, { days: 28, today: iso })
  const weightRate = (() => {
    const series = weightSeries(db.weightLog, 0)
    return series.length >= 2 ? weeklyRate(series, 28) : null
  })()
  const mus = muscuAnalysis(db, {
    days: 28, today: iso,
    sleep: sleepAna, protein: nutAna.protein, weightRate,
  })
  if (mus.sessions >= 3) {
    if (mus.balance && mus.balance.flags.length) {
      push('warn', 'dumbbell', mus.balance.flags[0].text, 'planner')
    }
    if (mus.stalls.length) {
      const st = mus.stalls[0]
      // Le texte était réécrit ici au lieu de reprendre celui du module :
      // l'écran Progrès affichait la version tenant compte du sommeil et
      // des protéines, le Coach la version naïve « varie les répétitions ».
      // Deux conseils contradictoires sur la même donnée.
      push('info', 'dumbbell', mus.context.length
        ? `${st.name} plafonne autour de ${st.best.best1RM} kg estimés, et ce n'est probablement pas le programme : ${mus.context.map((c) => c.text).join(' Et ')}`
        : `${st.name} plafonne autour de ${st.best.best1RM} kg estimés depuis plusieurs séances — faire varier les répétitions, le tempo, ou insérer une semaine allégée débloque plus souvent qu'insister à la même charge.`, 'planner')
    }
    const over = mus.volumes.filter((v) => groupVerdict(v.seriesPerWeek).level === 'high')
    if (over.length) {
      push('info', 'dumbbell', `${over[0].group} : ${String(over[0].seriesPerWeek).replace('.', ',')} séries par semaine, au-dessus du repère habituel de ${SERIES_HIGH}. Au-delà, le rendement supplémentaire devient discutable et la récupération plus difficile.`, 'planner')
    }
    if (mus.idle.length) {
      push('info', 'dumbbell', `${mus.idle[0].name} n'a pas été travaillé depuis ${mus.idle[0].daysSinceLast} jours alors que tu le suivais régulièrement.`, 'planner')
    }
  }

  // --- Stress/charge élevée sans outil de régulation récent ---
  // La condition ne vérifiait pas la seconde moitié de sa propre phrase :
  // faute de journal, la suggestion tombait même sur quelqu'un qui venait
  // de faire sa séance. Les séances étant maintenant enregistrées, on ne
  // propose que si rien n'a été fait dans la semaine.
  const mind = mindAnalysis(db, { today: iso, acwr, sleep: sleepAna })
  if (acwr.available && acwr.level === 'Vigilance renforcée') {
    const recentBreath = breathSessions(db, { days: 7, today: iso }).length
    if (!recentBreath) {
      push('warn', 'wave', "Charge d'entraînement élevée et aucune séance de respiration cette semaine — quelques minutes de respiration guidée ou de préparation mentale peuvent aider à mieux gérer cette période.", 'esprit')
    }
  }
  // Un objectif sans rappel est un objectif oublié : c'est précisément le
  // « T » de SMART que l'écran laissait filer.
  if (mind.goals.late.length) {
    const g = mind.goals.late[0]
    push('warn', 'target', `Ton objectif « ${(g.goal.s || 'sans titre').slice(0, 60)} » a dépassé son échéance de ${Math.abs(g.status.days)} jour(s) — le conclure ou le redater vaut mieux que le laisser courir.`, 'esprit')
  } else if (mind.goals.soon.length) {
    const g = mind.goals.soon[0]
    push('info', 'target', `Échéance proche pour « ${(g.goal.s || 'ton objectif').slice(0, 60)} » : ${g.status.text.toLowerCase()}`, 'esprit')
  }

  // --- Cycle menstruel : repère phase lutéale (preuve modérée, variabilité individuelle) ---
  if (db.cycle && db.cycle.enabled && db.cycle.startDate) {
    const cyc = cycleInfo(db.cycle)
    const cAna = cycleAnalysis(db.cycle)
    // Quand le ressenti enregistré montre un contraste net entre phases, il
    // vaut mieux que le repère générique : c'est la physiologie de la
    // personne, pas une moyenne de population.
    const eContrast = cAna.energy && cAna.energy.significant ? cAna.energy : null
    if (eContrast && eContrast.low.phase === cyc.phase) {
      push('info', 'wave', `Phase ${eContrast.low.label.toLowerCase()} — c'est là que ton énergie est la plus basse d'après ce que tu as noté (${String(eContrast.low.mean).replace('.', ',')}/5 contre ${String(eContrast.high.mean).replace('.', ',')} en phase ${eContrast.high.label.toLowerCase()}). Une séance plus légère aujourd'hui est cohérente avec ton propre historique.`, 'cycle')
    } else if (eContrast && eContrast.high.phase === cyc.phase) {
      push('info', 'wave', `Phase ${eContrast.high.label.toLowerCase()} — ton énergie y est la plus haute d'après ton suivi (${String(eContrast.high.mean).replace('.', ',')}/5). Bonne fenêtre pour tes séances les plus exigeantes.`, 'cycle')
    } else if (cyc.phase === 'luteale') {
      push('info', 'wave', "Phase lutéale de ton cycle — la perception d'effort peut être légèrement plus élevée chez certaines personnes. Repère individuel, pas une règle universelle.", 'cycle')
    }
    // Les jours prémenstruels se déduisent des règles réellement
    // enregistrées, pas d'une phase théorique.
    if (cAna.pms && cAna.pms.flagged && cyc.daysToNext <= PMS_WINDOW_DAYS) {
      const list = cAna.pms.topSymptoms.map((s) => s.symptom.toLowerCase()).join(', ')
      push('info', 'wave', `Tes règles sont attendues dans ${cyc.daysToNext} jour(s) : c'est la fenêtre où tu notes le plus de symptômes${list ? ` (${list})` : ''}. Prévoir une semaine plus légère vaut mieux que la subir.`, 'cycle')
    }
    if (cAna.stats && cAna.stats.level === 'warn' && cAna.stats.count >= 3) {
      push('info', 'wave', `Tes cycles varient de ${cAna.stats.spread} jours (${cAna.stats.min} à ${cAna.stats.max}) : les prédictions de phase restent approximatives, fie-toi d'abord à ton ressenti. Si cela dure, c'est à évoquer avec un professionnel de santé.`, 'cycle')
    }
  }

  const sessions = db.planningSessions || []

  // --- Tendance semaine vs semaine précédente (nouveau) : ne se déclenche
  // que quand l'ACWR n'est pas encore disponible (< 14 jours d'historique),
  // pour donner un premier repère de charge aux nouveaux utilisateurs sans
  // dupliquer le signal ACWR une fois qu'il devient fiable.
  if (!acwr.available) {
    const thisMonday = mondayOf(new Date())
    const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7)
    const weekMinutes = (monday) => {
      const startMs = monday.getTime(), endMs = startMs + 7 * 86400000
      let sum = 0
      for (const s of sessions) {
        if (!s || s.statut !== 'realise' || !s.date) continue
        const t = new Date(s.date + 'T00:00:00').getTime()
        if (t >= startMs && t < endMs) sum += dureeToMins(s.duree)
      }
      return sum
    }
    const thisWeekMin = weekMinutes(thisMonday)
    const lastWeekMin = weekMinutes(lastMonday)
    if (lastWeekMin >= 60 && thisWeekMin > 0) {
      const change = (thisWeekMin - lastWeekMin) / lastWeekMin
      if (change > 0.5) {
        push('info', 'chart', `Volume en hausse de ${Math.round(change * 100)}% par rapport à la semaine dernière (${thisWeekMin} vs ${lastWeekMin} min) — progression rapide, veille à bien récupérer entre les séances.`, 'planner')
      }
    }
  }

  // --- Déséquilibre entre sports pratiqués (nouveau) : si un sport
  // représente ≥80% des séances réalisées alors que plusieurs sports sont
  // enregistrés au profil, rappel à garder du temps pour les autres.
  const userSportIds2 = (db.profilePhys && db.profilePhys.sports) || []
  if (userSportIds2.length >= 2) {
    const ts = trainingStats(db)
    if (ts.hasData && ts.sports.length >= 2) {
      const totalCount = ts.sports.reduce((a, s) => a + s.count, 0)
      const top = ts.sports[0]
      if (totalCount >= 5 && top.pct >= 80) {
        const others = ts.sports.slice(1).map((s) => s.label).join(', ')
        push('info', 'chart', `${top.pct}% de tes séances enregistrées sont en ${top.label} — pense à garder un peu de place pour ${others} pour rester équilibré entre tes sports.`, 'planner')
      }
    }
  }

  // --- Hydratation avant une sortie course longue planifiée aujourd'hui ---
  const longRunToday = sessions.some((s) => s && s.date === iso && s.statut === 'planifie' && s.sport === 'course' && dureeToMins(s.duree) >= 60)
  if (longRunToday && hyd.status === 'ok' && hyd.extra.ml < hyd.extra.target * 0.3) {
    push('warn', 'drop', "Sortie course longue prévue aujourd'hui et hydratation encore faible — anticipe avant de partir.", 'hydratation')
  }

  // --- Ressenti des 3 dernières séances réalisées (signal direct de l'utilisateur) ---
  const doneWithRessenti = sessions.filter((s) => s && s.statut === 'realise' && s.date && typeof s.ressenti === 'number').sort((a, b) => a.date.localeCompare(b.date))
  if (doneWithRessenti.length >= 3) {
    const lastThree = doneWithRessenti.slice(-3)
    if (lastThree.every((s) => s.ressenti <= 2)) {
      push('warn', 'heart', 'Tes 3 dernières séances ont un ressenti faible — signe possible de fatigue accumulée. Une séance plus légère ou un jour de repos peut aider.', 'planner')
    } else if (lastThree.every((s) => s.ressenti >= 4)) {
      push('info', 'flame', 'Tes 3 dernières séances ont un très bon ressenti — continue sur cette dynamique, c\'est un bon signal de récupération adaptée.', 'planner')
    }
  }

  // --- Glucides bas + séance d'endurance longue planifiée aujourd'hui ---
  const nDay = nutritionDay(db, iso)
  if (nDay.entries > 0) {
    const longEnduranceToday = sessions.some((s) => s && s.date === iso && s.statut === 'planifie' && (s.sport === 'course' || s.sport === 'velo') && dureeToMins(s.duree) >= 90)
    if (longEnduranceToday && nDay.g < 80) {
      push('warn', 'apple', `Séance d'endurance longue prévue aujourd'hui et apport en glucides encore faible (${Math.round(nDay.g)} g) — pense à en ajouter avant de partir.`, 'nutrition')
    }
  }

  // --- Régularité du suivi nutrition : 3 jours consécutifs sans saisie ---
  const foodLog = db.foodLog || {}
  const d0 = new Date(iso + 'T00:00:00')
  let emptyDays = 0
  for (let k = 1; k <= 3; k++) {
    const dk = new Date(d0); dk.setDate(dk.getDate() - k)
    const isoK = todayISOFrom(dk)
    if (!foodLog[isoK] || foodLog[isoK].length === 0) emptyDays++
  }
  if (emptyDays === 3) {
    push('info', 'apple', 'Aucune saisie nutrition depuis 3 jours — reprends le suivi si tu veux des conseils plus précis.', 'nutrition')
  }

  // --- Régularité du suivi hydratation (nouveau, même logique que la
  // nutrition) : 3 jours consécutifs sans aucune boisson enregistrée.
  const hydroLog = db.hydroLog || {}
  let emptyHydroDays = 0
  for (let k = 1; k <= 3; k++) {
    const dk = new Date(d0); dk.setDate(dk.getDate() - k)
    const isoK = todayISOFrom(dk)
    if (!hydroLog[isoK] || hydroLog[isoK].length === 0) emptyHydroDays++
  }
  if (emptyHydroDays === 3) {
    push('info', 'drop', 'Aucune boisson enregistrée depuis 3 jours — reprends le suivi hydratation si tu veux garder un repère fiable.', 'hydratation')
  }

  // --- Répartition lipides anormalement élevée (> 40 % des calories du jour) ---
  if (nDay.entries > 0 && nDay.k > 0) {
    const lipRatio = nDay.l * 9 / nDay.k
    if (lipRatio > 0.40) {
      push('info', 'apple', `Les lipides représentent une grosse part de tes calories aujourd'hui (${Math.round(lipRatio * 100)} %) — repère général à surveiller, pas une règle stricte.`, 'nutrition')
    }
  }

  // --- Compléments : plan défini mais aucune prise récente ; créatine ---
  const suppPlan = db.suppPlan || []
  if (suppPlan.length) {
    const suppTaken = db.suppTaken || {}
    let anyTakenLast3 = false
    for (let k = 0; k <= 2; k++) {
      const dk = new Date(d0); dk.setDate(dk.getDate() - k)
      const isoK = todayISOFrom(dk)
      if (suppTaken[isoK] && suppTaken[isoK].length > 0) { anyTakenLast3 = true; break }
    }
    if (!anyTakenLast3) {
      push('info', 'spark', 'Tu as un plan de compléments mais aucune prise enregistrée depuis 3 jours — coche-les au fur et à mesure pour garder un suivi utile.', 'complements')
    }
    if (suppPlan.includes('creatine')) {
      let creatineDaysTaken = 0
      for (let k = 0; k <= 6; k++) {
        const dk = new Date(d0); dk.setDate(dk.getDate() - k)
        const isoK = todayISOFrom(dk)
        if (suppTaken[isoK] && suppTaken[isoK].includes('creatine')) creatineDaysTaken++
      }
      if (creatineDaysTaken > 0 && creatineDaysTaken < 4) {
        push('info', 'spark', `Créatine prise seulement ${creatineDaysTaken} jour(s) sur les 7 derniers — son effet dépend d'une prise quotidienne régulière, pas du moment précis.`, 'complements')
      }
    }
  }

  // --- Pic de forme : croise le plan d'affûtage avec la charge réelle (ACWR) ---
  const peakGoals = db.peakGoals || []
  if (peakGoals.length) {
    let upcoming = null
    peakGoals.forEach((g) => {
      const pl = computePeakPlan(g, iso)
      if (pl.phase === 'past') return
      if (!upcoming || g.eventDate < upcoming.goal.eventDate) upcoming = { goal: g, plan: pl }
    })
    if (upcoming) {
      const pk = upcoming.plan, pkGoal = upcoming.goal
      if (pk.phase === 'today') {
        push('info', 'target', `C'est le jour J pour « ${pkGoal.label} » — fais confiance au travail effectué.`, 'peak')
      } else {
        if (pk.phase === 'taper') {
          push('warn', 'target', `Affûtage en cours pour « ${pkGoal.label} » (J-${pk.daysRemaining}) — réduis le volume tout en gardant l'intensité.`, 'peak')
        } else if (pk.phase === 'build' && pk.daysRemaining <= 21) {
          push('info', 'route', `Phase de développement spécifique pour « ${pkGoal.label} » (J-${pk.daysRemaining}) — rapproche tes séances de l'intensité cible.`, 'peak')
        }
        // Croise le plan avec les vraies données (charge réelle, respect de
        // l'affûtage, mobilité, sommeil) — pas seulement la date — pour ne
        // pousser que les alertes qui reflètent un vrai risque pour l'objectif.
        const readiness = peakReadiness(db, pk)
        readiness.flags.forEach((f) => push(f.level, f.level === 'alert' ? 'shield' : 'target', `« ${pkGoal.label} » : ${f.text}`, 'peak'))
      }
    }
  }

  // --- Récupération active suggérée : charge élevée ou douleur active, sans
  // séance de récupération guidée récente (Dupuy et al. 2018, preuve modérée).
  const daysSinceRecov = daysSinceLastRecovery(db, iso)
  const loadHighForRecov = acwr.available && (acwr.level === 'Vigilance' || acwr.level === 'Vigilance renforcée')
  const painActiveForRecov = prev.status === 'ok' && prev.extra.pain && prev.extra.pain.active && !prev.extra.pain.urgent
  if ((loadHighForRecov || painActiveForRecov) && (daysSinceRecov == null || daysSinceRecov >= 5)) {
    push('info', 'leaf', 'Charge élevée ou douleur active sans séance de récupération récente — une routine guidée (étirements, auto-massage) peut réduire la sensation de fatigue et de courbatures.', 'recovery')
  }

  // --- Escalade ---
  // Le niveau était un texte libre, donc inexploitable. Depuis que chaque
  // croix porte sa cotation et son style, on peut dire des choses qu'un
  // simple « 6b+ » ne permettait pas.
  const climb = climbAnalysis(db, { days: 180, today: iso })
  if (climb.ascents.length >= 5) {
    if (climb.fingers) {
      for (const f of climb.fingers.flags) push('warn', 'dumbbell', f.text, 'planner')
    }
    for (const p of [climb.pyrVoie, climb.pyrBloc]) {
      if (p && !p.solid && p.total >= 5) push('info', 'chart', p.text, 'planner')
    }
    for (const g of [climb.gapVoie, climb.gapBloc]) {
      if (g && g.level === 'warn') push('info', 'chart', g.text, 'planner')
    }
    if (climb.angles && climb.angles.lopsided) push('info', 'chart', climb.angles.text, 'planner')
  }

  // --- Semaine planifiée : ce qu'elle va coûter ---
  // L'ACWR ne comptait que les séances faites : l'application signalait une
  // surcharge une fois qu'elle avait eu lieu. La projection le dit avant,
  // c'est-à-dire quand on peut encore alléger.
  const plan = plannerAnalysis(db, { today: iso })
  if (plan.load.available && plan.load.verdict && plan.load.plannedLoad > 0) {
    if (plan.load.verdict.level === 'alert') {
      push('warn', 'calendar', `Si tu fais tout ce qui est prévu cette semaine, ton rapport charge aiguë / chronique finira à ${String(plan.load.ratio).replace('.', ',')} — ${plan.load.verdict.text}. Il est à ${String(plan.load.currentRatio).replace('.', ',')} pour l'instant : alléger ou déplacer une séance suffit souvent.`, 'planner')
    } else if (plan.load.verdict.level === 'warn') {
      push('info', 'calendar', `Ta semaine planifiée amènerait ta charge à ${String(plan.load.ratio).replace('.', ',')} — ${plan.load.verdict.text}. À surveiller sans forcément changer quoi que ce soit.`, 'planner')
    }
  }
  for (const f of plan.structure.flags) {
    push(f.level === 'warn' ? 'warn' : 'info', 'calendar', f.text, 'planner')
  }
  if (plan.monotony && plan.monotony.level !== 'ok') {
    push('info', 'calendar', plan.monotony.text, 'planner')
  }
  if (plan.adherence && plan.adherence.level === 'warn') {
    push('info', 'calendar', plan.adherence.text, 'planner')
  }

  // --- Séance planifiée dans les 48h alors qu'un risque est actif ---
  const windowDates = [0, 1, 2].map((k) => { const d = new Date(d0); d.setDate(d.getDate() + k); return todayISOFrom(d) })
  const upcomingSessions = sessions.filter((s) => s && s.statut === 'planifie' && s.date && windowDates.includes(s.date))
  if (upcomingSessions.length) {
    const painNow = prev.status === 'ok' && prev.extra.pain && prev.extra.pain.active
    const loadRisky = acwr.available && (acwr.level === 'Vigilance' || acwr.level === 'Vigilance renforcée')
    if (painNow || loadRisky) {
      const soonest = upcomingSessions.slice().sort((a, b) => a.date.localeCompare(b.date))[0]
      const when = soonest.date === iso ? "aujourd'hui" : (soonest.date === windowDates[1] ? 'demain' : 'dans 2 jours')
      const sportLabel = (SPORTS.find((sp) => sp.id === soonest.sport) || { label: soonest.sport || 'Séance' }).label
      const reason = painNow && loadRisky ? 'douleur active et charge élevée' : (painNow ? 'douleur active' : "charge d'entraînement élevée")
      push(painNow ? 'alert' : 'warn', 'shield', `Séance planifiée ${when} (${sportLabel}) malgré ${reason} — envisage d'alléger l'intensité ou de la déplacer dans le Planning.`, 'planner')
    }
  }

  return recos
}

// ─── Hiérarchisation des recommandations ────────────────────
// Soixante-treize règles peuvent produire une vingtaine de conseils à la
// fois. Sur un profil réel, cinq d'entre eux portaient sur la mobilité et
// noyaient une douleur au genou installée depuis quarante jours. Une liste
// que personne ne lit jusqu'au bout ne vaut pas mieux qu'une liste vide.
//
// Trois règles simples : on écarte les doublons, on limite ce qu'un même
// domaine peut occuper, et on alterne les domaines pour que le premier
// écran en couvre plusieurs plutôt que d'en épuiser un seul.
export const MAX_PER_DOMAIN = 2
export const TOP_COUNT = 8

const LEVEL_RANK = { alert: 0, warn: 1, info: 2 }

// Deux conseils qui commencent par la même chose disent presque toujours la
// même chose : c'est le cas des règles qui se recoupent sur un même sujet.
// Le domaine fait partie de l'empreinte, et on retient huit mots : à six,
// des conseils qui ne partagent qu'une tournure d'ouverture se
// confondaient. Mieux vaut laisser passer un quasi-doublon que supprimer
// un conseil différent.
const FINGERPRINT_WORDS = 8

function fingerprint(reco) {
  const words = (reco.text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[0-9]+([.,][0-9]+)?/g, '#')
    .replace(/[^a-z# ]/g, ' ')
    .split(/\s+/).filter(Boolean).slice(0, FINGERPRINT_WORDS).join(' ')
  return (reco.action || 'general') + '|' + words
}

export function rankRecommendations(recos, { max = TOP_COUNT, perDomain = MAX_PER_DOMAIN } = {}) {
  const list = (recos || []).filter((r) => r && r.text)
  const seen = new Set()
  const unique = []
  for (const r of list) {
    const fp = fingerprint(r)
    if (seen.has(fp)) continue
    seen.add(fp)
    unique.push(r)
  }
  const sorted = unique
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (LEVEL_RANK[a.r.level] ?? 2) - (LEVEL_RANK[b.r.level] ?? 2) || a.i - b.i)
    .map((x) => x.r)

  // Un tour par domaine à la fois : le premier passage prend le meilleur
  // conseil de chaque domaine, le second le suivant, et ainsi de suite.
  const byDomain = new Map()
  for (const r of sorted) {
    const k = r.action || 'general'
    if (!byDomain.has(k)) byDomain.set(k, [])
    byDomain.get(k).push(r)
  }
  const top = []
  const overflow = []
  for (let round = 0; round < perDomain; round++) {
    for (const items of byDomain.values()) {
      if (items[round] && top.length < max) top.push(items[round])
    }
  }
  for (const items of byDomain.values()) {
    for (let k = 0; k < items.length; k++) {
      if (!top.includes(items[k])) overflow.push(items[k])
    }
  }
  // L'ordre de gravité doit tenir aussi à l'intérieur de la sélection.
  top.sort((a, b) => (LEVEL_RANK[a.level] ?? 2) - (LEVEL_RANK[b.level] ?? 2) || sorted.indexOf(a) - sorted.indexOf(b))
  overflow.sort((a, b) => (LEVEL_RANK[a.level] ?? 2) - (LEVEL_RANK[b.level] ?? 2) || sorted.indexOf(a) - sorted.indexOf(b))
  return {
    top, rest: overflow,
    total: list.length,
    duplicates: list.length - unique.length,
    domains: byDomain.size,
  }
}
