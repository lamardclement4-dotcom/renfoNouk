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
  accent: 'var(--c-primary)',
  // Le tracé : la couleur des courbes et des aiguilles.
  trace: 'var(--c-trace)',
  // Texte posé sur un aplat coloré. Blanc en clair, presque noir en sombre :
  // du blanc sur un vert phosphore vif serait illisible.
  onFill: 'var(--c-on-fill)',
  success: 'var(--c-success)',
  warn: 'var(--c-warn)',
  danger: 'var(--c-danger)',
  // Voies de mesure : chaque grandeur garde sa couleur partout.
  calorie: 'var(--c-calorie)',
  protein: 'var(--c-protein)',
  carb: 'var(--c-carb)',
  fat: 'var(--c-fat)',
  // Angles vifs : lignes droites et filets fins, pas de cartes arrondies.
  radius: 0,
  radiusSm: 0,
  radiusXs: 0,
  font: 'var(--f-text)',
  // Titres étroits en capitales, façon étiquette de flacon.
  display: 'var(--f-display)',
  // Chiffres et étiquettes de mesure, à chasse fixe.
  mono: 'var(--f-mono)',
  // Pas d'ombres : un instrument se lit à plat.
  shadowSm: 'none',
  shadow: 'none',
  shadowLg: 'none',
}

// Les anciens fonds dégradés par onglet sont tous ramenés au papier
// millimétré : l'identité vient du support, plus de la couleur de fond.
export const GRADIENTS = {
  accueil: 'var(--g-paper)',
  progres: 'var(--g-paper)',
  entrainer: 'var(--g-paper)',
  sante: 'var(--g-paper)',
  profil: 'var(--g-paper)',
}

// ------------------------------------------------------------
// Apparence. Une seule identité — le laboratoire —, en clair et en sombre.
// Les couleurs vivent dans index.css : choisir une apparence revient à
// poser data-theme sur <html>, ou à le retirer pour suivre le téléphone.
// ------------------------------------------------------------
export const THEMES = [
  { id: 'auto', label: 'Automatique', hint: 'Suit le réglage du téléphone' },
  { id: 'clair', label: 'Clair', hint: 'Papier millimétré' },
  { id: 'sombre', label: 'Sombre', hint: 'Écran d’instrument' },
]
export const DEFAULT_THEME = 'auto'
export const THEME_KEY = 'renfo:theme'

// Les thèmes d'avant la refonte : le choix fait est respecté autant que
// possible. « Nuit » était sombre ; « Clair », « Forêt » et « Couchant »
// étaient des choix clairs explicites ; « Origine » était le défaut de
// tout le monde, il suit donc désormais le téléphone.
const ANCIENS_THEMES = { nuit: 'sombre', clair: 'clair', foret: 'clair', couchant: 'clair', origine: 'auto' }

export function normalizeTheme(id) {
  if (THEMES.some((t) => t.id === id)) return id
  return ANCIENS_THEMES[id] || DEFAULT_THEME
}

