// ============================================================
// Sommeil : sensations au réveil et saisie des nuits passées.
//
// Une nuit est rangée à la date du réveil (sleepLog['2026-10-09'] = la nuit
// du 8 au 9). Les sensations au réveil disent ce que la durée ne dit pas :
// on peut dormir huit heures et se lever courbaturé, grippé ou sans
// énergie — trois raisons d'alléger la séance du jour.
// ============================================================
export const ENERGIES = ['Épuisé', 'Fatigué', 'Correct', 'En forme', 'Plein d’énergie']

export const SENSATIONS = [
  { id: 'repose', lab: 'Reposé', bon: true },
  { id: 'motive', lab: 'Motivé', bon: true },
  { id: 'humeur', lab: 'Bonne humeur', bon: true },
  { id: 'groggy', lab: 'Groggy' },
  { id: 'courbatures', lab: 'Courbatures' },
  { id: 'tete', lab: 'Tête lourde' },
  { id: 'stress', lab: 'Stress' },
  { id: 'malade', lab: 'Rhume, fièvre' },
]
const PAR_ID = Object.fromEntries(SENSATIONS.map((s) => [s.id, s]))

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

// Calendrier pur, en UTC : un changement d'heure ne décale pas les nuits.
export function decaler(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
function jour(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  return { js: JOURS[x.getUTCDay()], d, mois: MOIS[m - 1] }
}

// « Nuit du lun. 6 au mar. 7 oct. »
export function libelleNuit(iso) {
  const a = jour(decaler(iso, -1)), b = jour(iso)
  return `Nuit du ${a.js} ${a.d}${a.mois !== b.mois ? ' ' + a.mois : ''} au ${b.js} ${b.d} ${b.mois}`
}

export function nuitRenseignee(e) {
  return !!(e && Number(e.hours) > 0)
}

// Les dernières nuits, de la plus récente à la plus ancienne, avec ce qui
// manque : c'est ce qui permet de rattraper un oubli.
export function nuitsRecentes(log, aujourdhui, n = 7) {
  const out = []
  for (let k = 0; k < n; k++) {
    const iso = decaler(aujourdhui, -k)
    const j = jour(iso)
    out.push({
      iso,
      titre: k === 0 ? 'Cette nuit' : k === 1 ? 'Hier' : `${j.js} ${j.d}`,
      renseignee: nuitRenseignee((log || {})[iso]),
    })
  }
  return out
}

export function nuitsManquantes(log, aujourdhui, n = 7) {
  return nuitsRecentes(log, aujourdhui, n).filter((x) => !x.renseignee)
}

// Réveil normalisé : une donnée abîmée (ancienne version, saisie partielle)
// ne doit jamais faire tomber l'écran.
export function reveilDe(e) {
  const r = e && typeof e.reveil === 'object' && e.reveil ? e.reveil : {}
  const energie = Number.isInteger(r.energie) && r.energie >= 1 && r.energie <= 5 ? r.energie : null
  const sensations = Array.isArray(r.sensations) ? r.sensations.filter((s) => PAR_ID[s]) : []
  return { energie, sensations }
}

export function resumeReveil(log, aujourdhui, jours = 14) {
  const nuits = []
  for (let k = 0; k < jours; k++) {
    const iso = decaler(aujourdhui, -k)
    const r = reveilDe((log || {})[iso])
    if (r.energie != null || r.sensations.length) nuits.push({ iso, k, ...r })
  }
  if (!nuits.length) return { nuits: 0, energieMoy: null, frequentes: [], alertes: [] }
  const avecEnergie = nuits.filter((x) => x.energie != null)
  const energieMoy = avecEnergie.length ? Math.round(avecEnergie.reduce((a, x) => a + x.energie, 0) / avecEnergie.length * 10) / 10 : null
  const compte = {}
  for (const x of nuits) for (const s of x.sensations) compte[s] = (compte[s] || 0) + 1
  const frequentes = Object.entries(compte).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, lab: PAR_ID[id].lab, n, bon: !!PAR_ID[id].bon }))

  const alertes = []
  const derniere = nuits.find((x) => x.k <= 1)
  if (derniere && derniere.sensations.includes('malade')) {
    alertes.push('Signes de rhume ou de fièvre au réveil : repos ou séance très légère, sans intensité, tant qu’ils durent.')
  }
  const cinq = avecEnergie.filter((x) => x.k < 5)
  if (cinq.filter((x) => x.energie <= 2).length >= 3) {
    alertes.push('Réveils fatigués plusieurs matins de suite : regarde ta dette de sommeil et allège la charge quelques jours.')
  }
  const sept = nuits.filter((x) => x.k < 7)
  if (sept.filter((x) => x.sensations.includes('courbatures')).length >= 3) {
    alertes.push('Courbatures fréquentes au réveil : la récupération ne suit pas la charge. Plus de sommeil, de protéines, ou une séance plus douce.')
  }
  return { nuits: nuits.length, energieMoy, frequentes, alertes }
}

// Résumé d'une nuit pour l'historique : « En forme · Courbatures ».
export function resumeNuit(e) {
  const r = reveilDe(e)
  const morceaux = []
  if (r.energie != null) morceaux.push(ENERGIES[r.energie - 1])
  for (const s of r.sensations) morceaux.push(PAR_ID[s].lab)
  return morceaux.join(' · ')
}
