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
export const RESP_TYPE = 'HKQuantityTypeIdentifierRespiratoryRate'
export const EXO_TYPE = 'HKQuantityTypeIdentifierAppleExerciseTime'
export const SPO2_TYPE = 'HKQuantityTypeIdentifierOxygenSaturation'
// Le reste de ce que la montre mesure et que Raccourcis sait lire.
export const TEMP_TYPE = 'HKQuantityTypeIdentifierAppleSleepingWristTemperature'
export const VO2_TYPE = 'HKQuantityTypeIdentifierVO2Max'
export const HRR_TYPE = 'HKQuantityTypeIdentifierHeartRateRecoveryOneMinute'
export const MARCHE_TYPE = 'HKQuantityTypeIdentifierWalkingHeartRateAverage'
export const POIDS_TYPE = 'HKQuantityTypeIdentifierBodyMass'
export const ZEN_TYPE = 'HKCategoryTypeIdentifierMindfulSession'

// Température au poignet pendant le sommeil, en °C (un iPhone réglé en
// °F l'écrit en °F : convertie).
export function tempC(v) {
  const n = num(v)
  if (n == null) return null
  const c = n > 45 ? (n - 32) * 5 / 9 : n
  return c >= 30 && c <= 42 ? Math.round(c * 100) / 100 : null
}
// Poids en kg (« lb » converti).
export function poidsKg(v, unite) {
  const n = num(v)
  if (n == null) return null
  const kg = /lb|livre/i.test(String(unite || '')) ? n * 0.45359237 : n
  return kg >= 25 && kg <= 300 ? Math.round(kg * 10) / 10 : null
}

// Saturation en oxygène (Apple Watch, mesures en arrière-plan) : seules
// comptent celles de la nuit, de 19 h à midi, rangées au jour du réveil.
// L'export Santé l'écrit en fraction (0.97), Raccourcis souvent en
// pourcentage (97) : les deux sont lus.
export function spo2Pct(v) {
  const n = num(v)
  if (n == null) return null
  const p = n > 0 && n <= 1 ? n * 100 : n
  return p >= 50 && p <= 100 ? Math.round(p * 10) / 10 : null
}
export function jourDeNuit(stamp) { return nuitSpo2(stamp) }
export function nuitSpo2(stamp) {
  const d = dayOf(stamp), h = heureOf(stamp)
  if (!d || !h) return null
  const hh = Number(h.slice(0, 2))
  if (hh >= 12 && hh < 19) return null
  if (hh < 12) return d
  const [y, m, j] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, j + 1)).toISOString().slice(0, 10)
}

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

// Heure locale d'un horodatage de l'export (« 2026-01-05 07:12:00 +0100 »
// → « 07:12 ») : l'heure écrite est déjà l'heure locale du moment.
export function heureOf(stamp) {
  const m = /^\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2})/.exec(String(stamp || ''))
  return m ? m[1] : null
}

// Le bloc principal d'une journée de sommeil : les segments séparés de
// moins de deux heures forment un bloc, et le plus long est la nuit. Une
// sieste rangée au même jour ne déplace ainsi ni le coucher ni le lever.
export function blocPrincipal(list) {
  const tri = (list || []).filter((x) => x && x.a != null && x.b != null && x.b > x.a).sort((x, y) => x.a - y.a)
  const blocs = []
  for (const it of tri) {
    const der = blocs[blocs.length - 1]
    if (der && it.a - der.b <= 2 * 3600000) { if (it.b > der.b) { der.b = it.b; der.hb = it.hb } }
    else blocs.push({ ...it })
  }
  return blocs.sort((x, y) => (y.b - y.a) - (x.b - x.a))[0] || null
}

// Coucher, lever et temps pour s'endormir d'une nuit de l'export : le
// coucher est l'entrée au lit quand elle est connue et précède le sommeil
// de moins de deux heures, sinon le début du sommeil.
export function horairesNuit(asleep, inBed) {
  const dort = blocPrincipal(asleep)
  const lit = blocPrincipal(inBed)
  if (!dort) return lit && lit.ha && lit.hb ? { coucher: lit.ha, lever: lit.hb, endormissement: null } : null
  if (!dort.ha || !dort.hb) return null
  const avant = lit && lit.ha && lit.a <= dort.a && dort.a - lit.a <= 2 * 3600000
  return {
    coucher: avant ? lit.ha : dort.ha,
    lever: dort.hb,
    endormissement: avant ? Math.round((dort.a - lit.a) / 60000) : null,
  }
}

