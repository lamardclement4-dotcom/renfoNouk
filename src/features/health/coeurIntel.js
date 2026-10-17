// ============================================================
// Cœur : tout ce que la fréquence cardiaque dit de l'entraînement et de
// la récupération, réuni.
//
// Sources, par ordre de préférence :
//   - FC au repos envoyée par la montre (Santé, vitalsLog.restingHr) ;
//   - pouls pris au réveil, saisi dans l'app (sleepLog[jour].pouls) ;
//   - variabilité cardiaque et respiration de la nuit (montre) ;
//   - FC moyenne et maximale notées sur les séances ;
//   - FC max saisie au profil, ou l'âge.
// Une série ne mélange jamais deux sources : une FC de repos calculée sur
// la journée et un pouls pris allongé au réveil ne se comparent pas.
// Rien ici ne touche au réseau ni au DOM.
// ============================================================
import { decaler } from './sommeilReveil'
import { SPORTS } from '../train/trainData'
import { fcMaxDe, dureeToMins } from '../train/plannerIntel'
import { testHistory } from '../physical-tests/testsIntel'
import { TESTS_DEF } from '../physical-tests/testsData'

const nombre = (x, lo, hi) => {
  if (x == null || x === '') return null
  const n = Number(String(x).replace(',', '.'))
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null
}
const moyenne = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null)
const ecartType = (l) => { const m = moyenne(l); return l.length > 1 ? Math.sqrt(l.reduce((a, x) => a + (x - m) ** 2, 0) / l.length) : 0 }
const arrondi1 = (x) => Math.round(x * 10) / 10
const fr = (x) => String(x).replace('.', ',')

const lecteurs = {
  sante: (db) => (d) => nombre(((db && db.vitalsLog) || {})[d] && db.vitalsLog[d].restingHr, 30, 120),
  reveil: (db) => (d) => nombre(((db && db.sleepLog) || {})[d] && db.sleepLog[d].pouls, 30, 120),
  vfc: (db) => (d) => nombre(((db && db.vitalsLog) || {})[d] && db.vitalsLog[d].hrv, 5, 300),
  resp: (db) => (d) => nombre(((db && db.vitalsLog) || {})[d] && db.vitalsLog[d].resp, 4, 60),
  spo2: (db) => (d) => nombre(((db && db.vitalsLog) || {})[d] && db.vitalsLog[d].spo2, 70, 100),
  spo2Saisi: (db) => (d) => nombre(((db && db.sleepLog) || {})[d] && db.sleepLog[d].spo2, 70, 100),
}

// Les valeurs des `jours` derniers jours, du plus ancien au plus récent.
export function serie(db, iso, cle, jours) {
  const lire = lecteurs[cle](db)
  const out = []
  for (let k = jours - 1; k >= 0; k--) {
    const d = decaler(iso, -k)
    const v = lire(d)
    if (v != null) out.push({ iso: d, k, v })
  }
  return out
}

// La source de la FC au repos : celle qui a le plus de mesures sur 30
// jours (la montre l'emporte à égalité : elle mesure tous les jours).
export function sourceRepos(db, iso) {
  const s = serie(db, iso, 'sante', 30).length, r = serie(db, iso, 'reveil', 30).length
  if (!s && !r) return null
  return s >= r ? 'sante' : 'reveil'
}
export const NOM_SOURCE = { sante: 'FC au repos (montre)', reveil: 'pouls au réveil (saisi)' }

// ─── FC au repos : niveau et tendance ───
// Une FC de repos qui baisse sur des semaines est l'un des signes les
// plus fiables d'une meilleure endurance ; une semaine nettement
// au-dessus de la normale, d'une récupération incomplète.
export function tendanceRepos(db, iso) {
  const src = sourceRepos(db, iso)
  if (!src) return null
  const s90 = serie(db, iso, src, 90)
  const v = (l) => l.map((x) => x.v)
  const s7 = s90.filter((x) => x.k < 7), s30 = s90.filter((x) => x.k < 30)
  const m7 = s7.length >= 3 ? arrondi1(moyenne(v(s7))) : null
  const m30 = s30.length >= 7 ? arrondi1(moyenne(v(s30))) : null
  const derniere = s90.length ? s90[s90.length - 1] : null
  // Pente par moindres carrés, en battements par 30 jours, dès 15 mesures
  // étalées sur au moins un mois.
  let pente = null
  if (s90.length >= 15 && s90[0].k - s90[s90.length - 1].k >= 30) {
    const xs = s90.map((x) => -x.k), ys = v(s90)
    const mx = moyenne(xs), my = moyenne(ys)
    const num = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0)
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
    pente = den ? arrondi1((num / den) * 30) : null
  }
  const ecart7 = m7 != null && m30 != null ? arrondi1(m7 - m30) : null
  const textes = []
  if (pente != null) {
    textes.push(pente <= -1 ? `${fr(pente)} bpm par mois : ta FC au repos baisse, ton cœur s’entraîne.`
      : pente >= 1 ? `+${fr(pente)} bpm par mois : ta FC au repos monte. Fatigue accumulée, sommeil court, ou entraînement en baisse ?`
        : 'FC au repos stable sur trois mois.')
  }
  if (ecart7 != null && ecart7 >= 3) textes.push(`Cette semaine, ${fr(ecart7)} bpm au-dessus de ta normale : récupération incomplète, allège quelques jours.`)
  return { source: src, derniere, m7, m30, pente, ecart7, points: s90, texte: textes.join(' ') || null }
}

