// ============================================================
// Analyse du sommeil sur la durée.
//
// L'application n'exploitait que la nuit du jour : un score isolé, sans
// mémoire. Or ce qui pèse sur la récupération n'est pas une nuit mais
// l'accumulation — une dette qui s'installe, et surtout une irrégularité
// des horaires, dont la littérature récente fait un marqueur au moins
// aussi parlant que la durée moyenne.
//
// Le besoin n'est pas non plus fixe : il monte avec la charge
// d'entraînement. Comparer un athlète en grosse semaine à une norme de
// huit heures reviendrait à masquer son déficit réel.
//
// Indicateurs de suivi, pas diagnostic médical.
// ============================================================

// Les nombres s'écrivent avec une virgule : « 3.6 h » n'est pas du français.
const fr = (v) => String(v).replace('.', ',')

const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Jour courant en heure LOCALE. `new Date().toISOString()` renvoie le jour
// UTC : dans un fuseau en avance sur UTC, entre minuit et deux heures du
// matin, il désigne la veille — la prise du jour n'était alors pas comptée
// et la série paraissait rompue.
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

// 0 = lundi … 6 = dimanche.
export function dowOf(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

// Nuits renseignées sur la fenêtre, de la plus ancienne à la plus récente.
// Bornes du plausible. La saisie manuelle est bridée entre trois et douze
// heures par l'écran, mais l'import Apple Santé écrit ce qu'il trouve : un
// segment mal formé, et une nuit de trente heures entre dans le calcul. Elle
// y produit un « surplus » de vingt-deux heures qui efface des semaines de
// déficit réel — le pire des cas, puisque le chiffre affiché devient faux
// sans que rien ne le signale.
export const MIN_PLAUSIBLE_H = 1
export const MAX_PLAUSIBLE_H = 14

export function plausibleHours(h) {
  const v = num(h)
  if (v == null || v < MIN_PLAUSIBLE_H || v > MAX_PLAUSIBLE_H) return null
  return v
}

export function sleepSeries(sleepLog, { days = 14, today } = {}) {
  const ref = today || todayISO()
  const log = sleepLog || {}
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftISO(ref, -i)
    const e = log[date]
    const h = e ? plausibleHours(e.hours) : null
    if (h != null) out.push({ date, hours: h, quality: num(e.quality), awakenings: num(e.awakenings) || 0 })
  }
  return out
}

// Besoin personnalisé. La base retenue est de huit heures, majorée quand
// le volume d'entraînement de la semaine est important : la demande de
// récupération monte avec la charge, et garder une norme fixe ferait
// passer un déficit réel pour un sommeil suffisant.
export const BASE_NEED = 8

export function neededHours(weeklyTrainingMins) {
  const m = num(weeklyTrainingMins) || 0
  if (m >= 600) return BASE_NEED + 1
  if (m >= 300) return BASE_NEED + 0.5
  return BASE_NEED
}

// Dette cumulée sur la fenêtre : somme des écarts au besoin, en ne
// comptant que les nuits renseignées — extrapoler sur les nuits absentes
// inventerait une dette.
// Une nuit longue rattrape une partie du retard, pas la totalité, et pas sans
// limite : le corps ne met pas le sommeil en réserve. Le surplus était pourtant
// déduit heure pour heure et sans plafond, si bien que deux grasses matinées
// ramenaient dix-huit heures de dette à onze — alors que l'analyse ajoutait,
// deux lignes plus bas, que « le besoin est là toute la semaine, c'est
// l'occasion de dormir qui manque ». Elle se contredisait.
//
// Le crédit d'une nuit est donc plafonné, et la dette nette ne descend pas
// sous zéro : une dette ne devient pas une avance.
export const MAX_CREDIT_PER_NIGHT = 1

export function sleepDebt(series, need) {
  if (!series || !series.length || !(need > 0)) return null
  let debt = 0
  for (const n of series) debt += Math.max(0, need - n.hours)
  const surplus = series.reduce((a, n) => a + Math.max(0, n.hours - need), 0)
  const credit = series.reduce((a, n) => a + Math.min(MAX_CREDIT_PER_NIGHT, Math.max(0, n.hours - need)), 0)
  const net = Math.max(0, Math.round((debt - credit) * 10) / 10)
  return {
    debt: Math.round(debt * 10) / 10,
    surplus: Math.round(surplus * 10) / 10,
    credit: Math.round(credit * 10) / 10,
    net,
    nights: series.length,
    mean: Math.round(series.reduce((a, n) => a + n.hours, 0) / series.length * 10) / 10,
  }
}

