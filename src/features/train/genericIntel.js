// ============================================================
// Analyse générique, pilotée par les déclarations de champs.
//
// Les trente-sept sports déclarent au total cent vingt et un champs
// distincts — buts, plaquages, touches, dénivelé, profondeur, score,
// puissance… — et une vingtaine seulement étaient relus. Écrire un module
// par discipline pour les cent restants aurait produit trente fichiers
// répétant la même chose.
//
// Ce module lit `SPORT_FIELDS` et en déduit quoi calculer : un champ
// numérique porte une direction — plus haut vaut mieux, ou plus bas — et
// devient donc un record ; une liste de choix devient une répartition ;
// une case à cocher devient une fréquence. Ajouter un sport ou un champ
// n'oblige alors à rien d'autre qu'à le déclarer.
//
// Repères descriptifs : ce module ne juge pas, il mesure.
// ============================================================

import { SPORT_FIELDS } from './plannerData'

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

// Les durées « mm:ss » et « h:mm:ss » se comparent en secondes ; sans
// cela, « 1:05 » passerait pour supérieur à « 58:00 » en comparaison de
// chaînes.
// `x || []` ne protège que de `null` et `undefined`. Une liste stockée en
// base peut revenir sous une autre forme — écriture partielle, donnée écrite
// par une version antérieure — et l'objet passe alors la garde pour faire
// échouer le `.filter` juste après. L'écran entier meurt, loin de sa cause.
function asList(v) {
  return Array.isArray(v) ? v.filter((x) => x != null) : []
}