// ─── VFC : ta zone habituelle ───
// La VFC varie beaucoup d'un jour à l'autre : c'est la moyenne de la
// semaine face à ta zone habituelle (moyenne ± une demi-dispersion sur
// 30 jours) qui compte.
export function zoneVfc(db, iso) {
  const s30 = serie(db, iso, 'vfc', 30)
  if (s30.length < 10) return s30.length ? { mesures: s30.length, points: s30, statut: null } : null
  const vals = s30.map((x) => x.v)
  const m = moyenne(vals), sd = ecartType(vals)
  const s7 = s30.filter((x) => x.k < 7)
  const m7 = s7.length >= 3 ? arrondi1(moyenne(s7.map((x) => x.v))) : null
  const bas = arrondi1(m - sd / 2), haut = arrondi1(m + sd / 2)
  let joursSous = 0
  for (let i = s30.length - 1; i >= 0 && s30[i].v < m - sd; i--) joursSous++
  const statut = m7 == null ? null : m7 < bas ? 'sous' : m7 > haut ? 'dessus' : 'dans'
  return {
    mesures: s30.length, points: s30, normale: arrondi1(m), bas, haut, m7, joursSous, statut,
    texte: statut === 'sous' ? `Semaine sous ta zone habituelle (${fr(m7)} ms pour ${fr(bas)}–${fr(haut)}) : fatigue ou stress qui s’accumulent. Privilégie le sommeil et des séances faciles.`
      : statut === 'dessus' ? `Semaine au-dessus de ta zone habituelle (${fr(m7)} ms) : bonne récupération.`
        : statut === 'dans' ? `Semaine dans ta zone habituelle (${fr(bas)}–${fr(haut)} ms).` : null,
  }
}

// ─── Oxygène sanguin ───
// La montre mesure la saturation en oxygène en arrière-plan pendant le
// sommeil. Chez une personne en bonne santé, au niveau de la mer, elle
// reste entre 95 et 100 % ; la montre peut se tromper de 2 points, et un
// bracelet desserré fait chuter une mesure. Ce qui compte : ta moyenne de
// la nuit face à ta normale, et des chutes qui se répètent.
// Les mesures ponctuelles saisies (app Oxygène sanguin, en journée) ne se
// mêlent pas aux moyennes de nuit.
export function oxygene(db, iso) {
  const vit = (db && db.vitalsLog) || {}
  const nuits = serie(db, iso, 'spo2', 30).map((x) => {
    const e = vit[x.iso] || {}
    return { ...x, min: nombre(e.spo2Min, 50, 100), bas: Number(e.spo2Bas) || 0, n: Number(e.spo2N) || null }
  })
  const saisies = serie(db, iso, 'spo2Saisi', 30)
  if (!nuits.length && !saisies.length) return null
  const source = nuits.length >= saisies.length ? 'montre' : 'saisie'
  const pts = source === 'montre' ? nuits : saisies
  const der = pts[pts.length - 1]
  const avant = pts.slice(0, -1).map((x) => x.v)
  const normale = avant.length >= 5 ? arrondi1(moyenne(avant)) : null
  const s7 = pts.filter((x) => x.k < 7)
  const m7 = s7.length >= 3 ? arrondi1(moyenne(s7.map((x) => x.v))) : null
  // Nuit « basse » : au moins deux mesures sous 90 %, ou une moyenne sous
  // 92 %. Une seule mesure basse peut venir du bracelet.
  const basse = (x) => source === 'montre' && (x.bas >= 2 || x.v < 92)
  const nuitsBasses = pts.filter((x) => x.k < 14 && basse(x)).length
  const recente = der.k <= 1
  const ecart = normale != null && recente ? arrondi1(normale - der.v) : null
  const statut = nuitsBasses >= 3 ? 'repete' : recente && der.v < 92 ? 'bas' : ecart != null && ecart >= 2 ? 'baisse' : 'normal'
  const texte = statut === 'repete'
    ? `${nuitsBasses} nuits sur 14 avec des chutes d’oxygène (plusieurs mesures sous 90 % ou une moyenne sous 92 %). Si tu ronfles, te réveilles fatigué ou essoufflé, parles-en à un médecin : des chutes répétées la nuit peuvent venir d’une apnée du sommeil. La montre ne pose pas de diagnostic.`
    : statut === 'bas' ? `${fr(der.v)} % ${source === 'montre' ? 'en moyenne cette nuit' : 'à ta dernière mesure'} : bas. Vérifie le bracelet (serré, un doigt au-dessus de l’os du poignet) et refais une mesure au calme. En altitude, c’est normal ; sinon, si ça se répète ou avec un essoufflement, consulte.`
      : statut === 'baisse' ? `${fr(der.v)} % cette nuit, ${fr(ecart)} points sous ta normale (${fr(normale)} %) : souvent un rhume qui commence, le nez bouché, l’alcool de la veille ou l’altitude. Regarde demain si ça revient.`
        : normale != null ? `Dans ta normale (${fr(normale)} %). La nuit, 95 à 100 % est l’habitude.`
          : `Ta normale se dessine après 5 ${source === 'montre' ? 'nuits' : 'mesures'} (${avant.length + 1} pour l’instant). La nuit, 95 à 100 % est l’habitude.`
  return { source, points: pts, derniere: der, normale, m7, nuitsBasses, ecart, statut, texte, marques: pts.filter(basse).map((x) => x.k) }
}

