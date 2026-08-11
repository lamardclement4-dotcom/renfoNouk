// ============================================================
// Conditions d'entraînement et adaptation de la charge.
//
// La même allure ne coûte pas la même chose à 12 °C et à 30 °C : la
// chaleur détourne une partie du débit sanguin vers la peau, la fréquence
// cardiaque grimpe à puissance égale et l'allure soutenable chute. Ce
// module traduit des conditions en ajustements concrets (intensité,
// volume, hydratation) plutôt qu'en simple constat.
//
// Le lieu compte autant que la météo : sur home-trainer on perd le vent
// relatif qui évacue la chaleur dehors, si bien que 22 °C en intérieur
// sans ventilateur se vivent comme nettement plus chaud. Le type de lieu
// détermine donc les champs pertinents et les conseils.
//
// Les valeurs sont des ordres de grandeur issus des repères usuels de
// physiologie de l'effort, pas des prédictions individuelles.
// ============================================================

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Number(null) et Number('') valent 0, qui est fini : sans ce filtre, une
// donnée absente serait lue comme 0 °C ou 0 % et produirait un conseil
// franchement faux (« grand froid » sur une température manquante).
const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// ─── Lieux ───────────────────────────────────────────────────
export const ENVIRONMENTS = [
  { id: 'exterieur', label: 'Extérieur', icon: 'sun', outdoor: true },
  { id: 'salle', label: 'Salle', icon: 'dumbbell', outdoor: false },
  { id: 'domicile', label: 'Domicile', icon: 'home', outdoor: false },
  { id: 'tapis', label: 'Tapis / home-trainer', icon: 'route', outdoor: false, stationary: true },
  { id: 'piscine', label: 'Piscine', icon: 'wave', outdoor: false, water: true },
]

export const DEFAULT_ENV = 'exterieur'
export function envInfo(id) {
  return ENVIRONMENTS.find((e) => e.id === id) || ENVIRONMENTS.find((e) => e.id === DEFAULT_ENV)
}

// Champs catégoriels, saisis par choix plutôt qu'au clavier.
export const SUN_OPTIONS = [
  { id: 'ombre', label: 'Ombre', bump: 0 },
  { id: 'variable', label: 'Nuageux', bump: 1 },
  { id: 'plein', label: 'Plein soleil', bump: 4 },
]
export const PRECIP_OPTIONS = [
  { id: 'sec', label: 'Sec' },
  { id: 'pluie', label: 'Pluie' },
  { id: 'averses', label: 'Averses' },
  { id: 'neige', label: 'Neige' },
]
// Sur engin fixe, l'air ne circule pas : c'est le poste le plus
// sous-estimé de la charge thermique en intérieur.
export const AIRFLOW_OPTIONS = [
  { id: 'aucun', label: 'Aucun', bump: 5 },
  { id: 'ventilateur', label: 'Ventilateur', bump: 1 },
  { id: 'clim', label: 'Climatisation', bump: -1 },
  { id: 'ouvert', label: 'Fenêtres ouvertes', bump: 2 },
]

const optBump = (list, id, fallback = 0) => {
  const o = list.find((x) => x.id === id)
  return o && typeof o.bump === 'number' ? o.bump : fallback
}

// ─── Indices physiques ───────────────────────────────────────

// Indice de chaleur (Rothfusz, National Weather Service) : combine
// température et humidité. À 32 °C, 30 % d'humidité se vivent comme
// 31 °C, mais 80 % comme 44 °C. La régression ne vaut qu'en climat
// chaud ; sous 27 °C elle diverge, on rend la température brute.
export function heatIndex(tempC, humidity) {
  const t = num(tempC), rh = num(humidity)
  if (t == null) return null
  if (rh == null || t < 27) return Math.round(t * 10) / 10
  const T = t * 9 / 5 + 32
  const R = clamp(rh, 0, 100)
  let hi = -42.379 + 2.04901523 * T + 10.14333127 * R
    - 0.22475541 * T * R - 6.83783e-3 * T * T - 5.481717e-2 * R * R
    + 1.22874e-3 * T * T * R + 8.5282e-4 * T * R * R - 1.99e-6 * T * T * R * R
  if (R < 13 && T >= 80 && T <= 112) hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17)
  else if (R > 85 && T >= 80 && T <= 87) hi += ((R - 85) / 10) * ((87 - T) / 5)
  return Math.round(((hi - 32) * 5 / 9) * 10) / 10
}

// Refroidissement éolien (JAG/TI), sous 10 °C et au-delà de 5 km/h.
export function windChill(tempC, windKmh) {
  const t = num(tempC), w = num(windKmh)
  if (t == null) return null
  if (w == null || t > 10 || w < 5) return Math.round(t * 10) / 10
  const v = Math.pow(w, 0.16)
  return Math.round((13.12 + 0.6215 * t - 11.37 * v + 0.3965 * t * v) * 10) / 10
}

