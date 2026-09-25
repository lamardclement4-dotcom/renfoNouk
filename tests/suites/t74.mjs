// Recettes : un repas compose une fois, reutilise d un geste.
//
// Deux contrats gouvernent tout : le journal recoit UNE entree nommee (pas
// la liste des ingredients), et cette entree porte ses valeurs pour 100 g,
// ce qui la garde modifiable par l ecran existant sans qu il sache ce qu est
// une recette.
import { makeRecipe, recipeGrams, recipeTotals, recipePer100, servingGrams, servingTotals,
  recipeToEntry, recipeIssue, recipeValid, upsertRecipe, removeRecipe, toggleRecipeFav, sortedRecipes, itemPer100,
  MAX_ITEMS, MAX_SERVINGS } from '../../src/features/nutrition/recipes.js'
import { buildDb } from '../../src/features/nutrition/useNutritionStore.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const pres = (x, y, t, m) => a(Math.abs(x - y) <= t, `${m} (${x}, attendu ~${y})`)

const POULET = { n: 'Blanc de poulet', grams: 200, per: { k: 165, p: 31, g: 0, l: 3.6, fib: 0 } }
const QUINOA = { n: 'Quinoa cuit', grams: 150, per: { k: 120, p: 4.4, g: 21, l: 1.9, fib: 2.8 } }
const bowl = makeRecipe({ n: 'Bowl poulet-quinoa', servings: 2, items: [POULET, QUINOA], now: () => 1700000000000 })

// ─── composition ───
a(bowl.id === 'r' + (1700000000000).toString(36), 'identifiant derive de l horodatage')
a(bowl.n === 'Bowl poulet-quinoa' && bowl.servings === 2, 'nom et nombre de parts conserves')
a(bowl.items.length === 2, 'deux ingredients')
a(recipeGrams(bowl) === 350, `poids total : ${recipeGrams(bowl)} g`)

const t = recipeTotals(bowl)
a(t.k === 510, `calories totales : ${t.k} kcal`)
pres(t.p, 68.6, 0.1, 'proteines totales')
pres(t.g, 31.5, 0.1, 'glucides totaux')
pres(t.l, 10.1, 0.1, 'lipides totaux')
pres(t.fib, 4.2, 0.1, 'fibres totales')

// ─── la base que le journal stocke ───
const p100 = recipePer100(bowl)
pres(p100.k, 146, 1, 'calories pour 100 g de recette')
pres(p100.p, 19.6, 0.2, 'proteines pour 100 g')

a(servingGrams(bowl) === 175, `une part pese ${servingGrams(bowl)} g`)
pres(servingTotals(bowl).k, 255, 1, 'une part vaut 255 kcal')

// ─── entree de journal ───
const e = recipeToEntry(bowl, { servings: 1, meal: 'soir', now: () => 1700000000001 })
a(e.n === 'Bowl poulet-quinoa', 'l entree porte le NOM de la recette, pas ses ingredients')
a(e.meal === 'soir' && e.grams === 175, 'repas et poids de la part')
pres(e.k, 255, 2, 'calories de la part')
a(e.src === 'recette' && e.recipeId === bowl.id, 'origine tracee, avec la recette d ou elle vient')
for (const key of ['id', 'n', 'grams', 'meal', 'per', 'k', 'p', 'g', 'l', 'fib']) {
  a(key in e, `champ « ${key} », comme une entree saisie a la main`)
}
a(e.per.k === p100.k, '`per` porte le pour-100 g : changer la quantite recalcule sans rien savoir des recettes')

const deux = recipeToEntry(bowl, { servings: 2, now: () => 1 })
a(deux.grams === 350, 'deux parts pesent la recette entiere')
pres(deux.k, 510, 3, 'et valent ses calories totales')
const demi = recipeToEntry(bowl, { servings: 0.5, now: () => 1 })
a(demi.grams === 88, `une demi-part pese ${demi.grams} g`)

// ─── normalisation defensive ───
const sale = makeRecipe({ n: '   ', servings: 0, items: [
  POULET, { n: 'Rien', grams: 0, per: { k: 100 } }, null, { grams: 50 },
], now: () => 2 })
a(sale.n === 'Recette', 'sans nom : un nom par defaut plutot qu une ligne vide dans le journal')
a(sale.servings === 1, 'zero part devient une : diviser par zero donnerait des macros infinies')
a(sale.items.length === 2, 'les ingredients sans quantite et les entrees nulles sont ecartes')
a(sale.items[1].n === 'Ingrédient', 'un ingredient sans nom en recoit un')

