// ============================================================
// Import de l'export Apple Santé.
//
// Sur iPhone, aucune connexion directe n'est possible : Safari n'a pas le
// Web Bluetooth et Apple a annoncé qu'il ne l'aurait pas, et les API des
// fabricants — Fitbit, Garmin, Polar, Withings — exigent soit un secret
// client, soit un serveur intermédiaire faute de CORS. L'application est
// un site statique : elle n'a ni l'un ni l'autre.
//
// Reste une voie, et elle est meilleure qu'il n'y paraît : presque tous
// les bracelets déversent leurs données dans Apple Santé, qui sait tout
// exporter. Un seul importateur couvre donc n'importe quelle marque, sans
// dépendre d'un accès qui peut fermer.
//
// L'export est un fichier XML qui pèse couramment plusieurs centaines de
// mégaoctets — des années de mesures à la minute. Le charger d'un bloc
// ferait tomber l'onglet. Il est donc lu ligne par ligne et agrégé au
// passage : la mémoire reste bornée quelle que soit la taille.
// ============================================================

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Les dates de l'export portent leur décalage : « 2026-01-05 07:12:00 +0100 ».
// Les dix premiers caractères sont donc déjà le jour local, sans conversion —
// et c'est ce qu'on veut : convertir en UTC déplacerait une nuit d'un jour.
export function dayOf(stamp) {
  const s = String(stamp || '')
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null
}

export function msOf(stamp) {
  const s = String(stamp || '')
  // « 2026-01-05 07:12:00 +0100 » n'est pas un format que Date sait lire
  // partout : on le normalise en ISO.
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}):?(\d{2})?$/.exec(s.trim())
  if (m) return Date.parse(`${m[1]}T${m[2]}${m[3]}:${m[4] || '00'}`)
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}

const attr = (line, name) => {
  const m = new RegExp(name + '="([^"]*)"').exec(line)
  return m ? m[1] : null
}

// ─── Types retenus ──────────────────────────────────────────
export const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis'
export const STEPS_TYPE = 'HKQuantityTypeIdentifierStepCount'
export const RESTING_HR_TYPE = 'HKQuantityTypeIdentifierRestingHeartRate'
export const HRV_TYPE = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'

// Les séances Apple portent un type long ; on ne garde que le suffixe.
export const WORKOUT_SPORTS = [
  [/TrailRunning/i, 'trail'],
  [/Running/i, 'course'],
  [/Walking|Hiking/i, 'marche'],
  [/Cycling|Biking/i, 'velo'],
  [/Swimming/i, 'natation'],
  [/Rowing|Paddle/i, 'aviron'],
  [/Climbing/i, 'escalade'],
  [/TraditionalStrengthTraining|FunctionalStrengthTraining/i, 'muscu'],
  [/Yoga|Pilates/i, 'yoga'],
  [/Soccer/i, 'football'],
  [/Basketball|Volleyball|Handball/i, 'basket'],
  [/Tennis|Badminton|Squash/i, 'raquette'],
  [/Snowboarding|DownhillSkiing|CrossCountrySkiing/i, 'ski'],
  [/Boxing|MartialArts|Wrestling/i, 'combat'],
  [/Dance/i, 'danse'],
  [/Golf/i, 'golf'],
  [/Equestrian/i, 'equitation'],
  [/CrossTraining|HighIntensityIntervalTraining/i, 'crossfit'],
]

export function sportOfWorkout(type) {
  const t = String(type || '')
  for (const [re, id] of WORKOUT_SPORTS) if (re.test(t)) return id
  return null
}

// ─── Lecture d'une ligne ────────────────────────────────────

export function parseLine(line) {
  const l = String(line || '')
  if (l.indexOf('<Record') !== -1) {
    const type = attr(l, 'type')
    if (!type) return null
    return {
      kind: 'record', type,
      start: attr(l, 'startDate'), end: attr(l, 'endDate'),
      value: attr(l, 'value'), unit: attr(l, 'unit'),
      source: attr(l, 'sourceName'),
    }
  }
  if (l.indexOf('<Workout') !== -1) {
    const type = attr(l, 'workoutActivityType')
    if (!type) return null
    return {
      kind: 'workout', type,
      start: attr(l, 'startDate'), end: attr(l, 'endDate'),
      duration: num(attr(l, 'duration')), durationUnit: attr(l, 'durationUnit'),
      distance: num(attr(l, 'totalDistance')), distanceUnit: attr(l, 'totalDistanceUnit'),
      energy: num(attr(l, 'totalEnergyBurned')),
      source: attr(l, 'sourceName'),
    }
  }
  return null
}