// Point de rosée : meilleur indicateur d'inconfort à l'effort que
// l'humidité relative, car il ne dépend pas de la température. Au-delà de
// 16 °C il devient perceptible, au-delà de 20 °C franchement pénalisant.
export function dewPoint(tempC, humidity) {
  const t = num(tempC), rh = num(humidity)
  if (t == null || rh == null || rh <= 0) return null
  const a = 17.27, b = 237.7
  const g = (a * t) / (b + t) + Math.log(clamp(rh, 1, 100) / 100)
  return Math.round((b * g) / (a - g) * 10) / 10
}

export function dewPointVerdict(dp) {
  if (dp == null) return null
  if (dp >= 24) return { level: 'danger', text: 'Air saturé : la sueur ne s’évapore quasiment plus, la thermorégulation est très dégradée.' }
  if (dp >= 20) return { level: 'high', text: 'Air lourd : l’évaporation de la sueur est fortement freinée.' }
  if (dp >= 16) return { level: 'moderate', text: 'Humidité perceptible à l’effort.' }
  return { level: 'ok', text: 'Air sec, évaporation efficace.' }
}

// ─── Température ressentie à l'effort ────────────────────────
// Empile les effets : base météo, rayonnement solaire, absence de flux
// d'air en intérieur. C'est ce ressenti corrigé qui pilote les
// ajustements, pas la température affichée par l'application météo.
export function effectiveTemp(c) {
  const env = envInfo(c.environment)
  const t = num(c.tempC)
  if (t == null) return null
  // Une température ressentie fournie par l'application météo fait
  // autorité sur notre propre calcul : elle intègre déjà rayonnement et
  // vent mesurés sur place.
  const provided = num(c.feelsLikeC)
  let base = provided != null ? provided
    : t >= 27 ? heatIndex(t, c.humidity)
      : t <= 10 && env.outdoor ? windChill(t, c.windKmh)
        : t
  if (env.outdoor && provided == null) base += optBump(SUN_OPTIONS, c.sun)
  if (env.stationary) base += optBump(AIRFLOW_OPTIONS, c.airflow, 5)
  else if (!env.outdoor && c.airflow) base += Math.min(2, optBump(AIRFLOW_OPTIONS, c.airflow))
  return Math.round(base * 10) / 10
}

// Surcoût de l'effort dû à la chaleur. Le seuil neutre est fixé à 18 °C :
// en dessous, annoncer un ajustement contredirait le diagnostic
// « conditions favorables » affiché au même endroit.
export function heatPenalty(feels) {
  if (feels == null || feels <= 18) return 0
  const steps = [[22, 2], [25, 4], [27, 7], [30, 11], [33, 16], [36, 22], [40, 30]]
  for (const [limit, pct] of steps) if (feels <= limit) return pct
  return 35
}

// Perte de capacité aérobie en altitude : sensible dès 1500 m, de l'ordre
// de 2 % par tranche de 300 m au-dessus.
export function altitudePenalty(meters) {
  const m = num(meters)
  if (m == null || m <= 1500) return 0
  return Math.round(Math.min(30, (m - 1500) / 300 * 2) * 10) / 10
}

// Le vent de face pèse surtout en course et en vélo. Volontairement
// grossier : la pénalité réelle dépend de l'orientation du parcours.
export function windPenalty(windKmh) {
  const w = num(windKmh)
  if (w == null || w < 20) return 0
  if (w < 30) return 2
  if (w < 40) return 4
  if (w < 55) return 7
  return 10
}

// Eau froide : le corps dépense pour se réchauffer. Eau chaude : sur les
// séries longues, la chaleur ne s'évacue plus.
export function waterPenalty(waterTempC) {
  const w = num(waterTempC)
  if (w == null) return 0
  if (w < 18) return 8
  if (w < 22) return 4
  if (w > 31) return 6
  if (w > 29) return 3
  return 0
}

export function riskLevel(feels, c) {
  if (feels == null) return { level: 'unknown', label: 'Conditions inconnues' }
  if (feels >= 36) return { level: 'danger', label: 'Chaleur dangereuse' }
  if (feels >= 30) return { level: 'high', label: 'Forte chaleur' }
  if (feels >= 25) return { level: 'moderate', label: 'Chaleur modérée' }
  if (feels <= -10) return { level: 'danger', label: 'Froid extrême' }
  if (feels <= -2) return { level: 'high', label: 'Grand froid' }
  if (feels <= 5) return { level: 'moderate', label: 'Froid' }
  if (c && num(c.windKmh) >= 40) return { level: 'moderate', label: 'Vent fort' }
  if (c && (c.precip === 'neige')) return { level: 'moderate', label: 'Neige' }
  return { level: 'ok', label: 'Conditions favorables' }
}

// Même seuil neutre que le surcoût d'effort : sous 18 °C ressentis, boire
// à sa soif suffit.
export function extraHydrationMlPerHour(feels) {
  if (feels == null || feels <= 18) return 0
  if (feels <= 22) return 200
  if (feels <= 26) return 350
  if (feels <= 30) return 500
  if (feels <= 35) return 700
  return 900
}

