// ============================================================
// Ce que la forme du jour doit savoir au-delà de la nuit : le volume de
// la semaine (il règle le besoin de sommeil), la séance d'hier comparée à
// une séance habituelle, les jours d'entraînement enchaînés, une douleur
// en cours.
//
// Séparé de sommeilForme.js : ce module lit les séances et la prévention,
// et renfoIntel importe déjà sommeilForme — l'inverse ferait une boucle.
// ============================================================
import { rolling7Mins, dureeToMins } from '../train/renfoIntel'
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

// Signaux du cœur : pouls au réveil (saisi avec la nuit) ou, à défaut,
// fréquence cardiaque de repos et variabilité cardiaque importées d'Apple
// Santé. La normale est la moyenne des 28 jours d'avant, dès cinq mesures,
// prise dans la même source que la valeur du jour : un pouls pris allongé
// au réveil et une FC de repos calculée sur la journée ne se comparent pas.
const dansBornes = (x, lo, hi) => { const n = Number(x); return x != null && x !== '' && Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : null }
function serieAvant(iso, lire, jours = 28) {
  const l = []
  for (let k = 1; k <= jours; k++) { const x = lire(decaler(iso, -k)); if (x != null) l.push(x) }
  return l
}
const moyenneOuNull = (l) => (l.length >= 5 ? Math.round(l.reduce((a, b) => a + b, 0) / l.length * 10) / 10 : null)
const poulsSaisi = (log) => (d) => dansBornes(log[d] && log[d].pouls, 30, 120)
// Normale du pouls au réveil avant ce jour : pour la montrer pendant la
// saisie, avant même que la valeur du jour existe.
export function normaleDuPouls(db, iso) {
  const avant = serieAvant(iso, poulsSaisi((db && db.sleepLog) || {}))
  return { normale: moyenneOuNull(avant), mesures: avant.length }
}
export function signauxCorps(db, iso) {
  const log = (db && db.sleepLog) || {}, vit = (db && db.vitalsLog) || {}
  const reveil = poulsSaisi(log)
  const repos = (d) => dansBornes(vit[d] && vit[d].restingHr, 30, 120)
  const hrv = (d) => dansBornes(vit[d] && vit[d].hrv, 5, 300)
  let pouls = null
  for (const [source, lire] of [['reveil', reveil], ['sante', repos]]) {
    if (lire(iso) == null) continue
    const avant = serieAvant(iso, lire)
    pouls = { valeur: lire(iso), normale: moyenneOuNull(avant), mesures: avant.length, source }
    break
  }
  const avantVfc = serieAvant(iso, hrv)
  const vfc = hrv(iso) != null ? { valeur: hrv(iso), normale: moyenneOuNull(avantVfc), mesures: avantVfc.length } : null
  return { pouls, vfc }
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
  return { minutesSemaine: rolling7Mins(db, iso), chargeHier, chargeHabituelle, joursDaffilee, douleur: douleurDu(db, iso), signaux: signauxCorps(db, iso) }
}

// `log` : un journal de sommeil pas encore enregistré (la nuit qu'on vient
// de saisir), qui sert aussi au contexte (pouls au réveil).
export function formeDb(db, iso, log) {
  const base = log ? { ...(db || {}), sleepLog: log } : db
  return formeDuJour((base && base.sleepLog) || {}, iso, formeContexte(base, iso))
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

// ─── La séance du jour, réglée sur la forme ───
// Alléger : un tiers de volume en moins, ramené au palier de durée du
// calendrier le plus proche (plus court que la séance). Null si la séance
// est déjà trop courte pour être allégée.
const PALIERS = [[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h'], [150, '2 h 30'], [180, '3 h']]
export function dureeAllegee(duree) {
  const m = dureeToMins(duree)
  if (!(m > 15)) return null
  const cible = m * 2 / 3
  const p = PALIERS.filter(([x]) => x < m).sort((a, b) => Math.abs(a[0] - cible) - Math.abs(b[0] - cible) || a[0] - b[0])[0]
  return p ? p[1] : null
}

// Ce qu'on propose pour une séance prévue aujourd'hui : alléger en forme
// moyenne, alléger ou décaler à demain en récupération. Rien en bonne forme.
export function reglagesSeance(forme, seance) {
  if (!forme || !seance || seance.statut !== 'planifie') return []
  if (forme.niveau !== 'moyenne' && forme.niveau !== 'basse') return []
  const out = []
  // Déjà allégée : on ne réallège pas une séance à chaque passage.
  const dejaAllegee = !!(seance.reglage && seance.reglage.type === 'alleger')
  const allegee = dejaAllegee ? null : dureeAllegee(seance.duree)
  if (allegee) out.push({ id: 'alleger', lab: `Alléger : ${seance.duree} → ${allegee}`, duree: allegee })
  if (forme.niveau === 'basse') out.push({ id: 'decaler', lab: 'Décaler à demain', date: decaler(seance.date, 1) })
  return out
}
