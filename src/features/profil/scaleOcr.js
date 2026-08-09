// ============================================================
// Lecture d'une capture d'écran de balance connectée.
//
// L'OCR tourne sur l'appareil (aucun serveur, aucune image envoyée), ce
// qui le rend gratuit et privé mais faillible : virgules lues comme des
// points, "8" confondu avec "0", libellés tronqués. Toutes les valeurs
// extraites passent donc par un écran de validation avant enregistrement,
// et chaque mesure est bornée à une plage physiologiquement plausible —
// une masse grasse à 300 % est un défaut de lecture, pas une donnée.
//
// Ce module ne fait que du texte vers valeurs : il est pur et testable
// sans OCR ni rendu.
// ============================================================

// Plages de validité. Une valeur hors plage est rejetée plutôt que
// corrigée : mieux vaut demander la saisie que d'enregistrer un chiffre
// faux.
export const METRICS = [
  { key: 'kg', label: 'Poids', unit: 'kg', min: 20, max: 300, decimals: 1,
    patterns: [/\bpoids\b/, /\bweight\b/, /\bmasse\s+totale\b/] },
  { key: 'fatPct', label: 'Masse grasse', unit: '%', min: 2, max: 70, decimals: 1,
    patterns: [/masse\s*grasse/, /graisse\s*corporelle/, /body\s*fat/, /\bfat\b/, /^\s*mg\b/] },
  { key: 'musclePct', label: 'Masse musculaire', unit: '%', min: 10, max: 70, decimals: 1,
    patterns: [/masse\s*musculaire/, /muscle\s*mass/, /\bmuscle\b/] },
  { key: 'waterPct', label: 'Eau', unit: '%', min: 25, max: 80, decimals: 1,
    patterns: [/\beau\b/, /hydratation/, /body\s*water/, /\bwater\b/] },
  { key: 'boneKg', label: 'Masse osseuse', unit: 'kg', min: 0.5, max: 8, decimals: 1,
    patterns: [/masse\s*osseuse/, /\bos\b/, /bone\s*mass/, /\bbone\b/] },
  { key: 'visceral', label: 'Graisse viscérale', unit: '', min: 1, max: 30, decimals: 0,
    patterns: [/visc[ée]rale?/, /visceral/] },
  { key: 'bmi', label: 'IMC', unit: '', min: 10, max: 60, decimals: 1,
    patterns: [/\bimc\b/, /\bbmi\b/, /indice\s*de\s*masse/] },
  { key: 'metabolicAge', label: 'Âge métabolique', unit: 'ans', min: 10, max: 100, decimals: 0,
    patterns: [/[âa]ge\s*m[ée]tabolique/, /metabolic\s*age/] },
  { key: 'bmr', label: 'Métabolisme de base', unit: 'kcal', min: 600, max: 4000, decimals: 0,
    patterns: [/m[ée]tabolisme\s*(de\s*)?base/, /\bbmr\b/, /\bmb\b/] },
  { key: 'proteinPct', label: 'Protéines', unit: '%', min: 5, max: 35, decimals: 1,
    patterns: [/prot[ée]ine/, /\bprotein\b/] },
]