// ─── Sommeil ────────────────────────────────────────────────
// Deux pièges. Les segments se recouvrent quand plusieurs sources écrivent
// la même nuit — montre et téléphone — et les additionner donnerait des
// nuits de quatorze heures : ils sont donc fusionnés. Et « au lit » n'est
// pas « endormi » : compter le temps au lit surestime le sommeil d'une
// demi-heure ou plus. On ne retient « au lit » que faute de mieux, pour
// les exports anciens qui ne distinguaient pas.
export const ASLEEP = /Asleep/i
export const IN_BED = /InBed/i

export function mergeIntervals(list) {
  const sorted = list.filter((x) => x && x.a != null && x.b != null && x.b > x.a).sort((x, y) => x.a - y.a)
  const out = []
  for (const it of sorted) {
    const last = out[out.length - 1]
    if (last && it.a <= last.b) last.b = Math.max(last.b, it.b)
    else out.push({ a: it.a, b: it.b })
  }
  return out
}

export function totalHours(intervals) {
  const ms = mergeIntervals(intervals).reduce((a, i) => a + (i.b - i.a), 0)
  return Math.round(ms / 3600000 * 10) / 10
}

// ─── Agrégation en flux ─────────────────────────────────────

export function createHealthReader() {
  const sleepAsleep = new Map()   // jour de réveil -> intervalles
  const sleepInBed = new Map()
  const steps = new Map()
  const restingHr = new Map()
  const hrv = new Map()
  const workouts = []
  let seen = 0

  const push = (map, key, v) => {
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(v)
  }

  function line(raw) {
    const r = parseLine(raw)
    if (!r) return
    seen++
    if (r.kind === 'workout') {
      const day = dayOf(r.start)
      if (!day) return
      let km = r.distance
      if (km != null && /^m$/i.test(r.distanceUnit || '')) km = km / 1000
      let secs = r.duration
      if (secs != null) {
        const u = String(r.durationUnit || 'min').toLowerCase()
        secs = u === 'min' ? secs * 60 : u === 'h' ? secs * 3600 : secs
      }
      workouts.push({
        date: day, time: String(r.start || '').slice(11, 16),
        sport: sportOfWorkout(r.type), appleType: r.type,
        km: km == null ? null : Math.round(km * 100) / 100,
        seconds: secs == null ? null : Math.round(secs),
        calories: r.energy == null ? null : Math.round(r.energy),
        source: r.source,
      })
      return
    }
    if (r.type === SLEEP_TYPE) {
      const a = msOf(r.start)
      const b = msOf(r.end)
      // La nuit est attribuée au jour du réveil : c'est ainsi qu'on la
      // note soi-même, et c'est ce qu'attend le journal de sommeil.
      const day = dayOf(r.end)
      if (a == null || b == null || !day) return
      if (ASLEEP.test(r.value || '')) push(sleepAsleep, day, { a, b })
      else if (IN_BED.test(r.value || '')) push(sleepInBed, day, { a, b })
      return
    }
    if (r.type === STEPS_TYPE) {
      const day = dayOf(r.start)
      const v = num(r.value)
      if (day && v != null) push(steps, day, v)
      return
    }
    if (r.type === RESTING_HR_TYPE) {
      const day = dayOf(r.start)
      const v = num(r.value)
      if (day && v != null) push(restingHr, day, v)
      return
    }
    if (r.type === HRV_TYPE) {
      const day = dayOf(r.start)
      const v = num(r.value)
      if (day && v != null) push(hrv, day, v)
    }
  }

  function result() {
    const sleep = {}
    const days = new Set([...sleepAsleep.keys(), ...sleepInBed.keys()])
    for (const d of days) {
      const asleep = sleepAsleep.get(d)
      const hours = asleep && asleep.length ? totalHours(asleep) : totalHours(sleepInBed.get(d) || [])
      if (hours > 0) sleep[d] = { hours, fromInBed: !(asleep && asleep.length) }
    }
    const avg = (m) => {
      const out = {}
      for (const [d, list] of m) out[d] = Math.round(list.reduce((a, b) => a + b, 0) / list.length)
      return out
    }
    const sum = (m) => {
      const out = {}
      for (const [d, list] of m) out[d] = Math.round(list.reduce((a, b) => a + b, 0))
      return out
    }
    return {
      sleep, steps: sum(steps), restingHr: avg(restingHr), hrv: avg(hrv),
      workouts: workouts.sort((a, b) => a.date.localeCompare(b.date)),
      seen,
    }
  }

  return { line, result }
}

