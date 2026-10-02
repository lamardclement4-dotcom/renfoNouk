// Carnet de cuisine : des recettes a suivre en cuisinant, importees par
// l utilisateur. Le lecteur transforme un texte colle ou une page lue par
// OCR en titre / ingredients / etapes ; tout est montre avant d etre garde.
import { parseRecipeText, detectTimers, parseDuration, scaleIngredient, niceQty, makeCookRecipe,
  cookIssue, cookbookRoom, cookbookBytes, upsertCook, removeCook, toggleCookFav, sortedCookbook, cookSummary,
  COOKBOOK_MAX, MAX_STEPS, MAX_INGREDIENTS } from '../../src/features/nutrition/cookbook.js'
import { buildDb } from '../../src/features/nutrition/useNutritionStore.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── texte copie depuis un site ───
const SITE = `Gâteau au yaourt
Préparation : 10 min
Cuisson : 35 min
Ingrédients (pour 6 personnes)
- 1 pot de yaourt nature
- 2 pots de sucre
- 3 pots de farine
- 3 œufs
- 1/2 pot d'huile
- 1 sachet de levure
Préparation
1. Préchauffer le four à 180 °C.
2. Mélanger le yaourt et le sucre, puis ajouter les œufs un à un.
3. Incorporer la farine et la levure, puis l'huile.
4. Verser dans un moule beurré et enfourner 35 minutes.`
const s1 = parseRecipeText(SITE)
a(s1.title === 'Gâteau au yaourt', `titre : « ${s1.title} »`)
a(s1.servings === 6, 'six parts, lues dans l en-tete des ingredients')
a(s1.prepMins === 10 && s1.cookMins === 35, 'preparation et cuisson lues')
a(s1.ingredients.length === 6, `${s1.ingredients.length} ingredients`)
a(s1.ingredients[0] === '1 pot de yaourt nature', 'les puces sont retirees')
a(s1.steps.length === 4, `${s1.steps.length} etapes`)
a(s1.steps[0] === 'Préchauffer le four à 180 °C.', 'les numeros d etape sont retires')
a(!s1.steps.some((x) => /^Pr[ée]paration$/.test(x)), 'le second « Preparation », en-tete, n est pas pris pour une etape')

// ─── page de livre lue par OCR ───
// Lignes coupees en plein milieu de phrase, en-tetes en capitales, aucune puce.
const PAGE = `RISOTTO AUX CHAMPIGNONS
Pour 4 personnes
INGRÉDIENTS
300 g de riz arborio
250 g de champignons de Paris
1 oignon
1 litre de bouillon de volaille
10 cl de vin blanc
50 g de parmesan râpé
PRÉPARATION
Émincez l'oignon et faites-le revenir dans
un peu d'huile pendant 5 minutes.
Ajoutez le riz et nacrez-le 2 min. Versez le
vin blanc et laissez absorber.
Ajoutez le bouillon louche par louche pendant
18 à 20 minutes en remuant.`
const s2 = parseRecipeText(PAGE)
a(s2.title === 'Risotto aux champignons', 'un titre en capitales est rendu lisible')
a(s2.servings === 4 && s2.ingredients.length === 6, 'quatre parts, six ingredients')
a(s2.steps.length === 3, `les lignes coupees sont recollees : ${s2.steps.length} etapes, pas 6`)
a(s2.steps[0] === 'Émincez l\'oignon et faites-le revenir dans un peu d\'huile pendant 5 minutes.', 'premiere etape reconstituee mot pour mot')
a(/^Ajoutez le riz.*laissez absorber\.$/.test(s2.steps[1]), 'deuxieme etape reconstituee')

// ─── note de telephone, sans aucun en-tete ───
const NOTE = `Pâtes carbonara
200 g de spaghetti
100 g de lardons
2 jaunes d'œufs
50 g de pecorino
Cuire les pâtes 10 min dans l'eau bouillante salée.
Faire revenir les lardons.
Mélanger les jaunes et le pecorino, puis tout assembler hors du feu.`
const s3 = parseRecipeText(NOTE)
a(s3.ingredients.length === 4 && s3.steps.length === 3, 'sans en-tete, la forme des lignes suffit : 4 ingredients, 3 etapes')

a(parseRecipeText('').ok === false, 'texte vide : rien d exploitable')
a(parseRecipeText(null).ok === false, 'aucun texte : pas d exception')

// ─── minuteurs ───
const t = (s) => detectTimers(s).map((x) => x.secs)
a(t('enfourner 35 minutes')[0] === 2100, '35 minutes')
a(t('cuire 1 h 30 a feu doux').join() === '5400', '« 1 h 30 » donne un seul minuteur, pas un second de 30 minutes')
a(t('repos 1h30').join() === '5400', 'ecrit colle aussi')
a(t('pendant 18 à 20 minutes').join() === '1080', 'une fourchette demarre sur sa borne basse, un seul minuteur')
a(detectTimers('pendant 18 à 20 minutes')[0].label === '18–20 min', 'et son libelle garde la fourchette')
a(t('four à 180 °C, ajouter 200 g').length === 0, 'ni temperature ni masse ne deviennent des minuteurs')
a(t('remuer 10 secondes').length === 0, 'un geste de 10 s n est pas un minuteur')
a(t('cuire 10 min puis 10 min encore').length === 1, 'deux durees identiques : un seul minuteur')
a(parseDuration('1 h 15') === 4500 && parseDuration('45 min') === 2700, 'durees lues')

