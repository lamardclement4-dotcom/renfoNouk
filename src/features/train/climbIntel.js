// ============================================================
// Escalade : cotations, styles de réussite, pyramide et charge des
// doigts.
//
// L'écran ne gardait qu'un niveau en texte libre — « 6b+ » saisi à la
// main — plus deux compteurs de voies et de blocs. Rien de tout cela
// n'était exploitable : « 6b+ » et « 6B+ » sont deux chaînes
// différentes, et un niveau sans style ne veut pas dire grand-chose. Une
// voie enchaînée à vue et la même après dix essais ne racontent pas la
// même séance.
//
// Ce module rend les cotations comparables, distingue les styles, et
// ajoute deux lectures que le grimpeur fait de tête et que l'application
// ne faisait pas : la pyramide — un niveau maximum n'a de sens que s'il
// repose sur du volume en dessous — et la charge des doigts, dont les
// tendons s'adaptent bien plus lentement que les muscles.
//
// Repères d'usage courant dans la pratique, pas des prescriptions.
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

// ─── Cotations ───────────────────────────────────────────────
// Deux échelles distinctes, qui ne se comparent pas entre elles : la
// française pour les voies, la Fontainebleau pour le bloc. Les confondre
// ferait passer un 7a de bloc pour l'équivalent d'un 7a de voie, ce qui
// n'a rien à voir.
export const SPORT_GRADES = [
  '3', '4', '5a', '5b', '5c',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a', '9a+', '9b', '9b+', '9c',
]

export const BOULDER_GRADES = [
  '3', '4', '5', '5+',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a',
]

export const SCALES = { voie: SPORT_GRADES, bloc: BOULDER_GRADES }

export function normalizeGrade(grade) {
  return String(grade || '').trim().toLowerCase().replace(/\s+/g, '')
}

// Rang de la cotation dans son échelle. C'est ce rang, pas la chaîne, qui
// permet de comparer, trier et faire des moyennes.
export function gradeIndex(grade, scale = 'voie') {
  const list = SCALES[scale] || SPORT_GRADES
  const g = normalizeGrade(grade)
  if (!g) return null
  const i = list.findIndex((x) => normalizeGrade(x) === g)
  return i >= 0 ? i : null
}

export function gradeLabel(index, scale = 'voie') {
  const list = SCALES[scale] || SPORT_GRADES
  const i = num(index)
  if (i == null || i < 0 || i >= list.length) return null
  return list[i]
}

// Différence en nombre de crans, pour dire « deux cotations au-dessus »
// plutôt qu'un écart d'indices sans signification pour le lecteur.
export function gradeGap(a, b, scale = 'voie') {
  const ia = gradeIndex(a, scale)
  const ib = gradeIndex(b, scale)
  if (ia == null || ib == null) return null
  return ia - ib
}

// ─── Styles de réussite ──────────────────────────────────────
// L'ordre compte : à vue est la forme la plus exigeante, l'échec n'est
// pas une réussite. C'est cette hiérarchie qui permet de dire quel est le
// vrai niveau dans chaque registre.
export const STYLES = [
  { id: 'avue', label: 'À vue', short: 'AV', sent: true, rank: 0, desc: 'Réussi au premier essai, sans information préalable.' },
  { id: 'flash', label: 'Flash', short: 'FL', sent: true, rank: 1, desc: 'Réussi au premier essai, avec des informations.' },
  { id: 'travail', label: 'Après travail', short: 'AT', sent: true, rank: 2, desc: 'Réussi après avoir répété les mouvements.' },
  { id: 'essai', label: 'Essai / chute', short: '—', sent: false, rank: 3, desc: 'Tentative non aboutie.' },
]

export const STYLE_BY_ID = Object.fromEntries(STYLES.map((s) => [s.id, s]))

export function isSent(style) {
  const s = STYLE_BY_ID[style]
  return !!(s && s.sent)
}

// ─── Profils de mur ──────────────────────────────────────────
// Le profil sollicite des qualités différentes : la dalle demande de
// l'équilibre et de la précision de pied, le dévers de la force et du
// gainage. Éviter systématiquement l'un des deux est le trou le plus
// courant dans une progression.
export const ANGLES = [
  { id: 'dalle', label: 'Dalle', desc: 'Équilibre, précision de pied' },
  { id: 'vertical', label: 'Vertical', desc: 'Technique, gestion de l’effort' },
  { id: 'devers', label: 'Dévers', desc: 'Force, gainage, verrouillage' },
  { id: 'toit', label: 'Toit', desc: 'Gainage extrême, force de doigts' },
]

