// ============================================================
// Carnet de cuisine : des recettes à suivre en cuisinant, importées par
// l'utilisateur lui-même.
//
// Distinct des « recettes » de la nutrition, qui sont des compositions
// pesées pour calculer des macros. Ici, il s'agit de lire une recette sur
// son téléphone, les mains dans la farine : des ingrédients à cocher, des
// étapes une par une, des durées qui deviennent des minuteurs.
//
// L'import accepte ce qu'on a sous la main — un texte collé depuis un site
// ou une note, ou une page de livre photographiée. Les deux passent par le
// même lecteur, et le résultat est toujours montré pour correction avant
// d'être enregistré : un texte de site est bruyant, une page lue par OCR a
// ses lignes coupées en plein milieu de phrase.
//
// Pur : du texte vers une structure, testable sans écran ni OCR.
// ============================================================

export const COOKBOOK_MAX = 60
export const MAX_TITLE = 80
export const MAX_INGREDIENTS = 50
export const MAX_INGREDIENT_LEN = 140
export const MAX_STEPS = 30
export const MAX_STEP_LEN = 600
// Le carnet vit dans la colonne `phys`, renvoyée en entier à chaque
// écriture du profil, et la file d'attente hors ligne refuse au-delà de
// 2 Mo. Un plafond global garde une marge pour tout le reste.
export const COOKBOOK_BUDGET_BYTES = 700_000

const norm = (s) => (s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
const fr = (v) => String(v).replace('.', ',')

// ─── durées ──────────────────────────────────────────────────

// « 1 h 30 », « 1h30 », « 45 min », « 2 heures » → secondes.
export function parseDuration(s) {
  const t = norm(s)
  const hm = t.match(/(\d+)\s*h(?:eures?)?\s*(\d{1,2})?\s*(?:min|mn)?/)
  if (hm) return (Number(hm[1]) * 60 + (hm[2] ? Number(hm[2]) : 0)) * 60
  const m = t.match(/(\d+)\s*(?:min|minutes?|mn)\b/)
  if (m) return Number(m[1]) * 60
  return null
}

// Les durées citées dans une étape, pour en faire des minuteurs. Une seule
// expression parcourt la phrase de gauche à droite : « 1 h 30 » ne doit pas
// donner en plus un minuteur de 30 minutes, ni « 18 à 20 minutes » deux
// minuteurs distincts. Une fourchette démarre sur sa borne basse — on
// vérifie la cuisson au plus tôt, on prolonge si besoin.
const RE_DUREE = /(\d+)\s*(?:(?:à|a|-|–)\s*(\d+)\s*)?(h(?:eures?)?\s*(\d{1,2})?\s*(?:min|mn)?|min(?:utes?)?\b|mn\b|secondes?\b|sec\b)/gi

export function detectTimers(text) {
  const out = []
  const src = String(text || '')
  let m
  RE_DUREE.lastIndex = 0
  while ((m = RE_DUREE.exec(src)) !== null) {
    const unite = norm(m[3])
    let secs
    let label
    if (unite.startsWith('h')) {
      const minutes = m[4] ? Number(m[4]) : 0
      secs = (Number(m[1]) * 60 + minutes) * 60
      label = minutes ? `${m[1]} h ${String(minutes).padStart(2, '0')}` : `${m[1]} h`
    } else if (unite.startsWith('sec')) {
      secs = Number(m[1])
      label = `${m[1]} s`
    } else {
      secs = Number(m[1]) * 60
      label = m[2] ? `${m[1]}–${m[2]} min` : `${m[1]} min`
    }
    // Moins de 30 s : un geste, pas un minuteur. Plus de 12 h : une
    // marinade ou une levée longue, que personne ne surveille au minuteur.
    if (secs >= 30 && secs <= 12 * 3600 && !out.some((x) => x.secs === secs)) out.push({ label, secs })
  }
  return out
}

// ─── mise à l'échelle des quantités ─────────────────────────

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }
// La fraction passe EN PREMIER : sinon l'alternative décimale capture le
// « 1 » de « 1/2 » et laisse « /2 » derrière elle — « 1/2 pot » ×1,5
// devenait « 1,5/2 pot ».
const RE_QTE = /^(\s*[-•*·–]?\s*)(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔⅛])?|[½¼¾⅓⅔⅛])(\s*(?:à|-|–)\s*(\d+(?:[.,]\d+)?))?/