// Phase d'un segment de sommeil : « AsleepDeep » → profond, etc.
export function phaseOf(value) {
  const v = String(value || '')
  if (/AsleepDeep/i.test(v)) return 'profond'
  if (/AsleepREM/i.test(v)) return 'paradoxal'
  if (/AsleepCore/i.test(v)) return 'leger'
  if (/Awake/i.test(v)) return 'eveille'
  return null
}

// Minutes par phase sur une nuit, segments fusionnés par phase (montre et
// téléphone peuvent écrire la même nuit). Null sans phase mesurée.
export function phasesNuit(par) {
  if (!par || !(par.profond || par.paradoxal || par.leger)) return null
  const out = { profond: null, paradoxal: null, leger: null, eveille: null }
  for (const k of Object.keys(out)) {
    if (!par[k]) continue
    out[k] = Math.round(mergeIntervals(par[k]).reduce((a, i) => a + (i.b - i.a), 0) / 60000)
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
  const sleepPhases = new Map()   // jour de réveil -> { profond: [], … }
  const steps = new Map()
  const restingHr = new Map()
  const hrv = new Map()
  const resp = new Map()          // fréquence respiratoire (nuit), par jour
  const exo = new Map()           // minutes d'exercice (montre), par jour
  const spo2 = new Map()          // saturation en oxygène (nuit), par jour du réveil
  const temp = new Map()          // température au poignet (nuit), par jour du réveil
  const vo2 = new Map()           // VO2max de la montre (forme cardio)
  const hrr = new Map()           // récupération cardiaque à 1 min, après une séance
  const marche = new Map()        // FC moyenne à la marche
  const poids = new Map()         // jour -> { t, kg } (la dernière pesée du jour)
  const zen = new Map()           // minutes de pleine conscience
  const exoSeg = new Map()        // minutes d'exercice, segments horodatés
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
      const seg = { a, b, ha: heureOf(r.start), hb: heureOf(r.end) }
      if (ASLEEP.test(r.value || '')) push(sleepAsleep, day, seg)
      else if (IN_BED.test(r.value || '')) push(sleepInBed, day, seg)
      // Phases mesurées par la montre (Apple Watch depuis watchOS 9).
      const phase = phaseOf(r.value)
      if (phase) {
        if (!sleepPhases.has(day)) sleepPhases.set(day, {})
        const ph = sleepPhases.get(day)
        ;(ph[phase] = ph[phase] || []).push(seg)
      }
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
    if (r.type === TEMP_TYPE) {
      const day = jourDeNuit(r.start)
      const v = tempC(r.value)
      if (day && v != null) push(temp, day, v)
      return
    }
    if (r.type === VO2_TYPE || r.type === HRR_TYPE || r.type === MARCHE_TYPE) {
      const day = dayOf(r.start)
      const v = num(r.value)
      const [m, lo, hi] = r.type === VO2_TYPE ? [vo2, 10, 90] : r.type === HRR_TYPE ? [hrr, 3, 90] : [marche, 40, 160]
      if (day && v != null && v >= lo && v <= hi) push(m, day, v)
      return
    }
    if (r.type === POIDS_TYPE) {
      const day = dayOf(r.start)
      const kg = poidsKg(r.value, r.unit)
      const t = msOf(r.start) || 0
      if (day && kg != null && (!poids.has(day) || t >= poids.get(day).t)) poids.set(day, { t, kg })
      return
    }
    if (r.type === ZEN_TYPE) {
      const a = msOf(r.start), b = msOf(r.end), day = dayOf(r.start)
      if (day && a != null && b != null && b > a && b - a <= 4 * 3600000) push(zen, day, (b - a) / 60000)
      return
    }
    if (r.type === EXO_TYPE) {
      const a = msOf(r.start), b = msOf(r.end), day = dayOf(r.start)
      if (day && a != null && b != null && b >= a) push(exoSeg, day, { a, b: Math.max(b, a + 60000), ha: heureOf(r.start), hb: heureOf(r.end) })
    }
    if (r.type === SPO2_TYPE) {
      const day = nuitSpo2(r.start)
      const v = spo2Pct(r.value)
      if (day && v != null) push(spo2, day, v)
      return
    }
    if (r.type === RESP_TYPE || r.type === EXO_TYPE) {
      const day = dayOf(r.start)
      const v = num(r.value)
      if (day && v != null) push(r.type === RESP_TYPE ? resp : exo, day, v)
    }
  }

  function result() {
    const sleep = {}
    const days = new Set([...sleepAsleep.keys(), ...sleepInBed.keys()])
    for (const d of days) {
      const asleep = sleepAsleep.get(d)
      const hours = asleep && asleep.length ? totalHours(asleep) : totalHours(sleepInBed.get(d) || [])
      if (hours > 0) {
        sleep[d] = { hours, fromInBed: !(asleep && asleep.length), ...(horairesNuit(asleep, sleepInBed.get(d)) || {}) }
        const ph = phasesNuit(sleepPhases.get(d))
        if (ph) sleep[d].phases = ph
      }
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
    // Nombre de mesures par jour : un envoi plus tardif dans la journée, qui
    // en compte autant ou plus, remplace la moyenne d'un envoi précédent.
    const compte = (m) => {
      const out = {}
      for (const [d, list] of m) out[d] = list.length
      return out
    }
    // Oxygène de la nuit : moyenne au dixième, plus basse mesure, et nombre
    // de mesures sous 90 % (une seule peut venir d'un bracelet mal serré).
    const o2 = { spo2: {}, spo2N: {}, spo2Min: {}, spo2Bas: {} }
    for (const [d, list] of spo2) {
      o2.spo2[d] = Math.round(list.reduce((a, b) => a + b, 0) / list.length * 10) / 10
      o2.spo2N[d] = list.length
      o2.spo2Min[d] = Math.min(...list)
      o2.spo2Bas[d] = list.filter((x) => x < 90).length
    }
    const moy = (m, dec) => {
      const out = {}
      for (const [d, list] of m) out[d] = Math.round(list.reduce((a, b) => a + b, 0) / list.length * dec) / dec
      return out
    }
    // Blocs d'exercice : minutes de la montre séparées de moins de 5
    // minutes, gardés dès 10 minutes. Ils proposent la séance à noter.
    const exoBlocs = {}
    for (const [d, segs] of exoSeg) {
      const tri = segs.slice().sort((x, y) => x.a - y.a)
      const blocs = []
      for (const g of tri) {
        const der = blocs[blocs.length - 1]
        if (der && g.a - der.b <= 5 * 60000) { if (g.b > der.b) { der.b = g.b; der.hb = g.hb } } else blocs.push({ ...g })
      }
      const garde = blocs.map((x) => ({ debut: x.ha, fin: x.hb, min: Math.round((x.b - x.a) / 60000) })).filter((x) => x.min >= 10 && x.debut)
      if (garde.length) exoBlocs[d] = garde
    }
    return {
      ...o2,
      temp: moy(temp, 100), vo2: moy(vo2, 10), hrr: moy(hrr, 1), hrrN: compte(hrr), marche: moy(marche, 1),
      poids: Object.fromEntries([...poids].map(([d, x]) => [d, x.kg])),
      zenMin: Object.fromEntries([...zen].map(([d, l]) => [d, Math.round(l.reduce((a, b) => a + b, 0))])), zenN: compte(zen),
      exoBlocs,
      sleep, steps: sum(steps), restingHr: avg(restingHr), hrv: avg(hrv),
      restingHrN: compte(restingHr), hrvN: compte(hrv),
      resp: avg(resp), respN: compte(resp), exoMin: sum(exo),
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

export function toPatch(result, db, { now, source = 'sante' } = {}) {
  const prevSleep = (db && db.sleepLog) || {}
  const prevVitals = (db && db.vitalsLog) || {}
  const prevSessions = Array.isArray(db && db.planningSessions) ? db.planningSessions : []

  const sleepLog = { ...prevSleep }
  let sleepAdded = 0
  let sleepKept = 0
  let sleepFromBed = 0
  let sleepTimes = 0
  const horaires = (v) => ({
    ...(v.coucher && v.lever ? { coucher: v.coucher, lever: v.lever, endormissement: v.endormissement == null ? null : v.endormissement } : {}),
    ...(v.phases ? { phases: v.phases } : {}),
  })
  // Une nuit importée et jamais corrigée à la main peut être complétée ou
  // mise à jour par un import plus récent ; une nuit notée ou corrigée à la
  // main, jamais.
  const importee = (e) => (e.source === 'sante' || e.source === 'montre') && !e.corrigee
  let sleepUpdated = 0
  for (const [d, v] of Object.entries(result.sleep || {})) {
    const existing = prevSleep[d]
    if (existing && num(existing.hours) != null) {
      // Plusieurs envois par jour : le matin, la montre n'a parfois pas
      // fini de verser la nuit dans Santé. Un envoi plus tardif qui compte
      // plus de sommeil la remplace (heures, phases), sans toucher à ce
      // que tu as ajouté (qualité, réveil, la veille).
      if (importee(existing) && v.hours > num(existing.hours) + 0.05) {
        sleepLog[d] = { ...existing, hours: v.hours, ...horaires(v) }
        sleepUpdated++
        continue
      }
      // Une nuit venue d'un import précédent, sans heures : on les ajoute.
      if (importee(existing) && ((!existing.coucher && v.coucher && v.lever) || (!existing.phases && v.phases))) { sleepLog[d] = { ...existing, ...horaires(v) }; sleepTimes++ }
      sleepKept++
      continue
    }
    sleepLog[d] = { ...(existing || {}), hours: v.hours, source, ...horaires(v) }
    sleepAdded++
    if (v.fromInBed) sleepFromBed++
  }

  const vitalsLog = { ...prevVitals }
  let vitalsAdded = 0
  const days = new Set(['steps', 'restingHr', 'hrv', 'resp', 'exoMin', 'spo2', 'temp', 'vo2', 'hrr', 'marche', 'zenMin', 'exoBlocs'].flatMap((k) => Object.keys(result[k] || {})))
  for (const d of days) {
    const entry = { ...(prevVitals[d] || {}) }
    let touched = false
    if (result.steps && result.steps[d] != null && entry.steps == null) { entry.steps = result.steps[d]; touched = true }
    // Minutes d'exercice : cumulées dans la journée, la plus grande valeur
    // reçue est la plus complète.
    if (result.exoMin && result.exoMin[d] != null && !(entry.exoMin >= result.exoMin[d])) { entry.exoMin = result.exoMin[d]; touched = true }
    // FC et VFC : remplies si absentes, ou remplacées par un envoi qui en
    // compte autant ou plus pour ce jour-là (la VFC de la nuit s'affine
    // d'un envoi à l'autre ; un envoi du soir, qui ne voit que la fin de la
    // veille, ne remplace pas la moyenne complète du matin).
    const plusComplet = (cle, n) => entry[cle] == null || (entry[cle + 'N'] != null && n != null && n >= entry[cle + 'N'])
    for (const cle of ['restingHr', 'hrv', 'resp']) {
      const val = result[cle] && result[cle][d], n = result[cle + 'N'] && result[cle + 'N'][d]
      if (val == null || !plusComplet(cle, n)) continue
      if (entry[cle] === val && entry[cle + 'N'] === n) continue
      entry[cle] = val
      if (n != null) entry[cle + 'N'] = n
      touched = true
    }
    // Une valeur par jour (température de la nuit, VO2max, FC de marche) :
    // la plus récente reçue.
    for (const cle of ['temp', 'vo2', 'marche']) {
      const val = result[cle] && result[cle][d]
      if (val != null && entry[cle] !== val) { entry[cle] = val; touched = true }
    }
    // Récupération cardiaque et pleine conscience : plusieurs par jour, un
    // envoi qui en voit autant ou plus remplace.
    for (const cle of ['hrr', 'zenMin']) {
      const val = result[cle] && result[cle][d], nk = cle === 'hrr' ? 'hrrN' : 'zenN', n = result[nk] && result[nk][d]
      if (val == null) continue
      if (!(entry[cle] == null || (entry[nk] != null && n != null && n >= entry[nk]))) continue
      if (entry[cle] === val && entry[nk] === n) continue
      entry[cle] = val
      if (n != null) entry[nk] = n
      touched = true
    }
    // Blocs d'exercice : remplacés par une liste qui couvre autant ou plus.
    const blocs = result.exoBlocs && result.exoBlocs[d]
    if (blocs) {
      const tot = (l) => (Array.isArray(l) ? l.reduce((a, x) => a + (x.min || 0), 0) : -1)
      if (tot(blocs) >= tot(entry.exoBlocs) && JSON.stringify(blocs) !== JSON.stringify(entry.exoBlocs)) { entry.exoBlocs = blocs; touched = true }
    }
    // Oxygène : les quatre chiffres de la nuit vont ensemble.
    const o2 = result.spo2 && result.spo2[d], o2n = result.spo2N && result.spo2N[d]
    if (o2 != null && plusComplet('spo2', o2n) && !(entry.spo2 === o2 && entry.spo2N === o2n)) {
      entry.spo2 = o2
      entry.spo2N = o2n
      entry.spo2Min = result.spo2Min[d]
      entry.spo2Bas = result.spo2Bas[d]
      touched = true
    }
    if (touched) { vitalsLog[d] = entry; vitalsAdded++ }
  }

  // Pesées (balance connectée, saisie dans Santé) : ajoutées aux jours
  // sans pesée dans Renfo ; une pesée notée ici n'est jamais remplacée.
  const prevPoids = Array.isArray(db && db.weightLog) ? db.weightLog.filter((e) => e && e.date) : []
  const datesPoids = new Set(prevPoids.map((e) => e.date))
  const nouvellesPesees = Object.entries(result.poids || {}).filter(([d]) => !datesPoids.has(d)).map(([d, kg]) => ({ date: d, kg, source }))
  const weightLog = nouvellesPesees.length ? [...prevPoids, ...nouvellesPesees].sort((x, y) => x.date.localeCompare(y.date)).slice(-1000) : null
  // La pesée la plus récente fait le poids du profil (hydratation,
  // compléments, charges) : comme une pesée notée dans Poids.
  const derniere = weightLog && weightLog[weightLog.length - 1]
  const profilePhys = derniere && nouvellesPesees.includes(derniere) ? { ...((db && db.profilePhys) || {}), poids: derniere.kg } : null

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

  // Saisies faites sur la montre : « Noter ma séance » devient une séance
  // réalisée (avec son effort, qui compte dans la charge), « J'ai bu » une
  // boisson du jour. Un même dépôt relu ne double rien.
  const enMin = (h) => (typeof h === 'string' && /^\d{2}:\d{2}/.test(h) ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5)) : null)
  let seancesMontre = 0
  for (const x of result.seancesMontre || []) {
    const doublon = sessions.some((s) => s && s.date === x.date && s.sport === x.sport && enMin(s.heure) != null && Math.abs(enMin(s.heure) - enMin(x.heure)) <= 15)
    if (doublon) continue
    sessions.push({
      id: 'montre_' + x.date.replace(/-/g, '') + x.heure.replace(':', '') + '_' + x.sport,
      date: x.date, heure: x.heure, sport: x.sport, duree: x.min + ' min',
      statut: 'realise', ressenti: null, notes: null, data: x.rpe ? { rpe: x.rpe } : {}, exercises: [], source: 'montre',
    })
    seancesMontre++
  }
  const hydroLog = {}
  let eauMontre = 0
  for (const x of result.eauMontre || []) {
    const id = 'montre-' + x.date + '-' + x.heure + '-' + x.ml
    const jour = hydroLog[x.date] || (Array.isArray(((db && db.hydroLog) || {})[x.date]) ? db.hydroLog[x.date] : [])
    if (jour.some((e) => e && e.id === id)) continue
    const ts = Date.parse(x.date + 'T' + x.heure + ':00') || 0
    hydroLog[x.date] = [...jour, { id, ts, n: 'Eau (montre)', cat: 'eaux', factor: 1, kcal: 0, prot: 0, carb: 0, fat: 0, alc: 0, abv: 0, ml: x.ml, caf: 0, sugar: 0 }]
    eauMontre += x.ml
  }

  return {
    patch: { sleepLog, vitalsLog, planningSessions: sessions, ...(weightLog ? { weightLog } : {}), ...(profilePhys ? { profilePhys } : {}), ...(Object.keys(hydroLog).length ? { hydroLog } : {}) },
    summary: {
      sleepAdded, sleepKept, sleepFromBed, sleepTimes, sleepUpdated,
      vitalsAdded, weightAdded: nouvellesPesees.length, seancesMontre, eauMontre,
      addedSessions, skippedSessions, unknownSport,
      records: result.seen,
    },
  }
}
