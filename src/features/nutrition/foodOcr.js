// ============================================================
// Lecture d'une capture : étiquette nutritionnelle ou capture d'une autre
// application de nutrition.
//
// Même principe que l'import de balance et de météo : l'OCR tourne sur
// l'appareil, aucune image n'est envoyée nulle part. En contrepartie il se
// trompe — virgules lues comme des points, « 8 » pris pour « 0 », libellés
// tronqués. Chaque valeur est donc bornée au plausible, et l'ensemble est
// confronté à l'équation des calories avant d'être écrit.
//
// Deux pièges propres aux étiquettes, qui rendent une lecture naïve fausse
// plutôt qu'absente :
//
//   « Énergie 1050 kJ / 250 kcal » porte deux nombres. Prendre le premier
//   enregistre 1050 kcal pour un plat qui en fait 250 — une erreur d'un
//   facteur 4,2 qui fausse la journée sans rien signaler.
//
//   « Glucides 22 g / dont sucres 4,1 g » : la ligne « dont » est un
//   sous-total. La retenir remplacerait 22 par 4,1.
//
// Le journal stocke les valeurs pour 100 g (`per`) et le poids de la
// portion séparément. Ce module rend donc toujours du pour-100 g, quitte à
// reconvertir quand l'étiquette est libellée par portion.
//
// Pur : du texte vers des valeurs, testable sans OCR ni rendu.
// ============================================================

// Bornes pour 100 g. Une valeur au-delà est un défaut de lecture, pas une
// donnée : 100 g de graisse pure plafonnent à 900 kcal, et aucun aliment ne
// dépasse 100 g de macronutriment pour 100 g de produit.
export const FOOD_FIELDS = [
  { key: 'k', label: 'Calories', unit: 'kcal', min: 0, max: 900, decimals: 0,
    patterns: [/\b[ée]nergie\b/, /\bcalories?\b/, /\bkcal\b/, /\benergy\b/] },
  { key: 'p', label: 'Protéines', unit: 'g', min: 0, max: 100, decimals: 1,
    patterns: [/prot[ée]ines?/, /\bprotein\b/] },
  { key: 'g', label: 'Glucides', unit: 'g', min: 0, max: 100, decimals: 1,
    patterns: [/glucides?/, /\bcarb(ohydrate)?s?\b/], exclude: /\bdont\b|\bof which\b|sucres?|sugars?/ },
  { key: 'l', label: 'Lipides', unit: 'g', min: 0, max: 100, decimals: 1,
    patterns: [/lipides?/, /mati[èe]res?\s*grasses?/, /\bfat\b/, /graisses?/],
    exclude: /\bdont\b|\bof which\b|satur|trans/ },
  { key: 'fib', label: 'Fibres', unit: 'g', min: 0, max: 80, decimals: 1,
    patterns: [/fibres?\s*(alimentaires?)?/, /\bfib(er|re)\b/] },
]

