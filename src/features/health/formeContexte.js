// ============================================================
// Ce que la forme du jour doit savoir au-delà de la nuit : le volume de
// la semaine (il règle le besoin de sommeil), la séance d'hier comparée à
// une séance habituelle, les jours d'entraînement enchaînés, une douleur
// en cours.
//
// Séparé de sommeilForme.js : ce module lit les séances et la prévention,
// et renfoIntel importe déjà sommeilForme — l'inverse ferait une boucle.
// ============================================================
import { rolling7Mins } from '../train/renfoIntel'
import { sessionLoad } from '../home/weekTrace'
import { heatAcclimation } from '../train/weatherIntel'
import { painEpisodes, regionLabel } from './preventionIntel'
import { decaler } from './sommeilReveil'
import { formeDuJour, formeSerie, coucherConseille } from './sommeilForme'
import { neededHours, sleepDebt, sleepSeries } from './sleepIntel'

const VALIDE = /^\d{4}-\d{2}-\d{2}$/

// Charge jour par jour, en points (minutes × effort ressenti × chaleur),
// sur les `jours` jours qui précèdent `iso` (iso exclu).
function chargesAvant(db, iso, jours) {
  const debut = decaler(iso, -jours)
  const weather = db && db.weatherLog && typeof db.weatherLog === 'object' && !Array.isArray(db.weatherLog) ? db.weatherLog : {}
  const [y, m, d] = iso.split('-').map(Number)
  const acclim = heatAcclimation(weather, new Date(y, m - 1, d))
  const parJour = {}
  const seances = Array.isArray(db && db.planningSessions) ? db.planningSessions : []
  for (const s of seances) {
    if (!s || s.statut !== 'realise' || typeof s.date !== 'string' || !VALIDE.test(s.date)) continue
    if (s.date < debut || s.date >= iso) continue
    // Une durée aberrante ne doit pas tout écraser : 12 heures d'effort
    // maximal au plus, comme la courbe de l'accueil.
    parJour[s.date] = (parJour[s.date] || 0) + Math.min(sessionLoad(s, weather, acclim), 12 * 60 * 2)
  }
  return parJour
}

// La douleur qui couvre ce jour-là : épisode ouvert, ou refermé plus tard
// (le jour où le bilan la dit disparue n'en fait plus partie).
function douleurDu(db, iso) {
  const ep = painEpisodes(db).filter((e) => e.start <= iso && (!e.end || e.end > iso)).pop()
  if (ep) {
    const [ay, am, ad] = ep.start.split('-').map(Number), [by, bm, bd] = iso.split('-').map(Number)
    const jours = Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
    return { region: regionLabel(ep.region), jours, urgent: !!ep.urgent }
  }
  // Douleur cochée dans le bilan sans épisode daté : on la sait présente
  // depuis le bilan, pas depuis quand exactement.
  const p = db && db.prevention && db.prevention.pain
  const dateBilan = db && db.prevention && typeof db.prevention.date === 'string' ? db.prevention.date.slice(0, 10) : null
  if (p && p.active && (!dateBilan || dateBilan <= iso)) return { region: p.region ? regionLabel(p.region) : null, jours: null, urgent: !!p.urgent }
  return null
}

export function formeContexte(db, iso) {
  const parJour = chargesAvant(db, iso, 29)
  const hier = decaler(iso, -1)
  const chargeHier = Math.round(parJour[hier] || 0)
  // Séance habituelle : moyenne des jours entraînés sur les quatre semaines
  // d'avant (hier exclu), dès trois séances.
  const jours = []
  for (let k = 2; k <= 29; k++) { const v = parJour[decaler(iso, -k)]; if (v > 0) jours.push(v) }
  const chargeHabituelle = jours.length >= 3 ? Math.round(jours.reduce((a, b) => a + b, 0) / jours.length) : null
  let joursDaffilee = 0
  while (joursDaffilee < 28 && parJour[decaler(iso, -(joursDaffilee + 1))] > 0) joursDaffilee++
  return { minutesSemaine: rolling7Mins(db, iso), chargeHier, chargeHabituelle, joursDaffilee, douleur: douleurDu(db, iso) }
}

export function formeDb(db, iso, log) {
  return formeDuJour(log || (db && db.sleepLog) || {}, iso, formeContexte(db, iso))
}

export function formeSemaine(db, iso, n = 7) {
  return formeSerie((db && db.sleepLog) || {}, iso, (d) => formeContexte(db, d), n)
}

// Coucher conseillé pour la nuit qui vient, avec le besoin et la dette du
// moment.
export function coucherDuSoir(db, iso) {
  const log = (db && db.sleepLog) || {}
  const besoin = neededHours(rolling7Mins(db, iso))
  const dette = sleepDebt(sleepSeries(log, { days: 14, today: iso }), besoin)
  return coucherConseille(log, iso, { besoin, routine: db && db.sleepRoutine, dette: dette ? Math.max(0, dette.net) : 0 })
}