function valeurQte(s) {
  const t = String(s).trim()
  if (FRACTIONS[t] != null) return FRACTIONS[t]
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null
  const mixte = t.match(/^(\d+)\s*([½¼¾⅓⅔⅛])$/)
  if (mixte) return Number(mixte[1]) + FRACTIONS[mixte[2]]
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Arrondi lisible : on ne cuisine pas « 2,333 œufs ». Au-delà de 10, l'entier
// suffit ; en deçà, une décimale, écrite à la française.
export function niceQty(v) {
  if (!Number.isFinite(v)) return ''
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v))
  if (v >= 10) return String(Math.round(v))
  // Sous l'unité, une décimale arrondit trop : trois quarts de citron
  // deviendraient « 0,8 ».
  if (v < 1) return fr(Math.round(v * 100) / 100)
  return fr(Math.round(v * 10) / 10)
}

// Multiplie la quantité en tête de ligne — « 200 g de farine » ×1,5 donne
// « 300 g de farine ». Une ligne sans quantité chiffrée (« sel, poivre »)
// reste telle quelle : mieux vaut ne rien changer que deviner.
export function scaleIngredient(line, factor) {
  const s = String(line || '')
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 1e-9) return s
  const m = s.match(RE_QTE)
  if (!m) return s
  const a = valeurQte(m[2])
  if (a == null) return s
  let remplace = m[1] + niceQty(a * factor)
  if (m[4] != null) {
    const b = valeurQte(m[4])
    if (b != null) remplace += ' à ' + niceQty(b * factor)
  }
  return remplace + s.slice(m[0].length)
}

// ─── lecture d'un texte de recette ──────────────────────────

const RE_ENTETE_INGR = /^(ingredients?|il (vous )?faut|liste des ingredients|pour la pate|pour la garniture|pour la sauce)\b/
const RE_ENTETE_ETAPES = /^(preparation|etapes?|instructions?|methode|deroulement|realisation|la recette)\b/
const RE_ENTETE_NOTES = /^(astuces?|conseils?|notes?|variantes?|le conseil)\b/
const RE_PUCE = /^\s*[-•*·–]\s*/
const RE_NUM_ETAPE = /^\s*(?:(?:etape|step)\s*)?\d{1,2}\s*[.):–-]\s*/i
const RE_QTE_TETE = /^\s*(\d|[½¼¾⅓⅔⅛]|une?\s|deux\s|trois\s|quatre\s|quelques\s|1\/2)/i

function estEntete(ligneNorm, re) {
  // Un en-tête est court et ne porte guère que son mot-clé, éventuellement
  // suivi de « : » ou d'une précision entre parenthèses. « Préparation du
  // four… » dans une étape ne doit pas couper la liste en deux.
  const sans = ligneNorm.replace(/\(.*?\)/g, '').replace(/[:.\s]+$/, '').trim()
  return re.test(sans) && sans.split(' ').length <= 4 && ligneNorm.length <= 60
}

function lireParts(t) {
  const m = t.match(/(?:pour|serves?|portions?\s*:?)\s*(\d{1,2})\s*(?:personnes?|pers\.?|parts?|portions?|convives?)?/)
    || t.match(/(\d{1,2})\s*(?:personnes?|pers\.|parts|portions)\b/)
  const n = m ? Number(m[1]) : null
  return n && n >= 1 && n <= 50 ? n : null
}

function lireMinutes(t, mot) {
  const m = t.match(new RegExp(mot + '\\s*:?\\s*([^,;|]{1,20})'))
  if (!m) return null
  const secs = parseDuration(m[1])
  return secs ? Math.round(secs / 60) : null
}