// Régularité : dispersion des durées autour de leur moyenne. Se coucher
// et se lever à heures constantes pèse autant que le total dormi, et
// c'est un levier bien plus actionnable qu'une injonction à « dormir
// plus ».
export function regularity(series) {
  if (!series || series.length < 3) return null
  const mean = series.reduce((a, n) => a + n.hours, 0) / series.length
  const variance = series.reduce((a, n) => a + (n.hours - mean) ** 2, 0) / series.length
  const sd = Math.sqrt(variance)
  const rounded = Math.round(sd * 100) / 100
  let level, text
  if (sd < 0.5) { level = 'ok'; text = 'Durées très régulières : c’est le meilleur socle de récupération.' }
  else if (sd < 1) { level = 'ok'; text = 'Sommeil globalement régulier.' }
  else if (sd < 1.5) { level = 'warn'; text = 'Durées assez variables d’une nuit à l’autre : stabiliser les horaires vaut souvent mieux que rallonger une nuit.' }
  else { level = 'alert'; text = 'Durées très irrégulières : l’organisme ne cale pas son rythme, la récupération en pâtit même si la moyenne paraît correcte.' }
  return { sd: rounded, mean: Math.round(mean * 10) / 10, level, text }
}

// Écart semaine / week-end. Un net rattrapage le week-end trahit une
// restriction en semaine plutôt qu'un vrai besoin supplémentaire.
export function weekendCatchUp(series) {
  if (!series || series.length < 5) return null
  const week = series.filter((n) => dowOf(n.date) <= 4)
  const wknd = series.filter((n) => dowOf(n.date) >= 5)
  if (week.length < 3 || wknd.length < 2) return null
  const avg = (arr) => arr.reduce((a, n) => a + n.hours, 0) / arr.length
  const gap = Math.round((avg(wknd) - avg(week)) * 10) / 10
  return {
    weekday: Math.round(avg(week) * 10) / 10,
    weekend: Math.round(avg(wknd) * 10) / 10,
    gap,
    flagged: gap >= 1,
  }
}

// Sommeil des nuits qui suivent une séance, comparé aux autres. Un écart
// marqué oriente vers un effet de l'entraînement sur le sommeil, souvent
// lié aux séances tardives ou très intenses.
export function sleepAfterTraining(series, planningSessions) {
  if (!series || series.length < 4) return null
  const trained = new Set((planningSessions || [])
    .filter((s) => s && s.statut === 'realise' && s.date)
    .map((s) => s.date))
  // La nuit qui suit une séance est enregistrée le lendemain.
  const after = series.filter((n) => trained.has(shiftISO(n.date, -1)))
  const rest = series.filter((n) => !trained.has(shiftISO(n.date, -1)))
  if (after.length < 2 || rest.length < 2) return null
  const avg = (arr) => arr.reduce((a, n) => a + n.hours, 0) / arr.length
  const diff = Math.round((avg(after) - avg(rest)) * 10) / 10
  return {
    afterTraining: Math.round(avg(after) * 10) / 10,
    afterRest: Math.round(avg(rest) * 10) / 10,
    diff,
    nightsAfter: after.length,
    flagged: diff <= -0.5,
  }
}

// Synthèse consommée par l'écran.
export function sleepAnalysis(db, { days = 14, today, weeklyTrainingMins = 0 } = {}) {
  const series = sleepSeries(db && db.sleepLog, { days, today })
  if (!series.length) return { series: [], nights: 0 }
  const need = neededHours(weeklyTrainingMins)
  const debt = sleepDebt(series, need)
  const reg = regularity(series)
  const catchUp = weekendCatchUp(series)
  const afterTraining = sleepAfterTraining(series, db && db.planningSessions)
  const quality = series.filter((n) => n.quality)
  const meanQuality = quality.length ? Math.round(quality.reduce((a, n) => a + n.quality, 0) / quality.length * 10) / 10 : null

  const tips = []
  if (debt && debt.net >= 5) tips.push(`Dette de ${fr(debt.net)} h accumulée sur ${debt.nights} nuits : c’est le poste de récupération à traiter en premier, avant tout complément ou protocole.`)
  else if (debt && debt.net >= 2) tips.push(`Léger déficit cumulé (${fr(debt.net)} h) : une demi-heure de plus par nuit suffirait à le résorber.`)
  if (reg && reg.level !== 'ok') tips.push(reg.text)
  if (catchUp && catchUp.flagged) tips.push(`Tu récupères ${fr(catchUp.gap)} h de plus le week-end (${fr(catchUp.weekend)} h contre ${fr(catchUp.weekday)} h en semaine) : le besoin est là toute la semaine, c’est l’occasion de dormir qui manque.`)
  if (afterTraining && afterTraining.flagged) tips.push(`Tu dors ${fr(Math.abs(afterTraining.diff))} h de moins après une séance : vérifie l’horaire de tes entraînements tardifs et la caféine en fin de journée.`)
  if (need > BASE_NEED) tips.push(`Ton volume d’entraînement actuel élève le besoin à environ ${fr(need)} h par nuit.`)
  if (!tips.length) tips.push('Rien à signaler : durée et régularité tiennent la route.')

  return {
    series, nights: series.length, need, debt, regularity: reg,
    catchUp, afterTraining, meanQuality, tips,
  }
}
