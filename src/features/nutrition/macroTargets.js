// ============================================================
// Objectifs de macronutriments.
//
// L'écran laissait saisir quatre nombres sans jamais les confronter :
// deux mille kilocalories avec deux cents grammes de protéines, trois
// cents de glucides et cent de lipides font deux mille neuf cents, et
// rien ne le disait. On suivait donc un objectif qui se contredisait
// lui-même, et l'écart apparaissait plus tard sous forme d'un « écart
// calorique » attribué à une saisie incomplète.
//
// Trois façons d'exprimer la même chose selon ce qu'on a en tête :
// en grammes, en grammes par kilo de poids de corps — comme on lit les
// recommandations — ou en pourcentage des calories. Les trois sont
// converties vers la même structure, et la cohérence est vérifiée.
//
// Le module ne calcule que des nombres : il se vérifie sans écran.
// ============================================================

export const KCAL = { prot: 4, gluc: 4, lip: 9, alc: 7 }

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const r1 = (v) => Math.round(v * 10) / 10

export function kcalFromMacros({ prot, gluc, lip }) {
  return (num(prot) || 0) * KCAL.prot + (num(gluc) || 0) * KCAL.gluc + (num(lip) || 0) * KCAL.lip
}

// L'écart toléré. Un pour cent, c'est le bruit d'arrondi sur des grammes
// entiers ; au-delà de trois, les deux chiffres ne décrivent plus le même
// régime et il faut choisir lequel fait foi.
export const GAP_OK = 1
export const GAP_WARN = 3

export function coherence(t) {
  const declared = num(t && t.kcal)
  if (declared == null || declared <= 0) return null
  const derived = kcalFromMacros(t || {})
  const diff = derived - declared
  const pct = r1(diff / declared * 100)
  const abs = Math.abs(pct)
  const level = abs <= GAP_OK ? 'ok' : abs <= GAP_WARN ? 'warn' : 'alert'
  return {
    declared: Math.round(declared), derived: Math.round(derived),
    diff: Math.round(diff), pct, level,
    text: level === 'ok'
      ? 'Les macros correspondent aux calories visées.'
      : `Les macros pèsent ${Math.round(derived)} kcal alors que l'objectif en annonce ${Math.round(declared)} — ${diff > 0 ? '+' : ''}${Math.round(diff)} kcal d'écart.`,
  }
}

// ─── Les trois façons de saisir ─────────────────────────────

// Depuis des grammes par kilo. C'est ainsi que se lisent les
// recommandations : 1,6 g/kg de protéines veut dire quelque chose, 112 g
// ne veut rien dire sans le poids qui va avec.
export function fromPerKg({ kcal, weightKg, protPerKg, lipPerKg }) {
  const w = num(weightKg)
  const kc = num(kcal)
  if (!w || w <= 0 || !kc || kc <= 0) return null
  const prot = Math.round(w * (num(protPerKg) || 0))
  const lip = Math.round(w * (num(lipPerKg) || 0))
  // Les glucides prennent ce qui reste : c'est le macronutriment dont le
  // besoin est le plus élastique, et le seul qu'on puisse ajuster sans
  // toucher aux deux autres.
  const gluc = Math.max(0, Math.round((kc - prot * KCAL.prot - lip * KCAL.lip) / KCAL.gluc))
  return { kcal: Math.round(kc), prot, gluc, lip }
}

// Depuis des pourcentages de calories.
export function fromPercent({ kcal, protPct, glucPct, lipPct }) {
  const kc = num(kcal)
  if (!kc || kc <= 0) return null
  const p = num(protPct) || 0
  const g = num(glucPct) || 0
  const l = num(lipPct) || 0
  return {
    kcal: Math.round(kc),
    prot: Math.round(kc * p / 100 / KCAL.prot),
    gluc: Math.round(kc * g / 100 / KCAL.gluc),
    lip: Math.round(kc * l / 100 / KCAL.lip),
  }
}

