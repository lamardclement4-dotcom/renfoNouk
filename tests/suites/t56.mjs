// Meteo par ville. L application est un site statique : aucune cle d API ne
// peut y etre cachee, toute cle embarquee serait lisible. Open-Meteo n en
// demande aucune. Les appels reseau prennent leur `fetch` en parametre, donc
// tout se verifie ici sans toucher au reseau.
import { geocodeUrl, forecastUrl, airUrl, toPlaces, placeLabel, toConditions,
  precipFromCode, sunFromCloud, searchCity, loadConditions,
  MAX_RESULTS, CLOUD_SUNNY, CLOUD_SHADED,
  historyUrl, airHistoryUrl, useArchive, pickHourIndex, toConditionsAt, loadConditionsFor,
  daysBetweenISO, FORECAST_PAST_DAYS, DEFAULT_HOUR, ARCHIVE_URL, FORECAST_URL }
  from '../../src/features/train/weatherApi.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const P = { id: '1', name: 'Lyon', region: 'Rhône-Alpes', country: 'France', lat: 45.749, lon: 4.848, elevation: 173 }

// ─── URL construites ───
a(!/api[_-]?key|apikey|token/i.test(geocodeUrl('Lyon') + forecastUrl(P) + airUrl(P)), 'aucune cle d API dans les URL : rien a exposer dans le paquet')
a(geocodeUrl('Lyon').includes('name=Lyon') && geocodeUrl('Lyon').includes(`count=${MAX_RESULTS}`), 'la recherche demande ' + MAX_RESULTS + ' resultats')
a(geocodeUrl('  Saint-Étienne  ').includes('name=Saint-%C3%89tienne'), 'accents et espaces encodes')
a(forecastUrl(P).includes('wind_speed_unit=kmh'), "l unite de vent est demandee explicitement : un m/s pris pour un km/h diviserait la penalite par trois")
a(forecastUrl(P).includes('temperature_unit=celsius'), 'et la temperature en degres Celsius')
a(forecastUrl(P).includes('latitude=45.749') && forecastUrl(P).includes('longitude=4.848'), 'coordonnees transmises')

// ─── lecture du geocodage ───
a(toPlaces(null).length === 0 && toPlaces({}).length === 0, 'reponse vide -> aucune ville')
const places = toPlaces({ results: [
  { id: 1, name: 'Lyon', admin1: 'Rhône-Alpes', country: 'France', latitude: 45.75, longitude: 4.85, elevation: 173.4 },
  { id: 2, name: 'Lyon', admin1: 'Mississippi', country: 'États-Unis', latitude: 34.2, longitude: -90.5, elevation: 53 },
  { id: 3, name: 'Sans coordonnees', latitude: null, longitude: null },
] })
a(places.length === 2, 'une entree sans coordonnees est ecartee')
a(places[0].elevation === 173, "l altitude vient du geocodage, arrondie")
a(placeLabel(places[1]) === 'Lyon · Mississippi · États-Unis', 'region et pays affiches : trois villes portent ce nom')

// ─── codes meteo ───
for (const [code, attendu] of [[0, 'sec'], [3, 'sec'], [45, 'sec'], [53, 'pluie'], [65, 'pluie'], [67, 'pluie'],
  [71, 'neige'], [77, 'neige'], [81, 'averses'], [86, 'neige'], [95, 'averses'], [99, 'averses']])
  a(precipFromCode(code) === attendu, `code ${code} -> ${attendu}`)
a(precipFromCode(null) === 'sec' && precipFromCode('x') === 'sec', 'code absent ou illisible -> sec')

a(sunFromCloud(0) === 'plein' && sunFromCloud(CLOUD_SUNNY - 1) === 'plein', 'ciel degage -> plein soleil')
a(sunFromCloud(CLOUD_SUNNY) === 'variable' && sunFromCloud(CLOUD_SHADED - 1) === 'variable', 'couverture moyenne -> nuageux')
a(sunFromCloud(CLOUD_SHADED) === 'ombre' && sunFromCloud(100) === 'ombre', 'ciel couvert -> ombre')
a(sunFromCloud(null) === 'variable', 'couverture inconnue -> nuageux, le cas median')

