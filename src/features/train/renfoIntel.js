// ============================================================
// RenfoIntel — moteur de score santé / recommandations / stats
// d'entraînement, porté depuis l'ancienne app (moteur de règles
// déterministe, pas une IA). Adapté à notre persistance Supabase :
// les fonctions qui lisaient `renfo_planning_sessions_v2` en
// localStorage lisent désormais db.planningSessions / db.exerciseHistory.
// Reste volontairement sans ACWR (historique de charge 4 semaines non
// collecté) ni recommandations croisant le Planificateur legacy.
// ============================================================
import { SPORTS } from './trainData'

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
  const t = { k: 0, p: 0, entries: log.length }
  for (const e of log) { t.k += num(e.k, 0); t.p += num(e.p, 0) }
  return t
}

// Minutes de séance planning correspondant à un libellé de durée pilule
// (identique à LOAD_BY_DUREE mais en vraies minutes, pas un score de charge).
const DUREE_MINS = { '15 min': 15, '30 min': 30, '45 min': 45, '1 h': 60, '1 h 30': 90, '2 h': 120, '2 h 30': 150, '3 h': 180 }
function dureeToMins(duree) {
  if (!duree) return 0
  if (DUREE_MINS[duree]) return DUREE_MINS[duree]
  const n = parseInt(duree, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function mondayOf(d) {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - day + (day === 0 ? -6 : 1))
  r.setHours(0, 0, 0, 0)
  return r
}

// Minutes réalisées cette semaine (planning) par jour L→D + séances planifiées restantes.
function plannerWeekData(db) {
  const sessions = db.planningSessions || []
  const monday = mondayOf(new Date())
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
// donnée fabriquée). Sous-ensemble des règles de l'ancienne app,
// centré sur ce qui est mesurable sans le planificateur legacy/ACWR.
export function recommendations(db) {
  const iso = todayISO()
  const recos = []
  const push = (level, ic, text) => recos.push({ level, icon: ic, text })

  const nut = pillarNutrition(db, iso)
  if (nut.status === 'ok' && nut.extra.protTarget && nut.extra.prot < nut.extra.protTarget * 0.7) {
    push('warn', 'apple', `Ta consommation de protéines est trop faible pour ton objectif (${nut.extra.prot} / ${nut.extra.protTarget} g).`)
  }

  const hyd = pillarHydration(db, iso)
  if (hyd.status === 'ok' && hyd.extra.ml < hyd.extra.target * 0.6) {
    push('warn', 'drop', `Hydratation en retard : ${hyd.extra.ml} / ${hyd.extra.target} ml aujourd'hui.`)
  }
  if (hyd.status === 'ok' && hyd.extra.caf >= 320) {
    push(hyd.extra.caf >= 400 ? 'alert' : 'warn', 'bolt', `Ta consommation de caféine (${hyd.extra.caf} mg) est proche de la limite recommandée (400 mg/j).`)
  }

  const load = pillarLoad(db)
  if (load.status === 'ok' && load.extra.spike) {
    push('warn', 'chart', 'Grosse séance isolée : pense à équilibrer ta charge sur la semaine.')
  }
  if (load.extra && load.extra.plannerPlanned > 0 && load.extra.plannerCount === 0) {
    push('info', 'calendar', `${load.extra.plannerPlanned} séance(s) planifiée(s) cette semaine — pense à les marquer comme réalisées.`)
  }

  const slp = pillarSleep(db)
  if (slp.status === 'ok' && slp.extra.hours) {
    const h = slp.extra.hours
    if (h < 6) push('alert', 'moon', `Seulement ${h.toFixed(1)} h de sommeil cette nuit — en-dessous de 6 h, récupération et performances chutent significativement (AASM).`)
    else if (h < 7) push('warn', 'moon', `${h.toFixed(1)} h de sommeil cette nuit — vise 7–9 h pour une récupération optimale.`)
  }

  const prev = pillarPrevention(db)
  if (prev.status === 'ok' && prev.extra.pain && prev.extra.pain.active) {
    push(prev.extra.pain.urgent ? 'alert' : 'warn', 'shield',
      prev.extra.pain.urgent
        ? 'Douleur signalée comme préoccupante lors de ton dernier bilan de prévention — arrête les impacts et consulte un professionnel de santé.'
        : 'Douleur active signalée dans ton bilan de prévention — adapte tes séances tant qu\'elle n\'est pas résolue.')
  } else if (prev.status === 'absent') {
    push('info', 'shield', 'Tu n\'as pas encore fait ton bilan de prévention — utile pour repérer tes facteurs de risque de blessure avant qu\'ils ne posent problème.')
  } else if (prev.status === 'ok' && prev.extra.date) {
    const days = Math.floor((new Date(iso + 'T00:00:00') - new Date(prev.extra.date + 'T00:00:00')) / 86400000)
    if (days > 60) push('info', 'shield', `Ton dernier bilan de prévention date de ${days} jours — refais-le pour un état des lieux à jour.`)
  }

  const mob = pillarMobility(db)
  if (mob.status === 'ok' && mob.extra.weak.length) {
    const ankle = mob.extra.weak.some((l) => /cheville/i.test(l))
    push('info', 'target', ankle
      ? 'Ta mobilité de cheville limite potentiellement tes performances — ajoute des exercices ciblés.'
      : `Zones de mobilité à travailler : ${mob.extra.weak.join(', ')}.`)
  }
  if (mob.status === 'ok' && mob.extra.date) {
    const days = Math.floor((new Date(iso + 'T00:00:00') - new Date(mob.extra.date + 'T00:00:00')) / 86400000)
    if (days > 30 && mob.extra.score < 60) {
      push('info', 'target', `Ton dernier test de mobilité (score ${mob.extra.score}/100) date de ${days} jours — un nouveau test t'aiderait à voir si tu as progressé.`)
    }
  }

  const tests = db.physTests || []
  if (tests.length === 0) {
    push('info', 'route', 'Tu n\'as encore fait aucun test physique — utile pour cibler tes séances de renfo et mobilité selon tes vrais points faibles.')
  } else {
    const lastDate = tests.reduce((max, t) => (!max || t.date > max) ? t.date : max, null)
    if (lastDate) {
      const days = Math.floor((new Date(iso + 'T00:00:00') - new Date(lastDate + 'T00:00:00')) / 86400000)
      if (days > 60) push('info', 'route', `Ton dernier test physique date de ${days} jours — refais-en un pour voir ta progression et ajuster tes séances.`)
    }
  }

  return recos
}