// ─── mise a l echelle ───
a(scaleIngredient('200 g de farine', 1.5) === '300 g de farine', '200 g x1,5')
a(scaleIngredient("1/2 pot d'huile", 1.5) === "0,75 pot d'huile", 'une fraction est lue comme une fraction, pas comme « 1 » suivi de « /2 »')
a(scaleIngredient('½ citron', 1.5) === '0,75 citron', 'les fractions unicode aussi, avec deux decimales sous l unite')
a(scaleIngredient('2 à 3 tomates', 2) === '4 à 6 tomates', 'les deux bornes d une fourchette')
a(scaleIngredient('- 1 sachet de levure', 2) === '- 2 sachet de levure', 'la puce est conservee')
a(scaleIngredient('sel, poivre', 3) === 'sel, poivre', 'sans quantite chiffree, rien n est devine')
a(scaleIngredient('3 œufs', 1) === '3 œufs', 'facteur 1 : texte intact')
a(niceQty(2.25) === '2,3' && niceQty(12.4) === '12' && niceQty(3.02) === '3', 'arrondis lisibles, a la francaise')

// ─── normalisation et carnet ───
const r = makeCookRecipe({ title: '  ', ingredients: 'a\n\nb', steps: ['x', '', 'y'], servings: 0, now: () => 1 })
a(r.title === 'Recette', 'titre vide : un titre par defaut')
a(r.ingredients.length === 2 && r.steps.length === 2, 'lignes vides retirees, texte ou liste acceptes')
a(r.servings === null, 'zero part : non renseigne plutot que zero')
const gros = makeCookRecipe({ title: 'x', ingredients: Array.from({ length: 99 }, () => 'i'), steps: Array.from({ length: 99 }, () => 'e'.repeat(2000)) })
a(gros.ingredients.length === MAX_INGREDIENTS && gros.steps.length === MAX_STEPS, 'listes bornees')
a(gros.steps[0].length === 600, 'etapes bornees en longueur')

a(cookIssue(makeCookRecipe({ title: 'Vide' })) !== null, 'sans ingredient ni etape : bloque, et le dit')
a(cookIssue(makeCookRecipe({ title: 'Ok', steps: ['x'] })) === null, 'une etape suffit')

// La place est verifiee avant d ecrire, pas decouverte plus tard hors ligne.
const plein = Array.from({ length: COOKBOOK_MAX }, (_, i) => makeCookRecipe({ id: 'c' + i, title: 'R' + i, steps: ['x'] }))
a(/d[ée]j[àa] 60/.test(cookbookRoom(plein, makeCookRecipe({ id: 'neuf', title: 'N', steps: ['x'] }))), 'carnet plein : le refus dit pourquoi')
a(cookbookRoom(plein, { ...plein[0], title: 'Modifiee' }) === null, 'mais modifier une recette existante reste possible')
const enorme = makeCookRecipe({ id: 'e', title: 'E', steps: Array.from({ length: 30 }, () => 'x'.repeat(600)) })
const lourd = Array.from({ length: 50 }, (_, i) => ({ ...enorme, id: 'l' + i }))
a(cookbookBytes(lourd) > 700000, 'cinquante recettes maximales depassent le budget')
a(/plein/.test(cookbookRoom(lourd.slice(0, 40), { ...enorme, id: 'x' })), 'le budget en octets est controle, pas seulement le nombre')

let carnet = upsertCook([], makeCookRecipe({ id: 'a', title: 'A', steps: ['x'] }))
carnet = upsertCook(carnet, makeCookRecipe({ id: 'b', title: 'Brioche', ingredients: ['farine'], steps: ['x'] }))
carnet = upsertCook(carnet, { ...carnet[0], title: 'A2' })
a(carnet.length === 2 && carnet[0].title === 'A2', 'modifier remplace')
carnet = toggleCookFav(carnet, 'a')
a(sortedCookbook(carnet)[0].id === 'a', 'les favorites passent en tete')
a(sortedCookbook(carnet, 'farine').length === 1, 'la recherche lit aussi les ingredients')
a(removeCook(carnet, 'a').length === 1, 'suppression')
a(cookSummary(makeCookRecipe({ title: 'x', servings: 6, prepMins: 10, cookMins: 35, ingredients: ['a', 'b'] })) === '6 parts · 10 + 35 min · 2 ingrédients', 'resume lisible')

// ─── trajet de persistance ───
const db = buildDb({ nutrition: { cookbook: [carnet[0]] } }, {}, {}, [], {}, '2026-10-02')
a(Array.isArray(db.cookbook) && db.cookbook.length === 1, 'le carnet est expose par db.cookbook')
a(Array.isArray(buildDb({ nutrition: { cookbook: 'cassé' } }, {}, {}, [], {}, '2026-10-02').cookbook), 'une valeur corrompue est normalisee en liste')

console.log('\nALL PASS')
