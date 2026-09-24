// ============================================================
// Recettes : des repas composés une fois, réutilisés d'un geste.
//
// Noter un plat maison demandait de ressaisir chaque ingrédient à chaque
// fois — cinq recherches et cinq pesées pour un bowl qu'on mange toutes les
// semaines. Une recette fige la composition, et l'ajout au journal devient
// une seule action.
//
// Deux décisions qui gouvernent tout le reste :
//
// Le journal reçoit UNE entrée nommée, pas la liste des ingrédients. Sinon
// « Bowl poulet-quinoa » se dissout en cinq lignes dans le repas du midi, et
// on ne le reconnaît plus en relisant sa journée.
//
// Cette entrée porte ses valeurs pour 100 g, comme n'importe quel aliment.
// C'est ce qui la garde modifiable par l'écran existant : changer la
// quantité recalcule les macros sans rien savoir des recettes.
//
// Les totaux ne sont jamais stockés, toujours recalculés. Une valeur figée
// dérive dès qu'on corrige un ingrédient, et plus rien ne dit laquelle des
// deux est juste.
// ============================================================

export const MAX_ITEMS = 30
export const MAX_SERVINGS = 20
export const MAX_NAME = 60

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const r1 = (v) => Math.round(v * 10) / 10
const fr = (v) => String(v).replace('.', ',')

// Valeurs pour 100 g d'un ingrédient, quelle que soit la forme reçue :
// le catalogue donne du pour-100 g, une entrée de journal garde `per`.
export function itemPer100(it) {
  if (!it) return { k: 0, p: 0, g: 0, l: 0, fib: 0 }
  const src = it.per || it
  return {
    k: num(src.k), p: num(src.p), g: num(src.g), l: num(src.l), fib: num(src.fib),
  }
}

export function makeRecipe({ id, n, servings, items, now = Date.now } = {}) {
  const list = (Array.isArray(items) ? items : [])
    .filter((it) => it && num(it.grams) > 0)
    .slice(0, MAX_ITEMS)
    .map((it) => ({
      n: String(it.n || 'Ingrédient').slice(0, MAX_NAME),
      grams: Math.round(num(it.grams)),
      per: itemPer100(it),
    }))
  return {
    id: id || 'r' + now().toString(36),
    n: String(n || '').trim().slice(0, MAX_NAME) || 'Recette',
    // Au moins une part : diviser par zéro donnerait des macros infinies,
    // et une recette « pour 0 personne » n'a pas de sens.
    servings: Math.max(1, Math.min(MAX_SERVINGS, Math.round(num(servings)) || 1)),
    items: list,
  }
}

export function recipeGrams(r) {
  return (r && Array.isArray(r.items) ? r.items : []).reduce((a, it) => a + num(it.grams), 0)
}

export function recipeTotals(r) {
  const out = { k: 0, p: 0, g: 0, l: 0, fib: 0 }
  for (const it of (r && Array.isArray(r.items) ? r.items : [])) {
    const per = itemPer100(it)
    const f = num(it.grams) / 100
    out.k += per.k * f; out.p += per.p * f; out.g += per.g * f; out.l += per.l * f; out.fib += per.fib * f
  }
  return { k: Math.round(out.k), p: r1(out.p), g: r1(out.g), l: r1(out.l), fib: r1(out.fib) }
}

// Valeurs pour 100 g de la recette entière — la base que le journal stocke.
export function recipePer100(r) {
  const gr = recipeGrams(r)
  if (gr <= 0) return { k: 0, p: 0, g: 0, l: 0, fib: 0 }
  const t = recipeTotals(r)
  const f = 100 / gr
  return { k: Math.round(t.k * f), p: r1(t.p * f), g: r1(t.g * f), l: r1(t.l * f), fib: r1(t.fib * f) }
}

export function servingGrams(r) {
  const parts = Math.max(1, num(r && r.servings) || 1)
  return Math.round(recipeGrams(r) / parts)
}

export function servingTotals(r) {
  const parts = Math.max(1, num(r && r.servings) || 1)
  const t = recipeTotals(r)
  return { k: Math.round(t.k / parts), p: r1(t.p / parts), g: r1(t.g / parts), l: r1(t.l / parts), fib: r1(t.fib / parts) }
}

// Entrée de journal, à la forme exacte de la saisie manuelle : `per` porte le
// pour-100 g, les valeurs absolues sont mises à l'échelle du poids servi.
export function recipeToEntry(r, { servings = 1, meal = 'midi', now = Date.now } = {}) {
  const gr = recipeGrams(r)
  if (!r || gr <= 0) return null
  const parts = Math.max(0.25, num(servings) || 1)
  const grams = Math.round(servingGrams(r) * parts)
  if (grams <= 0) return null
  const per = recipePer100(r)
  const f = grams / 100
  return {
    id: 'e' + now(),
    n: r.n,
    grams, meal, per,
    k: Math.round(per.k * f), p: r1(per.p * f), g: r1(per.g * f), l: r1(per.l * f), fib: r1(per.fib * f),
    // L'origine est tracée : on sait qu'une ligne vient d'une recette, et
    // laquelle, sans que cela empêche de la corriger comme les autres.
    src: 'recette',
    recipeId: r.id,
  }
}

// Ce qui empêche d'enregistrer, dit en clair plutôt que par un bouton grisé
// sans explication.
export function recipeIssue(r) {
  if (!r) return 'Aucune recette.'
  if (!Array.isArray(r.items) || r.items.length === 0) return 'Ajoute au moins un ingrédient.'
  if (recipeGrams(r) <= 0) return 'Indique la quantité de chaque ingrédient.'
  if (!String(r.n || '').trim()) return 'Donne un nom à ta recette.'
  return null
}

export const recipeValid = (r) => recipeIssue(r) === null

// Résumé d'une part, pour la liste : « 1 part · 320 g · 520 kcal ».
export function servingLabel(r) {
  const t = servingTotals(r)
  const parts = Math.max(1, num(r && r.servings) || 1)
  return `${parts} part${parts > 1 ? 's' : ''} · ${servingGrams(r)} g · ${t.k} kcal par part`
}

// Ajout ou remplacement dans la liste de l'utilisateur, par identifiant :
// modifier une recette ne doit pas en créer une seconde du même nom.
export function upsertRecipe(list, recipe) {
  const cur = Array.isArray(list) ? list : []
  const i = cur.findIndex((x) => x && x.id === recipe.id)
  if (i < 0) return [...cur, recipe]
  const next = cur.slice()
  next[i] = recipe
  return next
}

export function removeRecipe(list, id) {
  return (Array.isArray(list) ? list : []).filter((x) => x && x.id !== id)
}

export { fr as frDecimal }
