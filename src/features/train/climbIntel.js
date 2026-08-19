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
        name: (x.name || '').trim() || null,
        lieu: x.lieu || null,
        prises: Array.isArray(x.prises) ? x.prises : [],
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


// ─── Lieu et type de prises ──────────────────────────────────
// Une cotation de falaise et une cotation de salle ne se valent pas :
// l'écart usuel est d'un cran, parfois deux. Les mélanger dans un même
// maximum donne un niveau qui ne correspond à rien.
export const LIEUX = [
  { id: 'salle', label: 'Salle' },
  { id: 'falaise', label: 'Falaise' },
]

// Les types de préhension ne sollicitent ni les mêmes doigts ni les mêmes
// tendons. Éviter systématiquement l'un d'eux crée un trou que la
// cotation seule ne montre jamais.
export const PRISES = [
  { id: 'reglette', label: 'Réglettes', desc: 'Doigts fléchis, forte contrainte sur les poulies' },
  { id: 'inversee', label: 'Inversées', desc: 'Traction vers le haut, sollicite les biceps et les épaules' },
  { id: 'pince', label: 'Pinces', desc: 'Pouce en opposition' },
  { id: 'plat', label: 'Plats', desc: 'Adhérence, force de compression' },
  { id: 'bac', label: 'Bacs', desc: 'Préhension confortable' },
  { id: 'mono', label: 'Mono / bi-doigts', desc: 'Contrainte très localisée, à doser' },
]

// ─── Niveau par profil de mur ────────────────────────────────
// C'est la lecture la plus actionnable : quelqu'un qui sort du 7a en
// dévers et du 6a en dalle n'a pas « un niveau 7a », il a une force de
// doigts avancée et une technique de pied en retard. Le volume par
// profil ne le dit pas — seul le niveau atteint dans chacun le dit.
export const ANGLE_GAP_WIDE = 3

export function gradeByAngle(list, scale = 'voie') {
  const sent = list.filter((a) => a.scale === scale && isSent(a.style) && a.angle)
  if (!sent.length) return null
  const by = {}
  for (const a of sent) {
    if (!by[a.angle] || a.index > by[a.angle].index) by[a.angle] = a
    by[a.angle].count = (by[a.angle].count || 0) + 1
  }
  const items = ANGLES
    .filter((x) => by[x.id])
    .map((x) => ({ id: x.id, label: x.label, desc: x.desc, grade: by[x.id].grade, index: by[x.id].index, count: by[x.id].count }))
    .sort((a, b) => b.index - a.index)
  if (items.length < 2) return { items, gap: null }
  const best = items[0]
  const worst = items[items.length - 1]
  const gap = best.index - worst.index
  return {
    items, best, worst, gap,
    lopsided: gap >= ANGLE_GAP_WIDE,
    text: gap >= ANGLE_GAP_WIDE
      ? `Tu sors du ${best.grade} en ${best.label.toLowerCase()} mais du ${worst.grade} en ${worst.label.toLowerCase()} : ${gap} cotations d'écart. Ce n'est pas un manque de niveau, c'est une qualité en retard — ${worst.desc.toLowerCase()}.`
      : `Niveau homogène entre les profils (${items.map((x) => `${x.label.toLowerCase()} ${x.grade}`).join(', ')}).`,
  }
}

// ─── Projets ouverts ─────────────────────────────────────────
// Une voie essayée plusieurs fois sans être enchaînée est un projet. Le
// grimpeur le sait, l'application non — alors qu'elle a le nom, la date
// et le nombre d'essais. Un projet qui traîne depuis des mois mérite
// d'être tranché : le reprendre sérieusement ou passer à autre chose.
export const PROJECT_MIN_TRIES = 2
export const PROJECT_STALE_DAYS = 60

