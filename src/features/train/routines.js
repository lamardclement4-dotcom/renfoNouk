// ============================================================
// Routines de mobilité et de pliométrie.
//
// L'application proposait des séances toutes faites et un programme
// correctif généré à partir du test de mobilité. Rien ne permettait de se
// composer sa propre routine — celle de dix minutes qu'on refait trois
// fois par semaine et qu'on connaît par cœur.
//
// Une routine a exactement la forme d'une séance du catalogue : une liste
// de mouvements, un nombre de tours, un temps de récupération. Elle est
// donc jouable par le lecteur existant sans rien y changer, et se retrouve
// à l'accueil au même titre qu'une séance planifiée.
//
// Les jours retenus font la différence avec une simple liste : une routine
// sans jour ne se rappelle à personne.
// ============================================================

import { EX, sessionDuration } from './trainData'

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const asList = (v) => (Array.isArray(v) ? v.filter((x) => x != null) : [])

export const ROUTINE_KINDS = [
  { id: 'mobilite', label: 'Mobilité', cats: ['mobilite'], icon: 'target', defaultSets: 1, defaultRest: 10 },
  { id: 'pliometrie', label: 'Pliométrie', cats: ['plyo'], icon: 'bolt', defaultSets: 3, defaultRest: 45 },
]

export const DOW_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
export const DOW_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function kindOf(id) {
  return ROUTINE_KINDS.find((k) => k.id === id) || ROUTINE_KINDS[0]
}

// Les mouvements disponibles pour un type de routine, tirés du catalogue
// existant : on ne redéclare pas deux cent soixante-huit mouvements pour
// pouvoir les assembler autrement.
export function movementsFor(kindId) {
  const k = kindOf(kindId)
  return Object.entries(EX)
    .filter(([key, m]) => m && !m.isRest && k.cats.includes(m.cat) && key !== 'rest')
    .map(([key, m]) => ({ key, name: m.name, type: m.type, secs: m.secs || null, reps: m.reps || null, cue: m.cue || null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

// Le jour de la semaine, lundi en tête, calculé en UTC : construire la date
// en heure locale décale d'un jour à l'est de Greenwich, et une routine du
// lundi apparaîtrait le dimanche.
export function dowOf(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number)
  if (!y) return null
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

function todayISO() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

export const MAX_MOVES = 20

export function makeRoutine({ kind, name, keys, sets, restSecs, dows, id } = {}) {
  const k = kindOf(kind)
  const clean = asList(keys).filter((key) => EX[key] && !EX[key].isRest).slice(0, MAX_MOVES)
  return {
    id: id || 'rt_' + Date.now().toString(36),
    custom: true,
    kind: k.id,
    cat: k.cats[0],
    name: String(name || '').trim() || `Routine ${k.label.toLowerCase()}`,
    keys: clean,
    sets: Math.max(1, Math.min(10, num(sets) || k.defaultSets)),
    restSecs: Math.max(0, Math.min(180, num(restSecs) != null ? num(restSecs) : k.defaultRest)),
    // Les jours retenus : sans eux, une routine ne se rappelle à personne.
    dows: asList(dows).map((d) => num(d)).filter((d) => d != null && d >= 0 && d <= 6),
    createdAt: todayISO(),
  }
}

export function routineValid(r) {
  return !!(r && r.name && Array.isArray(r.keys) && r.keys.length > 0)
}

// La durée estimée passe par le calcul du catalogue : une routine étant une
// séance, elle se mesure comme une séance.
export function routineMins(r) {
  if (!routineValid(r)) return 0
  try {
    return sessionDuration({ keys: r.keys, sets: r.sets, restSecs: r.restSecs, cat: r.cat })
  } catch {
    return Math.max(1, r.keys.length * r.sets)
  }
}

export function routineList(db) {
  return asList(db && db.routines).filter(routineValid)
}

export function lastDone(db, id) {
  const log = (db && db.routineLog) || {}
  const dates = Object.keys(log).filter((d) => asList(log[d]).includes(id)).sort()
  return dates.length ? dates[dates.length - 1] : null
}

export function daysSince(iso, ref) {
  if (!iso) return null
  const [ay, am, ad] = String(iso).split('-').map(Number)
  const [by, bm, bd] = String(ref).split('-').map(Number)
  if (!ay || !by) return null
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}

// Ce que l'accueil doit montrer : les routines du jour, celles déjà faites
// distinguées de celles qui restent. Une routine sans jour retenu n'est
// jamais « du jour » — elle reste disponible, sans se rappeler.
export function routinesToday(db, { today } = {}) {
  const ref = today || todayISO()
  const dow = dowOf(ref)
  const doneToday = asList((db && db.routineLog && db.routineLog[ref]) || [])
  return routineList(db)
    .filter((r) => asList(r.dows).includes(dow))
    .map((r) => {
      const last = lastDone(db, r.id)
      return {
        ...r,
        mins: routineMins(r),
        done: doneToday.includes(r.id),
        lastDone: last,
        daysSince: last ? daysSince(last, ref) : null,
      }
    })
}

export function routinesDue(db, opts) {
  return routinesToday(db, opts).filter((r) => !r.done)
}

// Enregistrer une routine faite. Le journal est daté, comme les autres :
// c'est ce qui permet de dire « trois fois cette semaine » plutôt que
// « déjà faite ».
export function markDone(db, id, { today } = {}) {
  const ref = today || todayISO()
  const log = { ...((db && db.routineLog) || {}) }
  const day = asList(log[ref])
  if (!day.includes(id)) log[ref] = [...day, id]
  return { routineLog: log }
}

export function unmarkDone(db, id, { today } = {}) {
  const ref = today || todayISO()
  const log = { ...((db && db.routineLog) || {}) }
  log[ref] = asList(log[ref]).filter((x) => x !== id)
  if (!log[ref].length) delete log[ref]
  return { routineLog: log }
}

// Combien de fois chaque routine a été faite sur une fenêtre : c'est
// l'observance, et elle vaut mieux qu'une intention.
export function routineStreak(db, id, { today, days = 28 } = {}) {
  const ref = today || todayISO()
  const log = (db && db.routineLog) || {}
  let count = 0
  const [y, m, d] = String(ref).split('-').map(Number)
  for (let i = 0; i < days; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() - i)
    const iso = dt.toISOString().slice(0, 10)
    if (asList(log[iso]).includes(id)) count++
  }
  return { count, days, perWeek: Math.round(count / days * 7 * 10) / 10 }
}
