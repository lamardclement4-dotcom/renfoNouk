import React from 'react'

// ============================================================
// Kit UI partagé des modules Santé, porté depuis l'ancienne app.
// L'ancienne app utilisait des CSS custom properties (var(--surface)…) ;
// on les fige ici en constantes littérales cohérentes avec le reste
// (fond clair, surfaces blanches, accent bleu).
// ============================================================
// Les couleurs pointent vers des variables CSS plutôt que des valeurs
// littérales : changer de thème revient alors à réécrire les variables sur
// <html>, sans re-rendu ni refonte des composants (les styles en ligne
// résolvent var() au moment du peinturage). Attention : var() ne se résout
// PAS dans les attributs de présentation SVG — dans du SVG il faut passer
// la couleur par `style`, jamais par `fill=`/`stroke=`.
export const C = {
  bg: 'var(--c-bg)',
  surface: 'var(--c-surface)',
  surface2: 'var(--c-surface2)',
  ink: 'var(--c-ink)',
  ink2: 'var(--c-ink2)',
  ink3: 'var(--c-ink3)',
  line: 'var(--c-line)',
  primary: 'var(--c-primary)',
  // Accents sémantiques : chaque métrique garde la même couleur partout
  // (calories/série en orange, glucides et réussite en vert, lipides en
  // jaune), ce qui rend les anneaux lisibles sans légende.
  accent: 'var(--c-primary)',
  success: 'var(--c-success)',
  warn: 'var(--c-warn)',
  danger: 'var(--c-danger)',
  calorie: 'var(--c-calorie)',
  protein: 'var(--c-protein)',
  carb: 'var(--c-carb)',
  fat: 'var(--c-fat)',
  radius: 22,
  radiusSm: 16,
  radiusXs: 12,
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif',
  // Ombres très basses et diffuses : les cartes doivent flotter sur le
  // fond dégradé sans halo marqué.
  shadowSm: '0 1px 2px rgba(17,24,39,.04), 0 1px 3px rgba(17,24,39,.03)',
  shadow: '0 2px 8px rgba(17,24,39,.05), 0 8px 24px -12px rgba(17,24,39,.10)',
  shadowLg: '0 8px 30px -8px rgba(17,24,39,.14), 0 2px 8px rgba(17,24,39,.05)',
}

// Dégradés de fond par onglet : ce sont eux qui donnent son identité à
// chaque écran. Ils sont eux aussi pilotés par variables pour suivre le
// thème (un dégradé clair sur fond sombre serait illisible).
export const GRADIENTS = {
  accueil: 'var(--g-accueil)',
  progres: 'var(--g-progres)',
  entrainer: 'var(--g-entrainer)',
  sante: 'var(--g-sante)',
  profil: 'var(--g-profil)',
}

// ------------------------------------------------------------
// Thèmes. Chacun redéfinit la palette complète ; `dark` sert à adapter ce
// qui ne peut pas l'être par une simple couleur (barre d'état du système,
// opacité des voiles). L'ordre de la liste est celui affiché dans Profil.
// ------------------------------------------------------------
const grad = (a, b, c) => `linear-gradient(180deg, ${a} 0%, ${b} 22%, ${c} 46%)`

