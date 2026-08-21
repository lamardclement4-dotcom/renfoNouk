// ============================================================
// Import d'une activité venue d'ailleurs.
//
// Strava, Garmin, Decathlon, Polar : tous exportent du GPX ou du TCX, et
// tous affichent un écran de résumé qu'on peut photographier. Ce sont les
// deux entrées retenues.
//
// L'API Strava est volontairement écartée : elle exige un jeton OAuth et
// un secret client, or l'application est un site statique — le secret
// serait lisible dans le paquet par quiconque l'ouvre. Un fichier exporté
// donne la même donnée sans rien exposer, fonctionne hors connexion, et
// ne dépend pas d'un service qui peut fermer son accès.
//
// Rien ici ne touche au réseau ni au DOM : l'analyse d'un fichier est du
// texte vers des nombres, et se vérifie comme telle.
// ============================================================

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const round = (v, d = 0) => {
  const n = num(v)
  if (n == null) return null
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

// ─── Bornes du plausible ────────────────────────────────────
// Un fichier corrompu ou une capture mal lue produit des valeurs
// aberrantes. Mieux vaut un champ vide qu'un marathon de 4 000 km.
export const LIMITS = {
  km: [0.05, 1000],
  seconds: [10, 86400 * 3],
  elevation: [0, 12000],
  hr: [30, 230],
  cadence: [20, 260],
  calories: [1, 20000],
}

export function inRange(key, v) {
  const n = num(v)
  const b = LIMITS[key]
  if (n == null || !b) return null
  return n >= b[0] && n <= b[1] ? n : null
}

// ─── Sports ─────────────────────────────────────────────────
// Les exports nomment le sport en anglais, en français, ou pas du tout.
// La correspondance vise les identifiants de l'application.
const SPORT_WORDS = [
  [/trail/i, 'trail'],
  [/(course|running|run\b|jogging|footing)/i, 'course'],
  [/(marche|walking|walk\b|hiking|randonn)/i, 'marche'],
  [/(v[ée]lo|cycling|biking|ride\b|bike\b)/i, 'velo'],
  [/(vtt|mountain\s*bik|mtb)/i, 'vtt'],
  [/(natation|swim)/i, 'natation'],
  [/(rameur|aviron|rowing|kayak|cano)/i, 'aviron'],
  [/(escalade|climb|bouldering)/i, 'escalade'],
  [/(ski|snowboard)/i, 'ski'],
  [/(muscu|strength|weight\s*training|gym\b)/i, 'muscu'],
  [/(sprint|piste)/i, 'sprint'],
]

export function sportFrom(text) {
  const t = String(text || '')
  // Le VTT contient « bike » : il doit être testé avant le vélo.
  if (/(vtt|mountain\s*bik|mtb)/i.test(t)) return 'vtt'
  for (const [re, id] of SPORT_WORDS) if (re.test(t)) return id
  return null
}

// ─── Lecture XML sans DOM ───────────────────────────────────
// Un DOMParser n'existe pas hors navigateur, et les fichiers de trace
// n'ont besoin que de quelques balises. On les extrait directement, ce qui
// rend l'analyse vérifiable côté Node.
function tagValues(xml, tag) {
  const re = new RegExp('<' + tag + '[^>]*>([^<]*)</' + tag + '>', 'gi')
  const out = []
  let m
  while ((m = re.exec(xml))) out.push(m[1].trim())
  return out
}
function firstTag(xml, tag) {
  const v = tagValues(xml, tag)
  return v.length ? v[0] : null
}

// Certaines balises TCX enveloppent leur nombre : la fréquence cardiaque
// s'écrit `<AverageHeartRateBpm><Value>142</Value></AverageHeartRateBpm>`.
// Une extraction qui n'accepte que du texte pur n'y trouve rien — et se
// tait, ce qui est le pire des cas.
function nestedValues(xml, tag) {
  const re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'gi')
  const out = []
  let m
  while ((m = re.exec(xml))) {
    const inner = firstTag(m[1], 'Value')
    const v = num(inner != null ? inner : m[1])
    if (v != null) out.push(v)
  }
  return out
}

export function isGpx(text) { return /<gpx[\s>]/i.test(String(text || '')) }
export function isTcx(text) { return /<TrainingCenterDatabase[\s>]/i.test(String(text || '')) }

// ─── Distance à partir des points ───────────────────────────
export const EARTH_RADIUS_M = 6371000