// Normalise une ligne pour la comparaison de libellés : minuscules, sans
// accents, espaces resserrés.
export function normLine(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extrait le premier nombre d'une chaîne. Gère la virgule décimale, les
// espaces insécables comme séparateur de milliers, et le point que
// certains OCR insèrent à la place de la virgule.
export function parseNumber(s) {
  if (!s) return null
  const cleaned = String(s)
    .replace(/[  ]/g, '')
    .replace(/(\d)\s+(\d{3}\b)/g, '$1$2')
  const m = cleaned.match(/-?\d+(?:[.,]\d+)?/)
  if (!m) return null
  const n = parseFloat(m[0].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function round(v, decimals) {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}

// Unité écrite à côté de la valeur. C'est le seul moyen de trancher entre
// "masse grasse 16 %" et "masse grasse 16 kg" : les deux nombres sont
// plausibles en pourcentage, seule l'unité les distingue.
function unitHint(text) {
  if (/%/.test(text)) return '%'
  if (/\bkgs?\b/.test(text)) return 'kg'
  if (/\blbs?\b/.test(text)) return 'lb'
  return null
}

// Certaines balances affichent la masse grasse ou musculaire en kg plutôt
// qu'en pourcentage. On convertit quand l'unité l'indique, ou quand la
// valeur est hors plage en % mais cohérente rapportée au poids. Sinon on
// rejette : mieux vaut demander la saisie qu'enregistrer un chiffre faux.
function reconcilePercent(value, weightKg, metric, hint) {
  const inRange = value >= metric.min && value <= metric.max
  const convert = () => {
    if (!(weightKg > 0) || !(value > 0) || value > weightKg * 1.1) return null
    const pct = value / weightKg * 100
    return pct >= metric.min && pct <= metric.max ? round(pct, metric.decimals) : null
  }
  if (hint === 'kg') return convert()
  if (hint === '%') return inRange ? value : null
  return inRange ? value : convert()
}

// Analyse le texte brut renvoyé par l'OCR.
// Renvoie { values, rejected } : les mesures retenues et celles écartées
// avec leur motif, pour pouvoir l'expliquer à l'écran plutôt que de les
// faire disparaître en silence.
export function parseScaleText(raw) {
  const values = {}
  const rejected = []
  if (!raw || typeof raw !== 'string') return { values, rejected }

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  // Premier passage : les métriques dont le libellé est sur la ligne.
  // Le nombre est cherché sur la même ligne, sinon sur la suivante — les
  // balances affichent souvent le libellé au-dessus de la valeur.
  for (let i = 0; i < lines.length; i++) {
    const norm = normLine(lines[i])
    for (const metric of METRICS) {
      if (values[metric.key] !== undefined) continue
      if (!metric.patterns.some((p) => p.test(norm))) continue
      // On retire le libellé avant de chercher le nombre, sinon un "IMC 2"
      // dans le nom du produit polluerait la lecture. L'unité est relevée
      // avant ce nettoyage, puisqu'il l'effacerait.
      let source = norm
      let candidate = parseNumber(norm.replace(/[a-z%°/]+/g, ' '))
      if (candidate == null && lines[i + 1]) {
        source = normLine(lines[i + 1])
        candidate = parseNumber(source.replace(/[a-z%°/]+/g, ' '))
      }
      if (candidate == null) { rejected.push({ key: metric.key, label: metric.label, reason: 'valeur illisible' }); continue }
      values[metric.key] = { raw: candidate, metric, hint: unitHint(source) }
    }
  }

  // Second passage : validation des plages, une fois le poids connu (il
  // sert à convertir les masses exprimées en kg).
  const weightEntry = values.kg
  const weightKg = weightEntry ? weightEntry.raw : 0
  const out = {}
  for (const [key, entry] of Object.entries(values)) {
    const m = entry.metric
    let v = entry.raw
    if (m.unit === '%') {
      v = reconcilePercent(v, weightKg, m, entry.hint)
      if (v == null) { rejected.push({ key, label: m.label, reason: `valeur hors plage (${entry.raw})` }); continue }
    } else if (v < m.min || v > m.max) {
      rejected.push({ key, label: m.label, reason: `valeur hors plage (${entry.raw})` })
      continue
    }
    out[key] = round(v, m.decimals)
  }
  return { values: out, rejected }
}

// Contrôles de cohérence entre mesures, signalés à l'utilisateur sans
// bloquer l'enregistrement : ce sont des indices d'erreur de lecture, pas
// des certitudes.
export function checkCoherence(v) {
  const warns = []
  if (v.fatPct != null && v.musclePct != null && v.fatPct + v.musclePct > 100) {
    warns.push('Masse grasse et masse musculaire dépassent 100 % à elles deux.')
  }
  if (v.waterPct != null && v.fatPct != null && v.waterPct + v.fatPct > 105) {
    warns.push('Eau et masse grasse dépassent 100 % à elles deux.')
  }
  if (v.boneKg != null && v.kg != null && v.boneKg > v.kg * 0.1) {
    warns.push('La masse osseuse paraît élevée par rapport au poids.')
  }
  return warns
}