export const THEMES = [
  {
    id: 'clair', label: 'Clair', hint: 'Bleu, lumineux',
    swatch: ['#2d7ff9', '#2fb865', '#ff8a3d'],
    vars: {
      '--c-bg': '#f6f7f9', '--c-surface': '#ffffff', '--c-surface2': '#f1f3f6',
      '--c-ink': '#111827', '--c-ink2': '#5b6472', '--c-ink3': '#98a1ae', '--c-line': '#e8ebef',
      '--c-primary': '#2d7ff9', '--c-success': '#2fb865', '--c-warn': '#f0b429', '--c-danger': '#e5533d',
      '--c-calorie': '#ff8a3d', '--c-protein': '#2d7ff9', '--c-carb': '#2fb865', '--c-fat': '#f2b93b',
      '--m-hydra': '#2e7d9e', '--m-sleep': '#4a6fa5', '--m-cycle': '#b5566a', '--m-mind': '#3f8f8a',
      '--g-accueil': grad('#dbeafe', '#eef4fd', '#f6f7f9'),
      '--g-progres': grad('#d6f5e3', '#eaf8f0', '#f6f7f9'),
      '--g-entrainer': grad('#ffe8d6', '#fdf1e7', '#f6f7f9'),
      '--g-sante': grad('#e5e0fb', '#f0edfc', '#f6f7f9'),
      '--g-profil': grad('#e6eaf0', '#f0f2f6', '#f6f7f9'),
    },
  },
  {
    id: 'foret', label: 'Forêt', hint: 'Vert, apaisant',
    swatch: ['#2f9e63', '#3f8f8a', '#e0913a'],
    vars: {
      '--c-bg': '#f5f8f5', '--c-surface': '#ffffff', '--c-surface2': '#eef4ef',
      '--c-ink': '#14241c', '--c-ink2': '#546b5e', '--c-ink3': '#93a89b', '--c-line': '#e2ebe4',
      '--c-primary': '#2f9e63', '--c-success': '#2f9e63', '--c-warn': '#d9a13c', '--c-danger': '#c9553f',
      '--c-calorie': '#e0913a', '--c-protein': '#3f8f8a', '--c-carb': '#2f9e63', '--c-fat': '#d9a13c',
      '--m-hydra': '#2f8f9e', '--m-sleep': '#4a6b8f', '--m-cycle': '#a8577a', '--m-mind': '#3f8f8a',
      '--g-accueil': grad('#d5efdf', '#e8f5ec', '#f5f8f5'),
      '--g-progres': grad('#cfeada', '#e4f2e9', '#f5f8f5'),
      '--g-entrainer': grad('#f6e7d3', '#f2eee4', '#f5f8f5'),
      '--g-sante': grad('#d8ecec', '#e7f3f2', '#f5f8f5'),
      '--g-profil': grad('#e4ebe6', '#eef3ef', '#f5f8f5'),
    },
  },
  {
    id: 'couchant', label: 'Couchant', hint: 'Terracotta, chaleureux',
    swatch: ['#c25a3f', '#b5566a', '#bd923f'],
    vars: {
      '--c-bg': '#faf8f5', '--c-surface': '#ffffff', '--c-surface2': '#f4f0ea',
      '--c-ink': '#2b2320', '--c-ink2': '#6d5f58', '--c-ink3': '#a99a92', '--c-line': '#ece4dc',
      '--c-primary': '#c25a3f', '--c-success': '#5b8a72', '--c-warn': '#bd923f', '--c-danger': '#b5566a',
      '--c-calorie': '#d2703f', '--c-protein': '#a3526b', '--c-carb': '#5b8a72', '--c-fat': '#bd923f',
      '--m-hydra': '#2e7d9e', '--m-sleep': '#4a6fa5', '--m-cycle': '#b5566a', '--m-mind': '#3f8f8a',
      '--g-accueil': grad('#fbe3d4', '#f8ece2', '#faf8f5'),
      '--g-progres': grad('#e6efe0', '#f0f2ea', '#faf8f5'),
      '--g-entrainer': grad('#fadfd2', '#f7ebe2', '#faf8f5'),
      '--g-sante': grad('#f4dfe4', '#f7eaed', '#faf8f5'),
      '--g-profil': grad('#efe8e0', '#f5f0ea', '#faf8f5'),
    },
  },
  {
    id: 'nuit', label: 'Nuit', hint: 'Sombre, repose les yeux', dark: true,
    swatch: ['#4c8dff', '#35c07a', '#ff9d4d'],
    vars: {
      '--c-bg': '#0e1117', '--c-surface': '#171b23', '--c-surface2': '#1f242e',
      '--c-ink': '#eef1f6', '--c-ink2': '#a4adbb', '--c-ink3': '#727d8e', '--c-line': '#272d38',
      '--c-primary': '#4c8dff', '--c-success': '#35c07a', '--c-warn': '#e8bd52', '--c-danger': '#f2684f',
      '--c-calorie': '#ff9d4d', '--c-protein': '#4c8dff', '--c-carb': '#35c07a', '--c-fat': '#e8bd52',
      '--m-hydra': '#3fa9c9', '--m-sleep': '#7b93e0', '--m-cycle': '#e0709a', '--m-mind': '#4fb8b0',
      '--g-accueil': grad('#17233a', '#131a26', '#0e1117'),
      '--g-progres': grad('#132a20', '#111d18', '#0e1117'),
      '--g-entrainer': grad('#2a1d13', '#1d1712', '#0e1117'),
      '--g-sante': grad('#1f1a2e', '#171522', '#0e1117'),
      '--g-profil': grad('#161a21', '#12151b', '#0e1117'),
    },
  },
]

