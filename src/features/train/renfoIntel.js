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
import { computePeakPlan } from './PeakSpace'
import { cycleInfo } from '../health/Cycle'

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
  if (sp.climat === 'chaud') base *= 1.1
  return round((base + effort) / 50) * 50
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
// semaine", total séances/minutes), fusionnant les deux seules sources
// de séance "réalisée" qui existent dans l'app : le compteur incrémental
// (db.week/sessionsTotal/minutesTotal, mis à jour uniquement quand une
// séance programme/catalogue est terminée via le lecteur intégré — ces
// séances n'existent nulle part ailleurs) et les séances du Calendrier
// marquées "Réalisé" (jamais stockées dans le compteur, recalculées ici
// en direct depuis planningSessions). Sans cette fusion, tout ce qui est
// coché "Réalisé" dans le Calendrier restait invisible sur ces écrans.
export function trainingTotals(db) {
  const planner = plannerWeekData(db)
  const week = (db.week || [0, 0, 0, 0, 0, 0, 0]).map((m, i) => m + (planner.week[i] || 0))
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
  recup: { label: 'Récupération', color: '#5b8a72' },
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

  const addMins = (label, color, date, mins, source) => {
    const dayIdx = Math.round((new Date(date + 'T00:00:00').getTime() - mondayMs) / 86400000)
    if (dayIdx < 0 || dayIdx > 6 || mins <= 0) return
    week[dayIdx] += mins
    items.push({ date, mins, label, color, source })
    if (!bySportMap[label]) bySportMap[label] = { mins: 0, color }
    bySportMap[label].mins += mins
  }

  for (const s of db.planningSessions || []) {
    if (!s || s.statut !== 'realise' || !s.date) continue
    const meta = sportMeta(s.sport)
    addMins(meta.label, meta.color, s.date, dureeToMins(s.duree), 'planner')
  }
  for (const e of db.sessionLog || []) {
    if (!e || !e.date) continue
    const meta = CAT_META[e.cat] || { label: e.title || 'Séance', color: '#999' }
    addMins(e.title || meta.label, meta.color, e.date, num(e.mins, 0), 'player')
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
  return { id: 'sleep', label: 'Sommeil', score, status: 'ok', detail, extra: { hours: h, quality: s.quality || null, awakenings: aw } }
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
  const painPenalty = p.pain && p.pain.active ? (p.pain.urgent ? 40 : 20) : 0
  const score = round(clamp(base - painPenalty, 0, 100))
  let detail = `Risque ${(p.level || '').toLowerCase()}`
  if (p.pain && p.pain.active) detail += p.pain.urgent ? ' · douleur à surveiller de près' : ' · douleur active'
  return { id: 'prevention', label: 'Prévention', score, status: 'ok', detail, extra: { level: p.level, pain: p.pain || null, date: p.date } }
}

// Charge d'entraînement : fusionne le planning (source primaire, dates
// exactes) et db.week (lecteur de séance in-app, supplément pour aujourd'hui).
export function pillarLoad(db) {
  const plannerData = plannerWeekData(db)
  const inAppTotal = (db.week || []).reduce((a, b) => a + num(b, 0), 0)
  const todayDow = (new Date().getDay() + 6) % 7
  const mergedWeek = plannerData.week.slice()
  if (mergedWeek[todayDow] === 0 && inAppTotal > 0) mergedWeek[todayDow] = inAppTotal
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
  function minsInWindow(daysBack) {
    const startMs = nowMs - daysBack * 86400000
    let sum = 0
    for (const s of sessions) {
      if (!s || s.statut !== 'realise' || !s.date) continue
      const t = new Date(s.date + 'T00:00:00').getTime()
      if (t > nowMs || t <= startMs) continue
      sum += dureeToMins(s.duree)
    }
    return sum
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
    level = 'Sous-charge'; color = '#6f8a3a'
    advice = ul.id === 'debutant'
      ? 'Charge basse — normal au démarrage. Augmente progressivement (+10 % max / semaine).'
      : "Charge récente plus basse que d'habitude — marge pour reprendre progressivement."
  } else if (ratio <= ul.acwrWarn) {
    level = 'Zone optimale'; color = '#4a8a6a'
    advice = `Charge cohérente avec ton profil ${ul.label.toLowerCase()} — progression bien maîtrisée.`
  } else if (ratio <= ul.acwrAlert) {
    level = 'Vigilance'; color = '#c4a03a'
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
const PALETTE = ['#e07b54', '#6f8a3a', '#4a8a6a', '#c4a03a', '#7a6fa5', '#4a8aa5', '#a5704a', '#9a7ab5', '#c4503a', '#5b8a72']
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

  // --- Prévention / douleur ---
  const prev = pillarPrevention(db)
  if (prev.status === 'ok' && prev.extra.pain && prev.extra.pain.active) {
    push(prev.extra.pain.urgent ? 'alert' : 'warn', 'shield',
      prev.extra.pain.urgent
        ? 'Douleur signalée comme préoccupante lors de ton dernier bilan de prévention — arrête les impacts et consulte un professionnel de santé.'
        : 'Douleur active signalée dans ton bilan de prévention — adapte tes séances tant qu\'elle n\'est pas résolue.', 'prevention')
    if (acwr.available && (acwr.level === 'Vigilance' || acwr.level === 'Vigilance renforcée')) {
      push('alert', 'shield', 'Douleur active et charge d\'entraînement élevée en même temps — combinaison à risque, priorise la récupération avant de reprendre l\'intensité.', 'prevention')
    }
  } else if (prev.status === 'absent') {
    push('info', 'shield', 'Tu n\'as pas encore fait ton bilan de prévention — utile pour repérer tes facteurs de risque de blessure avant qu\'ils ne posent problème.', 'prevention')
  } else if (prev.status === 'ok' && prev.extra.date) {
    const days = Math.floor((new Date(iso + 'T00:00:00') - new Date(prev.extra.date + 'T00:00:00')) / 86400000)
    if (days > 60) push('info', 'shield', `Ton dernier bilan de prévention date de ${days} jours — refais-le pour un état des lieux à jour.`, 'prevention')
  }

  // --- Mobilité ---
  const mob = pillarMobility(db)
  if (mob.status === 'ok' && mob.extra.weak.length) {
    const ankle = mob.extra.weak.some((l) => /cheville/i.test(l))
    push('info', 'target', ankle
      ? 'Ta mobilité de cheville limite potentiellement tes performances — ajoute des exercices ciblés.'
      : `Zones de mobilité à travailler : ${mob.extra.weak.join(', ')}.`, 'mobility')
  }
  if (mob.status === 'ok' && mob.extra.date) {
    const days = Math.floor((new Date(iso + 'T00:00:00') - new Date(mob.extra.date + 'T00:00:00')) / 86400000)
    if (days > 30 && mob.extra.score < 60) {
      push('info', 'target', `Ton dernier test de mobilité (score ${mob.extra.score}/100) date de ${days} jours — un nouveau test t'aiderait à voir si tu as progressé.`, 'mobility')
    }
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

  // --- Stress/charge élevée sans outil de régulation récent ---
  if (acwr.available && acwr.level === 'Vigilance renforcée') {
    push('warn', 'wave', "Charge d'entraînement élevée — une courte séance de respiration ou de préparation mentale peut t'aider à mieux gérer cette période.", 'esprit')
  }

  // --- Cycle menstruel : repère phase lutéale (preuve modérée, variabilité individuelle) ---
  if (db.cycle && db.cycle.enabled && db.cycle.startDate) {
    const cyc = cycleInfo(db.cycle)
    if (cyc.phase === 'luteale') {
      push('info', 'wave', "Phase lutéale de ton cycle — la perception d'effort peut être légèrement plus élevée chez certaines personnes. Repère individuel, pas une règle universelle.", 'cycle')
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
