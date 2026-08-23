// Catalogue des boissons et macros.
//
// Deux catalogues coexistaient : celui de l hydratation, qui ne retenait que
// volume, cafeine et sucre, et un `BOISSONS` de vingt-cinq entrees que plus
// personne n importait. Aucun des deux ne portait de calories : une biere, un
// latte ou un smoothie comptaient pour zero dans les macros du jour.
import { DRINKS, DRINK_CATEGORIES, drinkById, searchDrinks, scaleDrink,
  alcoholGrams, hydrationFactor, ALCOHOL_KCAL_PER_G, ETHANOL_DENSITY }
  from '../../src/features/nutrition/drinksData.js'
import { dayTotals, dayEntries, drinkAsEntry, averages, macroSplit, daySeries, KCAL_PER_G_ALC }
  from '../../src/features/nutrition/nutriIntel.js'
import { nutritionDay } from '../../src/features/train/renfoIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── couverture du catalogue ───
a(DRINKS.length >= 200, `${DRINKS.length} boissons (68 auparavant, sans macros)`)
a(DRINK_CATEGORIES.length >= 12, `${DRINK_CATEGORIES.length} categories`)
for (const c of DRINK_CATEGORIES) a(c.items.length >= 10, `${c.label} : ${c.items.length} boissons`)
for (const wanted of ['jus', 'sodas', 'cafes', 'bieres', 'vins', 'spiritueux', 'cocktails'])
  a(DRINK_CATEGORIES.some((c) => c.id === wanted), `categorie « ${wanted} » presente`)
a(new Set(DRINKS.map((d) => d.id)).size === DRINKS.length, 'aucun identifiant en double')
a(DRINKS.every((d) => d.ml > 0), 'chaque boisson a un volume')
a(DRINKS.every((d) => d.kcal >= 0 && d.prot >= 0 && d.carb >= 0 && d.fat >= 0), 'aucune macro negative')

// ─── alcool : calcule, pas recopie ───
// masse d ethanol = volume x degre x densite ; 7 kcal par gramme.
a(alcoholGrams(500, 5) === Math.round(500 * 0.05 * ETHANOL_DENSITY * 10) / 10, 'masse d ethanol d une pinte a 5 degres')
a(alcoholGrams(0, 5) === 0 && alcoholGrams(500, 0) === 0, 'volume ou degre nul -> aucun alcool')
a(alcoholGrams(null, 5) === 0, 'valeur absente -> zero, pas NaN')
const pinte = DRINKS.find((d) => /pinte/.test(d.n))
a(pinte && pinte.alc > 19 && pinte.alc < 21, `une pinte a 5 degres : ${pinte.alc} g d alcool`)
a(pinte.kcal > 190 && pinte.kcal < 220, `soit ${pinte.kcal} kcal — autant qu une part de gateau`)
const demi = DRINKS.find((d) => /demi \(250/.test(d.n))
a(Math.abs(demi.alc * 2 - pinte.alc) < 0.5, 'un demi et une pinte du meme degre restent coherents entre eux')
a(ALCOHOL_KCAL_PER_G === 7, 'sept kilocalories par gramme d alcool')

// ─── hydratation : l alcool est diuretique ───
a(hydrationFactor(0) === 1, 'sans alcool, tout le volume hydrate')
a(hydrationFactor(5) < 1 && hydrationFactor(5) > 0, 'une biere hydrate, mais moins')
a(hydrationFactor(12) < hydrationFactor(5), 'un vin hydrate moins qu une biere')
a(hydrationFactor(40) < 0, 'un spiritueux retire plus d eau qu il n en apporte')

// ─── quantite ───
const deux = scaleDrink(pinte, 2)
a(deux.alc === Math.round(pinte.alc * 2 * 10) / 10, 'deux pintes : deux fois l alcool')
a(deux.abv === pinte.abv, 'mais pas deux fois le degre')
a(deux.kcal === pinte.kcal * 2 && deux.ml === pinte.ml * 2, 'calories et volume doubles')
a(scaleDrink(pinte, 0).qty === 1 && scaleDrink(pinte, null).qty === 1, 'quantite absente ou nulle -> une unite')

// ─── recherche ───
a(searchDrinks('biere').length > 0, '« biere » sans accent trouve les bieres')
a(searchDrinks('COCA').some((d) => /Coca/.test(d.n)), 'la casse est ignoree')
a(searchDrinks('').length === 0, 'requete vide -> aucun resultat')
a(searchDrinks('zzzz').length === 0, 'requete sans correspondance')
a(drinkById(DRINKS[0].id) === DRINKS[0] && drinkById('nawak') === null, 'acces par identifiant')

// ─── LE point : les boissons comptent dans les macros ───
const biere = DRINKS.find((d) => /Bi[èe]re blonde, pinte/.test(d.n))
const entry = drinkAsEntry(biere)
a(entry.k === biere.kcal && entry.alc === biere.alc, 'une boisson devient un apport ordinaire')
a(drinkAsEntry({ n: 'eau', kcal: 0, alc: 0 }) === null, 'une eau sans calorie n encombre pas le journal alimentaire')

const db = {
  foodLog: { '2026-08-20': [{ n: 'Riz', k: 400, p: 8, g: 88, l: 1, fib: 2 }] },
  hydroLog: { '2026-08-20': [
    { n: 'Bière', ml: 500, kcal: biere.kcal, prot: 0, carb: biere.carb, fat: 0, alc: biere.alc, sugar: 0 },
    { n: 'Eau', ml: 500, kcal: 0, alc: 0 },
  ] },
}
const ents = dayEntries(db, '2026-08-20')
a(ents.length === 2, `le riz et la biere comptent ; l eau, non (${ents.length} apports)`)
const tot = dayTotals(ents)
a(tot.k === 400 + biere.kcal, `${tot.k} kcal au lieu de 400 : la biere ne disparait plus`)
a(tot.alc === biere.alc, `${tot.alc} g d alcool comptabilises`)
a(nutritionDay(db, '2026-08-20').k === tot.k, "l ecran d accueil voit le meme total")
a(dayEntries({}, '2026-08-20').length === 0, 'journee vide -> aucun apport, sans lever')
a(dayEntries({ hydroLog: { '2026-08-20': {} } }, '2026-08-20').length === 0, 'journal mal forme -> ignore')

// ─── part de l alcool dans les macros ───
const avg = { kcal: 2000, prot: 100, gluc: 200, lip: 60, fib: 20, alc: 20 }
const split = macroSplit(avg)
a(split.alcKcal === 20 * KCAL_PER_G_ALC, `${split.alcKcal} kcal viennent de l alcool`)
a(split.a > 0, `soit ${split.a} % des calories`)
a(Math.abs(split.p + split.g + split.l + split.a - 100) < 0.5, 'les quatre parts font cent pour cent')
const sansAlc = macroSplit({ ...avg, alc: 0 })
a(sansAlc.g > split.g && sansAlc.l > split.l,
  'ignorer l alcool gonflait mecaniquement glucides et lipides les jours ou l on a bu')

// les series lisent les deux journaux
const serie = daySeries(db, { days: 3, today: '2026-08-21', targetKcal: 2000 })
a(serie.length === 1 && serie[0].alc === biere.alc, 'la serie retient l alcool du jour')
console.log('\nALL PASS')