export function haversine(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const la1 = a.lat * rad
  const la2 = b.lat * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Le dénivelé positif se calcule sur l'altitude lissée. Le bruit du GPS
// fait osciller l'altitude de quelques mètres à l'arrêt ; sommer chaque
// hausse brute donne des centaines de mètres de dénivelé sur un parcours
// plat. Un seuil de trois mètres écarte ce bruit sans effacer les vraies
// côtes.
export const ELEV_NOISE_M = 3

export function elevationGain(elevations, threshold = ELEV_NOISE_M) {
  let gain = 0
  let ref = null
  for (const e of elevations) {
    const v = num(e)
    if (v == null) continue
    if (ref == null) { ref = v; continue }
    const d = v - ref
    if (d >= threshold) { gain += d; ref = v } else if (d <= -threshold) { ref = v }
  }
  return Math.round(gain)
}

export function parseGpx(text) {
  const xml = String(text || '')
  const pts = []
  const re = /<trkpt[^>]*lat="([-\d.]+)"[^>]*lon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>|<trkpt[^>]*lat="([-\d.]+)"[^>]*lon="([-\d.]+)"[^>]*\/>/gi
  let m
  while ((m = re.exec(xml))) {
    const lat = num(m[1] != null ? m[1] : m[4])
    const lon = num(m[2] != null ? m[2] : m[5])
    if (lat == null || lon == null) continue
    const body = m[3] || ''
    pts.push({ lat, lon, ele: num(firstTag(body, 'ele')), time: firstTag(body, 'time') })
  }
  let metres = 0
  for (let i = 1; i < pts.length; i++) metres += haversine(pts[i - 1], pts[i])
  const times = pts.map((p) => p.time).filter(Boolean)
  const start = times.length ? times[0] : firstTag(xml, 'time')
  const end = times.length ? times[times.length - 1] : null
  const seconds = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 1000) : null
  return {
    format: 'gpx',
    sport: sportFrom(firstTag(xml, 'type') || firstTag(xml, 'name') || ''),
    startISO: start ? String(start).slice(0, 10) : null,
    startTime: start ? String(start).slice(11, 16) : null,
    km: round(metres / 1000, 2),
    seconds,
    elevation: elevationGain(pts.map((p) => p.ele)),
    points: pts.length,
  }
}

export function parseTcx(text) {
  const xml = String(text || '')
  // Un fichier peut contenir plusieurs tours : les totaux s'additionnent.
  const secs = tagValues(xml, 'TotalTimeSeconds').map(num).filter((v) => v != null)
  const dist = tagValues(xml, 'DistanceMeters').map(num).filter((v) => v != null)
  const cals = tagValues(xml, 'Calories').map(num).filter((v) => v != null)
  const hrs = nestedValues(xml, 'AverageHeartRateBpm')
  const sportAttr = (/<Activity[^>]*Sport="([^"]+)"/i.exec(xml) || [])[1] || ''
  const id = firstTag(xml, 'Id')
  // `DistanceMeters` figure à la fois par tour et par point de trace. La
  // somme de tous les tours est la bonne ; celle des points la
  // multiplierait. On ne retient donc que les tours, repérés par leur
  // position juste après un `<Lap>`.
  const lapDist = []
  const lapRe = /<Lap[^>]*>([\s\S]*?)<\/Lap>/gi
  let lm
  while ((lm = lapRe.exec(xml))) {
    const d = num(firstTag(lm[1], 'DistanceMeters'))
    if (d != null) lapDist.push(d)
  }
  const metres = lapDist.length ? lapDist.reduce((a, b) => a + b, 0) : (dist.length ? dist[dist.length - 1] : null)
  return {
    format: 'tcx',
    sport: sportFrom(sportAttr),
    startISO: id ? String(id).slice(0, 10) : null,
    startTime: id ? String(id).slice(11, 16) : null,
    km: metres == null ? null : round(metres / 1000, 2),
    seconds: secs.length ? Math.round(secs.reduce((a, b) => a + b, 0)) : null,
    elevation: elevationGain(tagValues(xml, 'AltitudeMeters')),
    hr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
    calories: cals.length ? Math.round(cals.reduce((a, b) => a + b, 0)) : null,
    points: tagValues(xml, 'LatitudeDegrees').length,
  }
}

export function parseActivityFile(text) {
  if (isTcx(text)) return parseTcx(text)
  if (isGpx(text)) return parseGpx(text)
  return null
}

// ─── Lecture d'une capture d'écran ──────────────────────────
// Une capture Strava, Garmin ou Decathlon affiche les mêmes grandeurs,
// dans un ordre variable et avec des libellés différents. On cherche donc
// la valeur au voisinage de son libellé plutôt qu'à une place fixe.

export function toSeconds(txt) {
  const t = String(txt || '').trim()
  // 1:23:45, 45:12, ou 1h23, 45min
  let m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(t)
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
  m = /^(\d{1,3}):(\d{2})$/.exec(t)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  m = /^(\d{1,2})\s*h\s*(\d{1,2})?$/i.exec(t)
  if (m) return Number(m[1]) * 3600 + (m[2] ? Number(m[2]) * 60 : 0)
  m = /^(\d{1,3})\s*min$/i.exec(t)
  if (m) return Number(m[1]) * 60
  return null
}