export function projects(list, { today } = {}) {
  const ref = today || todayISO()
  const named = list.filter((a) => a.name)
  if (!named.length) return []
  const by = {}
  for (const a of named) {
    const key = a.name.toLowerCase() + '|' + a.scale
    if (!by[key]) by[key] = { name: a.name, scale: a.scale, grade: a.grade, index: a.index, tries: 0, sessions: new Set(), sent: null, first: a.date, last: a.date }
    const p = by[key]
    p.tries += a.attempts && a.attempts > 0 ? a.attempts : 1
    p.sessions.add(a.date)
    if (a.date < p.first) p.first = a.date
    if (a.date > p.last) p.last = a.date
    if (isSent(a.style) && (!p.sent || a.date < p.sent.date)) p.sent = { date: a.date, style: a.style }
  }
  return Object.values(by)
    .map((p) => ({
      ...p, sessions: p.sessions.size,
      ageDays: daysBetween(p.first, ref),
      idleDays: daysBetween(p.last, ref),
      open: !p.sent,
      stale: !p.sent && daysBetween(p.last, ref) >= PROJECT_STALE_DAYS,
    }))
    .filter((p) => p.tries >= PROJECT_MIN_TRIES || p.sent)
    .sort((a, b) => (a.open === b.open ? b.tries - a.tries : a.open ? -1 : 1))
}

// ─── Efficacité des essais ───────────────────────────────────
// Combien d'essais pour une croix. Le chiffre en soi ne dit rien — il
// dépend du niveau visé — mais son évolution dit si l'on devient plus
// efficace ou si l'on s'acharne davantage.
export function attemptEfficiency(list, scale = 'voie', { months = 3 } = {}) {
  const withTries = list.filter((a) => a.scale === scale && a.attempts && a.attempts > 0)
  if (withTries.length < 6) return null
  const byMonth = {}
  for (const a of withTries) {
    const m = a.date.slice(0, 7)
    if (!byMonth[m]) byMonth[m] = { month: m, tries: 0, sends: 0 }
    byMonth[m].tries += a.attempts
    if (isSent(a.style)) byMonth[m].sends++
  }
  const rows = Object.values(byMonth)
    .filter((r) => r.sends > 0)
    .map((r) => ({ ...r, perSend: Math.round(r.tries / r.sends * 10) / 10 }))
    .sort((a, b) => a.month.localeCompare(b.month))
  if (rows.length < 2) return null
  const first = rows[0]
  const last = rows[rows.length - 1]
  const delta = Math.round((last.perSend - first.perSend) * 10) / 10
  return {
    rows, first, last, delta,
    level: delta <= -0.5 ? 'ok' : delta >= 0.5 ? 'info' : 'flat',
    text: delta <= -0.5
      ? `Tu enchaînes en ${last.perSend} essais en moyenne contre ${first.perSend} auparavant : tu deviens plus efficace, pas seulement plus fort.`
      : delta >= 0.5
        ? `Il te faut ${last.perSend} essais par croix contre ${first.perSend} auparavant — signe que tu vises plus dur, ou que tu t'acharnes davantage.`
        : `Environ ${last.perSend} essais par croix, stable.`,
  }
}

// ─── Plateau ─────────────────────────────────────────────────
// Aucun nouveau maximum depuis longtemps, alors qu'on grimpe
// régulièrement. Ce n'est pas un échec — les paliers font partie de la
// progression — mais le dire évite de le vivre sans le voir.
export const PLATEAU_DAYS = 120

export function plateau(list, scale = 'voie', { today } = {}) {
  const ref = today || todayISO()
  const sent = list.filter((a) => a.scale === scale && isSent(a.style))
  if (sent.length < 8) return null
  const best = sent.reduce((m, a) => (a.index > m.index ? a : m), sent[0])
  const days = daysBetween(best.date, ref)
  // Encore faut-il avoir grimpé depuis : un plateau ne se constate pas
  // pendant une interruption.
  const since = sent.filter((a) => a.date > best.date).length
  if (days < PLATEAU_DAYS || since < 5) return null
  return {
    grade: best.grade, date: best.date, days, sessionsSince: since,
    text: `Ton meilleur ${scale === 'bloc' ? 'bloc' : 'niveau'} reste le ${best.grade} depuis ${days} jours, avec ${since} croix depuis. Les paliers font partie de la progression ; en sortir passe plus souvent par un changement de registre — profil, type de prises, volume — que par plus d'essais sur le même style de voie.`,
  }
}