export function toSeconds(t) {
  if (t == null || t === '') return null
  const parts = String(t).trim().split(':').map((x) => parseInt(x, 10))
  if (!parts.length || parts.some((x) => !Number.isFinite(x) || x < 0)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

export function fieldValue(field, raw) {
  if (raw === null || raw === undefined || raw === '') return null
  if (field.t === 'time') return toSeconds(raw)
  if (field.t === 'num') return num(raw)
  return null
}

export function fmtValue(field, v) {
  if (v == null) return null
  // Les enregistrements produits par `fieldRecords` portent `type`, les
  // champs bruts de SPORT_FIELDS portent `t`. Seuls les premiers sont
  // passés ici en pratique : la mise en forme des temps ne s'appliquait
  // donc jamais, et un 40 min s'affichait « 2400 ».
  if ((field.type || field.t) === 'time') {
    const h = Math.floor(v / 3600)
    const m = Math.floor((v % 3600) / 60)
    const s = Math.round(v % 60)
    const p = (n) => (n < 10 ? '0' + n : '' + n)
    return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`
  }
  return String(Math.round(v * 100) / 100).replace('.', ',')
}

// Libellé court, sans l'unité entre parenthèses que porte le champ de
// saisie : « Buts marqués » plutôt que « Buts marqués (0) ».
// Le libellé porte son unité entre parenthèses — « Distance (km) ». On la
// récupère pour l'afficher à côté du chiffre : sans elle, un record se lit
// « Distance 60 », qui ne veut rien dire. Toutes les parenthèses ne sont
// pas des unités : « (RPE 1-10) », « (mm:ss) » ou « (optionnel) » précisent
// une saisie, pas une grandeur, d'où une liste explicite.
const UNITS = new Set(['m', 'cm', 'km', 'kg', 's', 'min', 'W', 'bpm', 'km/h', 'pas/min', 'tr/min', 'coups/min', '°C', 'milles', 'foulées'])

export function unitOf(field) {
  const m = /\(([^)]*)\)\s*$/.exec(String(field.lab || ''))
  if (!m) return null
  const u = m[1].trim()
  return UNITS.has(u) ? u : null
}

export function shortLabel(field) {
  return String(field.lab || '').replace(/\s*\([^)]*\)\s*$/, '').trim()
}

export function sessionsOfSport(db, sport, { days = 730, today } = {}) {
  const ref = today || todayISO()
  const from = shiftISO(ref, -(days - 1))
  return (asList(db && db.planningSessions))
    .filter((s) => s && s.sport === sport && s.statut === 'realise' && s.date && s.date >= from && s.date <= ref)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function practisedSports(db, opts) {
  const ids = new Set()
  for (const s of asList(db && db.planningSessions)) {
    if (s && s.statut === 'realise' && s.sport && SPORT_FIELDS[s.sport]) ids.add(s.sport)
  }
  return [...ids].filter((id) => sessionsOfSport(db, id, opts).length > 0)
}

// ─── Records sur les champs numériques ───────────────────────
// Seuls les champs portant une direction produisent un record : compter
// un « meilleur poids de sac » ou une « meilleure température d'eau »
// n'aurait aucun sens, et ces champs sont déclarés sans direction.
export function fieldRecords(db, sport, { days = 730, today } = {}) {
  const cfg = SPORT_FIELDS[sport]
  if (!cfg) return []
  const sessions = sessionsOfSport(db, sport, { days, today })
  if (!sessions.length) return []
  const out = []
  for (const f of cfg.fields) {
    if (!f.dir || (f.t !== 'num' && f.t !== 'time')) continue
    const points = []
    for (const s of sessions) {
      const v = fieldValue(f, s.data && s.data[f.k])
      if (v == null || v < 0) continue
      // Zéro n'a pas le même sens selon la grandeur. Un match à zéro but
      // est une information, et l'exclure faussait aussi bien le compte
      // que la progression. Un temps, un score ou un nombre de putts à
      // zéro, en revanche, ne décrit aucune performance : sur un champ où
      // plus bas vaut mieux, il deviendrait un record imbattable.
      if (v === 0 && f.dir === 'down') continue
      points.push({ date: s.date, value: v })
    }
    if (!points.length) continue
    const better = (a, b) => (f.dir === 'up' ? a.value > b.value : a.value < b.value)
    const best = points.reduce((m, p) => (better(p, m) ? p : m), points[0])
    const last = points[points.length - 1]
    const first = points[0]
    out.push({
      key: f.k, label: shortLabel(f), unit: unitOf(f), dir: f.dir, type: f.t,
      best, last, first, count: points.length, points,
      isRecent: best.date === last.date && points.length > 1,
      progress: points.length > 1 ? (f.dir === 'up' ? last.value - first.value : first.value - last.value) : null,
    })
  }
  return out.sort((a, b) => b.count - a.count)
}

// ─── Répartition des choix ───────────────────────────────────
// Les listes déroulantes et les cases multiples décrivent un contexte —
// poste, surface, discipline, terrain. Leur répartition dit ce qu'on
// pratique réellement, et surtout ce qu'on ne pratique jamais.
export const DOMINANT_PCT = 70

export function fieldSplits(db, sport, { days = 730, today, minCount = 4 } = {}) {
  const cfg = SPORT_FIELDS[sport]
  if (!cfg) return []
  const sessions = sessionsOfSport(db, sport, { days, today })
  const out = []
  for (const f of cfg.fields) {
    if (f.t !== 'select1' && f.t !== 'pills') continue
    const counts = {}
    let total = 0
    for (const s of sessions) {
      const raw = s.data && s.data[f.k]
      const vals = f.t === 'pills' ? (Array.isArray(raw) ? raw : []) : (raw ? [raw] : [])
      for (const v of vals) { counts[v] = (counts[v] || 0) + 1; total++ }
    }
    if (total < minCount) continue
    const items = Object.keys(counts)
      .map((v) => ({ value: v, count: counts[v], pct: Math.round(counts[v] / total * 100) }))
      .sort((a, b) => b.count - a.count)
    const never = (f.opts || []).filter((o) => !counts[o])
    out.push({
      key: f.k, label: shortLabel(f), type: f.t, items, never, total,
      dominant: items[0], lopsided: items[0].pct >= DOMINANT_PCT && (f.opts || []).length > 1,
    })
  }
  return out
}

// ─── Fréquence des cases à cocher ────────────────────────────
// Une case cochée décrit un événement — une chute, un palier, un
// chavirage. Sa fréquence est la seule lecture qui vaille : une chute
// isolée n'est rien, une chute une séance sur deux est un signal.
export const FREQUENT_PCT = 40

export function fieldFlags(db, sport, { days = 730, today, minSessions = 4 } = {}) {
  const cfg = SPORT_FIELDS[sport]
  if (!cfg) return []
  const sessions = sessionsOfSport(db, sport, { days, today })
  if (sessions.length < minSessions) return []
  const out = []
  for (const f of cfg.fields) {
    if (f.t !== 'bool') continue
    // Une case jamais renseignée n'est pas une case à « non » : on ne
    // compte que les séances où la question a reçu une réponse.
    const answered = sessions.filter((s) => s.data && typeof s.data[f.k] === 'boolean')
    if (answered.length < minSessions) continue
    const yes = answered.filter((s) => s.data[f.k] === true).length
    const pct = Math.round(yes / answered.length * 100)
    out.push({
      key: f.k, label: shortLabel(f), yes, answered: answered.length, pct,
      frequent: pct >= FREQUENT_PCT,
    })
  }
  return out
}


// ─── Valeurs libres qui se répètent ──────────────────────────
// Un spot de surf, un cheval, une paire de chaussures, un nom de WOD :
// ces champs sont libres, donc jamais comparables entre eux — sauf quand
// la même valeur revient. Sa fréquence dit alors quelque chose que rien
// d'autre ne dit : le lieu habituel, la monture préférée, la paire qui
// sert le plus. Une valeur unique n'apprend rien et n'est pas retenue.
export const TEXT_MIN_REPEAT = 2

// « 1h30 », « 45min », « 3h20 », « 12 », « 2:30 » : des quantités écrites
// à la main, qu'aucun regroupement par fréquence n'éclaire.
const QUANTITY_LIKE = /^\d+\s*(h|min|m|s|:)?\s*\d*\s*(h|min|m|s)?$/

export function fieldTexts(db, sport, { days = 730, today, minRepeat = TEXT_MIN_REPEAT } = {}) {
  const cfg = SPORT_FIELDS[sport]
  if (!cfg) return []
  const sessions = sessionsOfSport(db, sport, { days, today })
  const out = []
  for (const f of cfg.fields) {
    if (f.t !== 'text') continue
    const counts = {}
    let total = 0
    let quantities = 0
    for (const s of sessions) {
      const raw = s.data && s.data[f.k]
      if (typeof raw !== 'string') continue
      // On regroupe sans tenir compte de la casse ni des espaces, tout en
      // gardant la première orthographe saisie pour l'affichage.
      const key = raw.trim().toLowerCase()
      if (!key) continue
      if (!counts[key]) counts[key] = { label: raw.trim(), count: 0 }
      counts[key].count++
      total++
      if (QUANTITY_LIKE.test(key)) quantities++
    }
    // Plusieurs champs libres portent en réalité une durée ou un nombre —
    // « 1h30 », « 45min ». Dire que « 1h30 revient quatre fois » est du
    // bruit : ce sont des quantités, pas des étiquettes. On les écarte à
    // la forme de leurs valeurs plutôt qu'à leur nom, pour que la règle
    // tienne aussi pour les champs à venir.
    if (total && quantities / total > 0.5) continue
    const items = Object.values(counts).filter((x) => x.count >= minRepeat).sort((a, b) => b.count - a.count)
    if (!items.length) continue
    out.push({ key: f.k, label: shortLabel(f), items, total, distinct: Object.keys(counts).length, top: items[0] })
  }
  return out
}

// ─── Synthèse par sport ──────────────────────────────────────
export function sportAnalysis(db, sport, opts = {}) {
  const cfg = SPORT_FIELDS[sport]
  if (!cfg) return null
  const sessions = sessionsOfSport(db, sport, opts)
  if (!sessions.length) return null
  const records = fieldRecords(db, sport, opts)
  const splits = fieldSplits(db, sport, opts)
  const flags = fieldFlags(db, sport, opts)
  const texts = fieldTexts(db, sport, opts)

  const tips = []
  // Un record battu à la dernière séance mérite d'être dit : c'est
  // l'information que la personne cherche en ouvrant l'application.
  const fresh = records.filter((r) => r.isRecent)
  if (fresh.length) {
    const r = fresh[0]
    tips.push(`${cfg.label} : ${r.label.toLowerCase()} à ${fmtValue(r, r.best.value)} lors de ta dernière séance — c'est ton meilleur résultat sur cette donnée.`)
  }
  for (const sp of splits) {
    if (!sp.lopsided) continue
    tips.push(`${cfg.label} — ${sp.label.toLowerCase()} : ${sp.dominant.pct} % de « ${sp.dominant.value} »${sp.never.length ? `, et jamais ${sp.never.map((n) => `« ${n} »`).join(' ni ')}` : ''}.`)
  }
  for (const fl of flags) {
    if (!fl.frequent) continue
    tips.push(`${cfg.label} — ${fl.label.toLowerCase()} sur ${fl.yes} séances des ${fl.answered} renseignées (${fl.pct} %).`)
  }
  for (const tx of texts) {
    if (tx.top.count < 3 || tx.distinct < 2) continue
    tips.push(`${cfg.label} — ${tx.label.toLowerCase()} : « ${tx.top.label} » revient ${tx.top.count} fois sur ${tx.total} séances renseignées.`)
  }
  return { sport, label: cfg.label, icon: cfg.icon, sessions: sessions.length, records, splits, flags, texts, tips }
}

export function genericAnalysis(db, opts = {}) {
  const sports = practisedSports(db, opts)
  const bySport = sports.map((id) => sportAnalysis(db, id, opts)).filter(Boolean)
  const tips = []
  for (const s of bySport) for (const t of s.tips) tips.push(t)
  return { bySport, tips }
}
