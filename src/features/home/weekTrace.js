// ============================================================
// Courbe de la semaine, pour l'accueil.
//
// Chaque point est la charge des 7 jours qui se terminent ce jour-là :
// une courbe glissante, qui monte les jours de séance et redescend quand
// une séance sort de la fenêtre. Le dernier point est donc exactement la
// charge aiguë du rapport aigu/chronique (acwrRisk), et la zone tracée
// derrière est celle où ce rapport reste raisonnable : 0,8 à 1,3 fois la
// charge hebdomadaire habituelle des 4 dernières semaines.
//
// La charge d'une séance est la même que partout ailleurs dans l'app :
// minutes × effort ressenti (RPE 5 = neutre) × pondération de la chaleur.
// ============================================================
import { dureeToMins } from '../train/renfoIntel'
import { loadMultiplier, heatAcclimation } from '../train/weatherIntel'

const JOUR = 86400000
const LETTRES = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function asList(v) {
  return Array.isArray(v) ? v.filter((x) => x != null) : []
}

function localISO(d) {
  const p = (n) => (n < 10 ? '0' : '') + n
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

// Jours écoulés entre deux dates ISO, en calendrier pur : compter en UTC
// évite qu'un changement d'heure ne décale une séance d'un jour.
function ecart(isoA, isoB) {
  const u = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
  return Math.round((u(isoA) - u(isoB)) / JOUR)
}

const VALIDE = /^\d{4}-\d{2}-\d{2}$/

export function sessionLoad(s, weather, acclim) {
  const rpe = Number(s.data && s.data.rpe)
  const intensite = Number.isFinite(rpe) && rpe > 0 ? rpe / 5 : 1
  const c = weather[s.date]
  const mins = dureeToMins(s.duree)
  if (!Number.isFinite(mins) || mins <= 0) return 0
  return mins * intensite * (c ? loadMultiplier(c, { acclimation: acclim }) : 1)
}

export function weekTrace(db, { today } = {}) {
  const ref = typeof today === 'string' && VALIDE.test(today) ? today : localISO(new Date())
  const [ry, rm, rd] = ref.split('-').map(Number)
  const refDate = new Date(ry, rm - 1, rd)
  const weather = (db && db.weatherLog && typeof db.weatherLog === 'object' && !Array.isArray(db.weatherLog)) ? db.weatherLog : {}
  const acclim = heatAcclimation(weather, refDate)

  // Charge jour par jour sur les 35 derniers jours (0 = aujourd'hui) : de
  // quoi tracer 7 points de 7 jours glissants et poser la zone sur 28 jours.
  const parJour = new Array(35).fill(0)
  const seances = new Array(35).fill(0)
  let plusAncien = null
  for (const s of asList(db && db.planningSessions)) {
    if (s.statut !== 'realise' || typeof s.date !== 'string' || !VALIDE.test(s.date)) continue
    const k = ecart(ref, s.date)
    if (k < 0) continue
    if (plusAncien == null || k > plusAncien) plusAncien = k
    if (k >= 35) continue
    const charge = sessionLoad(s, weather, acclim)
    // Une durée aberrante (saisie erronée, « 99999 h ») ne doit pas écraser
    // toute la courbe : on plafonne une séance à 12 heures d'effort maximal.
    parJour[k] += Math.min(charge, 12 * 60 * 2)
    seances[k] += 1
  }

  const fenetre = (debut) => { let t = 0; for (let k = debut; k < debut + 7; k++) t += parJour[k]; return t }
  const days = []
  for (let k = 6; k >= 0; k--) {
    const d = new Date(ry, rm - 1, rd - k)
    days.push({
      iso: localISO(d),
      letter: LETTRES[d.getDay()],
      value: Math.round(fenetre(k)),
      dayLoad: Math.round(parJour[k]),
      sessions: seances[k],
      isToday: k === 0,
    })
  }

  // La zone n'a de sens qu'avec un historique : mêmes conditions que le
  // rapport aigu/chronique (14 jours au moins, une charge habituelle non nulle).
  let chronicWeek = 0
  for (let k = 0; k < 28; k++) chronicWeek += parJour[k]
  chronicWeek /= 4
  const historique = plusAncien != null && plusAncien >= 14
  const band = historique && chronicWeek > 0
    ? { lo: Math.round(chronicWeek * 0.8), hi: Math.round(chronicWeek * 1.3), mean: Math.round(chronicWeek) }
    : null

  const acute = days[days.length - 1].value
  const max = Math.max(1, ...days.map((d) => d.value), band ? band.hi : 0)
  return {
    days,
    acute,
    band,
    ratio: band ? Math.round((acute / chronicWeek) * 100) / 100 : null,
    max,
    empty: days.every((d) => d.value === 0),
  }
}

// Géométrie de la courbe dans un repère donné : séparée du rendu pour être
// testée sans navigateur. Les marges laissent la place aux étiquettes.
export function traceGeometry(trace, { width = 340, height = 150, left = 6, right = 6, top = 22, bottom = 22 } = {}) {
  const n = trace.days.length
  const plotW = width - left - right
  const plotH = height - top - bottom
  // Un peu d'air au-dessus du point le plus haut.
  const plafond = trace.max * 1.15
  const x = (i) => left + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2)
  const y = (v) => top + plotH - (Math.max(0, v) / plafond) * plotH
  const points = trace.days.map((d, i) => [Math.round(x(i) * 10) / 10, Math.round(y(d.value) * 10) / 10])
  const band = trace.band ? { y1: Math.round(y(trace.band.hi) * 10) / 10, y2: Math.round(y(trace.band.lo) * 10) / 10 } : null
  return { points, band, baseline: top + plotH, top, left, right: width - right, width, height }
}