// ─── Structure de séance ─────────────────────────────────────
// Attaquer sa séance directement au maximum est le meilleur moyen de se
// blesser les doigts : les poulies demandent une montée en charge.
export const WARMUP_GAP = 3

export function sessionShape(session, best, scale = 'voie') {
  const asc = sessionAscents(session).filter((a) => a.scale === scale)
  if (asc.length < 3) return null
  const b = best && (best.travail || best.flash || best.avue)
  if (!b) return null
  const first = asc[0]
  const hardest = asc.reduce((m, a) => (a.index > m.index ? a : m), asc[0])
  const warmedUp = b.index - first.index >= WARMUP_GAP
  return {
    first, hardest, warmedUp, count: asc.length,
    text: warmedUp
      ? null
      : `Ta séance du ${session.date.split('-').reverse().join('/')} commence directement en ${first.grade}, à moins de ${WARMUP_GAP} cotations de ton maximum. Les poulies des doigts demandent une montée en charge progressive.`,
  }
}

export function warmupCheck(db, { days = 60, today } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  const all = ascents(db, { days: 180, today: ref })
  const best = bestByStyle(all, 'voie')
  const bestB = bestByStyle(all, 'bloc')
  const out = []
  for (const s of (db && db.planningSessions) || []) {
    if (!s || s.sport !== 'escalade' || s.statut !== 'realise') continue
    if (!s.date || s.date < from || s.date > ref) continue
    for (const [b, sc] of [[best, 'voie'], [bestB, 'bloc']]) {
      const shape = sessionShape(s, b, sc)
      if (shape && !shape.warmedUp) out.push(shape)
    }
  }
  return out
}

// ─── Salle et falaise ────────────────────────────────────────
export function lieuSplit(list, scale = 'voie') {
  const known = list.filter((a) => a.scale === scale && isSent(a.style) && a.lieu)
  if (known.length < 4) return null
  const by = {}
  for (const a of known) {
    if (!by[a.lieu] || a.index > by[a.lieu].index) by[a.lieu] = a
    by[a.lieu].count = (by[a.lieu].count || 0) + 1
  }
  const items = LIEUX.filter((l) => by[l.id]).map((l) => ({ id: l.id, label: l.label, grade: by[l.id].grade, index: by[l.id].index, count: by[l.id].count }))
  if (items.length < 2) return { items, gap: null }
  const salle = items.find((x) => x.id === 'salle')
  const falaise = items.find((x) => x.id === 'falaise')
  const gap = salle && falaise ? salle.index - falaise.index : null
  return {
    items, gap,
    text: gap == null
      ? null
      : gap >= 2
        ? `${gap} cotations d'écart entre ta salle (${salle.grade}) et ta falaise (${falaise.grade}). L'écart d'un cran est habituel ; au-delà, c'est souvent la lecture, la pose de pied sur rocher ou la gestion de l'engagement qui manquent, pas la force.`
        : `Écart habituel entre salle (${salle.grade}) et falaise (${falaise.grade}).`,
  }
}