// Le nombre qui suit ou précède immédiatement le libellé. Les captures
// alternent les deux dispositions : valeur au-dessus du libellé sur
// Strava, à droite ailleurs.
function near(lines, re, valueRe, skip) {
  for (let i = 0; i < lines.length; i++) {
    if (!re.test(lines[i])) continue
    for (const cand of [lines[i], lines[i + 1], lines[i - 1]]) {
      if (!cand) continue
      if (skip && skip.test(cand)) continue
      const m = valueRe.exec(cand)
      if (m) return m[1]
    }
  }
  return null
}

// Une ligne d'allure — « 5:00 /km » — contient le mot « km ». Sans garde,
// son 5 se lisait comme une distance de cinq kilomètres, et la course de
// douze kilomètres devenait une sortie de cinq. Une ligne de distance ne
// porte jamais de chronomètre : c'est ce qui les sépare.
const PACE_LINE = /\d{1,2}:\d{2}/

const NUMBER = /(\d+(?:[.,]\d+)?)/
const CLOCK = /(\d{1,2}:\d{2}(?::\d{2})?|\d{1,2}\s*h\s*\d{0,2}|\d{1,3}\s*min)/i

export function parseActivityText(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const all = lines.join('\n')

  const km = inRange('km', near(lines, /distance|\bkm\b/i, NUMBER, PACE_LINE))
  const secs = toSeconds(near(lines, /(temps|dur[ée]e|time|moving|elapsed)/i, CLOCK) || '')
  const dplus = inRange('elevation', near(lines, /(d[ée]nivel|elevation|gain|d\+)/i, NUMBER))
  const hr = inRange('hr', near(lines, /(fc|fr[ée]q|heart|bpm|pulse)/i, NUMBER))
  const cad = inRange('cadence', near(lines, /(cadence|spm|pas\/min)/i, NUMBER))
  const kcal = inRange('calories', near(lines, /(calorie|kcal|[ée]nergie)/i, NUMBER))

  // L'allure est utile pour recouper : si distance et temps manquent tous
  // deux, elle ne sert à rien, mais si l'un des deux manque elle le
  // reconstitue.
  const paceRaw = near(lines, /(allure|pace|\/km|min\/km)/i, /(\d{1,2}:\d{2})/)
  const paceSec = paceRaw ? toSeconds(paceRaw) : null

  let seconds = inRange('seconds', secs)
  let distance = km
  if (seconds == null && distance != null && paceSec) seconds = Math.round(distance * paceSec)
  if (distance == null && seconds != null && paceSec) distance = round(seconds / paceSec, 2)

  return {
    format: 'capture',
    sport: sportFrom(all),
    km: distance, seconds,
    elevation: dplus, hr, cadence: cad, calories: kcal,
    pace: paceSec,
  }
}

// ─── Vers une séance de l'application ───────────────────────

export function fmtDuree(seconds) {
  const s = inRange('seconds', seconds)
  if (s == null) return null
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  if (h && m) return `${h} h ${m < 10 ? '0' + m : m}`
  if (h) return `${h} h`
  return `${m} min`
}

export function fmtTemps(seconds) {
  const s = inRange('seconds', seconds)
  if (s == null) return null
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return h > 0 ? `${h}:${p(m)}:${p(r)}` : `${m}:${p(r)}`
}

// Le sport n'est pas toujours déductible : plutôt que d'en inventer un,
// on le laisse vide et l'écran le demande. Une séance rangée dans le
// mauvais sport fausserait sa discipline pendant des mois.
export function toSession(activity, { date, id } = {}) {
  if (!activity) return null
  const day = date || activity.startISO
  if (!day) return null
  const data = {}
  const km = inRange('km', activity.km)
  const secs = inRange('seconds', activity.seconds)
  if (km != null) data.distance = km
  if (secs != null) data.temps = fmtTemps(secs)
  const ele = inRange('elevation', activity.elevation)
  if (ele) data.denivele = ele
  const hr = inRange('hr', activity.hr)
  if (hr != null) data.fc = hr
  const cad = inRange('cadence', activity.cadence)
  if (cad != null) data.cadence = cad
  const kcal = inRange('calories', activity.calories)
  if (kcal != null) data.calories = kcal
  return {
    id: id || 'imp_' + Date.now(),
    date: day,
    heure: activity.startTime || '',
    sport: activity.sport || null,
    duree: fmtDuree(secs) || 'Personnalisée',
    statut: 'realise',
    ressenti: null,
    notes: null,
    data,
    exercises: [],
    source: activity.format,
  }
}
