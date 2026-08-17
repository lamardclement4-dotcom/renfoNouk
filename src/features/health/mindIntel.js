// ============================================================
// Pratique respiratoire et objectifs, dans la durée.
//
// L'espace Esprit ne conservait rien : ni les séances terminées, ni les
// objectifs. Le formulaire d'objectifs SMART allait jusqu'à le dire —
// « pas sauvegardé, à noter ailleurs une fois terminé ». Demander à
// quelqu'un de formuler son objectif puis le jeter à la fermeture de
// l'écran, c'est perdre exactement ce que la littérature citée juste
// au-dessus désigne comme le levier : un objectif écrit et daté.
//
// Ce module donne à cet espace la mémoire qui lui manquait : régularité
// de la pratique, et échéances des objectifs.
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

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

// ─── Séances de respiration ──────────────────────────────────
export function breathSessions(db, { days = 30, today } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  return ((db && db.breathLog) || [])
    .filter((s) => s && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.date >= from && s.date <= ref && num(s.mins) > 0)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Jours consécutifs de pratique en remontant. On tolère de commencer la
// veille : quelqu'un qui a pratiqué hier soir mais pas encore aujourd'hui
// n'a pas rompu sa série.
export function breathStreak(db, today) {
  const ref = today || todayISO()
  const dates = new Set(((db && db.breathLog) || []).filter((s) => s && s.date && num(s.mins) > 0).map((s) => s.date))
  if (!dates.size) return 0
  let start = ref
  if (!dates.has(ref)) {
    const y = shiftISO(ref, -1)
    if (!dates.has(y)) return 0
    start = y
  }
  let n = 0
  for (let i = 0; i < 400; i++) {
    if (dates.has(shiftISO(start, -i))) n++
    else break
  }
  return n
}

// La régularité prime sur la durée pour ces protocoles : mieux vaut cinq
// minutes tous les jours que quarante une fois par mois.
export function breathStats(db, { days = 30, today } = {}) {
  const sessions = breathSessions(db, { days, today })
  if (!sessions.length) return { sessions: [], count: 0, mins: 0, activeDays: 0, days, streak: breathStreak(db, today), perWeek: 0, byProtocol: [] }
  const mins = sessions.reduce((a, s) => a + num(s.mins), 0)
  const activeDays = new Set(sessions.map((s) => s.date)).size
  const byId = {}
  for (const s of sessions) {
    const k = s.protocol || 'inconnu'
    if (!byId[k]) byId[k] = { id: k, name: s.protocolName || k, count: 0, mins: 0 }
    byId[k].count++
    byId[k].mins += num(s.mins)
  }
  return {
    sessions, count: sessions.length, mins,
    activeDays, days,
    streak: breathStreak(db, today),
    perWeek: Math.round(activeDays / days * 7 * 10) / 10,
    byProtocol: Object.values(byId).sort((a, b) => b.count - a.count),
  }
}

// ─── Objectifs ───────────────────────────────────────────────
export const GOAL_FIELDS = [
  { k: 's', label: 'Spécifique', ph: 'Quoi exactement ? (ex: courir 10 km)' },
  { k: 'm', label: 'Mesurable', ph: 'Comment tu sais que c’est réussi ? (ex: en moins de 55 min)' },
  { k: 'a', label: 'Atteignable', ph: 'Réaliste avec ton niveau actuel ?' },
  { k: 'r', label: 'Pertinent', ph: 'Pourquoi c’est important pour toi ?' },
]

export function goals(db) {
  return ((db && db.smartGoals) || [])
    .filter((g) => g && g.id)
    .slice()
    .sort((a, b) => {
      if (!!a.doneAt !== !!b.doneAt) return a.doneAt ? 1 : -1
      const ad = a.due || '9999-99-99'
      const bd = b.due || '9999-99-99'
      return ad.localeCompare(bd)
    })
}

// Où en est un objectif par rapport à son échéance. C'est la date qui
// rend un objectif actionnable — « dans 6 semaines » ne rappelle rien à
// personne trois semaines plus tard.
export const GOAL_SOON_DAYS = 7

export function goalStatus(goal, today) {
  const ref = today || todayISO()
  if (!goal) return null
  if (goal.doneAt) return { level: 'done', days: null, text: `Atteint le ${goal.doneAt.split('-').reverse().join('/')}.` }
  if (!goal.due || !/^\d{4}-\d{2}-\d{2}$/.test(goal.due)) return { level: 'nodate', days: null, text: 'Sans échéance : un objectif daté a nettement plus de chances d’aboutir.' }
  const days = daysBetween(ref, goal.due)
  if (days < 0) return { level: 'late', days, text: `Échéance dépassée de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''} : c’est le moment de conclure ou de la revoir, pas de la laisser traîner.` }
  if (days === 0) return { level: 'today', days, text: 'C’est aujourd’hui.' }
  if (days <= GOAL_SOON_DAYS) return { level: 'soon', days, text: `Plus que ${days} jour${days > 1 ? 's' : ''}.` }
  return { level: 'ok', days, text: `Dans ${days} jours.` }
}

export function goalProgressSummary(db, today) {
  const all = goals(db)
  const open = all.filter((g) => !g.doneAt)
  const done = all.filter((g) => g.doneAt)
  const withStatus = open.map((g) => ({ goal: g, status: goalStatus(g, today) }))
  return {
    all, open, done,
    late: withStatus.filter((x) => x.status.level === 'late'),
    soon: withStatus.filter((x) => x.status.level === 'soon' || x.status.level === 'today'),
    undated: withStatus.filter((x) => x.status.level === 'nodate'),
  }
}

// Un objectif est complet quand les cinq dimensions sont renseignées,
// l'échéance comprise — c'est le « T » de SMART, et c'est celle que le
// formulaire laissait filer en texte libre.
export function goalCompleteness(draft) {
  const filled = GOAL_FIELDS.filter((f) => ((draft && draft[f.k]) || '').trim().length > 0).length
  const dated = !!(draft && draft.due && /^\d{4}-\d{2}-\d{2}$/.test(draft.due))
  return { filled, total: GOAL_FIELDS.length + 1, dated, complete: filled === GOAL_FIELDS.length && dated }
}

// ─── Synthèse ────────────────────────────────────────────────
export function mindAnalysis(db, { today, days = 30 } = {}) {
  const ref = today || todayISO()
  const breath = breathStats(db, { days, today: ref })
  const g = goalProgressSummary(db, ref)

  const tips = []
  if (g.late.length) {
    tips.push(`${g.late.length} objectif${g.late.length > 1 ? 's ont' : ' a'} dépassé son échéance : conclure ou redater vaut mieux que laisser courir, un objectif périmé cesse d’en être un.`)
  }
  if (g.soon.length) {
    const first = g.soon[0]
    tips.push(`« ${(first.goal.s || 'Ton objectif').slice(0, 60)} » arrive à échéance : ${first.status.text.toLowerCase()}`)
  }
  if (g.undated.length) {
    tips.push(`${g.undated.length} objectif${g.undated.length > 1 ? 's sont' : ' est'} sans date. Une échéance est la partie de SMART qui change le plus les chances d’aboutir.`)
  }
  if (!g.all.length) {
    tips.push('Aucun objectif enregistré. En formuler un, précis et daté, est l’un des leviers les mieux établis en psychologie de la performance.')
  }
  // La série en cours passe avant la moyenne du mois : quelqu'un qui
  // vient de s'y mettre a forcément une moyenne basse, et lui reprocher
  // son irrégularité passée au moment précis où il la corrige serait à
  // la fois faux et décourageant.
  if (breath.count === 0) {
    tips.push('Aucune séance de respiration sur le dernier mois. Ces protocoles valent surtout par la régularité : cinq minutes par jour font plus que quarante une fois.')
  } else if (breath.streak >= 3) {
    tips.push(`${breath.streak} jours d’affilée : c’est exactement la façon dont ces protocoles produisent leur effet.`)
  } else if (breath.perWeek < 2) {
    tips.push(`${breath.perWeek} séance(s) par semaine en moyenne sur ${breath.days} jours. La régularité pèse davantage que la durée sur ces protocoles.`)
  }
  if (!tips.length) tips.push('Pratique régulière et objectifs à jour. Rien à ajuster.')

  return { breath, goals: g, tips }
}