export function parseRecipeText(text) {
  const brut = String(text || '').replace(/\r/g, '')
  const lignes = brut.split('\n').map((l) => l.trim()).filter(Boolean)
  const res = { title: null, servings: null, prepMins: null, cookMins: null, ingredients: [], steps: [], notes: [] }
  if (!lignes.length) return { ...res, ok: false }

  let section = null
  let aEntetes = false
  for (const l of lignes) {
    const t = norm(l)
    if (estEntete(t, RE_ENTETE_INGR) || estEntete(t, RE_ENTETE_ETAPES) || estEntete(t, RE_ENTETE_NOTES)) { aEntetes = true; break }
  }

  for (const l of lignes) {
    const t = norm(l)

    // Lignes de méta-données, où qu'elles soient.
    const parts = lireParts(t)
    const prep = lireMinutes(t, 'preparation')
    const cuisson = lireMinutes(t, 'cuisson')
    const meta = (parts && t.length < 70) || ((prep || cuisson) && t.length < 70 && !RE_NUM_ETAPE.test(l))
    if (parts && res.servings == null && t.length < 70) res.servings = parts
    if (prep && res.prepMins == null && t.length < 70) res.prepMins = prep
    if (cuisson && res.cookMins == null && t.length < 70) res.cookMins = cuisson

    if (estEntete(t, RE_ENTETE_INGR)) { section = 'ingr'; continue }
    if (estEntete(t, RE_ENTETE_ETAPES)) { section = 'etapes'; continue }
    if (estEntete(t, RE_ENTETE_NOTES)) { section = 'notes'; continue }
    if (meta) continue

    if (res.title == null && section == null) {
      // Le titre : la première ligne qui n'est ni un en-tête ni une mesure.
      // Une page de livre l'écrit souvent en capitales : on le rend lisible.
      res.title = l === l.toUpperCase() && /[A-ZÀ-Ý]/.test(l)
        ? l.charAt(0) + l.slice(1).toLowerCase()
        : l
      continue
    }

    let dest = section
    if (!aEntetes) {
      // Sans en-têtes, la forme de la ligne décide : une quantité ou une puce
      // en tête et une ligne courte font un ingrédient ; le reste, une étape.
      dest = (RE_PUCE.test(l) || RE_QTE_TETE.test(l)) && l.length <= 90 && !/[.!]$/.test(l) && !RE_NUM_ETAPE.test(l)
        ? 'ingr' : 'etapes'
    }
    if (dest == null) dest = RE_QTE_TETE.test(l) || RE_PUCE.test(l) ? 'ingr' : 'etapes'

    if (dest === 'ingr') {
      const propre = l.replace(RE_PUCE, '').trim()
      if (propre) res.ingredients.push(propre)
    } else if (dest === 'notes') {
      res.notes.push(l)
    } else {
      const numerotee = RE_NUM_ETAPE.test(l)
      const propre = l.replace(RE_NUM_ETAPE, '').replace(RE_PUCE, '').trim()
      if (!propre) continue
      const prec = res.steps[res.steps.length - 1]
      // Une page lue par OCR coupe ses lignes au milieu des phrases. Une
      // ligne qui commence par une minuscule, ou qui suit une ligne restée
      // sans ponctuation finale, prolonge l'étape précédente — sauf si elle
      // porte elle-même un numéro d'étape.
      const prolonge = prec != null && !numerotee
        && (/^[a-zà-ÿ]/.test(propre) || !/[.!?:]$/.test(prec))
      if (prolonge) res.steps[res.steps.length - 1] = prec + ' ' + propre
      else res.steps.push(propre)
    }
  }

  res.ok = res.ingredients.length > 0 || res.steps.length > 0
  return res
}

// ─── normalisation et carnet ────────────────────────────────