// Découpe un flux de texte en lignes, en gardant le reste incomplet d'un
// morceau à l'autre : une balise coupée en deux ne doit pas être perdue.
export function createLineSplitter(onLine) {
  let rest = ''
  return {
    chunk(text) {
      rest += text
      const parts = rest.split('\n')
      rest = parts.pop()
      for (const p of parts) onLine(p)
    },
    end() { if (rest) { onLine(rest); rest = '' } },
  }
}

export function readHealthText(text) {
  const reader = createHealthReader()
  const split = createLineSplitter(reader.line)
  split.chunk(String(text || ''))
  split.end()
  return reader.result()
}

// ─── Fusion avec ce qui existe déjà ─────────────────────────
//
// Un import ne doit rien écraser en silence. Une nuit notée à la main peut
// porter une qualité de sommeil et des réveils que l'export ne connaît pas,
// et une séance déjà saisie peut avoir son ressenti et ses notes. On
// complète donc les trous, on laisse le reste, et on dit combien de fois
// on s'est abstenu.

export const DUP_MINUTES = 90

export function sameSession(existing, w) {
  if (!existing || existing.date !== w.date) return false
  if (w.sport && existing.sport && existing.sport !== w.sport) return false
  const a = existing.heure
  const b = w.time
  if (!a || !b) return true
  const mins = (t) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t)
    return m ? Number(m[1]) * 60 + Number(m[2]) : null
  }
  const ma = mins(a)
  const mb = mins(b)
  if (ma == null || mb == null) return true
  return Math.abs(ma - mb) <= DUP_MINUTES
}

export function toPatch(result, db, { now } = {}) {
  const prevSleep = (db && db.sleepLog) || {}
  const prevVitals = (db && db.vitalsLog) || {}
  const prevSessions = Array.isArray(db && db.planningSessions) ? db.planningSessions : []

  const sleepLog = { ...prevSleep }
  let sleepAdded = 0
  let sleepKept = 0
  let sleepFromBed = 0
  for (const [d, v] of Object.entries(result.sleep || {})) {
    const existing = prevSleep[d]
    if (existing && num(existing.hours) != null) { sleepKept++; continue }
    sleepLog[d] = { ...(existing || {}), hours: v.hours, source: 'sante' }
    sleepAdded++
    if (v.fromInBed) sleepFromBed++
  }

  const vitalsLog = { ...prevVitals }
  let vitalsAdded = 0
  const days = new Set([...Object.keys(result.steps || {}), ...Object.keys(result.restingHr || {}), ...Object.keys(result.hrv || {})])
  for (const d of days) {
    const entry = { ...(prevVitals[d] || {}) }
    let touched = false
    if (result.steps[d] != null && entry.steps == null) { entry.steps = result.steps[d]; touched = true }
    if (result.restingHr[d] != null && entry.restingHr == null) { entry.restingHr = result.restingHr[d]; touched = true }
    if (result.hrv[d] != null && entry.hrv == null) { entry.hrv = result.hrv[d]; touched = true }
    if (touched) { vitalsLog[d] = entry; vitalsAdded++ }
  }

  const stamp = now || Date.now()
  const sessions = prevSessions.slice()
  let addedSessions = 0
  let skippedSessions = 0
  let unknownSport = 0
  result.workouts.forEach((w, i) => {
    if (sessions.some((s) => sameSession(s, w))) { skippedSessions++; return }
    if (!w.sport) { unknownSport++; return }
    const data = {}
    if (w.km != null) data.distance = w.km
    if (w.seconds != null) {
      const h = Math.floor(w.seconds / 3600)
      const m = Math.floor((w.seconds % 3600) / 60)
      const p = (n) => (n < 10 ? '0' + n : '' + n)
      data.temps = h > 0 ? `${h}:${p(m)}:${p(w.seconds % 60)}` : `${m}:${p(w.seconds % 60)}`
    }
    if (w.calories != null) data.calories = w.calories
    const mins = w.seconds != null ? Math.round(w.seconds / 60) : null
    sessions.push({
      id: 'sante_' + stamp + '_' + i,
      date: w.date, heure: w.time || '', sport: w.sport,
      duree: mins == null ? 'Personnalisée' : mins >= 60 ? `${Math.floor(mins / 60)} h${mins % 60 ? ' ' + (mins % 60 < 10 ? '0' : '') + (mins % 60) : ''}` : `${mins} min`,
      statut: 'realise', ressenti: null, notes: null, data, exercises: [], source: 'sante',
    })
    addedSessions++
  })

  return {
    patch: { sleepLog, vitalsLog, planningSessions: sessions },
    summary: {
      sleepAdded, sleepKept, sleepFromBed,
      vitalsAdded,
      addedSessions, skippedSessions, unknownSport,
      records: result.seen,
    },
  }
}
