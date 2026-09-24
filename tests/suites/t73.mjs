// Repartition par famille d aliments, et proportion ideale de chacune.
//
// Les macros disent combien de glucides. Elles ne disent pas si ces
// glucides viennent de flocons d avoine ou de sodas. Ce module ajoute cette
// strate — encore faut-il que le classement soit juste, sans quoi les
// pourcentages sont pires qu absents : ils sont credibles et faux.
import { familyOf, familyByMacros, familyBreakdown, familyAdvice, normName, FAMILIES, familyById, ECART_MIN_PCT } from '../../src/features/nutrition/foodFamilies.js'
import { FOODS } from '../../src/features/nutrition/nutritionData.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── classement par le nom ───
const parNom = [
  ['Riz blanc cuit', 'feculent'], ['Pain complet', 'feculent'], ['Flocons d’avoine', 'feculent'],
  ['Amandes', 'oleagineux'], ['Graines de courge', 'oleagineux'], ['Noix de cajou', 'oleagineux'],
  ['Lentilles cuites', 'legumineuse'], ['Pois chiches cuits', 'legumineuse'], ['Tofu ferme', 'legumineuse'],
  ['Blanc de poulet', 'proteine_animale'], ['Saumon fumé', 'proteine_animale'],
  ['Yaourt nature', 'laitier'], ['Emmental', 'laitier'],
  ['Banane', 'fruit'], ['Brocoli', 'legume'], ['Huile d’olive', 'matiere_grasse'],
  ['Chocolat noir 70%', 'sucre'], ['Pizza margherita', 'plat'],
]
for (const [nom, attendu] of parNom) {
  const r = familyOf({ n: nom })
  a(r.id === attendu, `« ${nom} » -> ${r.id}`)
}

// Pieges de sous-chaine : un motif trop court matche a l interieur d un
// autre mot. « cola » se cache dans « chocolat », « confit » dans
// « confiture ». Sans limites de mot, ces deux aliments partaient dans la
// mauvaise famille — et la repartition entiere avec eux.
a(familyOf({ n: 'Chocolat noir 70%' }).id === 'sucre', '« chocolat » n est pas une boisson : « cola » s y cachait')
a(familyOf({ n: 'Chocolat au lait' }).id === 'sucre', 'ni le chocolat au lait')
a(familyOf({ n: 'Confiture de fraises' }).id === 'sucre', '« confiture » n est pas une viande : « confit » s y cachait')
a(familyOf({ n: 'Coca-Cola' }).id === 'boisson', 'mais un vrai cola reste une boisson')
a(familyOf({ n: 'Confit de canard' }).id === 'proteine_animale', 'et un vrai confit reste une viande')

// La preparation l emporte sur l ingredient : sans cette regle d ordre, une
// confiture comptait comme un fruit et une glace a la pistache comme un
// oleagineux — deux familles faussees d un coup.
a(familyOf({ n: 'Tarte aux pommes' }).id === 'sucre', 'une tarte aux pommes est un produit sucre, pas un fruit')
a(familyOf({ n: 'Glace pistache' }).id === 'sucre', 'une glace a la pistache n est pas un oleagineux')
a(familyOf({ n: 'Fraises' }).id === 'fruit', 'mais des fraises restent un fruit')
a(familyOf({ n: 'Mousse de saumon' }).id === 'proteine_animale', 'et une mousse de saumon reste du poisson')

// LE piege d ordre : « beurre de cacahuete » contient « beurre ». Range dans
// les matieres grasses, il sortirait des oleagineux et fausserait les deux.
a(familyOf({ n: 'Beurre de cacahuète' }).id === 'oleagineux', 'le beurre de cacahuete est un oleagineux, pas une matiere grasse')
a(familyOf({ n: 'Beurre doux' }).id === 'matiere_grasse', 'le beurre, lui, reste une matiere grasse')