const coupe = (s, n) => String(s || '').trim().slice(0, n)
const lignesDe = (v) => (Array.isArray(v) ? v : String(v || '').split('\n'))
  .map((x) => String(x || '').trim()).filter(Boolean)

export function makeCookRecipe({ id, title, servings, prepMins, cookMins, ingredients, steps, notes, fav, source, now = Date.now } = {}) {
  const num = (v, max) => {
    const n = Math.round(Number(v))
    return Number.isFinite(n) && n > 0 ? Math.min(n, max) : null
  }
  return {
    id: id || 'c' + now().toString(36),
    title: coupe(title, MAX_TITLE) || 'Recette',
    servings: num(servings, 50),
    prepMins: num(prepMins, 24 * 60),
    cookMins: num(cookMins, 24 * 60),
    ingredients: lignesDe(ingredients).slice(0, MAX_INGREDIENTS).map((x) => x.slice(0, MAX_INGREDIENT_LEN)),
    steps: lignesDe(steps).slice(0, MAX_STEPS).map((x) => x.slice(0, MAX_STEP_LEN)),
    notes: coupe(Array.isArray(notes) ? notes.join('\n') : notes, 1000),
    fav: !!fav,
    source: source === 'photo' ? 'photo' : 'texte',
  }
}

export function cookIssue(r) {
  if (!r) return 'Aucune recette.'
  if (!String(r.title || '').trim()) return 'Donne un titre à ta recette.'
  if (!(r.ingredients || []).length && !(r.steps || []).length) return 'Ajoute au moins un ingrédient ou une étape.'
  return null
}

export const cookbookBytes = (list) => JSON.stringify(Array.isArray(list) ? list : []).length

// Ce qui empêche d'ajouter au carnet, en clair — plutôt qu'un enregistrement
// qui échoue plus tard, hors ligne, sans rien dire.
export function cookbookRoom(list, recipe) {
  const cur = Array.isArray(list) ? list : []
  const remplace = cur.some((x) => x && recipe && x.id === recipe.id)
  if (!remplace && cur.length >= COOKBOOK_MAX) return `Ton carnet compte déjà ${COOKBOOK_MAX} recettes. Supprimes-en une pour en ajouter une autre.`
  const apres = remplace ? cur.map((x) => (x.id === recipe.id ? recipe : x)) : [...cur, recipe]
  if (cookbookBytes(apres) > COOKBOOK_BUDGET_BYTES) return 'Cette recette ne tient plus dans le carnet : il est plein. Supprimes-en une, ou raccourcis les étapes.'
  return null
}

export function upsertCook(list, recipe) {
  const cur = Array.isArray(list) ? list : []
  const i = cur.findIndex((x) => x && x.id === recipe.id)
  if (i < 0) return [...cur, recipe]
  const next = cur.slice(); next[i] = recipe; return next
}
export const removeCook = (list, id) => (Array.isArray(list) ? list : []).filter((x) => x && x.id !== id)
export const toggleCookFav = (list, id) => (Array.isArray(list) ? list : []).map((r) => (r && r.id === id ? { ...r, fav: !r.fav } : r))
export function sortedCookbook(list, q) {
  const nq = norm(q)
  return (Array.isArray(list) ? list : []).filter(Boolean)
    .filter((r) => !nq || norm(r.title).includes(nq) || (r.ingredients || []).some((x) => norm(x).includes(nq)))
    .slice().reverse()
    .sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0))
}

// Résumé pour la liste : « 6 parts · 10 + 35 min · 6 ingrédients ».
export function cookSummary(r) {
  const bouts = []
  if (r.servings) bouts.push(`${r.servings} part${r.servings > 1 ? 's' : ''}`)
  if (r.prepMins || r.cookMins) bouts.push([r.prepMins, r.cookMins].filter(Boolean).join(' + ') + ' min')
  bouts.push(`${(r.ingredients || []).length} ingrédient${(r.ingredients || []).length > 1 ? 's' : ''}`)
  return bouts.join(' · ')
}
