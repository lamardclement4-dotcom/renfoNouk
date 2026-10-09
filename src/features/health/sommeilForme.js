// ============================================================
// Sommeil, deuxième étage : heures de coucher et de lever, ce qui s'est
// passé la veille, ce qui influence vraiment les nuits, la forme du jour
// qu'on en tire pour la séance, et l'heure du coucher qui en découle.
// ============================================================
import { sleepSeries, neededHours, sleepDebt, plausibleHours } from './sleepIntel'
import { reveilDe, decaler, ENERGIES, SENSATIONS, libelleDuree } from './sommeilReveil'

export { libelleDuree }

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
const decale = (m) => (m - 19 * 60 + 1440) % 1440
const moyenne = (t) => t.reduce((a, b) => a + b, 0) / t.length
function finDeSemaine(iso) {
  const j = new Date(iso + 'T00:00:00Z').getUTCDay()
  return j === 0 || j === 6
}
export function regulariteHoraires(log, aujourdhui, jours = 14) {
  const c = [], l = [], endo = [], milieuSemaine = [], milieuWeekEnd = []
  for (let k = 0; k < jours; k++) {
    const iso = decaler(aujourdhui, -k)
    const e = (log || {})[iso]
    if (!e) continue
    const mc = minutesDe(e.coucher), ml = minutesDe(e.lever)
    if (mc != null) c.push(decale(mc))
    if (ml != null) l.push(ml)
    if (mc != null && Number.isFinite(Number(e.endormissement)) && e.endormissement !== null) endo.push(Number(e.endormissement))
    // Milieu de la nuit (entre l'endormissement et le lever) : c'est lui
    // qui situe l'horloge interne, mieux que le seul coucher.
    if (mc != null && ml != null) {
      const debut = decale(mc) + (Number(e.endormissement) || 0)
      const fin = decale(ml) <= decale(mc) ? decale(ml) + 1440 : decale(ml)
      if (fin > debut) (finDeSemaine(iso) ? milieuWeekEnd : milieuSemaine).push((debut + fin) / 2)
    }
  }
  if (c.length < 5) return null
  const ecart = (t) => { const m = moyenne(t); return Math.round(Math.sqrt(t.reduce((a, x) => a + (x - m) ** 2, 0) / t.length)) }
  const ec = ecart(c), el = l.length >= 5 ? ecart(l) : null
  const pire = Math.max(ec, el || 0)
  const niveau = pire <= 30 ? 'ok' : pire <= 60 ? 'warn' : 'alert'
  const endormissement = endo.length >= 3 ? Math.round(moyenne(endo)) : null
  // Décalage du week-end (« jet-lag social ») : de combien le milieu de la
  // nuit glisse entre la semaine et le week-end.
  const decalage = milieuWeekEnd.length >= 2 && milieuSemaine.length >= 3 ? Math.round(moyenne(milieuWeekEnd) - moyenne(milieuSemaine)) : null
  return {
    nuits: c.length,
    coucher: hhmm(moyenne(c) + 19 * 60), ecartCoucher: ec,
    lever: l.length >= 5 ? hhmm(moyenne(l)) : null, ecartLever: el,
    niveau,
    texte: niveau === 'ok' ? 'Horaires réguliers : c’est ce qui stabilise le mieux l’horloge interne.'
      : niveau === 'warn' ? 'Horaires un peu irréguliers : viser le même coucher à une demi-heure près aide à s’endormir plus vite.'
        : 'Horaires très variables : l’horloge interne se dérègle, comme un petit décalage horaire. Fixer d’abord l’heure du lever.',
    endormissement,
    texteEndormissement: endormissement == null ? null
      : endormissement > 30 ? 'Plus d’une demi-heure pour t’endormir : si le sommeil ne vient pas au bout de 20 minutes, lève-toi, lumière douce, et reviens quand il arrive. Le lit doit rester associé au sommeil.'
        : endormissement < 5 ? 'Endormissement quasi immédiat : souvent le signe d’une dette de sommeil plutôt que d’un bon sommeil.'
          : 'Endormissement normal (de 5 à 30 minutes).',
    decalage,
    texteDecalage: decalage == null ? null
      : Math.abs(decalage) >= 60 ? `Ta nuit glisse de ${libelleDuree(Math.abs(decalage) / 60)} ${decalage > 0 ? 'plus tard' : 'plus tôt'} le week-end : chaque lundi, ton corps vit un petit décalage horaire. Garde le lever du week-end à moins d’une heure de celui de la semaine.`
        : 'Semaine et week-end calés à moins d’une heure près : pas de décalage horaire du lundi.',
  }
}