// La ligature oe ne se decompose pas en NFD : sans traitement, « Œuf » n est
// jamais reconnu et part en « non classe ».
a(normName('Œuf dur') === 'oeuf dur', 'la ligature oe est normalisee')
a(familyOf({ n: 'Œuf dur' }).id === 'proteine_animale', 'et « Œuf dur » est bien classe')

// Pluriels composes : « haricot rouge » ne matche pas « haricots rouges ».
a(familyOf({ n: 'Haricots rouges cuits' }).id === 'legumineuse', 'les pluriels composes sont pris')
a(familyOf({ n: 'Pommes de terre vapeur' }).id === 'feculent', 'y compris « pommes de terre »')

// ─── classement par empreinte nutritionnelle ───
// Un aliment saisi a la main ou importe d une capture n a pas de nom connu :
// c est alors sa composition qui le designe.
a(familyByMacros({ k: 600, p: 20, g: 15, l: 50 }) === 'oleagineux', '600 kcal, 50 g de lipides, 20 g de proteines : un oleagineux')
a(familyByMacros({ k: 900, p: 0, g: 0, l: 100 }) === 'matiere_grasse', '100 g de lipides purs : une matiere grasse')
a(familyByMacros({ k: 130, p: 2.5, g: 28, l: 0.3 }) === 'feculent', 'beaucoup de glucides, pas de gras : un feculent')
a(familyByMacros({ k: 165, p: 31, g: 0, l: 3.6 }) === 'proteine_animale', 'proteines seules : une proteine animale')
a(familyByMacros({ k: 116, p: 9, g: 20, l: 0.4, fib: 8 }) === 'legumineuse', 'proteines + glucides + beaucoup de fibres : une legumineuse')
a(familyByMacros({ k: 350, p: 7, g: 78, l: 0.6 }) === 'feculent', 'un feculent sec (78 g de glucides)')
a(familyByMacros({ k: 25, p: 1, g: 4, l: 0.2 }) === 'legume', 'tres peu dense : un legume')
a(familyByMacros({ k: 0, p: 0, g: 0, l: 0 }) === 'boisson', 'zero calorie : une boisson')

const inconnu = familyOf({ n: 'Zblorg maison', per: { k: 600, p: 20, g: 15, l: 50 } })
a(inconnu.id === 'oleagineux' && inconnu.by === 'profil', 'un nom inconnu bascule sur l empreinte, et le dit')
a(familyOf({ n: 'Riz blanc cuit' }).by === 'nom', 'un nom connu ne passe pas par l empreinte')

// Une entree sans `per` mais avec un poids : les valeurs absolues sont
// ramenees a 100 g avant d etre jugees.
a(familyOf({ n: 'Truc', grams: 200, k: 1200, p: 40, g: 30, l: 100 }).id === 'oleagineux',
  '200 g a 1200 kcal sont ramenes a 100 g avant classement')

// ─── repartition sur un journal ───
const J = '2026-09-20'
const db = { foodLog: { [J]: [
  { id: '1', n: 'Riz blanc cuit', k: 400 },
  { id: '2', n: 'Amandes', k: 300 },
  { id: '3', n: 'Blanc de poulet', k: 200 },
  { id: '4', n: 'Chocolat noir 70%', k: 100 },
] } }
const b = familyBreakdown(db, { days: 1, today: J })
a(b !== null, 'une journee notee suffit')
a(b.total === 1000 && b.kcalJour === 1000, `total ${b.total} kcal`)
const part = (id) => (b.items.find((x) => x.id === id) || {}).pct
a(part('feculent') === 40, `feculents : ${part('feculent')} %`)
a(part('oleagineux') === 30, `oleagineux : ${part('oleagineux')} %`)
a(part('proteine_animale') === 20, `proteines animales : ${part('proteine_animale')} %`)
a(part('sucre') === 10, `produits sucres : ${part('sucre')} %`)

