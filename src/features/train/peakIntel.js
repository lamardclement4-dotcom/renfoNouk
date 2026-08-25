// ============================================================
// Planification d'un pic de forme.
//
// Ce calcul vivait dans le composant `PeakSpace.jsx`, donc inaccessible à
// tout ce qui n'est pas cet écran. Or il décide d'une chose que le reste
// doit connaître : la semaine qui précède une échéance ne se planifie pas
// comme les autres. Proposer une grosse semaine à trois jours d'une course
// contredirait l'affûtage que l'application recommande par ailleurs.
//
// Sorti ici, sans React ni réseau, il se teste et se réutilise.
// ============================================================

function todayISO() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function parseISO(s) {
  const [y, m, d] = String(s || '').split('-').map(Number)
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1))
}
// Différence en jours, calculée en UTC : une construction en heure locale
// décale d'un jour à l'est de Greenwich, et une échéance décalée d'un jour
// fait démarrer l'affûtage au mauvais moment.
function daysBetween(fromISO, toISO) {
  const a = parseISO(fromISO)
  const b = parseISO(toISO)
  return Math.round((b - a) / 86400000)
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

export var EFFORT_PROFILES = {
  endurance: { label: 'Endurance longue', taperDays: 14, buildDays: 28, reductionMin: 41, reductionMax: 60, preuve: 'bon',
    note: 'Réduis le volume (distance/durée) de 41 à 60 %, en gardant l\u2019intensité (allures) et la fréquence des séances quasi identiques.' },
  force: { label: 'Force maximale', taperDays: 10, buildDays: 21, reductionMin: 40, reductionMax: 60, preuve: 'modéré',
    note: 'Réduis le volume (séries × répétitions) d\u2019environ 50 %, en maintenant ou augmentant légèrement les charges (intensité).' },
  puissance: { label: 'Puissance / vitesse', taperDays: 10, buildDays: 21, reductionMin: 30, reductionMax: 50, preuve: 'limité',
    note: 'Réduis le volume de 30 à 50 %, garde des efforts brefs et rapides (peu de répétitions) à intensité maximale pour conserver la vitesse d\u2019exécution.' },
  collectif: { label: 'Sport collectif / intermittent', taperDays: 8, buildDays: 21, reductionMin: 20, reductionMax: 35, preuve: 'faible',
    note: 'Réduis le volume total (durée/nombre d\u2019exercices) de 20 à 35 %, en gardant quelques séquences à intensité match pour ne pas perdre le rythme de jeu.' },
  hypertrophie: { label: 'Musculation / esthétique', taperDays: 7, buildDays: 21, reductionMin: 30, reductionMax: 50, preuve: 'faible',
    note: 'Si c\u2019est pour un physique-show : la vraie \u00AB peak week \u00BB se joue surtout côté nutrition/hydratation (hors périmètre entraînement) — vois le module Nutrition. Côté entraînement : baisse le volume de 30 à 50 % en gardant l\u2019intensité, pour arriver reposé et \u00AB plein \u00BB (pump) sans fatigue résiduelle.' },
  technique: { label: 'Technique / précision', taperDays: 7, buildDays: 14, reductionMin: 20, reductionMax: 40, preuve: 'très faible',
    note: 'Réduis surtout la charge physique et le volume de répétitions de 20 à 40 %, tout en gardant des répétitions techniques courtes et de qualité pour ne pas perdre les sensations.' },
  explosivite: { label: 'Explosivité (essai unique)', taperDays: 8, buildDays: 21, reductionMin: 40, reductionMax: 60, preuve: 'faible',
    note: 'Réduis fortement le volume (40 à 60 %) tout en gardant des efforts très proches du maximum sur peu de répétitions, pour arriver frais et précis sur tes 2-3 essais de compétition (haltéro, saut, lancer).' },
  combat: { label: 'Sport de combat', taperDays: 7, buildDays: 21, reductionMin: 50, reductionMax: 75, preuve: 'limité',
    note: 'Réduis nettement le volume (50 à 75 %) sur la dernière semaine, en gardant quelques échanges courts à intensité de combat pour garder les repères et le timing.' },
  agres: { label: 'Souplesse / Agrès', taperDays: 7, buildDays: 21, reductionMin: 25, reductionMax: 40, preuve: 'très faible',
    note: 'Réduis le volume physique (répétitions, difficulté) de 25 à 40 %, mais NE COUPE PAS le travail de souplesse : l\u2019amplitude articulaire se perd vite à l\u2019arrêt, contrairement aux autres qualités.' },
  mixte: { label: 'Autre / non précisé', taperDays: 12, buildDays: 21, reductionMin: 30, reductionMax: 45, preuve: 'faible',
    note: 'Réduis le volume d\u2019entraînement de 30 à 45 %, en gardant l\u2019intensité des exercices spécifiques et la fréquence des séances.' }
};


export function computePeakPlan(goal, todayStr) {
  todayStr = todayStr || todayISO();
  var profile = EFFORT_PROFILES[goal.effortType] || EFFORT_PROFILES.mixte;
  var daysRemaining = daysBetween(todayStr, goal.eventDate);

  var phase, taperProgress = null, targetVolumePct = null;
  if (daysRemaining < 0) {
    phase = 'past';
  } else if (daysRemaining === 0) {
    phase = 'today';
  } else if (daysRemaining <= profile.taperDays) {
    phase = 'taper';
    taperProgress = clamp(1 - (daysRemaining / profile.taperDays), 0, 1);
    var reductionCenter = (profile.reductionMin + profile.reductionMax) / 2;
    targetVolumePct = Math.round(100 - taperProgress * reductionCenter);
  } else if (daysRemaining <= profile.taperDays + profile.buildDays) {
    phase = 'build';
  } else {
    phase = 'base';
  }

  var taperStartISO = null;
  if (daysRemaining >= 0) {
    var d = parseISO(goal.eventDate);
    d.setDate(d.getDate() - profile.taperDays);
    var p = function(n){ return n < 10 ? '0'+n : ''+n; };
    taperStartISO = d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }

  return {
    daysRemaining: daysRemaining,
    weeksRemaining: Math.ceil(daysRemaining / 7),
    phase: phase,
    profile: profile,
    taperProgress: taperProgress,
    targetVolumePct: targetVolumePct,
    taperStartISO: taperStartISO
  };
}