export const DEFAULT_THEME = 'clair'
export const THEME_KEY = 'renfo:theme'

// Écrit la palette du thème sur <html>. Appelée au démarrage puis à chaque
// changement dans Profil ; un id inconnu retombe sur le thème par défaut
// pour qu'une valeur périmée en base ne laisse pas l'interface sans
// couleurs.
export function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id) || THEMES.find((x) => x.id === DEFAULT_THEME)
  const root = document.documentElement
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v)
  root.style.colorScheme = t.dark ? 'dark' : 'light'
  root.dataset.theme = t.id
  return t.id
}

// Teintes par module. Elles réutilisent les rôles d'accent déjà définis
// (un module de récupération est vert comme la réussite, la nutrition
// verte comme les glucides…) et n'introduisent que les quatre teintes qui
// n'avaient pas d'équivalent, pour que chaque thème reste léger à décrire
// tout en gardant les modules distinguables.
export const MODULE_TINTS = {
  mobilite: 'var(--c-protein)',
  renfo: 'var(--c-calorie)',
  fullbody: 'var(--c-fat)',
  plyo: 'var(--c-danger)',
  recup: 'var(--c-success)',
  nutrition: 'var(--c-carb)',
  hydratation: 'var(--m-hydra)',
  sommeil: 'var(--m-sleep)',
  prevention: 'var(--c-ink2)',
  cycle: 'var(--m-cycle)',
  esprit: 'var(--m-mind)',
  complements: 'var(--c-warn)',
  danger: 'var(--c-danger)',
}

