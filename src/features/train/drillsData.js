import { EX } from './trainData'
import { TEMPLATE_FAMILIES } from './routineTemplates'
// ============================================================
// Échauffement et éducatifs.
//
// Une séance ne commence pas à la première répétition. L'échauffement et
// les éducatifs occupent souvent le premier quart du temps, décident de la
// qualité du reste, et ne se notaient nulle part — si bien qu'une séance
// bâclée à l'échauffement et une séance préparée s'enregistraient à
// l'identique.
//
// Les éducatifs sont propres à chaque discipline : le rattrapé n'existe
// qu'en natation, les talons-fesses qu'en course. On les propose donc par
// sport, avec ce que chacun travaille — un éducatif dont on ignore
// l'intention se fait sans intention.
// ============================================================

const asList = (v) => (Array.isArray(v) ? v.filter((x) => x != null) : [])

// ─── Échauffement ───────────────────────────────────────────
// Trois formes, dans l'ordre où elles se pratiquent.
export const WARMUP_KINDS = [
  { id: 'general', label: 'Général', hint: 'Monter en température : marche rapide, footing lent, vélo facile.' },
  { id: 'mobilite', label: 'Mobilité', hint: 'Amplitudes actives sur les articulations que la séance va solliciter.' },
  { id: 'specifique', label: 'Spécifique', hint: 'Le geste de la séance, en plus léger : lignes droites, séries à vide, montées en charge.' },
]

export const WARMUP_MINUTES = [0, 5, 10, 15, 20, 30]

export function warmupSummary(w) {
  if (!w) return null
  const mins = Number(w.mins) || 0
  const kinds = asList(w.kinds)
  if (!mins && !kinds.length) return null
  const labels = kinds
    .map((k) => (WARMUP_KINDS.find((x) => x.id === k) || {}).label)
    .filter(Boolean)
  return {
    mins, kinds,
    text: [mins ? `${mins} min` : null, labels.length ? labels.join(' + ').toLowerCase() : null]
      .filter(Boolean).join(' · '),
    complete: mins >= 10 && kinds.length >= 2,
  }
}