// La lecture inverse : ce que valent des grammes, exprimés dans les deux
// autres unités. C'est ce qui permet de saisir dans une unité et de
// vérifier dans une autre.
export function views(t, weightKg) {
  const kc = kcalFromMacros(t || {}) || num(t && t.kcal) || 0
  const w = num(weightKg)
  const pct = (g, per) => (kc > 0 ? r1((num(g) || 0) * per / kc * 100) : null)
  const perKg = (g) => (w && w > 0 ? Math.round((num(g) || 0) / w * 100) / 100 : null)
  return {
    prot: { g: num(t && t.prot) || 0, pct: pct(t && t.prot, KCAL.prot), perKg: perKg(t && t.prot) },
    gluc: { g: num(t && t.gluc) || 0, pct: pct(t && t.gluc, KCAL.gluc), perKg: perKg(t && t.gluc) },
    lip: { g: num(t && t.lip) || 0, pct: pct(t && t.lip, KCAL.lip), perKg: perKg(t && t.lip) },
  }
}

// ─── Repères ────────────────────────────────────────────────
// Bornes usuelles, pour signaler ce qui sort de l'ordinaire sans
// l'interdire : un régime très pauvre en glucides est un choix, pas une
// erreur de saisie, mais il mérite d'être vu.
export const PER_KG = {
  prot: { min: 1.2, max: 2.5, label: 'Protéines' },
  lip: { min: 0.6, max: 1.5, label: 'Lipides' },
  gluc: { min: 2, max: 10, label: 'Glucides' },
}

export function outOfRange(t, weightKg) {
  const w = num(weightKg)
  if (!w || w <= 0) return []
  const out = []
  for (const k of ['prot', 'lip', 'gluc']) {
    const v = (num(t && t[k]) || 0) / w
    const b = PER_KG[k]
    if (v < b.min) out.push({ key: k, label: b.label, perKg: Math.round(v * 100) / 100, side: 'low', min: b.min, max: b.max })
    else if (v > b.max) out.push({ key: k, label: b.label, perKg: Math.round(v * 100) / 100, side: 'high', min: b.min, max: b.max })
  }
  return out
}

// ─── Dépense estimée ────────────────────────────────────────
// Mifflin-St Jeor, puis facteur d'activité. C'est une estimation à ±10 %
// selon les individus : elle sert de point de départ, pas de vérité.
export const ACTIVITY = [
  { id: 'sedentaire', label: 'Sédentaire', factor: 1.2, hint: 'Bureau, peu de marche' },
  { id: 'leger', label: 'Léger', factor: 1.375, hint: '1 à 3 séances par semaine' },
  { id: 'modere', label: 'Modéré', factor: 1.55, hint: '3 à 5 séances par semaine' },
  { id: 'intense', label: 'Intense', factor: 1.725, hint: '6 à 7 séances par semaine' },
  { id: 'athlete', label: 'Très intense', factor: 1.9, hint: 'Deux séances par jour' },
]

export const GOALS = [
  { id: 'perte', label: 'Perte de gras', kcalFactor: 0.85, protPerKg: 2.2, lipPerKg: 0.8 },
  { id: 'maintien', label: 'Maintien', kcalFactor: 1, protPerKg: 1.6, lipPerKg: 1 },
  { id: 'muscle', label: 'Prise de muscle', kcalFactor: 1.1, protPerKg: 1.8, lipPerKg: 1 },
  { id: 'endurance', label: 'Endurance', kcalFactor: 1.02, protPerKg: 1.5, lipPerKg: 0.9 },
]

export function bmr({ weightKg, heightCm, age, sexe }) {
  const w = num(weightKg)
  const h = num(heightCm)
  const a = num(age)
  if (!w || !h || !a) return null
  return Math.round(10 * w + 6.25 * h - 5 * a + (sexe === 'f' ? -161 : 5))
}

export function tdee(body, activityId) {
  const b = bmr(body)
  if (b == null) return null
  const act = ACTIVITY.find((x) => x.id === activityId) || ACTIVITY.find((x) => x.id === 'modere')
  return Math.round(b * act.factor)
}

