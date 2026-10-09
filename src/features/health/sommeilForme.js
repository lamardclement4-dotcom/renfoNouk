// ============================================================
// Sommeil, deuxième étage : heures de coucher et de lever, ce qui s'est
// passé la veille, ce qui influence vraiment les nuits, et la forme du
// jour qu'on en tire pour la séance.
// ============================================================
import { sleepSeries, neededHours, sleepDebt, plausibleHours } from './sleepIntel'
import { reveilDe, decaler } from './sommeilReveil'

const fr = (x) => String(x).replace('.', ',')

// ─── Heures ───
export function minutesDe(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''))
  if (!m) return null
  const h = Number(m[1]), mi = Number(m[2])
  if (h > 23 || mi > 59) return null
  return h * 60 + mi
}
export function hhmm(min) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
}
// Durée de sommeil depuis le coucher, le lever et le temps mis à
// s'endormir, au quart d'heure près. Null si incohérent.
export function dureeDepuisHeures(coucher, lever, endormissement = 0) {
  const a = minutesDe(coucher), b = minutesDe(lever)
  if (a == null || b == null) return null
  let lit = b - a
  if (lit <= 0) lit += 1440
  const sommeil = (lit - Math.max(0, Number(endormissement) || 0)) / 60
  const arrondi = Math.round(sommeil * 4) / 4
  return plausibleHours(arrondi)
}
export function libelleDuree(h) {
  if (!(h > 0)) return '—'
  const total = Math.round(h * 60), hh = Math.floor(total / 60), mm = total % 60
  if (!hh) return `${mm} min`
  return mm ? `${hh} h ${String(mm).padStart(2, '0')}` : `${hh} h`
}

// ─── La veille ───
export const FACTEURS = [
  { id: 'cafeine', lab: 'Café après 14 h' },
  { id: 'alcool', lab: 'Alcool' },
  { id: 'ecrans', lab: 'Écrans au lit' },
  { id: 'repas', lab: 'Repas tardif' },
  { id: 'seance', lab: 'Séance tardive' },
  { id: 'stress', lab: 'Journée stressante' },
  { id: 'chaleur', lab: 'Chambre trop chaude' },
  { id: 'bruit', lab: 'Bruit, lumière' },
  { id: 'voyage', lab: 'Voyage, décalage' },
]
const FACTEUR = Object.fromEntries(FACTEURS.map((f) => [f.id, f]))
export function facteursDe(e) {
  return e && Array.isArray(e.facteurs) ? e.facteurs.filter((f) => FACTEUR[f]) : []
}

// ─── Ce qui influence tes nuits ───
// Pour chaque facteur noté au moins 3 fois sur la période, et absent au
// moins 3 fois : écart moyen de durée, d'énergie au réveil et de qualité
// entre les nuits avec et sans. N'est retenu que ce qui pèse vraiment
// (un quart d'heure, un demi-point d'énergie ou de qualité).
export function influences(log, aujourdhui, jours = 30) {
  const nuits = []
  for (let k = 0; k < jours; k++) {
    const iso = decaler(aujourdhui, -k)
    const e = (log || {})[iso]
    const h = e ? plausibleHours(e.hours) : null
    if (h == null) continue
    nuits.push({ h, q: Number(e.quality) || null, en: reveilDe(e).energie, f: facteursDe(e) })
  }
  const moy = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null)
  const out = []
  for (const fa of FACTEURS) {
    const avec = nuits.filter((n) => n.f.includes(fa.id)), sans = nuits.filter((n) => !n.f.includes(fa.id))
    if (avec.length < 3 || sans.length < 3) continue
    const dH = moy(avec.map((n) => n.h)) - moy(sans.map((n) => n.h))
    const eA = avec.filter((n) => n.en != null).map((n) => n.en), eS = sans.filter((n) => n.en != null).map((n) => n.en)
    const dE = eA.length >= 2 && eS.length >= 2 ? moy(eA) - moy(eS) : null
    const qA = avec.filter((n) => n.q).map((n) => n.q), qS = sans.filter((n) => n.q).map((n) => n.q)
    const dQ = qA.length >= 2 && qS.length >= 2 ? moy(qA) - moy(qS) : null
    const fortH = Math.abs(dH) >= 0.25, fortE = dE != null && Math.abs(dE) >= 0.5, fortQ = dQ != null && Math.abs(dQ) >= 0.5
    if (!fortH && !fortE && !fortQ) continue
    const morceaux = []
    if (fortH) morceaux.push(`${libelleDuree(Math.abs(dH))} de sommeil en ${dH < 0 ? 'moins' : 'plus'}`)
    if (fortE) morceaux.push(`énergie au réveil ${fr(Math.round(Math.abs(dE) * 10) / 10)} point${Math.abs(dE) >= 1.5 ? 's' : ''} plus ${dE < 0 ? 'basse' : 'haute'}`)
    if (fortQ) morceaux.push(`qualité ${fr(Math.round(Math.abs(dQ) * 10) / 10)} plus ${dQ < 0 ? 'basse' : 'haute'}`)
    const poids = Math.abs(dH) * 2 + Math.abs(dE || 0) + Math.abs(dQ || 0) * 0.6
    out.push({ id: fa.id, lab: fa.lab, n: avec.length, dHeures: Math.round(dH * 100) / 100, dEnergie: dE == null ? null : Math.round(dE * 10) / 10, dQualite: dQ == null ? null : Math.round(dQ * 10) / 10,
      nefaste: dH < 0 || (dE != null && dE < 0), poids, texte: `${fa.lab} : ${morceaux.join(', ')} (${avec.length} nuits).` })
  }
  return out.sort((a, b) => b.poids - a.poids)
}

