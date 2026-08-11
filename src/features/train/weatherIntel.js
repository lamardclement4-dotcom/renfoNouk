// ============================================================
// Conditions météo et adaptation de la charge.
//
// La même allure ne coûte pas la même chose à 12 °C et à 30 °C : la
// chaleur détourne une partie du débit sanguin vers la peau, la
// fréquence cardiaque grimpe à puissance égale et l'allure soutenable
// chute. Ce module traduit des conditions en ajustements concrets
// (intensité, volume, hydratation) plutôt qu'en simple constat.
//
// Les valeurs sont des ordres de grandeur issus des repères usuels de
// physiologie de l'effort, pas des prédictions individuelles : elles sont
// présentées comme des fourchettes, et l'écran le dit.
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

// Indice de chaleur (Rothfusz, formule du National Weather Service).
// Il combine température et humidité en une température ressentie :
// à 32 °C, 30 % d'humidité se vivent comme 31 °C, mais 80 % comme 41 °C.
// La régression n'est valable qu'en climat chaud ; en dessous de 27 °C
// elle diverge, on rend donc la température brute.
export function heatIndex(tempC, humidity) {
  const t = num(tempC), rh = num(humidity)
  if (t == null) return null
  if (rh == null || t < 27) return Math.round(t * 10) / 10
  const T = t * 9 / 5 + 32
  const R = clamp(rh, 0, 100)
  let hi = -42.379 + 2.04901523 * T + 10.14333127 * R
    - 0.22475541 * T * R - 6.83783e-3 * T * T - 5.481717e-2 * R * R
    + 1.22874e-3 * T * T * R + 8.5282e-4 * T * R * R - 1.99e-6 * T * T * R * R
  // Corrections aux extrémités, prévues par la méthode d'origine.
  if (R < 13 && T >= 80 && T <= 112) hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17)
  else if (R > 85 && T >= 80 && T <= 87) hi += ((R - 85) / 10) * ((87 - T) / 5)
  return Math.round(((hi - 32) * 5 / 9) * 10) / 10
}

// Refroidissement éolien (formule JAG/TI), valable sous 10 °C et
// au-delà de 5 km/h. En dessous, le vent ne change pas le ressenti de
// façon significative.
export function windChill(tempC, windKmh) {
  const t = num(tempC), w = num(windKmh)
  if (t == null || w == null || t > 10 || w < 5) return t == null ? null : Math.round(t * 10) / 10
  const v = Math.pow(w, 0.16)
  return Math.round((13.12 + 0.6215 * t - 11.37 * v + 0.3965 * t * v) * 10) / 10
}

// Température ressentie retenue : chaleur ou froid selon le régime.
export function feelsLike(c) {
  const t = num(c.tempC)
  if (t == null) return null
  if (t >= 27) return heatIndex(t, c.humidity)
  if (t <= 10) return windChill(t, c.windKmh)
  return Math.round(t * 10) / 10
}

// Surcoût de l'effort dû à la chaleur, en pourcentage. Le seuil neutre est
// fixé à 18 °C : en dessous, annoncer un ajustement contredirait le
// diagnostic « conditions favorables » affiché au même endroit. Au-delà,
// l'allure soutenable se dégrade progressivement, et nettement passé
// 27 °C où la thermorégulation devient limitante.
export function heatPenalty(feels) {
  if (feels == null || feels <= 18) return 0
  const steps = [[22, 2], [25, 4], [27, 7], [30, 11], [33, 16], [36, 22], [40, 30]]
  for (const [limit, pct] of steps) if (feels <= limit) return pct
  return 35
}

// Perte de capacité aérobie en altitude : sensible à partir de 1500 m,
// de l'ordre de 2 % par tranche de 300 m au-dessus de ce seuil.
export function altitudePenalty(meters) {
  const m = num(meters)
  if (m == null || m <= 1500) return 0
  return Math.round(Math.min(30, (m - 1500) / 300 * 2) * 10) / 10
}

// Le vent de face pèse surtout en course et en vélo. On reste volontairement
// grossier : la pénalité réelle dépend de l'orientation du parcours, qu'on
// ne connaît pas.
export function windPenalty(windKmh) {
  const w = num(windKmh)
  if (w == null || w < 20) return 0
  if (w < 30) return 2
  if (w < 40) return 4
  if (w < 55) return 7
  return 10
}

