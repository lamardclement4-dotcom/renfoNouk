// Lecture d'une capture de plat : etiquette nutritionnelle ou capture d une
// autre application. Le journal alimentaire ecrit ce qui est lu sans ecran de
// validation : chaque piege rate devient une journee faussee, puis une
// retrospective faussee, sans que rien ne le signale.
import { parseFoodText, toFoodEntry, caloriesFrom, detectBasis, detectName, kcalCoherence, readingIssue, FOOD_FIELDS } from '../../src/features/nutrition/foodOcr.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── LE piege : kJ et kcal sur la meme ligne ───
// 1050 kJ valent 250 kcal. Lire le premier nombre enregistre un plat quatre
// fois trop calorique.
a(caloriesFrom('Énergie 1050 kJ / 250 kcal') === 250, 'sur « 1050 kJ / 250 kcal », ce sont 250 kcal qui sont retenues')
a(caloriesFrom('Energy 2100 kJ / 500 kcal') === 500, 'meme chose en anglais')
a(caloriesFrom('250 kcal') === 250, 'kcal seul')
a(caloriesFrom('Énergie 1050 kJ') === null, 'une valeur uniquement en kJ est refusee, pas prise pour des calories')

// ─── etiquette francaise complete ───
const etiquette = `Galettes de sarrasin
Valeurs nutritionnelles pour 100 g
Énergie 1050 kJ / 250 kcal
Matières grasses 12 g
  dont acides gras saturés 3,5 g
Glucides 22 g
  dont sucres 4,1 g
Fibres alimentaires 2,3 g
Protéines 9,8 g
Sel 0,85 g`
const e = parseFoodText(etiquette)
a(e.per.k === 250, `calories : ${e.per.k} kcal`)
a(e.per.l === 12, `lipides : ${e.per.l} g — « dont acides gras satures 3,5 g » n a pas ecrase la ligne`)
a(e.per.g === 22, `glucides : ${e.per.g} g — « dont sucres 4,1 g » non plus`)
a(e.per.p === 9.8, `proteines : ${e.per.p} g, virgule decimale comprise`)
a(e.per.fib === 2.3, `fibres : ${e.per.fib} g`)
a(e.basis === '100g' && e.grams === 100, 'libelle pour 100 g')
a(e.name === 'Galettes de sarrasin', `nom retenu : « ${e.name} »`)
a(e.ok === true, 'lecture jugee exploitable')
a(e.rejected.length === 0, 'rien de rejete')

// ─── capture d une autre application, libellee par portion ───
const appli = `Poulet rôti et riz
Portion 250 g
Calories 400 kcal
Protéines 30 g
Glucides 45 g
Lipides 9 g`
const p = parseFoodText(appli)
a(p.basis === 'portion' && p.grams === 250, `portion detectee : ${p.grams} g`)
a(p.read.k === 400, 'la valeur lue reste celle de la portion')
a(p.per.k === 160, `ramenee a 100 g : ${p.per.k} kcal — le journal ne stocke que cette base`)
a(p.per.p === 12 && p.per.g === 18 && p.per.l === 3.6, `macros pour 100 g : ${p.per.p}/${p.per.g}/${p.per.l}`)
a(p.ok === true, 'exploitable')

// ─── bornes de plausibilite ───
const fou = parseFoodText('Plat mystere\nCalories 5000 kcal\nProtéines 12 g')
a(fou.per.k == null, '5000 kcal pour 100 g : refuse, 100 g de graisse pure plafonnent a 900')
a(fou.rejected.some((r) => r.key === 'k'), 'et le refus est trace')
a(fou.ok === false, 'sans calories, rien ne part dans le journal')

// ─── l equation des calories attrape ce que les bornes laissent passer ───
const incoherent = parseFoodText('Pizza\nCalories 800 kcal\nProtéines 5 g\nGlucides 10 g\nLipides 2 g')
a(incoherent.per.k === 800, '800 kcal est dans les bornes')
a(incoherent.coherence.ok === false, `mais les macros n en impliquent que ${incoherent.coherence.attendu} : incoherent`)
a(incoherent.ok === false, 'donc non ecrit sans relecture')

const coherent = kcalCoherence({ k: 250, p: 9.8, g: 22, l: 12 })
a(coherent.ok === true, `250 kcal pour 9,8/22/12 : coherent (attendu ${coherent.attendu})`)

// ─── texte inexploitable : aucune exception ───
for (const vide of ['', null, undefined, 'zzz   ###', '   ']) {
  const r = parseFoodText(vide)
  a(r.ok === false, `texte inexploitable (${JSON.stringify(vide)}) : refuse sans lever`)
}

// ─── forme exacte attendue par le journal ───
const entree = toFoodEntry(p, { meal: 'soir', now: () => 1700000000000 })
a(entree.id === 'e1700000000000', 'identifiant construit comme ceux de la saisie manuelle')
a(entree.n === 'Poulet rôti et riz' && entree.meal === 'soir', 'nom et repas')
a(entree.grams === 250, 'poids de portion conserve a part')
a(entree.per.k === 160, '`per` porte le pour-100 g')
a(entree.k === 400, `et les valeurs absolues sont remises a l echelle : ${entree.k} kcal pour 250 g`)
a(entree.p === 30 && entree.g === 45 && entree.l === 9, 'macros absolues coherentes avec la portion lue')
for (const key of ['id', 'n', 'grams', 'meal', 'per', 'k', 'p', 'g', 'l', 'fib']) {
  a(key in entree, `champ « ${key} » present, comme dans une entree saisie a la main`)
}
a(entree.src === 'capture', 'origine marquee : une valeur lue se corrige, une valeur saisie se respecte')
a(toFoodEntry(fou) === null, 'une lecture non exploitable ne produit aucune entree')

// ─── details ───
a(detectBasis('valeurs pour 100 ml').grams === 100, 'pour 100 ml compte comme pour 100 g')
a(detectName('Nutrition Facts\n250 kcal\nSaumon fumé') === 'Saumon fumé', 'une ligne de mesure n est jamais prise pour un nom')
a(FOOD_FIELDS.every((f) => f.max > f.min && f.label && f.unit !== undefined), 'chaque champ borne est bien forme')

// ─── le refus doit s expliquer ───
a(readingIssue(e) === null, 'une lecture exploitable n affiche aucun refus')
a(/hors du plausible/.test(readingIssue(fou)), `5000 kcal : « ${readingIssue(fou)} »`)
a(/78 kcal/.test(readingIssue(incoherent)), `incoherence : « ${readingIssue(incoherent)} »`)
a(/calories/i.test(readingIssue(parseFoodText('Salade\nProtéines 4 g'))), 'sans calories : le motif est dit')
a(typeof readingIssue(null) === 'string', 'aucune entree : message quand meme, jamais un silence')

console.log('\nALL PASS')