// ─── transformation en champs ───
const cur = { time: '2026-08-21T14:45', temperature_2m: 23.74, apparent_temperature: 24.02,
  relative_humidity_2m: 52, wind_speed_10m: 7.7, wind_gusts_10m: 20.5, uv_index: 1.45,
  pressure_msl: 1012.3, weather_code: 2, cloud_cover: 69 }
const c1 = toConditions({ current: cur }, { current: { european_aqi: 32 } }, P)
a(c1.fields.tempC === 23.7 && c1.fields.feelsLikeC === 24, 'temperature et ressenti au dixieme')
a(c1.fields.humidity === 52 && c1.fields.windKmh === 8 && c1.fields.gustKmh === 21, 'humidite, vent et rafales arrondis')
a(c1.fields.uv === 1.5 && c1.fields.aqi === 32 && c1.fields.pressure === 1012, 'UV, qualite de l air et pression')
a(c1.fields.altitudeM === 173, "l altitude vient de la ville, pas de la maille de prevision")
a(c1.choices.sun === 'variable' && c1.choices.precip === 'sec', '69 % de couverture -> nuageux, et code 2 -> sec')
a(c1.observedAt === '2026-08-21T14:45', 'heure du releve conservee')

// un champ absent ne doit pas devenir zero : Number(null) vaut 0 et serait pris
// pour une mesure — un vent nul plutot qu un vent non mesure.
const c2 = toConditions({ current: { temperature_2m: 18 } }, null, null)
a(c2.fields.tempC === 18, 'la temperature est lue')
a(!('windKmh' in c2.fields) && !('aqi' in c2.fields) && !('altitudeM' in c2.fields), 'les champs absents restent absents, pas a zero')
a(toConditions(null, null, null).fields.tempC === undefined, 'reponse nulle -> aucun champ, sans lever')

// ─── appels, avec fetch injecte ───
const ok = (body) => ({ ok: true, status: 200, json: async () => body })
a((await searchCity('L', { fetch: () => { throw new Error('ne doit pas etre appele') } })).length === 0,
  'une lettre ne declenche aucun appel')
const vus = []
const res = await searchCity('Lyon', { fetch: (u) => { vus.push(u); return ok({ results: [{ id: 1, name: 'Lyon', latitude: 45.75, longitude: 4.85 }] }) } })
a(res.length === 1 && vus.length === 1, 'la recherche appelle le geocodage une fois')

let err = null
try { await searchCity('Lyon', { fetch: () => ({ ok: false, status: 503 }) }) } catch (e) { err = e }
a(err && /503/.test(err.message), 'un service en panne remonte son code : ' + (err && err.message))

// la qualite de l air vient d un service distinct : son echec ne doit pas
// priver des conditions elles-memes.
const cond = await loadConditions(P, { fetch: (u) => {
  if (u.includes('air-quality')) return { ok: false, status: 500 }
  return ok({ current: cur })
} })
a(cond.fields.tempC === 23.7, 'les conditions sont relevees malgre la panne de la qualite de l air')
a(!('aqi' in cond.fields), 'et le champ correspondant reste vide plutot que faux')

// ─── jours precedents ───
// Le service de prevision couvre les 92 derniers jours ; au-dela, l archive.
a(daysBetweenISO('2026-08-11', '2026-08-21') === 10, '10 jours d ecart')
a(daysBetweenISO('2026-12-31', '2027-01-01') === 1, 'passage d annee')
a(daysBetweenISO('2026-03-28', '2026-03-30') === 2, 'passage a l heure d ete : deux jours restent deux jours')
a(daysBetweenISO(null, '2026-08-21') === null, 'date absente -> null')