// Niveau de risque global, qui pilote le ton des conseils.
export function riskLevel(feels, c) {
  if (feels == null) return { level: 'unknown', label: 'Conditions inconnues' }
  if (feels >= 36) return { level: 'danger', label: 'Chaleur dangereuse' }
  if (feels >= 30) return { level: 'high', label: 'Forte chaleur' }
  if (feels >= 25) return { level: 'moderate', label: 'Chaleur modérée' }
  if (feels <= -10) return { level: 'danger', label: 'Froid extrême' }
  if (feels <= -2) return { level: 'high', label: 'Grand froid' }
  if (feels <= 5) return { level: 'moderate', label: 'Froid' }
  if (c && num(c.windKmh) >= 40) return { level: 'moderate', label: 'Vent fort' }
  return { level: 'ok', label: 'Conditions favorables' }
}

// Hydratation supplémentaire conseillée pendant l'effort, en ml par heure.
// À l'ombre et au frais, boire à sa soif suffit ; en forte chaleur, la
// sudation dépasse largement ce que la soif réclame spontanément.
// Même seuil neutre que le surcoût d'effort : sous 18 °C ressentis, boire
// à sa soif suffit et afficher un supplément contredirait le diagnostic.
export function extraHydrationMlPerHour(feels) {
  if (feels == null || feels <= 18) return 0
  if (feels <= 22) return 200
  if (feels <= 26) return 350
  if (feels <= 30) return 500
  if (feels <= 35) return 700
  return 900
}

// Synthèse : ajustements et consignes pour une séance donnée.
// `sessionMins` sert au calcul d'hydratation, `sport` module les conseils.
export function weatherAdvice(conditions, { sessionMins = 60, sport } = {}) {
  const c = conditions || {}
  const feels = feelsLike(c)
  if (feels == null) return null
  const heat = heatPenalty(feels)
  const alt = altitudePenalty(c.altitudeM)
  const wind = windPenalty(c.windKmh)
  // Les pénalités se cumulent, mais on les plafonne : au-delà, le conseil
  // n'est plus « ralentis » mais « reporte ».
  const effort = Math.min(45, heat + alt + wind)
  const risk = riskLevel(feels, c)
  const hydration = Math.round(extraHydrationMlPerHour(feels) * (sessionMins / 60))

  const tips = []
  if (heat >= 2) {
    tips.push(`Vise une allure ${heat} % plus lente à effort ressenti égal — la fréquence cardiaque monte seule à cette température.`)
    if (feels >= 30) tips.push('Décale la séance tôt le matin ou en soirée, et cherche l’ombre.')
    if (feels >= 25) tips.push('Bois avant d’avoir soif : à cette chaleur la soif arrive après le début de la déshydratation.')
  }
  if (risk.level === 'danger' && feels >= 36) {
    tips.unshift('Reporte la séance intense ou passe en intérieur : à ce niveau le risque de coup de chaleur est réel.')
  }
  if (feels <= 5) {
    tips.push('Allonge l’échauffement : muscles et tendons sont moins élastiques au froid, le risque de claquage augmente.')
    if (feels <= -2) tips.push('Couvre les extrémités et protège les voies respiratoires sur les efforts intenses.')
  }
  if (alt > 0) tips.push(`Altitude : environ ${alt} % de capacité aérobie en moins, compte plusieurs jours d’adaptation.`)
  if (wind > 0) tips.push('Vent marqué : privilégie un parcours abrité, ou pars face au vent pour finir vent dans le dos.')
  if (num(c.uv) != null && c.uv >= 6) tips.push('Indice UV élevé : crème solaire et casquette, même par temps couvert.')
  if (num(c.aqi) != null && c.aqi >= 100) tips.push('Qualité de l’air dégradée : évite les séances intenses en extérieur et les axes routiers.')
  if (!tips.length) tips.push('Rien à ajuster : les conditions se prêtent à une séance normale.')

  // Le volume ne se réduit qu'en conditions franchement hostiles ; en deçà,
  // ralentir suffit.
  const volumeCut = effort >= 20 ? Math.min(30, Math.round(effort * 0.6)) : 0

  return { feels, heat, alt, wind, effort, volumeCut, risk, hydration, tips, sport }
}

// Allure ajustée : convertit une allure cible (secondes par km) en allure
// réaliste dans ces conditions.
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
