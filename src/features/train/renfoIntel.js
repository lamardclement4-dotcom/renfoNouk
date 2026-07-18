// ============================================================
// RenfoIntel — moteur de recommandations pour l'écran Coach, porté
// depuis l'ancienne app (moteur de règles déterministe, pas une IA).
// Version resserrée : ne reprend que les piliers/règles qui ne
// dépendent pas de l'ancien Planificateur localStorage (retiré de
// cette migration) ni de l'ACWR 4-semaines — celui-ci demanderait un
// historique de charge qu'on ne collecte pas encore ici.
// ============================================================

function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : (def || 0) }
function round(v) { return Math.round(v) }
function todayISO() {
  const d = new Date()
  const p = (n) => n < 10 ? '0' + n : '' + n
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

function weightKg(db) {
  const w = num((db.profilePhys || {}).poids, 0)
  return w > 0 ? w : 70
}

// Réplique de la cible hydrique de NutritionSpace/HydrationSpace.
function hydricTargetMl(db) {
  const sp = db.hydroSport || {}
  const rate = sp.intensite === 'leger' ? 400 : sp.intensite === 'intense' ? 800 : 600
  let base = 30 * weightKg(db)
  const effort = num(sp.min, 0) / 60 * rate
  if (sp.climat === 'chaud') base *= 1.1
  return round((base + effort) / 50) * 50
}

function hydroDay(db, iso) {
  const log = (db.hydroLog || {})[iso] || []
  let ml = 0, caf = 0
  for (const e of log) { ml += num(e.ml, 0) * (e.factor != null ? num(e.factor, 1) : 1); caf += num(e.caf, 0) }
  return { ml: round(ml), caf: round(caf), entries: log.length }
}

function nutritionDay(db, iso) {
  const log = (db.foodLog || {})[iso] || []
  const t = { k: 0, p: 0, entries: log.length }
  for (const e of log) { t.k += num(e.k, 0); t.p += num(e.p, 0) }
  return t
}

function pillarHydration(db, iso) {
  const d = hydroDay(db, iso)
  if (d.entries === 0) return { id: 'hydration', status: 'absent' }
  const target = hydricTargetMl(db) || 2000
  return { id: 'hydration', status: 'ok', extra: { ml: d.ml, target, caf: d.caf } }
}

function pillarNutrition(db, iso) {
  const t = db.foodTargets
  const d = nutritionDay(db, iso)
  if (d.entries === 0) return { id: 'nutrition', status: 'absent' }
  const kcalTarget = t ? (num(t.kcal, 0) || num(t.k, 0)) : 0
  const protTarget = t ? (num(t.prot, 0) || num(t.p, 0)) : 0
  if (!t || !kcalTarget) return { id: 'nutrition', status: 'no-target' }
  return { id: 'nutrition', status: 'ok', extra: { kcal: round(d.k), kcalTarget: round(kcalTarget), prot: round(d.p), protTarget: round(protTarget) } }
}

function pillarSleep(db) {
  const s = db.sleepLog && db.sleepLog[todayISO()]
  if (!s || !num(s.hours, 0)) return { id: 'sleep', status: 'absent' }
  return { id: 'sleep', status: 'ok', extra: { hours: num(s.hours, 0), quality: s.quality || null } }
}

function pillarMobility(db) {
  const m = db.mobility
  if (!m || m.score == null) return { id: 'mobility', status: 'absent' }
  const weak = (m.zones || []).filter((z) => z.val > 0 && z.val < 2).map((z) => z.label)
  return { id: 'mobility', status: 'ok', extra: { weak, score: m.score, date: m.date } }
}

function pillarPrevention(db) {
  const p = db.prevention
  if (!p || p.score == null) return { id: 'prevention', status: 'absent' }
  return { id: 'prevention', status: 'ok', extra: { level: p.level, pain: p.pain || null, date: p.date } }
}

// Charge simplifiée : uniquement db.week (pas de fusion avec l'ancien
// planificateur localStorage, retiré de cette migration).
function pillarLoad(db) {
  const week = db.week || []
  const sum = week.reduce((a, b) => a + num(b, 0), 0)
  if (sum === 0) return { id: 'load', status: 'absent' }
  const g = db.goals || {}
  const target = num(g.dailyMin, 10) * num(g.weeklySessions, 4) || 120
  const ratio = sum / target
  const maxDay = Math.max(...week.map((m) => num(m, 0)))
  const spike = maxDay / sum > 0.6 && sum > target * 0.5
  return { id: 'load', status: 'ok', extra: { weekMin: sum, targetMin: target, ratio, spike } }
}

// Recommandations : ne se déclenchent que si la donnée existe (aucune
// donnée fabriquée). Sous-ensemble des règles de l'ancienne app,
// centré sur ce qui est mesurable sans le planificateur/ACWR.
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