// ─── Synthèse ────────────────────────────────────────────────
export function weatherAdvice(conditions, { sessionMins = 60 } = {}) {
  const c = conditions || {}
  const env = envInfo(c.environment)
  const feels = effectiveTemp(c)
  if (feels == null) return null

  const heat = heatPenalty(feels)
  const alt = env.outdoor ? altitudePenalty(c.altitudeM) : 0
  const wind = env.outdoor ? windPenalty(c.windKmh) : 0
  const water = env.water ? waterPenalty(c.waterTempC) : 0
  const effort = Math.min(45, heat + alt + wind + water)
  const risk = riskLevel(feels, env.outdoor ? c : { ...c, windKmh: null, precip: null })
  const hydration = env.water ? 0 : Math.round(extraHydrationMlPerHour(feels) * (sessionMins / 60))
  const dp = dewPoint(c.tempC, c.humidity)
  const dpVerdict = dewPointVerdict(dp)

  const tips = []
  if (heat >= 2) {
    tips.push(`Vise une allure ${heat} % plus lente à effort ressenti égal — la fréquence cardiaque monte seule à cette température.`)
    if (feels >= 25) tips.push('Bois avant d’avoir soif : à cette chaleur la soif arrive après le début de la déshydratation.')
  }
  if (risk.level === 'danger' && feels >= 36) {
    tips.unshift('Reporte la séance intense ou change de lieu : à ce niveau le risque de coup de chaleur est réel.')
  }
  if (dpVerdict && (dpVerdict.level === 'high' || dpVerdict.level === 'danger')) tips.push(dpVerdict.text)

  if (env.stationary) {
    const bump = optBump(AIRFLOW_OPTIONS, c.airflow, 5)
    if (bump >= 4) tips.push('Sur engin fixe, l’air ne circule pas : sans ventilateur la charge thermique équivaut à environ 5 °C de plus qu’en extérieur. Un ventilateur change tout.')
    else if (bump >= 1) tips.push('Garde le ventilateur face à toi pendant tout l’effort, pas seulement à la fin.')
    tips.push('Prévois une serviette et un bidon de plus qu’en extérieur : rien ne sèche tout seul.')
  } else if (!env.outdoor) {
    if (feels >= 24) tips.push('Salle chaude : cherche un point ventilé et allège les séries longues.')
  }

  if (env.outdoor) {
    if (feels >= 30) tips.push('Décale la séance tôt le matin ou en soirée, et cherche l’ombre.')
    if (c.sun === 'plein' && feels >= 24) tips.push('Plein soleil : le rayonnement ajoute à la charge thermique, préfère un parcours ombragé.')
    if (feels <= 5) {
      tips.push('Allonge l’échauffement : muscles et tendons sont moins élastiques au froid, le risque de claquage augmente.')
      if (feels <= -2) tips.push('Couvre les extrémités et protège les voies respiratoires sur les efforts intenses.')
    }
    if (wind > 0) tips.push('Vent marqué : privilégie un parcours abrité, ou pars face au vent pour finir vent dans le dos.')
    if (c.precip === 'pluie' || c.precip === 'averses') tips.push('Pluie : attention aux appuis et au refroidissement à l’arrêt, prévois une couche sèche pour après.')
    if (c.precip === 'neige') tips.push('Neige : adhérence réduite, raccourcis les foulées et oublie les allures cibles.')
    if (alt > 0) tips.push(`Altitude : environ ${alt} % de capacité aérobie en moins, compte plusieurs jours d’adaptation.`)
    if (num(c.uv) != null && c.uv >= 6) tips.push('Indice UV élevé : crème solaire et casquette, même par temps couvert.')
    if (num(c.aqi) != null && c.aqi >= 100) tips.push('Qualité de l’air dégradée : évite les séances intenses en extérieur et les axes routiers.')
  }

  if (env.water) {
    const w = num(c.waterTempC)
    if (w != null && w < 22) tips.push('Eau fraîche : échauffe-toi à sec avant d’entrer, et raccourcis les récupérations pour ne pas refroidir.')
    if (w != null && w > 29) tips.push('Eau chaude : sur les séries longues la chaleur ne s’évacue plus, bois entre les séries malgré la sensation de fraîcheur.')
  }

  if (!tips.length) tips.push('Rien à ajuster : les conditions se prêtent à une séance normale.')

  const volumeCut = effort >= 20 ? Math.min(30, Math.round(effort * 0.6)) : 0
  return { feels, heat, alt, wind, water, effort, volumeCut, risk, hydration, tips, dewPoint: dp, dewVerdict: dpVerdict, env }
}

export function adjustPace(secPerKm, effortPct) {
  const s = num(secPerKm)
  if (s == null || !(s > 0) || !effortPct) return null
  return Math.round(s * (1 + effortPct / 100))
}

export function fmtPace(secPerKm) {
  if (secPerKm == null || !(secPerKm > 0)) return '—'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Compatibilité : d'autres modules (objectif d'hydratation) appellent
// encore feelsLike sur des conditions sans lieu explicite.
export function feelsLike(c) {
  return effectiveTemp(c || {})
}
