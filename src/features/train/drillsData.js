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