// ─── Éducatifs, par discipline ──────────────────────────────
// Chacun dit ce qu'il travaille : un éducatif sans intention est un
// exercice de plus.
export const DRILLS = {
  course: [
    { id: 'talons', label: 'Talons-fesses', aim: 'Retour du pied sous la fesse, fréquence de cycle.' },
    { id: 'montees', label: 'Montées de genoux', aim: 'Hauteur de cuisse et appui actif sous le bassin.' },
    { id: 'askip', label: 'A-skips', aim: 'Coordination bras-jambes et griffé du pied.' },
    { id: 'bskip', label: 'B-skips', aim: 'Extension de jambe puis griffé — le geste complet de la foulée.' },
    { id: 'jambesTendues', label: 'Jambes tendues', aim: 'Griffé du sol, tonicité de cheville.' },
    { id: 'pasChasses', label: 'Pas chassés', aim: 'Appuis latéraux, souvent négligés en course.' },
    { id: 'foulees', label: 'Foulées bondissantes', aim: 'Amplitude et poussée complète.' },
    { id: 'lignes', label: 'Lignes droites', aim: 'Accélérations progressives : le passage entre échauffement et séance.' },
    { id: 'cadence', label: 'Travail de cadence', aim: 'Fréquence de pas, en réduisant le temps de contact.' },
  ],
  natation: [
    { id: 'rattrape', label: 'Rattrapé', aim: 'Allonge et prise d’appui, une main attend l’autre.' },
    { id: 'poings', label: 'Poings fermés', aim: 'Appui sur l’avant-bras plutôt que sur la main seule.' },
    { id: 'battements', label: 'Battements planche', aim: 'Propulsion de jambes et position de corps.' },
    { id: 'educJambes', label: 'Éducatif jambes sans planche', aim: 'Gainage et alignement, sans appui extérieur.' },
    { id: 'troisTemps', label: 'Trois temps', aim: 'Respiration bilatérale et roulis symétrique.' },
    { id: 'monoBras', label: 'Un bras', aim: 'Dissocier les côtés, corriger un déséquilibre.' },
    { id: 'amplitude', label: 'Nage en amplitude', aim: 'Le moins de coups possible par longueur.' },
  ],
  velo: [
    { id: 'uneJambe', label: 'Pédalage une jambe', aim: 'Coup de pédale rond, corrige le point mort haut.' },
    { id: 'cadenceHaute', label: 'Cadence haute', aim: 'Fluidité au-delà de 100 tours par minute.' },
    { id: 'forceBas', label: 'Force à basse cadence', aim: 'Couple à 50-60 tours, assis, sans à-coups.' },
    { id: 'sprintsCourts', label: 'Sprints courts', aim: 'Réveil neuromusculaire avant l’effort principal.' },
    { id: 'danseuse', label: 'Passage en danseuse', aim: 'Transition assis-debout sans rupture de cadence.' },
  ],
  sprint: [
    { id: 'askip', label: 'A-skips', aim: 'Coordination et griffé, la base du sprint.' },
    { id: 'bskip', label: 'B-skips', aim: 'Extension puis griffé actif.' },
    { id: 'montees', label: 'Montées de genoux', aim: 'Fréquence et hauteur de cuisse.' },
    { id: 'departs', label: 'Départs', aim: 'Mise en action, angle du corps sur les premiers appuis.' },
    { id: 'accel', label: 'Accélérations progressives', aim: 'Montée en vitesse sans à-coup, avant le travail maximal.' },
    { id: 'bondissements', label: 'Bondissements', aim: 'Puissance de poussée et réactivité au sol.' },
    { id: 'lancee', label: 'Départs lancés', aim: 'Vitesse maximale sans le coût de la mise en action.' },
  ],
  muscu: [
    { id: 'montee', label: 'Montée en charge', aim: 'Séries progressives à vide puis chargées avant la série de travail.' },
    { id: 'activation', label: 'Activation', aim: 'Réveil des muscles cibles : élastique, poids de corps.' },
    { id: 'technique', label: 'Répétitions techniques', aim: 'Charge légère, attention portée au geste seul.' },
    { id: 'amplitude', label: 'Amplitude complète', aim: 'Parcourir toute l’amplitude avant de charger.' },
  ],
  escalade: [
    { id: 'voiesFaciles', label: 'Voies faciles', aim: 'Monter en température deux à trois cotations sous le niveau.' },
    { id: 'traversee', label: 'Traversée', aim: 'Volume de préhension à faible intensité.' },
    { id: 'piedsPrecis', label: 'Pieds précis', aim: 'Poser sans corriger, silencieusement.' },
    { id: 'doigts', label: 'Activation des doigts', aim: 'Suspensions courtes et légères — les poulies demandent une montée en charge.' },
  ],
  collectif: [
    { id: 'passes', label: 'Passes et réceptions', aim: 'Toucher de balle et coordination œil-main.' },
    { id: 'appuis', label: 'Travail d’appuis', aim: 'Changements de direction, freinage, relance.' },
    { id: 'conduite', label: 'Conduite de balle', aim: 'Contrôle en mouvement, tête levée.' },
    { id: 'oppositionLegere', label: 'Opposition légère', aim: 'Le geste du match, à intensité réduite.' },
  ],
  raquette: [
    { id: 'panier', label: 'Panier de balles', aim: 'Répétition du geste sans contrainte de jeu.' },
    { id: 'deplacements', label: 'Déplacements à vide', aim: 'Reprises d’appui et replacement.' },
    { id: 'echangeLent', label: 'Échange lent', aim: 'Régularité avant la vitesse.' },
    { id: 'service', label: 'Services', aim: 'Le geste le plus technique, à froid puis progressif.' },
  ],
}

// Les sports collectifs partagent leurs éducatifs : les décliner un par un
// donnerait quatre listes identiques.
export const DRILL_ALIASES = {
  demi: 'course', fond: 'course', trail: 'course', marche: 'course',
  vtt: 'velo',
  football: 'collectif', basket: 'collectif', rugby: 'collectif', frisbee: 'collectif', pingpong: 'raquette',
  crossfit: 'muscu', callisthenie: 'muscu', halterophilie: 'muscu', gym: 'muscu', fitness: 'muscu',
}

export function drillsFor(sport) {
  const key = DRILL_ALIASES[sport] || sport
  return DRILLS[key] || []
}

export function drillById(sport, id) {
  return drillsFor(sport).find((d) => d.id === id) || null
}