// ─── Régularité des horaires ───
// Le coucher est ramené autour de minuit (19 h → 0, 7 h → 720) pour que
// 23 h 30 et 0 h 30 soient voisins, pas à 23 heures d'écart.
export function regulariteHoraires(log, aujourdhui, jours = 14) {
  const c = [], l = []
  for (let k = 0; k < jours; k++) {
    const e = (log || {})[decaler(aujourdhui, -k)]
    if (!e) continue
    const mc = minutesDe(e.coucher), ml = minutesDe(e.lever)
    if (mc != null) c.push((mc - 19 * 60 + 1440) % 1440)
    if (ml != null) l.push(ml)
  }
  if (c.length < 5) return null
  const moy = (t) => t.reduce((a, b) => a + b, 0) / t.length
  const ecart = (t) => { const m = moy(t); return Math.round(Math.sqrt(t.reduce((a, x) => a + (x - m) ** 2, 0) / t.length)) }
  const ec = ecart(c), el = l.length >= 5 ? ecart(l) : null
  const pire = Math.max(ec, el || 0)
  const niveau = pire <= 30 ? 'ok' : pire <= 60 ? 'warn' : 'alert'
  return {
    nuits: c.length,
    coucher: hhmm(moy(c) + 19 * 60), ecartCoucher: ec,
    lever: l.length >= 5 ? hhmm(moy(l)) : null, ecartLever: el,
    niveau,
    texte: niveau === 'ok' ? 'Horaires réguliers : c’est ce qui stabilise le mieux l’horloge interne.'
      : niveau === 'warn' ? 'Horaires un peu irréguliers : viser le même coucher à une demi-heure près aide à s’endormir plus vite.'
        : 'Horaires très variables : l’horloge interne se dérègle, comme un petit décalage horaire. Fixer d’abord l’heure du lever.',
  }
}

// ─── Forme du jour ───
// Une note sur 100 pour décider de la séance : la nuit au regard du
// besoin (40), la dette des deux semaines (20), l'énergie au réveil (25),
// la qualité (15), corrigée par les sensations. Les éléments absents
// comptent un peu sous la moyenne : une saisie incomplète n'est pas
// pénalisée, mais « pleine forme » demande un bon réveil noté.
const EFFET = { malade: -25, courbatures: -8, groggy: -5, tete: -5, stress: -5, repose: 4, motive: 4, humeur: 2 }
const NIVEAUX = [
  { min: 75, id: 'haute', verdict: 'Pleine forme : séance intense possible.' },
  { min: 55, id: 'bonne', verdict: 'Forme correcte : séance normale.' },
  { min: 35, id: 'moyenne', verdict: 'Forme moyenne : séance légère conseillée.' },
  { min: 0, id: 'basse', verdict: 'Récupération : repos ou mobilité douce.' },
]
export function formeDuJour(log, aujourdhui, minutesSemaine = 0) {
  const e = (log || {})[aujourdhui]
  const h = e ? plausibleHours(e.hours) : null
  if (h == null) return null
  const besoin = neededHours(minutesSemaine)
  const dette = sleepDebt(sleepSeries(log, { days: 14, today: aujourdhui }), besoin)
  const net = dette ? dette.net : 0
  const r = reveilDe(e)
  const q = Number(e.quality) || null
  let score = Math.min(1, h / besoin) * 40
    + Math.max(0, 1 - net / 10) * 20
    + (r.energie != null ? (r.energie - 1) / 4 : 0.4) * 25
    + (q ? (q - 1) / 4 : 0.4) * 15
  let effet = 0
  for (const s of r.sensations) effet += EFFET[s] || 0
  score = Math.round(Math.max(0, Math.min(100, score + Math.max(-30, Math.min(8, effet)))))
  const malade = r.sensations.includes('malade')
  const niveau = malade ? NIVEAUX[3] : NIVEAUX.find((n) => score >= n.min)
  const details = [`${libelleDuree(h)} de sommeil pour un besoin de ${libelleDuree(besoin)}`]
  if (net >= 1) details.push(`dette de ${fr(net)} h sur 14 jours`)
  if (r.energie != null) details.push(`énergie ${r.energie}/5 au réveil`)
  if (q) details.push(`qualité ${q}/5`)
  return {
    score,
    niveau: niveau.id,
    verdict: malade ? 'Signes de maladie : repos, pas d’intensité.' : niveau.verdict,
    details,
  }
}