const verdict = (id) => (b.items.find((x) => x.id === id) || {}).verdict
a(verdict('feculent') === 'ok', '40 % de feculents tombe dans la fourchette 30-45')
a(verdict('oleagineux') === 'haut', '30 % d oleagineux depasse les 12 % attendus')
a(verdict('legumineuse') === 'bas', 'aucune legumineuse : en dessous')
a(!b.items.some((x) => x.id === 'plat'), 'une famille sans cible et sans calories n encombre pas la liste')

// Mais des qu elle pese, elle figure dans la repartition — sans etre jugee,
// faute de cible defendable.
const avecPlat = familyBreakdown({ foodLog: { [J]: [
  { id: '1', n: 'Pizza margherita', k: 500 },
  { id: '2', n: 'Riz blanc cuit', k: 500 },
] } }, { days: 1, today: J })
const plat = avecPlat.items.find((x) => x.id === 'plat')
a(plat && plat.pct === 50, `les plats prepares pesent ${plat && plat.pct} % et sont comptes`)
a(plat.verdict === 'sans_cible', 'mais ils ne sont pas juges : un plat n est pas une famille nutritionnelle')
a(!familyAdvice(avecPlat).some((c) => c.id === 'plat'), 'et aucun conseil ne les commente')

// ─── conseils ───
const conseils = familyAdvice(b)
a(conseils.length > 0, `${conseils.length} ecarts signales`)
a(conseils[0].id === 'oleagineux', 'le plus gros ecart vient en tete')
a(conseils.every((c) => c.gap >= ECART_MIN_PCT || c.level === 'info'), `aucun ecart inferieur a ${ECART_MIN_PCT} points n est signale`)
a(conseils.every((c) => !/\d+\.\d/.test(c.text)), 'aucune decimale a l anglaise dans les conseils')
a(/30 %/.test(conseils[0].text) && /5–12 %/.test(conseils[0].text), 'le conseil dit la part relevee ET la fourchette visee')

// Part non classee importante : il faut le dire plutot que laisser conclure.
const flou = familyBreakdown({ foodLog: { [J]: [
  { id: '1', n: 'Zzzz', k: 500, p: 9, g: 9, l: 9, grams: 100 },
  { id: '2', n: 'Riz blanc cuit', k: 500 },
] } }, { days: 1, today: J })
if (flou && flou.unknownPct >= 15) {
  a(familyAdvice(flou).some((c) => c.level === 'info'), 'une part non classee importante est signalee comme reserve')
}

// ─── bords ───
a(familyBreakdown({}, { days: 14, today: J }) === null, 'base vide : aucune repartition inventee')
a(familyBreakdown({ foodLog: {} }, { days: 14, today: J }) === null, 'journal vide non plus')
a(familyAdvice(null).length === 0, 'aucune repartition : aucun conseil')
a(familyOf(null).id === 'autre', 'entree absente : « non classe », sans lever')

// ─── coherence des fourchettes ───
for (const f of FAMILIES) {
  a((f.min == null) === (f.max == null), `${f.label} : les deux bornes vont ensemble`)
  if (f.min != null) a(f.min < f.max && f.max <= 100, `${f.label} : fourchette ${f.min}-${f.max} bien formee`)
  a(typeof f.why === 'string' && f.why.length > 20, `${f.label} : la raison de la cible est ecrite`)
}
a(familyById('nexistepas').id === 'autre', 'un identifiant inconnu retombe sur « non classe »')

// ─── garde-fou sur le vrai catalogue ───
// Mesure a l ecriture : 93,8 % des 3 020 aliments sont classes. Si une
// modification fait chuter ce taux, les pourcentages deviennent trompeurs.
const classes = FOODS.filter((f) => familyOf(f).id !== 'autre').length
const taux = classes / FOODS.length * 100
a(taux >= 90, `${taux.toFixed(1)} % du catalogue est classe (seuil : 90 %)`)

console.log('\nALL PASS')