// ─── Type de prises ──────────────────────────────────────────
export function priseSplit(list) {
  const all = list.flatMap((a) => a.prises)
  if (all.length < 8) return null
  const by = {}
  for (const p of all) by[p] = (by[p] || 0) + 1
  const items = PRISES.filter((p) => by[p.id]).map((p) => ({ ...p, count: by[p.id], pct: Math.round(by[p.id] / all.length * 100) })).sort((a, b) => b.count - a.count)
  const missing = PRISES.filter((p) => !by[p.id] && p.id !== 'mono')
  const dominant = items[0]
  return {
    items, missing, total: all.length,
    lopsided: dominant && dominant.pct >= 60,
    text: dominant && dominant.pct >= 60
      ? `${dominant.pct} % de tes voies passent sur ${dominant.label.toLowerCase()}${missing.length ? `, et tu ne grimpes jamais sur ${missing.map((m) => m.label.toLowerCase()).join(' ni ')}` : ''}. Chaque préhension sollicite des tendons différents : n'en travailler qu'une crée un déséquilibre que la cotation ne montre pas.`
      : `Préhensions variées : ${items.slice(0, 3).map((x) => `${x.label.toLowerCase()} ${x.pct} %`).join(', ')}.`,
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
  const angleVoie = gradeByAngle(list, 'voie')
  const angleBloc = gradeByAngle(list, 'bloc')
  const projs = projects(list, { today: ref })
  const openProjects = projs.filter((p) => p.open)
  const effVoie = attemptEfficiency(list, 'voie')
  const platVoie = plateau(list, 'voie', { today: ref })
  const platBloc = plateau(list, 'bloc', { today: ref })
  const warmups = warmupCheck(db, { days: 60, today: ref })
  const lieux = lieuSplit(list, 'voie')
  const prises = priseSplit(list)

  const tips = []
  if (!list.length) {
    tips.push('Aucune voie enregistrée. Noter chaque croix avec sa cotation et son style — à vue, flash ou après travail — permet de suivre un vrai niveau plutôt qu’un chiffre saisi de mémoire.')
  } else {
    if (fingers) for (const f of fingers.flags) tips.push(f.text)
    for (const p of [pyrVoie, pyrBloc]) if (p && !p.solid) tips.push(p.text)
    for (const g of [gapVoie, gapBloc]) if (g && g.level !== 'ok') tips.push(g.text)
    // Attaquer directement au maximum est la première cause de blessure
    // aux doigts : ce conseil passe devant les autres.
    if (warmups.length) tips.push(warmups[0].text)
    // Le niveau atteint par profil est plus actionnable que le simple
    // volume : il désigne la qualité en retard, pas seulement l'oubli.
    for (const g of [angleVoie, angleBloc]) if (g && g.lopsided) tips.push(g.text)
    if (angles && angles.lopsided && !(angleVoie && angleVoie.lopsided)) tips.push(angles.text)
    if (prises && prises.lopsided) tips.push(prises.text)
    const stale = openProjects.filter((p) => p.stale)
    if (stale.length) {
      const pj = stale[0]
      tips.push(`« ${pj.name} » (${pj.grade}) est ouvert depuis ${pj.ageDays} jours, ${pj.tries} essais, et tu n'y es pas retourné depuis ${pj.idleDays} jours. Le reprendre sérieusement ou le laisser vaut mieux que le garder en suspens.`)
    } else if (openProjects.length) {
      const pj = openProjects[0]
      tips.push(`${openProjects.length} projet${openProjects.length > 1 ? 's' : ''} en cours, dont « ${pj.name} » (${pj.grade}) à ${pj.tries} essais sur ${pj.sessions} séances.`)
    }
    for (const pl of [platVoie, platBloc]) if (pl) tips.push(pl.text)
    if (lieux && lieux.gap != null && lieux.gap >= 2) tips.push(lieux.text)
    if (effVoie && effVoie.level !== 'flat') tips.push(effVoie.text)
    for (const [p, lab] of [[progVoie, 'en voie'], [progBloc, 'en bloc']]) {
      if (p && p.months.length >= 3 && p.gain > 0) {
        tips.push(`Progression ${lab} : de ${p.first.grade} à ${p.last.grade} sur ${p.months.length} mois.`)
      }
    }
  }
  if (!tips.length) tips.push('Pratique équilibrée : pyramide solide, styles variés et charge des doigts maîtrisée.')

  return {
    ascents: list, stats, bestVoie, bestBloc, gapVoie, gapBloc, pyrVoie, pyrBloc,
    angles, angleVoie, angleBloc, fingers, progVoie, progBloc,
    projects: projs, openProjects, efficiency: effVoie,
    plateauVoie: platVoie, plateauBloc: platBloc, warmups, lieux, prises, tips,
  }
}
