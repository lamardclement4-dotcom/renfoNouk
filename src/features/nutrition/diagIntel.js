// ============================================================
// Analyse du diagnostic nutrition et des objectifs personnels.
//
// Le diagnostic enregistre cinq bilans, chacun avec un score global ET un
// score par pilier — énergie, alimentation, hydratation, récupération,
// comportement. Seul l'écart du score global au bilan précédent était
// lu. Les cinq piliers, qui disent précisément ce qui bouge, ne servaient
// qu'à dessiner le radar du jour.
//
// Deux de ces piliers portent sur des choses que l'application mesure par
// ailleurs : l'hydratation et la récupération. Un score auto-déclaré
// confortable en face d'un journal qui dit l'inverse est une information
// à part entière — c'est le seul endroit de l'application où le déclaratif
// et le mesuré peuvent se contredire.
//
// Les objectifs personnels, eux, n'avaient ni date de création ni date
// d'accomplissement : impossible de distinguer un objectif posé hier d'un
// autre qui traîne depuis six mois.
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

// Cinquante-huit fonctions d'analyse reçoivent leur date de référence dans un
// objet d'options, seize la reçoivent en second argument. Passer `{ today }`
// à l'une de ces seize ne levait pas à l'appel : la date devenait un objet, et
// la panne surgissait plus loin, dans une comparaison de chaînes. Les deux
// formes sont donc acceptées plutôt que de laisser le piège ouvert.
function refDay(today) {
  if (typeof today === 'string' && today) return today
  if (today && typeof today === 'object' && typeof today.today === 'string') return today.today
  return todayISO()
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

export const PILLAR_IDS = ['energie', 'alimentation', 'hydratation', 'recuperation', 'comportement']
export const PILLAR_LABELS = {
  energie: 'Énergie', alimentation: 'Alimentation', hydratation: 'Hydratation',
  recuperation: 'Récupération', comportement: 'Comportement',
}

// Le questionnaire écrit -1 pour un pilier dont aucune question n'a été
// répondue. Le confondre avec un score de zéro ferait passer un pilier
// non renseigné pour le point le plus faible.
export function pillarValue(v) {
  const n = num(v)
  return n != null && n >= 0 ? n : null
}

export function history(db) {
  return ((db && db.diagHistory) || [])
    .filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && num(e.score) != null)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Vétusté ─────────────────────────────────────────────────
export const RETEST_DAYS = 60
export const STALE_DAYS = 150

export function freshness(db, today) {
  const ref = refDay(today)
  const hist = history(db)
  if (!hist.length) return { level: 'absent', days: null, date: null, text: 'Diagnostic jamais passé.' }
  const date = hist[hist.length - 1].date
  const days = Math.max(0, daysBetween(date, ref))
  if (days >= STALE_DAYS) return { level: 'stale', days, date, text: `Ton diagnostic date de ${days} jours : il décrit des habitudes qui ont pu changer depuis.` }
  if (days >= RETEST_DAYS) return { level: 'due', days, date, text: `Ton diagnostic a ${days} jours — le refaire mesure ce qui a bougé.` }
  return { level: 'fresh', days, date, text: days === 0 ? 'Diagnostic passé aujourd’hui.' : `Diagnostic passé il y a ${days} jour${days > 1 ? 's' : ''}.` }
}

// ─── Piliers ─────────────────────────────────────────────────
export function pillarSeries(db, id) {
  const out = []
  for (const e of history(db)) {
    const v = pillarValue(e.piliers && e.piliers[id])
    if (v == null) continue
    out.push({ date: e.date, val: v })
  }
  return out
}

// Un écart en deçà de ce seuil relève de la formulation d'une réponse
// plutôt que d'un changement d'habitude : le questionnaire n'a pas la
// finesse de distinguer 62 de 68.
export const MEANINGFUL_DELTA = 10

export function pillarProgress(db, id) {
  const s = pillarSeries(db, id)
  if (!s.length) return null
  const first = s[0]
  const last = s[s.length - 1]
  const delta = last.val - first.val
  let change = null
  if (s.length >= 2) {
    const prev = s[s.length - 2]
    const d = last.val - prev.val
    change = { prev, delta: d, meaningful: Math.abs(d) >= MEANINGFUL_DELTA, dir: Math.abs(d) < MEANINGFUL_DELTA ? 'flat' : d > 0 ? 'up' : 'down' }
  }
  return { id, label: PILLAR_LABELS[id] || id, series: s, count: s.length, first, last, delta, change }
}

export function allPillars(db) {
  return PILLAR_IDS.map((id) => pillarProgress(db, id)).filter(Boolean)
    .sort((a, b) => a.last.val - b.last.val)
}

export function globalTrend(db) {
  const hist = history(db)
  if (hist.length < 2) return null
  const last = hist[hist.length - 1]
  const prev = hist[hist.length - 2]
  return { last, prev, delta: num(last.score) - num(prev.score), span: daysBetween(prev.date, last.date), count: hist.length }
}

// Même piège que pour la mobilité : un score global stable peut recouvrir
// deux piliers qui bougent en sens contraire.
export function hiddenMoves(db) {
  const g = globalTrend(db)
  if (!g) return null
  const moved = []
  for (const id of PILLAR_IDS) {
    const before = pillarValue(g.prev.piliers && g.prev.piliers[id])
    const after = pillarValue(g.last.piliers && g.last.piliers[id])
    if (before == null || after == null) continue
    const d = after - before
    if (Math.abs(d) >= MEANINGFUL_DELTA) moved.push({ id, label: PILLAR_LABELS[id], delta: d, before, after })
  }
  const up = moved.filter((m) => m.delta > 0)
  const down = moved.filter((m) => m.delta < 0)
  return { globalDelta: g.delta, up, down, masked: Math.abs(g.delta) < MEANINGFUL_DELTA && up.length > 0 && down.length > 0 }
}

// ─── Déclaré contre mesuré ───────────────────────────────────
// Le seul endroit de l'application où l'on peut confronter ce que
// quelqu'un pense de ses habitudes à ce que ses propres journaux
// enregistrent. On ne conclut que si les deux existent et divergent
// nettement — un questionnaire n'est pas une mesure, et l'écart doit être
// franc pour valoir d'être signalé.
export const DECLARED_GOOD = 70
export const DECLARED_POOR = 45

export function declaredVsMeasured(db, { hydro = null, sleep = null } = {}) {
  const hist = history(db)
  if (!hist.length) return []
  const last = hist[hist.length - 1].piliers || {}
  const out = []

  const hydroScore = pillarValue(last.hydratation)
  if (hydroScore != null && hydro && hydro.adherence && hydro.adherence.days >= 7) {
    const measuredOk = hydro.adherence.pct >= 70
    if (hydroScore >= DECLARED_GOOD && !measuredOk) {
      out.push({
        id: 'hydratation', level: 'warn', declared: hydroScore, measured: hydro.adherence.pct,
        text: `Tu situes ton hydratation à ${hydroScore}/100 au diagnostic, mais ton journal montre la cible atteinte ${hydro.adherence.hit} jours sur ${hydro.adherence.days}.`,
      })
    } else if (hydroScore <= DECLARED_POOR && measuredOk) {
      out.push({
        id: 'hydratation', level: 'info', declared: hydroScore, measured: hydro.adherence.pct,
        text: `Tu juges ton hydratation faible (${hydroScore}/100), alors que ton journal montre la cible atteinte ${hydro.adherence.pct} % du temps — tu fais mieux que tu ne crois.`,
      })
    }
  }

  const recupScore = pillarValue(last.recuperation)
  if (recupScore != null && sleep && sleep.debt && sleep.nights >= 7) {
    const measuredOk = sleep.debt.net <= 3
    if (recupScore >= DECLARED_GOOD && !measuredOk) {
      out.push({
        id: 'recuperation', level: 'warn', declared: recupScore, measured: sleep.debt.net,
        text: `Tu situes ta récupération à ${recupScore}/100, mais ton journal de sommeil accuse ${sleep.debt.net} h de dette sur ${sleep.debt.nights} nuits.`,
      })
    } else if (recupScore <= DECLARED_POOR && measuredOk) {
      out.push({
        id: 'recuperation', level: 'info', declared: recupScore, measured: sleep.debt.net,
        text: `Tu juges ta récupération faible (${recupScore}/100), alors que tes nuits enregistrées ne montrent pas de dette notable.`,
      })
    }
  }
  return out
}

// ─── Objectifs personnels ────────────────────────────────────
// Sans date, un objectif posé hier et un autre qui traîne depuis six mois
// se ressemblaient. Les entrées anciennes n'en ont pas : on ne les
// signale pas plutôt que de leur en inventer une.
export const GOAL_STALE_DAYS = 60

export function goalsStatus(db, today) {
  const ref = refDay(today)
  const list = (db && db.customGoals) || []
  if (!list.length) return null
  const items = list.map((g) => {
    const created = g && /^\d{4}-\d{2}-\d{2}$/.test(g.createdAt || '') ? g.createdAt : null
    const doneAt = g && /^\d{4}-\d{2}-\d{2}$/.test(g.doneAt || '') ? g.doneAt : null
    const ageDays = created ? Math.max(0, daysBetween(created, ref)) : null
    return {
      id: g.id, label: g.label, done: !!g.done, created, doneAt, ageDays,
      stale: !g.done && ageDays != null && ageDays >= GOAL_STALE_DAYS,
      tookDays: created && doneAt ? Math.max(0, daysBetween(created, doneAt)) : null,
    }
  })
  const done = items.filter((i) => i.done)
  const open = items.filter((i) => !i.done)
  const stale = items.filter((i) => i.stale)
  const timed = done.filter((i) => i.tookDays != null)
  return {
    items, total: items.length, done: done.length, open: open.length,
    pct: Math.round(done.length / items.length * 100),
    stale,
    medianDays: timed.length ? timed.map((i) => i.tookDays).sort((a, b) => a - b)[Math.floor(timed.length / 2)] : null,
    undated: items.filter((i) => i.created == null).length,
  }
}

// ─── Synthèse ────────────────────────────────────────────────
export function diagAnalysis(db, { today, hydro = null, sleep = null } = {}) {
  const ref = refDay(today)
  const hist = history(db)
  const pillars = allPillars(db)
  const fresh = freshness(db, ref)
  const trend = globalTrend(db)
  const hidden = hiddenMoves(db)
  const contradictions = declaredVsMeasured(db, { hydro, sleep })
  const goals = goalsStatus(db, ref)

  const tips = []
  if (!hist.length) {
    tips.push('Diagnostic nutrition jamais passé. Un premier passage situe tes cinq piliers ; c’est en le refaisant que l’évolution devient lisible.')
  } else {
    for (const c of contradictions.filter((x) => x.level === 'warn')) tips.push(c.text)
    if (hidden && hidden.masked) {
      tips.push(`Ton score global n’a bougé que de ${hidden.globalDelta > 0 ? '+' : ''}${hidden.globalDelta} points, mais il recouvre des mouvements opposés : ${hidden.up.map((m) => m.label.toLowerCase()).join(', ')} en progrès, ${hidden.down.map((m) => m.label.toLowerCase()).join(', ')} en recul.`)
    } else {
      const down = pillars.filter((p) => p.change && p.change.dir === 'down')
      if (down.length) tips.push(`${down[0].label} en recul de ${Math.abs(down[0].change.delta)} points depuis ton diagnostic précédent.`)
    }
    const weakest = pillars[0]
    if (weakest && weakest.last.val < DECLARED_POOR) {
      tips.push(`${weakest.label} est ton pilier le plus faible (${weakest.last.val}/100) — c’est là que l’effort rapporte le plus.`)
    }
    for (const c of contradictions.filter((x) => x.level === 'info')) tips.push(c.text)
    if (fresh.level !== 'fresh') tips.push(fresh.text)
  }
  if (goals) {
    if (goals.stale.length) tips.push(`${goals.stale.length} objectif${goals.stale.length > 1 ? 's' : ''} personnel${goals.stale.length > 1 ? 's traînent' : ' traîne'} depuis plus de ${GOAL_STALE_DAYS} jours : le reformuler ou l’abandonner vaut mieux que le laisser courir.`)
    else if (goals.done === goals.total) tips.push(`Tes ${goals.total} objectifs personnels sont atteints — c’est le moment d’en poser de nouveaux.`)
  }
  if (!tips.length) tips.push('Piliers équilibrés et diagnostic à jour. Rien à ajuster.')

  return { history: hist, pillars, freshness: fresh, trend, hidden, contradictions, goals, tips }
}