// ─── Forme du jour ───
// Une note sur 100 pour décider de la séance : la nuit au regard du
// besoin (40), la dette des deux semaines (20), l'énergie au réveil (25),
// la qualité (15). Les éléments absents comptent un peu sous la moyenne :
// une saisie incomplète n'est pas pénalisée, mais « pleine forme » demande
// un bon réveil noté. Viennent ensuite les ajustements : sensations au
// réveil, séance de la veille comparée à l'habitude, jours d'entraînement
// enchaînés, douleur en cours.
//
// Le contexte (troisième argument) : un nombre = minutes d'entraînement
// des 7 derniers jours (ancienne forme), ou un objet
// { minutesSemaine, chargeHier, chargeHabituelle, joursDaffilee, douleur }
// que formeContexte (formeContexte.js) tire des données.
const EFFET = { malade: -25, courbatures: -8, groggy: -5, tete: -5, stress: -5, repose: 4, motive: 4, humeur: 2 }
const SENSATION = Object.fromEntries(SENSATIONS.map((x) => [x.id, x]))
const NIVEAUX = [
  { min: 75, id: 'haute', verdict: 'Pleine forme : séance intense possible.', consigne: 'Séance prévue telle quelle. Bon jour pour l’intensité, un test ou un record.' },
  { min: 55, id: 'bonne', verdict: 'Forme correcte : séance normale.', consigne: 'Séance prévue, sans chercher le record : effort jusqu’à 7 sur 10.' },
  { min: 35, id: 'moyenne', verdict: 'Forme moyenne : séance légère conseillée.', consigne: 'Allège : un tiers de volume en moins, effort 6 sur 10 au plus, échauffement plus long.' },
  { min: 0, id: 'basse', verdict: 'Récupération : repos ou mobilité douce.', consigne: 'Repos, marche ou 20 minutes de mobilité. La séance prévue peut attendre demain.' },
]
const arrondi1 = (x) => Math.round(x * 10) / 10
function contexteDe(c) {
  if (c && typeof c === 'object') return c
  return { minutesSemaine: Number(c) || 0 }
}

export function formeDuJour(log, aujourdhui, contexte = 0) {
  const e = (log || {})[aujourdhui]
  const h = e ? plausibleHours(e.hours) : null
  if (h == null) return null
  const ctx = contexteDe(contexte)
  const besoin = neededHours(ctx.minutesSemaine || 0)
  const dette = sleepDebt(sleepSeries(log, { days: 14, today: aujourdhui }), besoin)
  const net = dette ? Math.max(0, dette.net) : 0
  const r = reveilDe(e)
  const q = Number(e.quality) >= 1 && Number(e.quality) <= 5 ? Number(e.quality) : null

  const parts = [
    { id: 'duree', lab: 'Durée de la nuit', max: 40, pts: Math.round(Math.min(1, h / besoin) * 40), texte: `${libelleDuree(h)} pour ${libelleDuree(besoin)} de besoin` },
    { id: 'dette', lab: 'Dette sur 14 jours', max: 20, pts: Math.round(Math.max(0, 1 - net / 10) * 20), texte: net >= 0.25 ? `${libelleDuree(net)} de retard` : 'aucune' },
    { id: 'energie', lab: 'Énergie au réveil', max: 25, pts: Math.round((r.energie != null ? (r.energie - 1) / 4 : 0.4) * 25), texte: r.energie != null ? `${r.energie}/5, ${ENERGIES[r.energie - 1].toLowerCase()}` : 'non notée' },
    { id: 'qualite', lab: 'Qualité du sommeil', max: 15, pts: Math.round((q ? (q - 1) / 4 : 0.4) * 15), texte: q ? `${q}/5` : 'non notée' },
  ]

  const ajustements = []
  if (r.sensations.length) {
    let effet = 0
    for (const x of r.sensations) effet += EFFET[x] || 0
    ajustements.push({ id: 'sensations', lab: 'Sensations au réveil', pts: Math.max(-30, Math.min(8, effet)), texte: r.sensations.map((x) => SENSATION[x].lab).join(', ') })
  }
  // La séance d'hier, rapportée à une séance habituelle : la même heure de
  // fractionné pèse plus pour qui court deux fois par semaine que pour qui
  // s'entraîne tous les jours.
  const chargeHier = Number(ctx.chargeHier) || 0
  if (chargeHier > 0) {
    const habitude = Number(ctx.chargeHabituelle) > 0 ? Number(ctx.chargeHabituelle) : null
    const ratio = habitude ? chargeHier / habitude : null
    const pts = ratio == null ? (chargeHier >= 150 ? -6 : 0) : ratio >= 1.8 ? -10 : ratio >= 1.3 ? -6 : 0
    const texte = `${Math.round(chargeHier)} points de charge` + (ratio == null ? ''
      : ratio >= 1.8 ? `, ${fr(arrondi1(ratio))} fois ta séance habituelle`
        : ratio >= 1.3 ? `, ${Math.round((ratio - 1) * 100)} % de plus que ta séance habituelle`
          : ', dans ton habitude')
    ajustements.push({ id: 'charge', lab: 'Séance d’hier', pts, texte })
  }
  const affilee = Number(ctx.joursDaffilee) || 0
  if (affilee >= 3) {
    ajustements.push({ id: 'affilee', lab: 'Jours enchaînés', pts: affilee >= 5 ? -6 : -4, texte: `${affilee} jours d’entraînement d’affilée` })
  }
  const douleur = ctx.douleur || null
  if (douleur) {
    // Les zones n'ont pas toutes le même genre (« genou », « hanche /
    // bassin ») : on les nomme sans article.
    const zone = douleur.region ? douleur.region.charAt(0).toUpperCase() + douleur.region.slice(1) : 'Zone non précisée'
    const depuis = Number.isFinite(douleur.jours) ? `, depuis ${douleur.jours} jour${douleur.jours > 1 ? 's' : ''}` : ''
    ajustements.push({ id: 'douleur', lab: 'Douleur', pts: douleur.urgent ? -20 : douleur.jours >= 7 ? -10 : -6, texte: zone + depuis })
  }

  const total = parts.reduce((a, x) => a + x.pts, 0) + ajustements.reduce((a, x) => a + x.pts, 0)
  const score = Math.max(0, Math.min(100, total))
  const malade = r.sensations.includes('malade')
  const urgente = !!(douleur && douleur.urgent)
  const niveau = malade || urgente ? NIVEAUX[3] : NIVEAUX.find((n) => score >= n.min)
  let verdict = niveau.verdict, consigne = niveau.consigne
  if (malade) {
    verdict = 'Signes de maladie : repos, pas d’intensité.'
    consigne = 'Pas d’entraînement tant que la fièvre dure, puis une reprise en douceur sur deux ou trois jours.'
  } else if (urgente) {
    verdict = 'Douleur à faire voir : pas de séance qui sollicite la zone.'
    consigne = 'Repos de la zone en attendant un avis professionnel. Le reste du corps peut bouger doucement.'
  }
  if (douleur && !urgente && !malade) consigne += ` Ménage la zone douloureuse${douleur.region ? ' (' + douleur.region + ')' : ''} : rien qui réveille la douleur.`

  const details = [`${libelleDuree(h)} de sommeil pour un besoin de ${libelleDuree(besoin)}`]
  if (net >= 1) details.push(`dette de ${libelleDuree(net)} sur 14 jours`)
  if (r.energie != null) details.push(`énergie ${r.energie}/5 au réveil`)
  if (q) details.push(`qualité ${q}/5`)
  return { score, niveau: niveau.id, verdict, consigne, details, parts, ajustements, besoin, dette: net }
}