// ─── FC max et zones d'entraînement ───
// La même FC max que le calcul de charge des séances (plannerIntel) :
// saisie, sinon la plus haute vue en séance sur un an si elle atteint
// l'estimation par l'âge, sinon l'âge (Tanaka : 208 − 0,7 × âge).
export function fcMax(db, iso) {
  return fcMaxDe(db, iso)
}
export const NOM_SOURCE_MAX = { saisie: 'saisie', seances: 'la plus haute de tes séances', age: 'estimée depuis ton âge' }

// Zones de Karvonen : un pourcentage de la réserve (FC max − FC repos),
// ajouté à la FC de repos. Plus juste qu'un pourcentage de la FC max
// seule, car il tient compte de ton cœur au repos.
export const ZONES = [
  { z: 1, lab: 'Récupération', de: 0.5, a: 0.6, but: 'footing très facile, échauffement, retour au calme' },
  { z: 2, lab: 'Endurance fondamentale', de: 0.6, a: 0.7, but: 'la base : long, facile, on peut parler' },
  { z: 3, lab: 'Tempo', de: 0.7, a: 0.8, but: 'soutenu mais tenable, phrases courtes' },
  { z: 4, lab: 'Seuil', de: 0.8, a: 0.9, but: 'dur, quelques mots, fractionné long' },
  { z: 5, lab: 'VO2max', de: 0.9, a: 1, but: 'très dur, fractionné court' },
]
export function zonesKarvonen(max, repos) {
  if (!(max > 0) || !(repos > 0) || max - repos < 40) return null
  const r = max - repos
  return ZONES.map((x) => ({ ...x, min: Math.round(repos + x.de * r), max: Math.round(repos + x.a * r) }))
}
export function zoneDe(fc, zones) {
  if (!zones || !(fc > 0)) return null
  if (fc < zones[0].min) return 0
  const z = zones.find((x) => fc <= x.max)
  return z ? z.z : 5
}

// VO2max estimée (Uth et al., 2004) : 15,3 × FC max / FC repos. Une
// indication, à ±15 % : un test d'effort reste la mesure.
export function vo2Estime(max, repos) {
  if (!(max > 0) || !(repos > 0)) return null
  const v = Math.round(15.3 * max / repos)
  return v >= 20 && v <= 90 ? v : null
}

// VO2max mesurée par le dernier test de Cooper (Tests physiques) : plus
// juste que l'estimation par la FC, elle passe devant quand elle existe.
const COOPER = TESTS_DEF.find((d) => d.id === 'cooper')
export function vo2Test(db) {
  const h = testHistory(db, 'cooper')
  if (!h.length || !COOPER) return null
  const der = h[h.length - 1]
  const v = COOPER.vo2max(der.value)
  return v >= 20 && v <= 90 ? { valeur: v, date: der.date, distance: der.value } : null
}