// ------------------------------------------------------------
// Set d'icônes SVG (style trait, viewBox 24x24, currentColor) qui
// remplace les emojis système : rendu net et identique sur tous les
// appareils/OS, au lieu de dépendre de la police emoji locale.
// Chaque entrée est une liste d'enfants SVG (path/circle/line/rect) ;
// par défaut ils héritent du stroke=currentColor du <svg> parent, sauf
// mention contraire (fill pour les icônes "pleines").
// ------------------------------------------------------------
const el = React.createElement
const ICONS = {
  apple: [
    el('circle', { key: 1, cx: 12, cy: 13.5, r: 6.5 }),
    el('path', { key: 2, d: 'M12 7V4.2' }),
    el('path', { key: 3, d: 'M12 5.5c1.2-1.6 3-1.3 3-1.3s.1 2-1.8 2.7c-.6.2-1.2 0-1.2 0' }),
  ],
  drop: [el('path', { d: 'M12 3s6.5 7 6.5 11.5a6.5 6.5 0 1 1-13 0C5.5 10 12 3 12 3z' })],
  droplet: [el('path', { d: 'M12 3s6.5 7 6.5 11.5a6.5 6.5 0 1 1-13 0C5.5 10 12 3 12 3z' })],
  moon: [el('path', { d: 'M20 14.2A8.5 8.5 0 1 1 9.8 4a7 7 0 0 0 10.2 10.2z', fill: 'currentColor' })],
  shield: [el('path', { d: 'M12 3l7 3v6c0 5-3.2 7.8-7 9-3.8-1.2-7-4-7-9V6l7-3z' })],
  wave: [
    el('path', { key: 1, d: 'M3 9c1.4-1.8 3.2-1.8 4.6 0s3.2 1.8 4.6 0 3.2-1.8 4.6 0 3.2 1.8 4.6 0' }),
    el('path', { key: 2, d: 'M3 15c1.4-1.8 3.2-1.8 4.6 0s3.2 1.8 4.6 0 3.2-1.8 4.6 0 3.2 1.8 4.6 0' }),
  ],
  spark: [el('path', { d: 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z', fill: 'currentColor' })],
  cup: [
    el('path', { key: 1, d: 'M6 8h10v6a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8z' }),
    el('path', { key: 2, d: 'M16 9.5h1.5a2 2 0 0 1 0 4H16' }),
    el('path', { key: 3, d: 'M9 4.2c0 1-1 1-1 2s1 1 1 2' }),
    el('path', { key: 4, d: 'M13 4.2c0 1-1 1-1 2s1 1 1 2' }),
  ],
  leaf: [
    el('path', { key: 1, d: 'M5 21c9-1 14.5-6.5 15-15.5C11 6 5.5 11 5 21z' }),
    el('path', { key: 2, d: 'M6.5 19.5L18 8' }),
  ],
  flame: [
    el('path', { key: 1, d: 'M12 2.3c2.2 3-1.2 5-1.2 8.5a3.8 3.8 0 0 0 7.6 0c0-1-.3-1.8-.3-1.8s1.1.7 1.1 2.8a4.9 4.9 0 0 1-9.8 0c0-3.8 2.8-6 2.6-9.5z' }),
    el('path', { key: 2, d: 'M12 12.3c.9 1.2.6 2.9-.5 3.8' }),
  ],
  layers: [
    el('path', { key: 1, d: 'M12 3 3 8l9 5 9-5-9-5z' }),
    el('path', { key: 2, d: 'M3 13l9 5 9-5' }),
    el('path', { key: 3, d: 'M3 17.5l9 5 9-5' }),
  ],
  route: [
    el('path', { key: 1, d: 'M6 3v18' }),
    el('path', { key: 2, d: 'M6 4h11l-3 4 3 4H6z' }),
  ],
  bolt: [el('path', { d: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z', fill: 'currentColor' })],
  zap: [el('path', { d: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z', fill: 'currentColor' })],
  target: [
    el('circle', { key: 1, cx: 12, cy: 12, r: 9 }),
    el('circle', { key: 2, cx: 12, cy: 12, r: 5 }),
    el('circle', { key: 3, cx: 12, cy: 12, r: 1.4, fill: 'currentColor' }),
  ],
  dumbbell: [
    el('path', { key: 1, d: 'M8.5 12h7' }),
    el('rect', { key: 2, x: 3.5, y: 9, width: 3.2, height: 6, rx: 1 }),
    el('rect', { key: 3, x: 17.3, y: 9, width: 3.2, height: 6, rx: 1 }),
  ],
  user: [
    el('circle', { key: 1, cx: 12, cy: 8, r: 3.6 }),
    el('path', { key: 2, d: 'M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7' }),
  ],
  close: [
    el('path', { key: 1, d: 'M6 6l12 12' }),
    el('path', { key: 2, d: 'M18 6L6 18' }),
  ],
  back: [
    el('path', { key: 1, d: 'M19 12H5' }),
    el('path', { key: 2, d: 'M11 6l-6 6 6 6' }),
  ],
  arrow: [
    el('path', { key: 1, d: 'M5 12h14' }),
    el('path', { key: 2, d: 'M13 6l6 6-6 6' }),
  ],
  next: [el('path', { d: 'M9 6l6 6-6 6' })],
  play: [el('path', { d: 'M8 5v14l11-7z', fill: 'currentColor' })],
  check: [el('path', { d: 'M5 13l4 4L19 7' })],
  chart: [
    el('path', { key: 1, d: 'M3 17l6-6 4 4 8-8' }),
    el('path', { key: 2, d: 'M15 6.6h6V12.6' }),
  ],
  clock: [
    el('circle', { key: 1, cx: 12, cy: 12, r: 9 }),
    el('path', { key: 2, d: 'M12 7v5l4 2' }),
  ],
  search: [
    el('circle', { key: 1, cx: 11, cy: 11, r: 7 }),
    el('path', { key: 2, d: 'M21 21l-4.3-4.3' }),
  ],
  heart: [el('path', { d: 'M12 20.5s-7-4.3-9.3-8.6A5.2 5.2 0 0 1 12 6.5a5.2 5.2 0 0 1 9.3 5.4c-2.3 4.3-9.3 8.6-9.3 8.6z', fill: 'currentColor' })],
  battery: [
    el('rect', { key: 1, x: 2, y: 8, width: 17, height: 8, rx: 2 }),
    el('path', { key: 2, d: 'M21 11v2' }),
    el('rect', { key: 3, x: 4, y: 10, width: 9, height: 4, fill: 'currentColor', stroke: 'none' }),
  ],
  bell: [
    el('path', { key: 1, d: 'M6 9a6 6 0 0 1 12 0c0 4.5 1.8 5.8 1.8 5.8H4.2S6 13.5 6 9z' }),
    el('path', { key: 2, d: 'M10 19.5a2 2 0 0 0 4 0' }),
  ],
  calendar: [
    el('rect', { key: 1, x: 3, y: 5, width: 18, height: 16, rx: 2 }),
    el('path', { key: 2, d: 'M3 10h18' }),
    el('path', { key: 3, d: 'M8 3v4' }),
    el('path', { key: 4, d: 'M16 3v4' }),
  ],
  plus: [
    el('path', { key: 1, d: 'M12 5v14' }),
    el('path', { key: 2, d: 'M5 12h14' }),
  ],
  pill: [
    el('path', { key: 1, d: 'M8.3 15.7a5 5 0 0 1 0-7l3.4-3.4a5 5 0 0 1 7 7l-3.4 3.4a5 5 0 0 1-7 0z' }),
    el('path', { key: 2, d: 'M9.5 9.5l5 5' }),
  ],
  sun: [
    el('circle', { key: 1, cx: 12, cy: 12, r: 4 }),
    el('path', { key: 2, d: 'M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6' }),
  ],
  bed: [
    el('path', { key: 1, d: 'M3 18v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6' }),
    el('path', { key: 2, d: 'M3 18v2' }),
    el('path', { key: 3, d: 'M21 18v2' }),
    el('rect', { key: 4, x: 5, y: 10.5, width: 5.5, height: 3, rx: 1 }),
  ],
  wind: [
    el('path', { key: 1, d: 'M3 8h10.5a2 2 0 1 0-2-2' }),
    el('path', { key: 2, d: 'M3 12.2h14a2 2 0 1 1-2 2' }),
    el('path', { key: 3, d: 'M3 16.4h8' }),
  ],
  brain: [
    el('path', { d: 'M9.5 3.5a3.2 3.2 0 0 0-3.2 3.2 3.2 3.2 0 0 0-1.6 5.8 3.2 3.2 0 0 0 1.9 5.7 3.2 3.2 0 0 0 5.4 1.8V4.3a3.2 3.2 0 0 0-2.5-.8zM14.5 3.5a3.2 3.2 0 0 1 3.2 3.2 3.2 3.2 0 0 1 1.6 5.8 3.2 3.2 0 0 1-1.9 5.7 3.2 3.2 0 0 1-5.4 1.8V4.3a3.2 3.2 0 0 1 2.5-.8z' }),
  ],
  alert: [
    el('path', { key: 1, d: 'M12 3 2 20h20L12 3z' }),
    el('path', { key: 2, d: 'M12 9.5v4.5' }),
    el('circle', { key: 3, cx: 12, cy: 17, r: 0.9, fill: 'currentColor', stroke: 'none' }),
  ],
  info: [
    el('circle', { key: 1, cx: 12, cy: 12, r: 9 }),
    el('circle', { key: 2, cx: 12, cy: 8.2, r: 0.9, fill: 'currentColor', stroke: 'none' }),
    el('path', { key: 3, d: 'M12 11.2v5.3' }),
  ],
  star: [el('path', { d: 'M12 2.5l3 6.9 7 .6-5.5 4.8 1.8 7-6.3-4-6.3 4 1.8-7-5.5-4.8 7-.6z', fill: 'currentColor' })],
  run: [
    el('circle', { key: 1, cx: 14, cy: 4.3, r: 1.8, fill: 'currentColor', stroke: 'none' }),
    el('path', { key: 2, d: 'M10 8.5l3 2.8-1.6 4L14 19M13 11.3l3.4-1 1.6 3M9 21l2.6-4.7' }),
  ],
  stretch: [
    el('circle', { key: 1, cx: 12, cy: 4.3, r: 1.8, fill: 'currentColor', stroke: 'none' }),
    el('path', { key: 2, d: 'M7.5 8.5h9M12 8.5v7.5M12 16l-3 5M12 16l3 5' }),
  ],
  snow: [
    el('path', { key: 1, d: 'M12 2v20' }),
    el('path', { key: 2, d: 'M4.5 7l15 10' }),
    el('path', { key: 3, d: 'M19.5 7l-15 10' }),
  ],
  trophy: [
    el('path', { key: 1, d: 'M8 4h8v4.2a4 4 0 0 1-8 0V4z' }),
    el('path', { key: 2, d: 'M6 5.2H4.3a2 2 0 0 0 0 4H6' }),
    el('path', { key: 3, d: 'M18 5.2h1.7a2 2 0 0 1 0 4H18' }),
    el('path', { key: 4, d: 'M12 12.2v3.8' }),
    el('path', { key: 5, d: 'M8.3 20h7.4' }),
    el('path', { key: 6, d: 'M9.3 16h5.4l.6 4H8.7z' }),
  ],
  pause: [
    el('rect', { key: 1, x: 6, y: 5, width: 4, height: 14, rx: 1, fill: 'currentColor', stroke: 'none' }),
    el('rect', { key: 2, x: 14, y: 5, width: 4, height: 14, rx: 1, fill: 'currentColor', stroke: 'none' }),
  ],
  prev: [el('path', { d: 'M15 6l-6 6 6 6' })],
  mountain: [el('path', { d: 'M3 20 9 8l3.2 5.8L15 9l6 11H3z' })],
  ball: [
    el('circle', { key: 1, cx: 12, cy: 12, r: 9 }),
    el('path', { key: 2, d: 'M12 8.3l3.4 2.4-1.3 4h-4.2l-1.3-4z' }),
    el('path', { key: 3, d: 'M12 3v5.3M6.2 8.5l-3.6 1.2M8.7 18.7l-1.3 4M15.3 18.7l1.3 4M17.8 8.5l3.6 1.2' }),
  ],
  edit: [
    el('path', { key: 1, d: 'M12 20h9' }),
    el('path', { key: 2, d: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' }),
  ],
  pin: [
    el('path', { key: 1, d: 'M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z' }),
    el('circle', { key: 2, cx: 12, cy: 10, r: 2.4 }),
  ],
  home: [el('path', { d: 'M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.2v-6.2H9.2V21H5a1 1 0 0 1-1-1z' })],
  glass: [
    el('path', { key: 1, d: 'M6.5 3h11l-1.3 16.3a2 2 0 0 1-2 1.7H9.8a2 2 0 0 1-2-1.7L6.5 3z' }),
    el('path', { key: 2, d: 'M7 8h10' }),
  ],
  bottle: [
    el('path', { key: 1, d: 'M10 2h4v3.2l1.5 2V21a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V7.2l1.5-2V2z' }),
    el('path', { key: 2, d: 'M9.3 12h5.4' }),
  ],
  wine: [
    el('path', { key: 1, d: 'M7 3h10c0 5-1.5 8-5 8s-5-3-5-8z' }),
    el('path', { key: 2, d: 'M12 11v7' }),
    el('path', { key: 3, d: 'M8.5 21h7' }),
  ],
  dot: [el('circle', { cx: 12, cy: 12, r: 3, fill: 'currentColor', stroke: 'none' })],
}
export function Icon({ name, size = 16, color, style }) {
  const children = ICONS[name] || ICONS.dot
  return el('svg', {
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { display: 'inline-block', flexShrink: 0, color: color || 'currentColor', ...style },
  }, ...children)
}

// Conteneur d'un "space" avec en-tête + zone scrollable. `fixed` (true par
// défaut) le fait couvrir tout le viewport, comme un "flow" qui masque la
// barre de navigation basse — utilisé par les sous-écrans. Les onglets
// racine (Progrès, Profil) passent fixed=false pour rester un enfant flex
// normal du cadre de App.jsx et laisser la barre de nav visible.
// Coquille commune à tous les sous-écrans. Le titre est traité en grand,
// aligné à gauche, sous une barre d'actions compacte : c'est ce qui donne
// aux sous-écrans la même allure que les onglets principaux.
// `tint` colore le titre (compat. appelants existants) ; `bg` choisit le
// dégradé d'ambiance parmi GRADIENTS ; `subtitle` ajoute une ligne de
// contexte sous le titre.
export function FlowSpace({ title, subtitle, onClose, action, tint, bg, children, fixed = true }) {
  const surface = bg && GRADIENTS[bg]
    ? { backgroundImage: GRADIENTS[bg], backgroundColor: C.bg, backgroundAttachment: 'local', backgroundRepeat: 'no-repeat' }
    : { background: C.bg }
  return React.createElement('div', { style: fixed
    ? { position: 'fixed', inset: 0, ...surface, zIndex: 55, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font, animation: 'spaceIn .22s ease' }
    : { flex: 1, minHeight: 0, ...surface, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', width: '100%', fontFamily: C.font } },
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '14px 18px 32px' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
        React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 38, height: 38, borderRadius: 999, background: C.surface, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: C.shadowSm, flex: '0 0 auto' } },
          React.createElement(Icon, { name: 'back', size: 19 })),
        React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: 38 } }, action || null)),
      React.createElement('h1', { style: { fontFamily: C.font, fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1, margin: 0, color: tint || C.ink } }, title),
      subtitle && React.createElement('p', { style: { fontSize: 13.5, color: C.ink2, margin: '6px 0 0', lineHeight: 1.45 } }, subtitle),
      React.createElement('div', { style: { marginTop: 18 } }, children)))
}

// Bandeau d'introduction d'un sous-écran. Carte claire teintée plutôt que
// bloc de couleur pleine : le grand titre de FlowSpace porte déjà l'accent,
// deux aplats saturés l'un sous l'autre alourdissaient l'écran.
export function SpaceBanner({ ic, tint, title, text }) {
  return React.createElement('div', { style: { display: 'flex', gap: 14, padding: 16, borderRadius: C.radius, background: `color-mix(in srgb, ${tint} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${tint} 24%, ${C.line})`, marginBottom: 18 } },
    React.createElement('div', { style: { width: 44, height: 44, borderRadius: 13, flex: '0 0 auto', background: `color-mix(in srgb, ${tint} 16%, ${C.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      React.createElement(Icon, { name: ic, size: 22, color: tint })),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontFamily: C.font, fontSize: 16.5, fontWeight: 700, lineHeight: 1.2, color: C.ink } }, title),
      React.createElement('p', { style: { fontSize: 13.5, color: C.ink2, margin: '5px 0 0', lineHeight: 1.45 } }, text)))
}

export function SecLab({ children, style }) {
  return React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: 'uppercase', letterSpacing: '.03em', margin: '18px 2px 10px', ...style } }, children)
}

export function NoteBox({ tint = C.primary, children }) {
  return React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: C.radiusSm, background: `color-mix(in srgb, ${tint} 9%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${tint} 25%, ${C.line})`, fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: 14 } },
    React.createElement('span', { style: { color: tint, fontWeight: 800, flex: '0 0 auto' } }, '!'),
    React.createElement('span', null, children))
}

// Bascule segmentée : l'onglet actif est une pastille blanche surélevée
// dans une gouttière teintée, plutôt qu'un aplat de couleur — c'est le
// même vocabulaire que SegPills, en version compacte et pleine largeur.
export function SegTabs({ tabs, value, onChange, tint = C.primary }) {
  return React.createElement('div', { style: { display: 'flex', gap: 4, background: C.surface2, padding: 4, borderRadius: 999, marginBottom: 18, border: `1px solid ${C.line}` } },
    tabs.map((t) => {
      const active = value === t.id
      return React.createElement('button', { key: t.id, onClick: () => onChange(t.id),
        style: { flex: 1, padding: '9px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', color: active ? tint : C.ink2, background: active ? C.surface : 'transparent', boxShadow: active ? C.shadowSm : 'none', transition: 'all .15s ease' } }, t.lab)
    }))
}

export function Pill({ tint = C.primary, solid, style, children }) {
  return React.createElement('span', { style: solid
    ? { display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#fff', background: tint, ...style }
    : { display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: tint, background: `color-mix(in srgb, ${tint} 12%, ${C.surface})`, border: `1px solid color-mix(in srgb, ${tint} 30%, ${C.line})`, ...style } }, children)
}

// Anneau de progression SVG (utilisé par le lecteur de séance et le suivi de cycle).
export function Ring({ size = 250, stroke = 12, progress = 0, track = C.surface2, color = C.primary, pulse, children }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return React.createElement('div', { style: { position: 'relative', width: size, height: size, flex: '0 0 auto', animation: pulse ? 'ringPulse 3s ease-in-out infinite' : 'none' } },
    // Les couleurs passent par `style` et non par l'attribut `stroke` :
    // les attributs de présentation SVG ne résolvent pas var(), et toute
    // la palette est désormais en variables CSS (thèmes).
    React.createElement('svg', { width: size, height: size, style: { transform: 'rotate(-90deg)' } },
      React.createElement('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', strokeWidth: stroke, style: { stroke: track } }),
      React.createElement('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', strokeWidth: stroke, strokeLinecap: 'round', strokeDasharray: circ, strokeDashoffset: circ * (1 - Math.max(0, Math.min(1, progress))), style: { stroke: color, transition: 'stroke-dashoffset .4s linear' } })),
    React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } }, children))
}

// ------------------------------------------------------------
// Primitives de la refonte visuelle : fond dégradé par onglet, carte
// blanche surélevée, gros chiffre-repère, pilules de filtre et bouton
// flottant. Elles encapsulent le style pour que les écrans décrivent leur
// contenu plutôt que de répéter des objets de style.
// ------------------------------------------------------------

// Carte blanche standard.
export function Card({ children, style, onClick, pad = 16 }) {
  const base = { background: C.surface, borderRadius: C.radius, padding: pad, boxShadow: C.shadow, border: `1px solid ${C.line}`, width: '100%', boxSizing: 'border-box' }
  if (!onClick) return React.createElement('div', { style: { ...base, ...style } }, children)
  return React.createElement('button', { onClick, style: { ...base, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', ...style } }, children)
}

// Gros chiffre-repère : libellé discret, valeur dominante, unité en
// exposant optique. C'est le motif central de la maquette.
export function BigStat({ label, value, unit, color = C.ink, sub, size = 38, style }) {
  return React.createElement('div', { style },
    label && React.createElement('div', { style: { fontSize: 13, color: C.ink2, fontWeight: 600, marginBottom: 4 } }, label),
    React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 4 } },
      React.createElement('span', { style: { fontFamily: C.font, fontSize: size, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, color } }, value),
      unit && React.createElement('span', { style: { fontSize: Math.round(size * 0.42), fontWeight: 700, color: C.ink3 } }, unit)),
    sub && React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 6 } }, sub))
}

// Barre de progression fine.
export function Bar({ pct, color = C.primary, height = 6, style }) {
  return React.createElement('div', { style: { width: '100%', height, borderRadius: 999, background: C.surface2, overflow: 'hidden', ...style } },
    React.createElement('div', { style: { width: Math.max(0, Math.min(100, pct)) + '%', height: '100%', borderRadius: 999, background: color, transition: 'width .45s ease' } }))
}

// Pilules de filtre (1 sem. / 1 mois / …) : active pleine, inactives
// blanches cerclées.
export function SegPills({ options, value, onChange, tint = C.primary, style }) {
  return React.createElement('div', { style: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, ...style } },
    options.map((o) => {
      const id = o.id !== undefined ? o.id : o
      const lab = o.label !== undefined ? o.label : o
      const on = id === value
      return React.createElement('button', {
        key: id,
        onClick: () => onChange(id),
        style: { flex: '0 0 auto', padding: '9px 16px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: on ? '#fff' : C.ink2, background: on ? tint : C.surface, border: `1px solid ${on ? tint : C.line}`, boxShadow: on ? `0 8px 18px -10px ${tint}` : C.shadowSm },
      }, lab)
    }))
}

// Bouton d'action pleine largeur.
export function PrimaryBtn({ tint = C.primary, onClick, disabled, children, style }) {
  return React.createElement('button', { onClick, disabled,
    style: { width: '100%', padding: 15, borderRadius: 999, fontSize: 15, fontWeight: 800, border: 'none', color: '#fff', background: disabled ? C.surface2 : tint, cursor: disabled ? 'default' : 'pointer', boxShadow: disabled ? 'none' : `0 12px 26px -14px ${tint}`, ...style } }, children)
}

export function Choice({ tint = C.primary, value, set, options, multi }) {
  return React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
    options.map((o) => {
      const active = multi ? (value || []).includes(o.id) : value === o.id
      return React.createElement('button', { key: o.id, type: 'button', onClick: () => set(o.id),
        style: { padding: '10px 14px', borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          border: '1.5px solid ' + (active ? tint : '#ddd'),
          background: active ? `color-mix(in srgb, ${tint} 12%, ${C.surface})` : C.surface,
          color: active ? tint : C.ink2 } }, o.lab)
    }))
}

export function isoToday() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
export function isoShift(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}
export function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