// Les n derniers jours, du plus ancien au plus récent ; null quand la nuit
// manque. `contexte(iso)` donne le contexte de chaque jour.
export function formeSerie(log, aujourdhui, contexte = () => 0, n = 7) {
  const out = []
  for (let k = n - 1; k >= 0; k--) {
    const iso = decaler(aujourdhui, -k)
    const f = formeDuJour(log, iso, contexte(iso))
    out.push({ iso, score: f ? f.score : null, niveau: f ? f.niveau : null })
  }
  return out
}

// ─── L'heure du coucher qui donne la nuit dont on a besoin ───
// À rebours depuis le lever visé (la routine suivie, sinon le lever
// habituel des deux dernières semaines) : besoin de sommeil, temps
// habituel pour s'endormir, et un supplément si la dette est là.
export function coucherConseille(log, aujourdhui, { besoin = 8, routine = null, dette = 0 } = {}) {
  let lever = routine && routine.enabled && minutesDe(routine.wake) != null ? routine.wake : null
  let source = lever ? 'routine' : null
  const levers = [], endo = []
  for (let k = 0; k < 14; k++) {
    const e = (log || {})[decaler(aujourdhui, -k)]
    if (!e) continue
    const ml = minutesDe(e.lever)
    if (ml != null) levers.push(ml)
    if (minutesDe(e.coucher) != null && Number.isFinite(Number(e.endormissement)) && e.endormissement !== null) endo.push(Number(e.endormissement))
  }
  if (!lever && levers.length >= 3) { lever = hhmm(Math.round(moyenne(levers) / 5) * 5); source = 'habitude' }
  if (!lever) return null
  const endormissement = endo.length >= 2 ? Math.round(moyenne(endo) / 5) * 5 : 15
  const bonus = dette >= 5 ? 30 : dette >= 2 ? 15 : 0
  const coucher = hhmm(Math.round((minutesDe(lever) - besoin * 60 - endormissement - bonus) / 5) * 5)
  const raison = `pour dormir ${libelleDuree(besoin)} avant ${source === 'routine' ? 'ton lever de' : 'ton lever habituel de'} ${lever}`
    + ` (${endormissement} min pour t’endormir${endo.length >= 2 ? ', d’après tes nuits' : ''}${bonus ? `, plus ${bonus} min pour résorber la dette` : ''})`
  return { coucher, lever, source, besoin, endormissement, bonus, raison, texte: `Au lit vers ${coucher} ${raison}.` }
}
