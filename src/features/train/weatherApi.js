// ============================================================
// Météo par nom de ville.
//
// Les conditions se saisissaient à la main, champ par champ, ou par
// import d'une capture d'écran à lire en OCR. Or l'application est un
// site statique : elle n'a pas de serveur où cacher une clé d'API, et
// toute clé embarquée dans le paquet est lisible par n'importe qui.
//
// Open-Meteo répond à ces deux contraintes : aucune clé n'est requise,
// et les en-têtes CORS autorisent l'appel depuis le navigateur. Son
// service de géocodage traduit un nom de ville en coordonnées, ce qui
// permet de ne demander que la ville.
//
// La transformation des réponses est séparée des appels réseau : elle se
// teste sans rien appeler, et c'est là que vivent les décisions
// discutables (quel code météo vaut « averses », à partir de quelle
// couverture nuageuse on n'est plus au soleil).
// ============================================================

export const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
export const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

// Les vitesses sont demandées explicitement en km/h : le défaut du
// service pourrait changer, et un vent en m/s pris pour des km/h
// diviserait la pénalité de vent par trois sans rien signaler.
const CURRENT = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature',
  'precipitation', 'weather_code', 'pressure_msl',
  'wind_speed_10m', 'wind_gusts_10m', 'uv_index', 'cloud_cover',
].join(',')

export const MAX_RESULTS = 5

// `Number(null)` et `Number('')` valent zéro, et zéro passe `isFinite` : une
// valeur absente deviendrait une mesure — un vent nul plutôt qu'un vent non
// relevé, et une ville sans coordonnées se retrouverait au point (0, 0), au
// large du golfe de Guinée.
const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const round = (v, d = 0) => {
  const n = num(v)
  if (n == null) return null
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

// ─── Géocodage ──────────────────────────────────────────────

export function geocodeUrl(city) {
  const q = new URLSearchParams({
    name: String(city || '').trim(), count: String(MAX_RESULTS), language: 'fr', format: 'json',
  })
  return `${GEOCODE_URL}?${q}`
}

// Plusieurs villes portent le même nom — Lyon existe en France, dans le
// Mississippi et dans le Missouri. On garde la région et le pays pour
// que le choix soit possible plutôt que deviné.
export function toPlaces(payload) {
  const rows = (payload && payload.results) || []
  return rows.map((r) => ({
    id: String(r.id != null ? r.id : `${r.latitude},${r.longitude}`),
    name: r.name,
    region: r.admin1 || null,
    country: r.country || r.country_code || null,
    lat: num(r.latitude),
    lon: num(r.longitude),
    elevation: round(r.elevation),
  })).filter((p) => p.name && p.lat != null && p.lon != null)
}

export function placeLabel(p) {
  if (!p) return ''
  return [p.name, p.region, p.country].filter(Boolean).join(' · ')
}

// ─── Conditions ─────────────────────────────────────────────

export function forecastUrl(place) {
  const q = new URLSearchParams({
    latitude: String(place.lat), longitude: String(place.lon),
    current: CURRENT, wind_speed_unit: 'kmh', temperature_unit: 'celsius', timezone: 'auto',
  })
  return `${FORECAST_URL}?${q}`
}

export function airUrl(place) {
  const q = new URLSearchParams({
    latitude: String(place.lat), longitude: String(place.lon),
    current: 'european_aqi', timezone: 'auto',
  })
  return `${AIR_URL}?${q}`
}

// Codes WMO. Le regroupement est volontairement grossier : les quatre
// choix de l'application ne distinguent pas la bruine du crachin.
export function precipFromCode(code) {
  const c = num(code)
  if (c == null) return 'sec'
  if (c >= 95) return 'averses'          // orages
  if (c >= 85) return 'neige'            // averses de neige
  if (c >= 80) return 'averses'          // averses de pluie
  if (c >= 71) return 'neige'            // chutes de neige, grains
  if (c >= 51) return 'pluie'            // bruine et pluie, y compris verglaçantes
  return 'sec'                           // ciel clair à couvert, brouillard
}

export const CLOUD_SUNNY = 25
export const CLOUD_SHADED = 75

export function sunFromCloud(cover) {
  const c = num(cover)
  if (c == null) return 'variable'
  if (c < CLOUD_SUNNY) return 'plein'
  if (c < CLOUD_SHADED) return 'variable'
  return 'ombre'
}

// L'altitude vient du géocodage, pas des conditions : le service de
// prévision renvoie celle de sa maille, qui peut s'écarter de plusieurs
// dizaines de mètres de celle de la ville.
export function toConditions(forecast, air, place) {
  const cur = (forecast && forecast.current) || {}
  const aqi = air && air.current ? num(air.current.european_aqi) : null
  const fields = {
    tempC: round(cur.temperature_2m, 1),
    feelsLikeC: round(cur.apparent_temperature, 1),
    humidity: round(cur.relative_humidity_2m),
    windKmh: round(cur.wind_speed_10m),
    gustKmh: round(cur.wind_gusts_10m),
    uv: round(cur.uv_index, 1),
    aqi: aqi == null ? null : Math.round(aqi),
    pressure: round(cur.pressure_msl),
    altitudeM: place ? place.elevation : null,
  }
  for (const k of Object.keys(fields)) if (fields[k] == null) delete fields[k]
  return {
    fields,
    choices: { sun: sunFromCloud(cur.cloud_cover), precip: precipFromCode(cur.weather_code) },
    observedAt: cur.time || null,
  }
}

// ─── Appels réseau ──────────────────────────────────────────
// `fetch` est injectable : les tests couvrent les URL construites et la
// transformation des réponses sans toucher au réseau.

async function getJson(url, doFetch) {
  const res = await (doFetch || fetch)(url)
  if (!res || !res.ok) {
    const code = res ? res.status : '?'
    throw new Error(`Le service météo a répondu ${code}.`)
  }
  return res.json()
}

export async function searchCity(city, { fetch: doFetch } = {}) {
  const name = String(city || '').trim()
  if (name.length < 2) return []
  return toPlaces(await getJson(geocodeUrl(name), doFetch))
}

// La qualité de l'air vient d'un service distinct. Son indisponibilité ne
// doit pas priver des conditions elles-mêmes : elle est simplement
// absente, et le champ reste vide.
export async function loadConditions(place, { fetch: doFetch } = {}) {
  const forecast = await getJson(forecastUrl(place), doFetch)
  let air = null
  try { air = await getJson(airUrl(place), doFetch) } catch { air = null }
  return toConditions(forecast, air, place)
}
