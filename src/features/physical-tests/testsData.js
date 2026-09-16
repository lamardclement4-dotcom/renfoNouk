// ============================================================
// Définition des tests physiques et normes de référence.
//
// Ces données vivaient dans PhysicalTests.jsx, l'écran. Deux modules
// d'analyse — testsIntel.js et renfoIntel.js — en importaient `TESTS_DEF`,
// et tiraient avec lui tout l'écran : React, le store, le kit d'interface.
// renfoIntel étant chargé dès l'accueil, l'écran des tests physiques était
// téléchargé au démarrage par toute personne ouvrant l'application, qu'elle
// aille voir ses tests ou non.
//
// Un module de données ne doit rien importer d'une interface : c'est la
// seule règle qui garde le découpage en morceaux efficace.
//
// Sources : Cooper (1968), ACSM Guidelines for Exercise Testing (11e éd.
// 2021), McGill (2002), NSCA, YMCA Fitness Testing, Rikli & Jones (2013).
// Niveau de preuve : moyennes de population, recommandations consensuelles.
// Limite : ne remplacent pas un test en laboratoire (ex. ergospirométrie
// pour le VO2max).
// ============================================================

export function ageGroup(age) {
  const a = Number(age) || 30
  if (a < 30) return '20-29'
  if (a < 40) return '30-39'
  if (a < 50) return '40-49'
  if (a < 60) return '50-59'
  return '60+'
}

// Seuils : [Excellent, Bien, Acceptable, Faible]
const NORMS = {
  cooper: {
    h: { '20-29': [2800, 2400, 2000, 1600], '30-39': [2700, 2300, 1900, 1500], '40-49': [2500, 2100, 1750, 1400], '50-59': [2300, 1950, 1600, 1300], '60+': [2100, 1800, 1450, 1200] },
    f: { '20-29': [2300, 2000, 1700, 1400], '30-39': [2200, 1900, 1600, 1350], '40-49': [2100, 1800, 1500, 1300], '50-59': [1900, 1650, 1400, 1200], '60+': [1700, 1500, 1300, 1100] },
  },
  gai_max: {
    h: { '20-29': [180, 120, 60, 30], '30-39': [170, 115, 58, 28], '40-49': [160, 105, 55, 25], '50-59': [145, 95, 50, 22], '60+': [130, 85, 45, 20] },
    f: { '20-29': [150, 100, 45, 22], '30-39': [140, 95, 43, 20], '40-49': [130, 85, 40, 18], '50-59': [115, 75, 35, 16], '60+': [100, 65, 30, 14] },
  },
  squat30: {
    h: { '20-29': [25, 20, 15, 10], '30-39': [24, 19, 14, 9], '40-49': [22, 17, 13, 8], '50-59': [20, 15, 11, 7], '60+': [18, 13, 9, 5] },
    f: { '20-29': [22, 17, 13, 8], '30-39': [21, 16, 12, 7], '40-49': [19, 14, 10, 6], '50-59': [17, 12, 9, 5], '60+': [15, 10, 7, 4] },
  },
  souplesse: {
    h: { '20-29': [40, 34, 17, 0], '30-39': [38, 32, 15, -2], '40-49': [35, 28, 12, -4], '50-59': [32, 24, 8, -6], '60+': [28, 20, 4, -8] },
    f: { '20-29': [41, 37, 23, 10], '30-39': [39, 35, 21, 8], '40-49': [37, 32, 18, 5], '50-59': [34, 29, 15, 2], '60+': [31, 26, 12, -1] },
  },
  push30: {
    h: { '20-29': [36, 29, 22, 14], '30-39': [33, 26, 19, 12], '40-49': [29, 22, 16, 10], '50-59': [25, 18, 13, 8], '60+': [20, 14, 10, 6] },
    f: { '20-29': [30, 23, 17, 10], '30-39': [27, 21, 15, 9], '40-49': [24, 18, 13, 7], '50-59': [21, 15, 11, 6], '60+': [17, 12, 8, 4] },
  },
}

const LEVEL_COLORS = { Excellent: 'var(--c-success)', Bien: '#7a9a4a', Acceptable: 'var(--c-warn)', Faible: '#c47a3a', 'Très faible': '#c4503a' }
const LEVEL_SCORES = { Excellent: 5, Bien: 4, Acceptable: 3, Faible: 2, 'Très faible': 1 }

function makeInterpret(testId) {
  return (val, sexe, age) => {
    const v = Number(val)
    const sx = sexe === 'f' ? 'f' : 'h'
    const grp = ageGroup(age)
    const table = (NORMS[testId] && NORMS[testId][sx] && NORMS[testId][sx][grp]) || NORMS[testId].h['20-29']
    let lvl
    if (v >= table[0]) lvl = 'Excellent'
    else if (v >= table[1]) lvl = 'Bien'
    else if (v >= table[2]) lvl = 'Acceptable'
    else if (v >= table[3]) lvl = 'Faible'
    else lvl = 'Très faible'
    return { level: lvl, color: LEVEL_COLORS[lvl], score: LEVEL_SCORES[lvl] }
  }
}

export const TESTS_DEF = [
  { id: 'cooper', label: 'Test de Cooper', unit: 'm', icon: 'route', color: '#e07b54', input: { type: 'number', min: 500, max: 5000, step: 50, placeholder: 'Distance en mètres' },
    protocol: "Courir 12 minutes à allure maximale sur terrain plat. Mesurer la distance. VO₂max ≈ (d – 504,9) / 44,73. Source : Cooper (1968), ACSM Guidelines (2021).",
    interpret: makeInterpret('cooper'), vo2max: (val) => Math.round((Number(val) - 504.9) / 44.73) },
  { id: 'gai_max', label: 'Gainage ventral max', unit: 's', icon: 'layers', color: '#5b6fa5', input: { type: 'number', min: 0, max: 600, step: 5, placeholder: 'Durée en secondes' },
    protocol: 'Position planche avant-bras, corps aligné. Maintenir le plus longtemps possible sans compensation. Source : McGill (2002), NSCA.',
    interpret: makeInterpret('gai_max') },
  { id: 'squat30', label: 'Squats 30 secondes', unit: 'rép.', icon: 'bolt', color: '#7a5fa5', input: { type: 'number', min: 0, max: 80, step: 1, placeholder: 'Nombre de répétitions' },
    protocol: 'Pieds écartés, descendre cuisses parallèles au sol, remonter complet. Maximum en 30s. Source : YMCA, Rikli & Jones (2013).',
    interpret: makeInterpret('squat30') },
  { id: 'souplesse', label: 'Sit & Reach', unit: 'cm', icon: 'target', color: 'var(--c-success)', input: { type: 'number', min: -30, max: 40, step: 1, placeholder: 'cm (+ = au-delà des pieds)' },
    protocol: 'Assis, jambes tendues, se pencher le plus loin possible. + = au-delà des pieds, - = en-deçà. Source : ACSM (2021), Wells & Dillon (1952).',
    interpret: makeInterpret('souplesse') },
  { id: 'push30', label: 'Pompes 30 secondes', unit: 'rép.', icon: 'dumbbell', color: '#a55b5b', input: { type: 'number', min: 0, max: 80, step: 1, placeholder: 'Nombre de répétitions' },
    protocol: "Pompes standard ou sur genoux. Descendre jusqu'au contact de poitrine, remonter bras tendus. Maximum en 30s. Source : YMCA, NSCA.",
    interpret: makeInterpret('push30') },
]