export function normLine(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Premier nombre d'une chaîne. Gère la virgule décimale, les espaces
// insécables en séparateur de milliers, et le point que certains OCR
// insèrent à la place de la virgule.
export function parseNumber(s) {
  if (!s) return null
  const cleaned = String(s)
    .replace(/[  ]/g, '')
    .replace(/(\d)\s+(\d{3}\b)/g, '$1$2')
  const m = cleaned.match(/-?\d+(?:[.,]\d+)?/)
  if (!m) return null
  const n = Number(m[0].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Calories d'une ligne d'énergie. Le kilojoule est systématiquement écarté :
// il vaut 4,184 fois moins que la kilocalorie, et le confondre multiplie la
// journée par quatre.
export function caloriesFrom(line) {
  const s = normLine(line)
  const kcal = s.match(/(\d[\d  .,]*)\s*(?:k\s*cal|kcal|cal\b)/)
  if (kcal) return parseNumber(kcal[1])
  // Pas de libellé kcal : on refuse une valeur uniquement libellée en kJ
  // plutôt que de la prendre pour des calories.
  if (/\bkj\b/.test(s)) {
    const sansKj = s.replace(/(\d[\d  .,]*)\s*kj/g, ' ')
    const reste = parseNumber(sansKj)
    return reste
  }
  return parseNumber(s)
}

// Sur quelle quantité les valeurs sont-elles libellées ?
//
// « pour 100 g » est le cas des étiquettes françaises. Les captures d'autres
// applications affichent le plus souvent une portion — et c'est alors le
// poids de cette portion qui doit être enregistré, les valeurs étant
// ramenées à 100 g.
export function detectBasis(text) {
  const s = normLine(text)
  if (/(pour|per|\/)\s*100\s*(g|ml)/.test(s)) return { basis: '100g', grams: 100 }
  const portion = s.match(/(?:portion|part|serving|assiette)[^\d]{0,20}(\d[\d.,]*)\s*(?:g|ml)\b/)
    || s.match(/(\d[\d.,]*)\s*(?:g|ml)\b[^\d]{0,12}(?:par\s*)?(?:portion|part|serving)/)
  if (portion) {
    const grams = parseNumber(portion[1])
    if (grams && grams > 0 && grams <= 3000) return { basis: 'portion', grams }
  }
  // Une quantité seule sur sa ligne, sans le mot « portion » : c'est ainsi que
  // les applications de nutrition affichent la quantité pesée.
  //
  //   Poulet rôti
  //   250 g
  //   Calories 412
  //
  // Sans cette lecture, les 412 kcal de la portion étaient pris pour des
  // valeurs pour 100 g — deux fois et demie trop, sur le cas le plus courant.
  //
  // La ligne doit ne contenir QUE la quantité : « Contenu : 250 g » désigne un
  // emballage, pas une portion, et ne doit pas servir de base.
  for (const brute of String(text || '').split(/\r?\n/)) {
    const l = normLine(brute)
    const m = l.match(/^(\d[\d .,]*)\s*(?:g|ml)$/)
    if (!m) continue
    const grams = parseNumber(m[1])
    // 100 g est déjà la base : rien à reconvertir. En deçà de 20 g on est sur
    // du bruit de lecture, au-delà de 2 kg sur autre chose qu'une portion.
    if (grams && grams >= 20 && grams <= 2000 && Math.round(grams) !== 100) {
      return { basis: 'portion', grams }
    }
  }
  return { basis: '100g', grams: 100 }
}

// Nom du plat : première ligne qui ressemble à un intitulé et non à une
// mesure. Sans elle, toutes les entrées importées s'appelleraient pareil et
// deviendraient indistinguables dans le journal.
export function detectName(text) {
  const lignes = String(text || '').split(/\r?\n/)
  for (const brute of lignes) {
    const l = brute.trim()
    if (l.length < 3 || l.length > 60) continue
    const s = normLine(l)
    if (/\d/.test(s) && /(kcal|kj|\bg\b|\bml\b|%)/.test(s)) continue
    if (/valeurs?\s*nutrition|nutrition\s*facts|pour\s*100|ingredients?/.test(s)) continue
    if (!/[a-z]/.test(s)) continue
    return l.replace(/\s+/g, ' ')
  }
  return null
}

const r1 = (v) => Math.round(v * 10) / 10

// L'équation des calories : 4 kcal par gramme de protéines et de glucides,
// 9 par gramme de lipides. Un écart important entre les calories lues et
// celles que les macros impliquent signale un chiffre mal lu — c'est le
// seul contrôle qui attrape une erreur sans qu'on sache laquelle.
export const KCAL_TOLERANCE_PCT = 30
export const KCAL_TOLERANCE_ABS = 60

export function kcalCoherence(per) {
  const { k, p, g, l } = per || {}
  if (k == null || (p == null && g == null && l == null)) return { checked: false, ok: true }
  const attendu = 4 * (p || 0) + 4 * (g || 0) + 9 * (l || 0)
  const ecart = Math.abs(k - attendu)
  const pct = attendu > 0 ? Math.round(ecart / attendu * 100) : null
  const ok = ecart <= KCAL_TOLERANCE_ABS || (pct != null && pct <= KCAL_TOLERANCE_PCT)
  return { checked: true, ok, attendu: Math.round(attendu), lu: Math.round(k), ecart: Math.round(ecart), pct }
}

// Texte OCR → valeurs pour 100 g, poids de portion, et ce qui a été refusé.
export function parseFoodText(text) {
  const brut = String(text || '')
  const lignes = brut.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const { basis, grams } = detectBasis(brut)
  const lu = {}
  const rejected = []

  for (const f of FOOD_FIELDS) {
    for (const ligne of lignes) {
      const s = normLine(ligne)
      if (f.exclude && f.exclude.test(s)) continue
      if (!f.patterns.some((p) => p.test(s))) continue
      // Le nombre qui suit le libellé, pas celui qui le précède : « 22 g
      // glucides » comme « glucides 22 g » doivent donner 22.
      const apres = s.replace(new RegExp('^.*?(' + f.patterns.map((p) => p.source).join('|') + ')'), '')
      const valeur = f.key === 'k' ? caloriesFrom(ligne) : parseNumber(apres || s)
      if (valeur == null) continue
      if (valeur < f.min || valeur > f.max) {
        rejected.push({ key: f.key, label: f.label, value: valeur, reason: `hors plage ${f.min}–${f.max} ${f.unit}` })
        continue
      }
      lu[f.key] = f.decimals === 0 ? Math.round(valeur) : r1(valeur)
      break
    }
  }

  // Ramené à 100 g : le journal ne stocke que cette base, la portion vit à
  // part. Une capture libellée « portion 250 g » doit donc être divisée.
  const facteur = basis === 'portion' && grams > 0 ? 100 / grams : 1
  const per = {}
  for (const f of FOOD_FIELDS) {
    if (lu[f.key] == null) continue
    const v = lu[f.key] * facteur
    per[f.key] = f.decimals === 0 ? Math.round(v) : r1(v)
  }

  const coherence = kcalCoherence(per)
  // Une entrée sans calories n'a rien à faire dans un journal alimentaire :
  // c'est la seule valeur dont dépendent le total du jour et l'analyse.
  const ok = per.k != null && coherence.ok

  return {
    name: detectName(brut),
    basis, grams,
    per, read: lu, rejected, coherence, ok,
    raw: brut,
  }
}

// Pourquoi une lecture n'est pas exploitable, en une phrase destinée à
// l'écran. Sans elle, un refus silencieux laisse croire à une panne.
export function readingIssue(parsed) {
  if (!parsed) return 'Rien n’a pu être lu.'
  if (parsed.ok) return null
  if (parsed.per.k == null) {
    const refus = parsed.rejected.find((r) => r.key === 'k')
    if (refus) return `Les calories lues (${refus.value}) sont hors du plausible pour 100 g. Corrige les valeurs ci-dessous.`
    return 'Aucune valeur de calories n’a été trouvée sur cette capture. Complète les valeurs ci-dessous.'
  }
  const c = parsed.coherence
  if (c && c.checked && !c.ok) {
    return `Les macros lues impliquent ${c.attendu} kcal, la capture en annonce ${c.lu} : un chiffre a mal été lu. Vérifie les valeurs ci-dessous.`
  }
  return 'La lecture est incomplète. Complète les valeurs ci-dessous.'
}

// Entrée prête pour le journal, à la forme exacte qu'attend le store :
// valeurs pour 100 g dans `per`, valeurs absolues mises à l'échelle.
export function toFoodEntry(parsed, { meal = 'midi', now = Date.now } = {}) {
  if (!parsed || !parsed.ok) return null
  const per = { k: parsed.per.k, p: parsed.per.p || 0, g: parsed.per.g || 0, l: parsed.per.l || 0, fib: parsed.per.fib || 0 }
  const grams = parsed.grams > 0 ? parsed.grams : 100
  const f = grams / 100
  return {
    id: 'e' + now(),
    n: parsed.name || 'Plat importé',
    grams, meal, per,
    k: r1(per.k * f), p: r1(per.p * f), g: r1(per.g * f), l: r1(per.l * f), fib: r1(per.fib * f),
    // Marque l'origine : une valeur lue par OCR se corrige, une valeur
    // saisie se respecte. Sans cette trace, impossible de savoir laquelle
    // remettre en cause quand un total paraît faux.
    src: 'capture',
  }
}