a(!useArchive('2026-08-11', '2026-08-21'), 'un jour recent passe par les previsions')
a(!useArchive('2026-05-22', '2026-08-21'), `${FORECAST_PAST_DAYS} jours en arriere : encore les previsions`)
a(useArchive('2026-01-01', '2026-08-21'), 'un jour ancien passe par l archive')
a(historyUrl(P, '2026-08-11', '2026-08-21').startsWith(FORECAST_URL), 'et l URL suit')
a(historyUrl(P, '2026-01-01', '2026-08-21').startsWith(ARCHIVE_URL), 'archive pour le jour ancien')
a(historyUrl(P, '2026-08-11', '2026-08-21').includes('start_date=2026-08-11&end_date=2026-08-11'), 'la journee demandee est bornee')
a(historyUrl(P, '2026-08-11', '2026-08-21').includes('hourly='), 'et demandee heure par heure')
a(!/api[_-]?key|apikey|token/i.test(historyUrl(P, '2026-01-01', '2026-08-21') + airHistoryUrl(P, '2026-01-01')), 'toujours aucune cle')

// ─── choix de l heure ───
const T24 = Array.from({ length: 24 }, (_, i) => `2026-08-11T${String(i).padStart(2, '0')}:00`)
a(pickHourIndex(T24, 19) === 19, "l heure demandee est prise telle quelle")
a(pickHourIndex(T24, null) === DEFAULT_HOUR, `sans heure connue : ${DEFAULT_HOUR} h`)
a(pickHourIndex(T24, 30) === 23 && pickHourIndex(T24, -3) === 0, 'une heure hors bornes est ramenee dans la journee')
a(pickHourIndex(T24.slice(0, 12), 19) === 11, "journee tronquee : l heure la plus proche disponible")
a(pickHourIndex([], 12) === -1 && pickHourIndex(null, 12) === -1, 'aucune heure -> -1, pas d index inventé')

// ─── lecture d une journee ───
const mkHourly = () => ({ hourly: {
  time: T24,
  temperature_2m: T24.map((_, i) => 10 + i),
  apparent_temperature: T24.map((_, i) => 9 + i),
  relative_humidity_2m: T24.map(() => 60),
  wind_speed_10m: T24.map(() => 12), wind_gusts_10m: T24.map(() => 30),
  uv_index: T24.map((_, i) => (i === 19 ? null : 3)),
  pressure_msl: T24.map(() => 1008), weather_code: T24.map(() => 61), cloud_cover: T24.map(() => 90),
} })
const past = toConditionsAt(mkHourly(), { hourly: { time: T24, european_aqi: T24.map(() => 41) } }, P, 19)
a(past.fields.tempC === 29, "les valeurs sont celles de 19 h, pas d une moyenne du jour")
a(past.fields.aqi === 41 && past.fields.altitudeM === 173, 'qualite de l air et altitude au rendez-vous')
a(!('uv' in past.fields), "l archive ne fournit pas toujours l UV : le champ reste vide plutot que faux")
a(past.choices.precip === 'pluie' && past.choices.sun === 'ombre', 'ciel et precipitations de cette heure-la')
a(past.observedAt === '2026-08-11T19:00', "l heure relevee est rendue")
a(toConditionsAt({}, null, P, 12).fields.tempC === undefined, 'reponse sans heures -> aucun champ, sans lever')

// ─── choix du point d entree ───
const seen = []
const okj = (b) => ({ ok: true, status: 200, json: async () => b })
await loadConditionsFor(P, '2026-08-21', { today: '2026-08-21', fetch: (u) => { seen.push(u); return okj({ current: cur }) } })
a(seen.some((u) => u.includes('current=')), "le jour meme sans heure : l observation courante, la plus juste")
seen.length = 0
await loadConditionsFor(P, '2026-08-11', { hour: 19, today: '2026-08-21', fetch: (u) => { seen.push(u); return okj(mkHourly()) } })
a(seen.some((u) => u.includes('start_date=2026-08-11')), 'un jour passe : la journee demandee')
a(!seen.some((u) => u.includes('current=')), "et pas l observation courante")
seen.length = 0
const degrade = await loadConditionsFor(P, '2026-08-11', { hour: 19, today: '2026-08-21', fetch: (u) => {
  if (u.includes('air-quality')) return { ok: false, status: 500 }
  return okj(mkHourly())
} })
a(degrade.fields.tempC === 29, 'la qualite de l air en panne ne prive pas des conditions')

console.log('\nALL PASS')