const enorme = makeRecipe({ n: 'x'.repeat(200), servings: 999, items: Array.from({ length: 80 }, () => POULET) })
a(enorme.n.length === 60, 'le nom est borne')
a(enorme.servings === MAX_SERVINGS, `les parts sont bornees a ${MAX_SERVINGS}`)
a(enorme.items.length === MAX_ITEMS, `les ingredients a ${MAX_ITEMS}`)

a(itemPer100({ k: 165, p: 31 }).k === 165, 'un aliment du catalogue donne directement son pour-100 g')
a(itemPer100({ per: { k: 120 } }).k === 120, 'une entree de journal donne le sien via `per`')
a(itemPer100(null).k === 0, 'rien du tout ne leve pas')

// ─── ce qui empeche d enregistrer, dit en clair ───
a(recipeValid(bowl), 'une recette complete est valide')
a(recipeIssue(bowl) === null, 'et n affiche aucun blocage')
a(/ingr[ée]dient/i.test(recipeIssue(makeRecipe({ n: 'Vide', items: [] }))), `sans ingredient : « ${recipeIssue(makeRecipe({ n: 'Vide', items: [] }))} »`)
a(typeof recipeIssue(null) === 'string', 'aucune recette : un message, jamais un silence')
a(recipeToEntry(makeRecipe({ n: 'Vide', items: [] })) === null, 'une recette vide ne produit aucune entree')
a(recipeToEntry(null) === null, 'ni une recette absente')

// ─── liste de l utilisateur ───
let liste = upsertRecipe([], bowl)
a(liste.length === 1, 'ajout dans une liste vide')
const modifie = { ...bowl, n: 'Bowl revisite' }
liste = upsertRecipe(liste, modifie)
a(liste.length === 1 && liste[0].n === 'Bowl revisite', 'modifier remplace, ne duplique pas')
liste = upsertRecipe(liste, makeRecipe({ n: 'Autre', items: [QUINOA], now: () => 3 }))
a(liste.length === 2, 'une autre recette s ajoute')
a(removeRecipe(liste, modifie.id).length === 1, 'suppression par identifiant')
a(removeRecipe(null, 'x').length === 0, 'une liste absente ne leve pas')

// ─── trajet de persistance ───
// Les recettes vivent sous profiles.phys.nutrition, comme les favoris. Si ce
// chemin change, elles disparaissent au rechargement sans rien signaler.
const db = buildDb({ nutrition: { recipes: [bowl] } }, {}, {}, [], {}, '2026-09-24')
a(Array.isArray(db.recipes) && db.recipes.length === 1, 'le db expose db.recipes')
a(db.recipes[0].n === 'Bowl poulet-quinoa', 'avec la recette enregistree')
a(Array.isArray(buildDb({}, {}, {}, [], {}, '2026-09-24').recipes), 'et une liste vide quand il n y en a pas')
// Une valeur corrompue — une chaine la ou une liste est attendue — faisait
// tomber l ecran au premier .map(). Les cles imbriquees sous `nutrition`
// echappaient a la normalisation centrale, qui ne voit que le premier niveau.
for (const cle of ['recipes', 'foodFav', 'diagHistory']) {
  const casse = buildDb({ nutrition: { [cle]: 'cassé' } }, {}, {}, [], {}, '2026-09-24')
  a(Array.isArray(casse[cle]), `${cle} corrompu est normalise en liste, l ecran tient`)
}

// ─── favoris ───
a(bowl.fav === false, 'une recette naît sans favori')
const favori = makeRecipe({ ...bowl, fav: true })
a(favori.fav === true, 'le favori traverse makeRecipe : modifier une recette ne la sort pas des favoris')

const troisRec = [
  makeRecipe({ id: 'a', n: 'Première', items: [POULET] }),
  makeRecipe({ id: 'b', n: 'Deuxième', items: [POULET] }),
  makeRecipe({ id: 'c', n: 'Troisième', items: [POULET] }),
]
const basculee = toggleRecipeFav(troisRec, 'a')
a(basculee.find((r) => r.id === 'a').fav === true, 'la bascule met en favori')
a(basculee.filter((r) => r.fav).length === 1, 'et ne touche pas les autres')
a(toggleRecipeFav(basculee, 'a').find((r) => r.id === 'a').fav === false, 'la bascule retire aussi')
a(toggleRecipeFav(basculee, 'a').find((r) => r.id === 'a').n === 'Première', 'sans rien reconstruire du reste')
a(toggleRecipeFav(null, 'a').length === 0, 'une liste absente ne leve pas')

const triees = sortedRecipes(basculee)
a(triees[0].id === 'a', 'les favorites viennent en tete')
a(triees[1].id === 'c' && triees[2].id === 'b', 'et les autres restent des plus recentes aux plus anciennes')
a(sortedRecipes(null).length === 0, 'liste absente : tri vide, pas d exception')

console.log('\nALL PASS')