// Zone et part de la FC max d'une FC donnée (saisie de séance).
export function zoneDeFc(db, iso, fc) {
  const f = nombre(fc, 60, 220)
  if (f == null) return null
  const max = fcMax(db, iso)
  if (!max) return null
  const t = tendanceRepos(db, iso)
  const repos = t && (t.m30 != null ? t.m30 : t.derniere && t.derniere.v)
  const zones = repos ? zonesKarvonen(max.valeur, repos) : null
  const z = zoneDe(f, zones)
  const pct = Math.round(f / max.valeur * 100)
  return { fc: Math.round(f), pct, max: max.valeur, source: max.source, zone: z, lab: z ? ZONES[z - 1].lab : z === 0 ? 'sous la zone 1' : null }
}

// ─── FC des séances ───
const nomSport = (id) => { const s = SPORTS.find((x) => x.id === id); return s ? s.label : 'Séance' }
export function seancesFc(db, iso, n = 8, zones = null, max = null) {
  return (Array.isArray(db && db.planningSessions) ? db.planningSessions : [])
    .filter((s) => s && s.statut === 'realise' && typeof s.date === 'string' && s.date <= iso && nombre(s.data && s.data.fc, 60, 220) != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n)
    .map((s) => {
      const fc = Math.round(nombre(s.data.fc, 60, 220))
      return { date: s.date, sport: nomSport(s.sport), mins: dureeToMins(s.duree) || null, fc, pct: max ? Math.round(fc / max * 100) : null, zone: zoneDe(fc, zones) }
    })
}

// ─── Bilan du jour ───
export function bilanCoeur(db, iso) {
  const t = tendanceRepos(db, iso), v = zoneVfc(db, iso)
  const respS = serie(db, iso, 'resp', 30)
  const alertes = []
  if (t && t.derniere && t.m30 != null && t.derniere.k <= 1 && t.derniere.v - t.m30 >= 7) alertes.push(`FC au repos à ${t.derniere.v} bpm, ${Math.round(t.derniere.v - t.m30)} au-dessus de ta normale.`)
  if (t && t.ecart7 != null && t.ecart7 >= 3) alertes.push(`Semaine à ${fr(t.ecart7)} bpm au-dessus de ta normale.`)
  if (v && v.joursSous >= 3) alertes.push(`VFC nettement basse depuis ${v.joursSous} jours.`)
  if (respS.length >= 6) {
    const der = respS[respS.length - 1], avant = respS.slice(0, -1).map((x) => x.v)
    if (der.k <= 1 && avant.length >= 5 && der.v - moyenne(avant) >= 3) alertes.push(`Respiration la nuit à ${fr(der.v)}/min, au-dessus de ta normale.`)
  }
  const o2 = oxygene(db, iso)
  if (o2 && o2.statut === 'repete') alertes.push(`Oxygène : ${o2.nuitsBasses} nuits avec des chutes sur 14 jours.`)
  else if (o2 && o2.statut === 'bas') alertes.push(`Oxygène la nuit à ${fr(o2.derniere.v)} %, bas.`)
  else if (o2 && o2.statut === 'baisse') alertes.push(`Oxygène la nuit à ${fr(o2.derniere.v)} %, ${fr(o2.ecart)} points sous ta normale.`)
  const niveau = alertes.length >= 2 ? 'incomplete' : alertes.length === 1 ? 'surveiller' : (t || v || o2) ? 'bonne' : null
  return {
    niveau, alertes,
    verdict: niveau === 'incomplete' ? 'Récupération incomplète : séance facile ou repos, et surveille un début de maladie.'
      : niveau === 'surveiller' ? 'À surveiller : un signal sort de ta normale.'
        : niveau === 'bonne' ? 'Récupération bonne : tes signaux sont dans ta normale.' : null,
  }
}

// ─── Résumé pour le reste du site ───
// Accueil, Progrès et la tuile Santé lisent ce résumé : les mêmes
// chiffres que l'espace Cœur, jamais recalculés à part.
export function resumeCoeur(db, iso) {
  const t = tendanceRepos(db, iso)
  const der = t && t.derniere
  const b = bilanCoeur(db, iso)
  const max = fcMax(db, iso)
  const repos = t && (t.m30 != null ? t.m30 : der && der.v)
  const test = vo2Test(db)
  const estime = max && repos ? vo2Estime(max.valeur, repos) : null
  return {
    repos: der && der.k <= 1 ? der.v : null,
    source: t ? t.source : null,
    m30: t ? t.m30 : null,
    pente: t ? t.pente : null,
    niveau: b.niveau, verdict: b.verdict, alertes: b.alertes,
    vfc: zoneVfc(db, iso),
    o2: oxygene(db, iso),
    resp: (() => { const r = serie(db, iso, 'resp', 30); return r.length >= 5 ? arrondi1(moyenne(r.map((x) => x.v))) : null })(),
    fcMax: max,
    vo2: test ? { valeur: test.valeur, source: 'test', date: test.date } : estime ? { valeur: estime, source: 'estime' } : null,
  }
}