// ─── Lecture des voies enregistrées ──────────────────────────
// Une séance d'escalade porte ses croix dans `data.ascents`.
export function sessionAscents(session) {
  const list = (session && session.data && session.data.ascents) || []
  return list
    .filter((x) => x && x.grade)
    .map((x, i) => {
      const scale = x.scale === 'bloc' ? 'bloc' : 'voie'
      return {
        id: x.id || 'a' + i,
        date: session.date,
        grade: x.grade,
        scale,
        index: gradeIndex(x.grade, scale),
        style: STYLE_BY_ID[x.style] ? x.style : 'travail',
        angle: x.angle || null,
        attempts: num(x.attempts),
        name: x.name || null,
      }
    })
    .filter((x) => x.index != null)
}

export function ascents(db, { days = 180, today, scale = null } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  const out = []
  for (const s of (db && db.planningSessions) || []) {
    if (!s || s.sport !== 'escalade' || s.statut !== 'realise') continue
    if (!s.date || s.date < from || s.date > ref) continue
    for (const a of sessionAscents(s)) {
      if (scale && a.scale !== scale) continue
      out.push(a)
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Niveau par style ────────────────────────────────────────
// Le maximum brut ne dit rien seul : quelqu'un qui sort du 7b après
// vingt essais et du 6b à vue n'a pas « un niveau 7b ». Les deux chiffres
// racontent la séance, l'écart entre eux raconte le grimpeur.
export function bestByStyle(list, scale = 'voie') {
  const out = {}
  for (const st of STYLES) {
    if (!st.sent) continue
    const items = list.filter((a) => a.scale === scale && a.style === st.id)
    if (!items.length) continue
    const best = items.reduce((m, a) => (a.index > m.index ? a : m), items[0])
    out[st.id] = { style: st.id, label: st.label, grade: best.grade, index: best.index, date: best.date, count: items.length }
  }
  return out
}

// Écart entre le niveau à vue et le niveau après travail. Un écart très
// large signale un grimpeur qui projette sans consolider ; un écart nul,
// quelqu'un qui n'essaie jamais plus dur que ce qu'il sait faire.
export const GAP_WIDE = 4
export const GAP_NARROW = 1

export function styleGap(best) {
  const onsight = best.avue || best.flash
  const redpoint = best.travail
  if (!onsight || !redpoint) return null
  const gap = redpoint.index - onsight.index
  if (gap >= GAP_WIDE) {
    return { gap, onsight, redpoint, level: 'warn', text: `Tu sors du ${redpoint.grade} après travail mais du ${onsight.grade} ${onsight.style === 'avue' ? 'à vue' : 'en flash'} : ${gap} cotations d'écart. Consolider le niveau intermédiaire fait souvent plus progresser que projeter plus dur.` }
  }
  if (gap <= GAP_NARROW) {
    return { gap, onsight, redpoint, level: 'info', text: `Ton niveau à vue (${onsight.grade}) et ton niveau après travail (${redpoint.grade}) sont très proches : tu ne t'engages presque jamais sur plus dur que ce que tu sais déjà faire.` }
  }
  return { gap, onsight, redpoint, level: 'ok', text: `${gap} cotations entre ton niveau à vue (${onsight.grade}) et après travail (${redpoint.grade}) — un écart habituel.` }
}

// ─── Pyramide ────────────────────────────────────────────────
// Un niveau maximum ne tient que s'il repose sur du volume en dessous.
// La règle d'usage veut plusieurs croix à la cotation précédente avant de
// considérer un niveau comme acquis.
export const PYRAMID_BASE = 3

export function pyramid(list, scale = 'voie', { days = 180 } = {}) {
  const sent = list.filter((a) => a.scale === scale && isSent(a.style))
  if (!sent.length) return null
  const byIndex = {}
  for (const a of sent) byIndex[a.index] = (byIndex[a.index] || 0) + 1
  const indices = Object.keys(byIndex).map(Number).sort((a, b) => b - a)
  const top = indices[0]
  const rows = indices.map((i) => ({ index: i, grade: gradeLabel(i, scale), count: byIndex[i] }))
  const below = byIndex[top - 1] || 0
  const solid = below >= PYRAMID_BASE
  return {
    rows, top, topGrade: gradeLabel(top, scale), topCount: byIndex[top],
    below, solid, days, total: sent.length,
    text: solid
      ? `Ton ${gradeLabel(top, scale)} repose sur ${below} croix en ${gradeLabel(top - 1, scale)} : le niveau est consolidé.`
      : `Tu as sorti du ${gradeLabel(top, scale)}, mais seulement ${below} croix en ${gradeLabel(top - 1, scale)} : la base manque pour que le niveau soit acquis plutôt que ponctuel.`,
  }
}

// ─── Profils travaillés ──────────────────────────────────────
export function angleSplit(list) {
  const known = list.filter((a) => a.angle)
  if (known.length < 6) return null
  const by = {}
  for (const a of known) by[a.angle] = (by[a.angle] || 0) + 1
  const items = ANGLES
    .filter((x) => by[x.id])
    .map((x) => ({ id: x.id, label: x.label, desc: x.desc, count: by[x.id], pct: Math.round(by[x.id] / known.length * 100) }))
    .sort((a, b) => b.count - a.count)
  const missing = ANGLES.filter((x) => !by[x.id])
  const dominant = items[0]
  return {
    items, missing, total: known.length,
    // Un profil qui occupe plus des deux tiers des croix laisse les autres
    // qualités de côté.
    lopsided: dominant && dominant.pct >= 65,
    text: dominant && dominant.pct >= 65
      ? `${dominant.pct} % de tes croix sont en ${dominant.label.toLowerCase()}${missing.length ? `, et tu ne grimpes jamais en ${missing.map((m) => m.label.toLowerCase()).join(' ni en ')}` : ''}. Varier les profils travaille des qualités que celui-ci ne sollicite pas.`
      : `Profils variés : ${items.map((x) => `${x.label.toLowerCase()} ${x.pct} %`).join(', ')}.`,
  }
}

// ─── Charge des doigts ───────────────────────────────────────
// Les tendons et les poulies des doigts s'adaptent bien plus lentement
// que les muscles : c'est la blessure la plus fréquente en escalade, et
// elle vient presque toujours d'un enchaînement de séances dures trop
// rapproché. Deux jours durs consécutifs, ou plus de trois séances dures
// dans la semaine, sont les deux repères d'usage.
export const HARD_GAP_FROM_MAX = 2
export const MAX_HARD_PER_WEEK = 3

export function isHardSession(sessionAsc, best, scale) {
  const b = best && (best.travail || best.flash || best.avue)
  if (!b) return false
  const threshold = b.index - HARD_GAP_FROM_MAX
  return sessionAsc.some((a) => a.scale === scale && a.index >= threshold)
}

export function fingerLoad(db, { days = 28, today } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  const sessions = ((db && db.planningSessions) || [])
    .filter((s) => s && s.sport === 'escalade' && s.statut === 'realise' && s.date && s.date >= from && s.date <= ref)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!sessions.length) return null
  const all = ascents(db, { days: 180, today: ref })
  const bestVoie = bestByStyle(all, 'voie')
  const bestBloc = bestByStyle(all, 'bloc')

  const days_ = sessions.map((s) => {
    const asc = sessionAscents(s)
    return {
      date: s.date,
      hard: isHardSession(asc, bestVoie, 'voie') || isHardSession(asc, bestBloc, 'bloc'),
      count: asc.length,
    }
  })
  const hardDays = days_.filter((d) => d.hard)
  // Jours durs consécutifs.
  const backToBack = []
  for (let i = 1; i < days_.length; i++) {
    if (days_[i].hard && days_[i - 1].hard && daysBetween(days_[i - 1].date, days_[i].date) === 1) {
      backToBack.push(days_[i].date)
    }
  }
  const weeks = days / 7
  const hardPerWeek = Math.round(hardDays.length / weeks * 10) / 10

  const flags = []
  if (backToBack.length) {
    flags.push({
      id: 'consecutif', level: 'warn',
      text: `${backToBack.length} fois deux séances dures d'escalade sur deux jours consécutifs. Les tendons des doigts s'adaptent bien plus lentement que les muscles : c'est l'enchaînement, pas le volume, qui blesse le plus souvent.`,
    })
  }
  if (hardPerWeek > MAX_HARD_PER_WEEK) {
    flags.push({
      id: 'frequence', level: 'warn',
      text: `${hardPerWeek} séances dures par semaine en moyenne, au-delà du repère de ${MAX_HARD_PER_WEEK}. Une séance facile intercalée protège les doigts sans coûter de progression.`,
    })
  }
  return { sessions: days_, hardDays: hardDays.length, hardPerWeek, backToBack, days, flags }
}

// ─── Progression ─────────────────────────────────────────────
// Meilleure croix par mois, pour voir si le niveau monte réellement ou
// si l'on répète le même registre.
export function progression(list, scale = 'voie') {
  const sent = list.filter((a) => a.scale === scale && isSent(a.style))
  if (!sent.length) return null
  const byMonth = {}
  for (const a of sent) {
    const m = a.date.slice(0, 7)
    if (!byMonth[m] || a.index > byMonth[m].index) byMonth[m] = a
  }
  const months = Object.keys(byMonth).sort().map((m) => ({ month: m, grade: byMonth[m].grade, index: byMonth[m].index }))
  if (months.length < 2) return { months, gain: 0, first: months[0], last: months[0] }
  const first = months[0]
  const last = months[months.length - 1]
  return { months, gain: last.index - first.index, first, last }
}

// ─── Volume et réussite ──────────────────────────────────────
export function sessionStats(db, { days = 28, today } = {}) {
  const ref = today || todayISO()
  const list = ascents(db, { days, today: ref })
  const sessions = new Set(list.map((a) => a.date))
  const sent = list.filter((a) => isSent(a.style))
  const attempts = list.reduce((sum, a) => sum + (a.attempts || 1), 0)
  return {
    days, sessions: sessions.size, total: list.length, sent: sent.length,
    failed: list.length - sent.length,
    successRate: list.length ? Math.round(sent.length / list.length * 100) : null,
    attempts,
    voies: list.filter((a) => a.scale === 'voie').length,
    blocs: list.filter((a) => a.scale === 'bloc').length,
  }
}

// ─── Synthèse ────────────────────────────────────────────────
export function climbAnalysis(db, { days = 180, today } = {}) {
  const ref = today || todayISO()
  const list = ascents(db, { days, today: ref })
  const stats = sessionStats(db, { days: 28, today: ref })
  const bestVoie = bestByStyle(list, 'voie')
  const bestBloc = bestByStyle(list, 'bloc')
  const gapVoie = styleGap(bestVoie)
  const gapBloc = styleGap(bestBloc)
  const pyrVoie = pyramid(list, 'voie', { days })
  const pyrBloc = pyramid(list, 'bloc', { days })
  const angles = angleSplit(list)
  const fingers = fingerLoad(db, { days: 28, today: ref })
  const progVoie = progression(list, 'voie')
  const progBloc = progression(list, 'bloc')

  const tips = []
  if (!list.length) {
    tips.push('Aucune voie enregistrée. Noter chaque croix avec sa cotation et son style — à vue, flash ou après travail — permet de suivre un vrai niveau plutôt qu’un chiffre saisi de mémoire.')
  } else {
    if (fingers) for (const f of fingers.flags) tips.push(f.text)
    for (const p of [pyrVoie, pyrBloc]) if (p && !p.solid) tips.push(p.text)
    for (const g of [gapVoie, gapBloc]) if (g && g.level !== 'ok') tips.push(g.text)
    if (angles && angles.lopsided) tips.push(angles.text)
    for (const [p, lab] of [[progVoie, 'en voie'], [progBloc, 'en bloc']]) {
      if (p && p.months.length >= 3 && p.gain > 0) {
        tips.push(`Progression ${lab} : de ${p.first.grade} à ${p.last.grade} sur ${p.months.length} mois.`)
      }
    }
  }
  if (!tips.length) tips.push('Pratique équilibrée : pyramide solide, styles variés et charge des doigts maîtrisée.')

  return { ascents: list, stats, bestVoie, bestBloc, gapVoie, gapBloc, pyrVoie, pyrBloc, angles, fingers, progVoie, progBloc, tips }
}