export function suggest(body, { activity, goal } = {}) {
  const base = tdee(body, activity)
  if (base == null) return null
  const g = GOALS.find((x) => x.id === goal) || GOALS.find((x) => x.id === 'maintien')
  const kcal = Math.round(base * g.kcalFactor)
  const t = fromPerKg({ kcal, weightKg: body.weightKg, protPerKg: g.protPerKg, lipPerKg: g.lipPerKg })
  return t ? { ...t, fib: Math.round(kcal / 1000 * 14), base, goal: g.id } : null
}

// ─── Jour d'entraînement, jour de repos ─────────────────────
// Un même chiffre pour tous les jours est le principal défaut de
// précision : le besoin en glucides d'un jour de sortie longue n'a rien à
// voir avec celui d'un jour sans séance. Les protéines et les lipides ne
// bougent pas — c'est l'apport glucidique qui suit la charge.
export const DAY_TYPES = [
  { id: 'repos', label: 'Repos', glucFactor: 0.75 },
  { id: 'normal', label: 'Jour ordinaire', glucFactor: 1 },
  { id: 'gros', label: 'Grosse séance', glucFactor: 1.35 },
]

export function forDay(t, dayTypeId) {
  if (!t) return null
  const d = DAY_TYPES.find((x) => x.id === dayTypeId) || DAY_TYPES.find((x) => x.id === 'normal')
  const gluc = Math.round((num(t.gluc) || 0) * d.glucFactor)
  const prot = num(t.prot) || 0
  const lip = num(t.lip) || 0
  return {
    ...t, dayType: d.id, gluc,
    kcal: Math.round(prot * KCAL.prot + gluc * KCAL.gluc + lip * KCAL.lip),
  }
}

// Structure enregistrée : les trois jours d'un coup, pour que l'objectif
// affiché suive la séance du jour sans ressaisie.
export function buildPlan(t, weightKg) {
  if (!t) return null
  const days = {}
  for (const d of DAY_TYPES) days[d.id] = forDay(t, d.id)
  return {
    ...t,
    days,
    coherence: coherence(t),
    views: views(t, weightKg),
    warnings: outOfRange(t, weightKg),
  }
}

// ─── L'objectif du jour ─────────────────────────────────────
//
// Enregistrer trois variantes ne sert à rien si l'écran en montre toujours
// une seule. Le type de jour se déduit de ce qui est prévu ou fait : une
// grosse séance déplace l'apport glucidique, un jour sans séance le réduit.
// C'est là que l'objectif cesse d'être une moyenne pour devenir précis.

export const BIG_DAY_MINS = 90
export const BIG_DAY_LOAD = 100

function minutesOf(duree) {
  const s = String(duree || '')
  let m = /^(\d+)\s*h\s*(\d+)?/i.exec(s)
  if (m) return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0)
  m = /^(\d+)\s*min/i.exec(s)
  if (m) return Number(m[1])
  return 0
}

export function dayTypeFor(db, iso) {
  const sessions = Array.isArray(db && db.planningSessions) ? db.planningSessions : []
  let mins = 0
  let load = 0
  for (const s of sessions) {
    if (!s || s.date !== iso) continue
    if (s.statut !== 'realise' && s.statut !== 'planifie') continue
    const m = minutesOf(s.duree)
    mins += m
    const rpe = num(s.data && s.data.rpe)
    load += m * (rpe && rpe > 0 ? rpe / 5 : 1)
  }
  if (mins === 0) return 'repos'
  if (mins >= BIG_DAY_MINS || load >= BIG_DAY_LOAD) return 'gros'
  return 'normal'
}

// L'objectif effectif d'une date. Sans variantes enregistrées, l'objectif
// général sert tel quel : on ne fabrique pas une modulation que
// l'utilisateur n'a pas demandée.
export function targetForDate(db, iso) {
  const t = db && db.foodTargets
  if (!t) return null
  const type = dayTypeFor(db, iso)
  const days = t.days
  if (days && days[type]) return { ...days[type], dayType: type, modulated: true }
  return { ...t, dayType: type, modulated: false }
}