export function applyTheme(id) {
  const choix = normalizeTheme(id)
  if (typeof document === 'undefined' || !document.documentElement) return choix
  const root = document.documentElement
  const st = root.style || {}
  // Les anciens thèmes écrivaient chaque couleur en style en ligne sur
  // <html> : on les efface, sinon ils masqueraient la palette d'index.css.
  if (typeof st.removeProperty === 'function' && typeof st.length === 'number') {
    for (let k = st.length - 1; k >= 0; k--) {
      const prop = st[k]
      if (/^--(c|g|m)-/.test(prop)) st.removeProperty(prop)
    }
  }
  const valeur = choix === 'clair' ? 'light' : choix === 'sombre' ? 'dark' : null
  if (root.dataset) {
    if (valeur) root.dataset.theme = valeur
    else delete root.dataset.theme
  } else if (valeur && typeof root.setAttribute === 'function') {
    root.setAttribute('data-theme', valeur)
  } else if (!valeur && typeof root.removeAttribute === 'function') {
    root.removeAttribute('data-theme')
  }
  st.colorScheme = valeur || ''
  return choix
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
  // L'encre : un aplat gris terne se lisait comme un bouton désactivé.
  prevention: 'var(--c-ink)',
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
export function FlowSpace({ title, subtitle, onClose, action, tint, children, fixed = true }) {
  // Tous les écrans sont posés sur le même papier millimétré.
  const surface = { backgroundColor: C.bg, backgroundImage: 'var(--g-paper)', backgroundSize: 'var(--g-paper-size)', backgroundPosition: '-1px -1px', backgroundAttachment: 'local' }
  return React.createElement('div', { style: fixed
    ? { position: 'fixed', inset: 0, ...surface, zIndex: 55, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', fontFamily: C.font, color: C.ink, animation: 'spaceIn .2s ease' }
    : { flex: 1, minHeight: 0, ...surface, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto', width: '100%', fontFamily: C.font, color: C.ink } },
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '14px 18px 32px' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
        React.createElement('button', { onClick: onClose, 'aria-label': 'Fermer', style: { width: 38, height: 38, background: C.surface, border: `1px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: '0 0 auto', color: C.ink } },
          React.createElement(Icon, { name: 'back', size: 18 })),
        React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: 38 } }, action || null)),
      React.createElement('h1', { style: { fontFamily: C.display, fontSize: 40, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.01em', lineHeight: .9, margin: 0, color: tint || C.ink, textWrap: 'balance' } }, title),
      subtitle && React.createElement('p', { style: { fontSize: 13.5, color: C.ink2, margin: '8px 0 0', lineHeight: 1.45, maxWidth: '60ch' } }, subtitle),
      React.createElement('div', { style: { marginTop: 18 } }, children)))
}

// Bandeau d'introduction d'un sous-écran. Carte claire teintée plutôt que
// bloc de couleur pleine : le grand titre de FlowSpace porte déjà l'accent,
// deux aplats saturés l'un sous l'autre alourdissaient l'écran.
export function SpaceBanner({ ic, tint, title, text }) {
  // Bandeau réglé plutôt que carte teintée : un filet épais au-dessus, un
  // filet fin dessous, comme l'en-tête d'une fiche de mesure.
  return React.createElement('div', { style: { display: 'flex', gap: 14, padding: '13px 0 14px', borderTop: `2px solid ${C.ink}`, borderBottom: `1px solid ${C.line}`, marginBottom: 18 } },
    React.createElement('div', { style: { width: 40, height: 40, flex: '0 0 auto', border: `1.5px solid ${tint}`, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      React.createElement(Icon, { name: ic, size: 20, color: tint })),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontFamily: C.display, fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.02em', lineHeight: 1, color: C.ink } }, title),
      React.createElement('p', { style: { fontSize: 13.5, color: C.ink2, margin: '6px 0 0', lineHeight: 1.45 } }, text)))
}

export function SecLab({ children, style }) {
  return React.createElement('div', { style: { fontFamily: C.display, fontSize: 14.5, fontWeight: 800, color: C.ink2, textTransform: 'uppercase', letterSpacing: '.07em', margin: '20px 0 10px', paddingBottom: 5, borderBottom: `1px solid ${C.line}`, ...style } }, children)
}

export function NoteBox({ tint = C.primary, children }) {
  return React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '3px 0 3px 12px', borderLeft: `3px solid ${tint}`, fontSize: 12.5, color: C.ink2, lineHeight: 1.5, marginTop: 14 } },
    React.createElement('span', { style: { color: tint, fontWeight: 600, flex: '0 0 auto', fontFamily: C.mono } }, '!'),
    React.createElement('span', null, children))
}

// Bascule segmentée : l'onglet actif est une pastille blanche surélevée
// dans une gouttière teintée, plutôt qu'un aplat de couleur — c'est le
// même vocabulaire que SegPills, en version compacte et pleine largeur.
export function SegTabs({ tabs, value, onChange, tint = C.primary }) {
  // Onglets soulignés plutôt que pilule coulissante : un trait sous l'onglet
  // actif, comme le sélecteur de voie d'un appareil.
  return React.createElement('div', { role: 'tablist', style: { display: 'flex', marginBottom: 18, borderBottom: `1px solid ${C.line}`, overflowX: 'auto' } },
    tabs.map((t) => {
      const active = value === t.id
      return React.createElement('button', { key: t.id, role: 'tab', 'aria-selected': active, onClick: () => onChange(t.id),
        style: { flex: 1, padding: '10px 10px 8px', fontFamily: C.display, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap', border: 'none', borderBottom: `2px solid ${active ? tint : 'transparent'}`, marginBottom: -1, cursor: 'pointer', color: active ? C.ink : C.ink3, background: 'transparent' } }, t.lab)
    }))
}

export function Pill({ tint = C.primary, solid, style, children }) {
  // Étiquette de mesure : petites capitales à chasse fixe, angles vifs.
  const base = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 7px', fontFamily: C.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: '.02em', textTransform: 'uppercase', lineHeight: 1.3 }
  return React.createElement('span', { style: solid
    ? { ...base, color: C.onFill, background: tint, ...style }
    : { ...base, color: tint, border: `1px solid ${tint}`, background: 'transparent', ...style } }, children)
}

// Anneau de progression SVG (utilisé par le lecteur de séance et le suivi de cycle).
export function Ring({ size = 250, stroke = 12, progress = 0, track = C.surface2, color = C.primary, pulse, children }) {
  // Cadran gradué : un arc de 270° ouvert vers le bas, avec ses graduations,
  // plutôt qu'un anneau fermé. C'est la forme des mesures dans l'app.
  const p = Math.max(0, Math.min(1, progress))
  const c = size / 2
  const m = Math.max(4, size * 0.06)
  const r = (size - stroke) / 2 - m
  const pt = (deg, rr) => { const a = deg * Math.PI / 180; return [c + rr * Math.cos(a), c + rr * Math.sin(a)] }
  const a0 = 135
  const course = 270
  const [x0, y0] = pt(a0, r)
  const [x1, y1] = pt(a0 + course, r)
  const arc = `M${x0.toFixed(2)},${y0.toFixed(2)} A${r.toFixed(2)},${r.toFixed(2)} 0 1 1 ${x1.toFixed(2)},${y1.toFixed(2)}`
  const graduations = []
  const n = 27
  for (let i = 0; i <= n; i++) {
    const grand = i % 9 === 0
    const [ax, ay] = pt(a0 + i * course / n, r + stroke / 2 + 1)
    const [bx, by] = pt(a0 + i * course / n, r + stroke / 2 + (grand ? m - 1 : m * 0.55))
    graduations.push(React.createElement('line', { key: i, x1: ax, y1: ay, x2: bx, y2: by, strokeWidth: grand ? 1.4 : 1, style: { stroke: grand ? C.ink2 : C.ink3 } }))
  }
  return React.createElement('div', { style: { position: 'relative', width: size, height: size, flex: '0 0 auto', animation: pulse ? 'ringPulse 3s ease-in-out infinite' : 'none' } },
    // Les couleurs passent par `style` : les attributs de présentation SVG
    // ne résolvent pas var(), et toute la palette est en variables CSS.
    React.createElement('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': true },
      graduations,
      React.createElement('path', { d: arc, fill: 'none', strokeWidth: stroke, style: { stroke: track } }),
      // L'aiguille monte depuis zéro à l'affichage (dialRise part d'un
      // décalage de 1, c'est-à-dire d'un arc vide), puis suit la valeur.
      React.createElement('path', { d: arc, fill: 'none', strokeWidth: stroke, pathLength: 1, strokeDasharray: '1 2', strokeDashoffset: 1 - p, style: { stroke: color, transition: 'stroke-dashoffset .4s linear', animation: 'dialRise 1s cubic-bezier(.3,.6,.3,1) .15s backwards' } })),
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
  // Étiquette posée sur le papier : fond uni qui masque la grille, filet
  // épais en tête, filets fins sur les côtés. Ni coins ronds ni ombre.
  const base = { background: C.surface, borderRadius: 0, padding: pad, border: `1px solid ${C.line}`, borderTop: `2px solid ${C.ink}`, width: '100%', boxSizing: 'border-box' }
  if (!onClick) return React.createElement('div', { style: { ...base, ...style } }, children)
  return React.createElement('button', { onClick, style: { ...base, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', ...style } }, children)
}

// Gros chiffre-repère : libellé discret, valeur dominante, unité en
// exposant optique. C'est le motif central de la maquette.
export function BigStat({ label, value, unit, color = C.ink, sub, size = 38, style }) {
  return React.createElement('div', { style },
    label && React.createElement('div', { style: { fontFamily: C.display, fontSize: 13.5, color: C.ink2, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 } }, label),
    React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', gap: 5 } },
      // La chasse fixe est large : on réduit un peu pour garder l'encombrement.
      React.createElement('span', { style: { fontFamily: C.mono, fontSize: Math.round(size * 0.84), fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1, color } }, value),
      unit && React.createElement('span', { style: { fontFamily: C.mono, fontSize: Math.max(10, Math.round(size * 0.3)), fontWeight: 400, color: C.ink3 } }, unit)),
    sub && React.createElement('div', { style: { fontSize: 12.5, color: C.ink3, marginTop: 6 } }, sub))
}

// Barre de progression fine.
export function Bar({ pct, color = C.primary, height = 6, style }) {
  // Jauge droite, avec son repère d'origine.
  return React.createElement('div', { style: { position: 'relative', width: '100%', height, background: C.surface2, borderLeft: `1px solid ${C.ink3}`, overflow: 'hidden', ...style } },
    React.createElement('div', { style: { width: Math.max(0, Math.min(100, pct)) + '%', height: '100%', background: color, transition: 'width .45s ease' } }))
}

// Pilules de filtre (1 sem. / 1 mois / …) : active pleine, inactives
// blanches cerclées.
export function SegPills({ options, value, onChange, tint = C.primary, style }) {
  // Sélecteur segmenté d'appareil : cases jointives, l'active en aplat.
  return React.createElement('div', { style: { display: 'flex', overflowX: 'auto', border: `1px solid ${C.line}`, background: C.surface, ...style } },
    options.map((o, i) => {
      const id = o.id !== undefined ? o.id : o
      const lab = o.label !== undefined ? o.label : o
      const on = id === value
      return React.createElement('button', {
        key: id,
        'aria-pressed': on,
        onClick: () => onChange(id),
        style: { flex: '1 0 auto', padding: '8px 12px', fontFamily: C.mono, fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', color: on ? C.onFill : C.ink2, background: on ? tint : 'transparent', border: 'none', borderLeft: i ? `1px solid ${C.line}` : 'none' },
      }, lab)
    }))
}

// Bouton d'action pleine largeur.
export function PrimaryBtn({ tint = C.primary, onClick, disabled, children, style }) {
  return React.createElement('button', { onClick, disabled,
    style: { width: '100%', padding: '14px 16px', fontFamily: C.display, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', border: 'none', color: disabled ? C.ink3 : C.onFill, background: disabled ? C.surface2 : tint, cursor: disabled ? 'default' : 'pointer', ...style } }, children)
}

export function Choice({ tint = C.primary, value, set, options, multi }) {
  return React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
    options.map((o) => {
      const active = multi ? (value || []).includes(o.id) : value === o.id
      return React.createElement('button', { key: o.id, type: 'button', 'aria-pressed': active, onClick: () => set(o.id),
        style: { padding: '9px 12px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          border: `1.5px solid ${active ? tint : C.line}`,
          background: C.surface,
          color: active ? C.ink : C.ink2 } }, o.lab)
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

// ── État d'enregistrement ────────────────────────────────────
// Une écriture qui échouait finissait dans un console.error : l'écran
// affichait la saisie, elle n'était jamais partie, et personne ne le
// savait. Ce bandeau n'apparaît que lorsqu'il y a quelque chose à dire.
export function SyncBanner({ sync, onRetry }) {
  if (!sync || sync.status === 'idle' || sync.status === 'saving') return null
  const isError = sync.status === 'error'
  const tint = isError ? 'var(--c-danger)' : C.warn
  return React.createElement('div', {
    role: 'status',
    style: {
      position: 'fixed', left: 12, right: 12, bottom: 'calc(76px + env(safe-area-inset-bottom))',
      zIndex: 90, maxWidth: 436, margin: '0 auto',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: C.radiusSm,
      background: C.surface,
      border: `1px solid color-mix(in srgb, ${tint} 40%, ${C.line})`,
      borderLeft: `3px solid ${tint}`,
      fontFamily: C.font,
    },
  },
    React.createElement(Icon, { name: isError ? 'shield' : 'clock', size: 16, color: tint, style: { flex: '0 0 auto' } }),
    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
      React.createElement('div', { style: { fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.35 } },
        isError
          ? 'Enregistrement impossible'
          : `${sync.pending} modification${sync.pending > 1 ? 's' : ''} en attente d’enregistrement`),
      React.createElement('div', { style: { fontSize: 11.5, color: C.ink3, marginTop: 2, lineHeight: 1.4 } },
        isError
          ? 'Tes données restent sur cet appareil et repartiront dès que possible.'
          : 'Elles partiront dès le retour du réseau — tu peux continuer.')),
    isError && onRetry ? React.createElement('button', {
      onClick: onRetry,
      style: { flex: '0 0 auto', padding: '7px 12px', border: 'none', background: tint, color: C.onFill, fontFamily: C.mono, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer' },
    }, 'Réessayer') : null)
}