export function drillsSummary(sport, ids) {
  const list = asList(ids).map((id) => drillById(sport, id)).filter(Boolean)
  if (!list.length) return null
  return { count: list.length, labels: list.map((d) => d.label), text: list.map((d) => d.label).join(', ') }
}

// ─── Composer un échauffement ───────────────────────────────
//
// Cocher « mobilité » ne dit pas quoi faire. Un échauffement se compose :
// on monte en température, on ouvre ce que la séance va solliciter, puis
// on répète le geste en plus léger. Ce qui suit produit ce contenu à
// partir du sport, des zones raides relevées au dernier test, et de
// l'intensité prévue — une séance dure demande une préparation plus
// longue et plus spécifique qu'une sortie facile.

// Comment on monte en température, selon la discipline. Une seule ligne
// par sport suffit : c'est le geste de la séance, en très facile.
export const GENERAL_WARMUP = {
  course: 'Footing très lent, respiration nasale',
  velo: 'Pédalage souple, petit braquet',
  natation: 'Longueurs souples, nage alternée',
  muscu: 'Cardio léger : rameur, vélo ou corde',
  escalade: 'Traversée facile, prises généreuses',
  collectif: 'Course lente avec ballon, appuis progressifs',
  raquette: 'Déplacements légers, échange à mi-court',
  sprint: 'Footing lent puis marche active',
}

export function generalFor(sport) {
  const key = DRILL_ALIASES[sport] || sport
  return GENERAL_WARMUP[key] || GENERAL_WARMUP[sport] || 'Montée en température progressive : marche rapide ou footing lent'
}

// La famille de mobilité la mieux adaptée : celle qui prépare ce sport,
// et qui touche une zone raide si l'une d'elles est connue.
export function mobilityMovesFor(sport, { stiffZones = [], count = 4 } = {}) {
  const fams = TEMPLATE_FAMILIES.filter((f) => f.kind === 'mobilite')
  const scored = fams.map((f) => {
    let score = 0
    if (asList(f.prep).includes(sport)) score += 2
    score += asList(f.zones).filter((z) => stiffZones.includes(z)).length * 3
    return { f, score }
  }).sort((a, b) => b.score - a.score)
  const best = scored[0] && scored[0].score > 0 ? scored[0].f : fams[0]
  if (!best) return []
  // Le premier niveau : un échauffement n'est pas une séance de mobilité.
  // On y cherche des amplitudes libres, pas du gain d'amplitude.
  const keys = best.levels[0].keys.slice(0, count)
  return keys.map((k) => ({ key: k, name: (EX[k] || {}).name || k, family: best.label }))
}

// Répartition du temps. Une séance dure mérite plus de spécifique : c'est
// la partie qui prépare le geste lui-même, et celle qu'on saute en premier.
export function splitMinutes(total, hard) {
  const t = Math.max(0, Math.round(Number(total) || 0))
  if (!t) return { general: 0, mobilite: 0, specifique: 0 }
  const specPct = hard ? 0.4 : 0.25
  const mobPct = hard ? 0.25 : 0.3
  const spec = Math.max(1, Math.round(t * specPct))
  const mob = Math.max(1, Math.round(t * mobPct))
  return { general: Math.max(1, t - spec - mob), mobilite: mob, specifique: spec }
}

export function buildWarmup(sport, { mins = 15, stiffZones = [], hard = false } = {}) {
  const split = splitMinutes(mins, hard)
  const moves = mobilityMovesFor(sport, { stiffZones, count: hard ? 4 : 3 })
  const drills = drillsFor(sport).slice(0, hard ? 3 : 2)
  return {
    mins, hard, split,
    kinds: ['general', 'mobilite', 'specifique'],
    phases: [
      { id: 'general', label: 'Général', mins: split.general, items: [generalFor(sport)] },
      { id: 'mobilite', label: 'Mobilité', mins: split.mobilite, items: moves.map((m) => m.name), keys: moves.map((m) => m.key) },
      {
        id: 'specifique', label: 'Spécifique', mins: split.specifique,
        items: drills.length ? drills.map((d) => d.label) : ['Le geste de la séance, à intensité réduite'],
        drills: drills.map((d) => d.id),
      },
    ],
    text: `${mins} min : ${split.general} de montée en température, ${split.mobilite} de mobilité, ${split.specifique} de spécifique.`,
  }
}
