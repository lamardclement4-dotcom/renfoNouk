// ============================================================
// D'où viennent les calories : répartition par famille d'aliments.
//
// Les macros disent combien de protéines, de glucides et de lipides. Elles
// ne disent pas d'où ils viennent — 200 g de glucides pris sur des flocons
// d'avoine et des lentilles, ou sur des sodas et des viennoiseries, donnent
// le même chiffre et pas la même alimentation.
//
// Ce module ajoute la strate manquante : une proportion idéale par famille,
// du même genre que celle qui existe déjà pour les lipides, mais appliquée
// aux féculents, aux oléagineux, aux légumineuses et au reste.
//
// ─── Pourquoi le classement se fait en deux temps ───
//
// Les données ne portent ni sucres simples ni acides gras saturés : seuls
// k/p/g/l/fibres existent. Impossible donc de déduire « amidon contre
// sucre » des chiffres. Le nom est la seule source — mais un nom manque
// quand l'aliment a été saisi à la main ou importé d'une capture.
//
// D'où le repli sur l'empreinte nutritionnelle : un aliment à 600 kcal avec
// 50 g de lipides et 20 g de protéines EST un oléagineux, quel que soit son
// intitulé. Mesuré sur le catalogue : 2 304 entrées classées par le nom,
// 530 de plus par l'empreinte, soit 93,8 % des 3 020.
//
// ─── Sur les proportions idéales ───
//
// Ce sont des ordres de grandeur tirés des repères de santé publique
// (PNNS, OMS), pas des cibles personnelles. Une proportion hors fourchette
// est une question à se poser, pas une faute. Les bornes sont larges pour
// cette raison.
// ============================================================

import { dayEntries } from './nutriIntel'

const fr = (v) => String(v).replace('.', ',')
const r1 = (v) => Math.round(v * 10) / 10

export function normName(s) {
  // La ligature œ ne se décompose pas en NFD : sans ce remplacement,
  // « Œuf » n'est jamais reconnu.
  return (s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Part idéale de l'apport énergétique, en pourcentage des calories du jour.
//
// `min`/`max` à null : aucune cible défendable. Les plats préparés ne sont
// pas une famille nutritionnelle mais un mode de préparation, et les
// condiments pèsent trop peu pour qu'une cible ait du sens.
export const FAMILIES = [
  { id: 'feculent', label: 'Féculents', min: 30, max: 45,
    why: 'Base de l’apport énergétique. Les versions complètes apportent en plus les fibres qui manquent presque toujours.' },
  { id: 'legume', label: 'Légumes', min: 4, max: 10,
    why: 'Peu de calories pour beaucoup de volume : leur part en énergie reste faible même quand on en mange beaucoup. Le repère utile est plutôt 400 g par jour avec les fruits.' },
  { id: 'fruit', label: 'Fruits', min: 5, max: 12,
    why: 'Sucres accompagnés de fibres et de micronutriments, ce qui les distingue des produits sucrés.' },
  { id: 'proteine_animale', label: 'Viandes, poissons, œufs', min: 10, max: 20,
    why: 'Suffisant pour couvrir les besoins en protéines et en fer sans occuper la place du reste.' },
  { id: 'legumineuse', label: 'Légumineuses', min: 5, max: 12,
    why: 'Protéines, glucides lents et fibres à la fois. C’est la famille la plus souvent absente, et celle qui change le plus le total de fibres.' },
  { id: 'laitier', label: 'Produits laitiers', min: 6, max: 15,
    why: 'Calcium et protéines. Au-delà, les graisses saturées montent vite.' },
  { id: 'oleagineux', label: 'Oléagineux', min: 5, max: 12,
    why: 'Une petite poignée par jour, environ 30 g : lipides insaturés, magnésium, fibres. Très caloriques, donc la part grimpe vite.' },
  { id: 'matiere_grasse', label: 'Matières grasses ajoutées', min: 8, max: 16,
    why: 'Huiles et beurre. Nécessaires, mais denses : 1 g en vaut 9 kcal.' },
  { id: 'sucre', label: 'Produits sucrés', min: 0, max: 10,
    why: 'L’OMS situe la limite des sucres libres à 10 % de l’apport, idéalement 5 %.' },
  { id: 'boisson', label: 'Boissons caloriques', min: 0, max: 5,
    why: 'Les calories bues rassasient moins que les mêmes calories mâchées.' },
  { id: 'plat', label: 'Plats préparés', min: null, max: null,
    why: 'Un mode de préparation, pas une famille nutritionnelle : ce qu’il y a dedans compte plus que la catégorie.' },
  { id: 'complement', label: 'Compléments', min: null, max: null, why: 'Hors repères alimentaires.' },
  { id: 'condiment', label: 'Condiments', min: null, max: null, why: 'Trop peu de calories pour qu’une cible ait un sens.' },
  { id: 'autre', label: 'Non classé', min: null, max: null,
    why: 'Ni le nom ni le profil nutritionnel n’ont permis de trancher.' },
]

export const familyById = (id) => FAMILIES.find((f) => f.id === id) || FAMILIES[FAMILIES.length - 1]

// L'ordre compte : la première règle qui accroche gagne. Les oléagineux
// passent avant les matières grasses pour que « beurre de cacahuète » ne
// soit pas lu comme du beurre.
export const NAME_RULES = [
  ['boisson', /(^eau|eau (minerale|gazeuse|plate)|jus |soda|\bcola\b|biere|\bvin\b|whisky|vodka|rhum|\bgin\b|cafe|\bthe\b|tisane|infusion|limonade|sirop|cidre|champagne|punch|cocktail|smoothie|boisson|latte|cappuccino|espresso|mojito|spritz|lait[s]? (d|de|vegetal)|kombucha|energisant|energetique)/],
  ['sucre', /(chocolat|bonbon|gateau|biscuit|tarte|chausson aux|mille[- ]feuille|palmier|glace|sorbet|confiture|\bmiel\b|sucre|nutella|pate a tartiner|viennoiserie|croissant|brioche|madeleine|cookie|brownie|donut|beignet|dessert|mousse au |\bflan\b|pudding|barre chocolatee|gaufre|churros|meringue|nougat|caramel|speculoos)/],
  ['oleagineux', /(amande|noix|noisette|cajou|pistache|cacahuete|arachide|graine|sesame|tahin|chia|tournesol|pignon|pecan|macadamia)/],
  ['matiere_grasse', /(huile|^beurre$|^beurre (doux|demi|sale)|margarine|saindoux|graisse|creme fraiche|vinaigrette|mayonnaise)/],
  ['legumineuse', /(lentille|pois[- ]?chiche|haricot[s]? (rouge|blanc|noir|coco)|\bfeve[s]?\b|flageolet|\bsoja\b|edamame|pois casse|mungo|azuki|tofu|tempeh|seitan|houmous|hummus|falafel|proteine[s]? de pois)/],
  ['laitier', /(^lait\b|^lait (entier|demi|ecreme)|yaourt|fromage|skyr|faisselle|petit[- ]suisse|mozzarella|emmental|parmesan|comte|camembert|feta|chevre|brebis|ricotta|mascarpone|gruyere|cheddar|roquefort|reblochon|raclette|kefir|cottage|\bwhey\b|caseine)/],
  ['feculent', /(\briz\b|risotto|^pates|\bpates\b|nouille|vermicelle|spaghetti|penne|tagliatelle|macaroni|coquillette|ramen|pain|baguette|biscotte|tartine craquante|pomme[s]? de terre|patate|frite|chips|quinoa|boulgour|semoule|couscous|taboule|avoine|porridge|flocon|polenta|sarrasin|epeautre|millet|\borge\b|seigle|\bble\b|farine|cereale|muesli|granola|corn flakes|wrap|tortilla|gnocchi|fecule|maltodextrine|manioc|igname|chataigne|pop[- ]?corn|galette de|crepe|pancake|blini|amidon)/],
  ['proteine_animale', /(poulet|boeuf|porc|agneau|veau|dinde|canard|lapin|caille|pintade|jambon|saucisse|steak|escalope|filet|cotelette|merguez|bacon|lardon|viande|poisson|saumon|thon|cabillaud|colin|merlu|sardine|maquereau|truite|dorade|hareng|anchois|crevette|moule|huitre|calamar|poulpe|crabe|homard|langoustine|oeuf|abats|\bfoie\b|rognon|boudin|terrine|charcuterie|rillette|chorizo|salami|surimi|gesier|magret|\bconfit\b|confit de|cordon bleu)/],
  ['fruit', /(pomme[s]?\b|poire|banane|orange|mandarine|clementine|citron|pamplemousse|raisin|fraise|framboise|myrtille|mure[s]?\b|groseille|cassis|cerise|peche|abricot|prune|nectarine|kiwi|ananas|mangue|papaye|melon|pasteque|figue|datte|grenade|litchi|fruit|avocat|\bcoco\b|goyave|cranberr|kaki|rhubarbe)/],
  ['legume', /(carotte|courgette|tomate|salade|laitue|epinard|brocoli|\bchou|haricot[s]? vert|poireau|oignon|\bail\b|poivron|aubergine|concombre|radis|navet|panais|betterave|celeri|asperge|artichaut|champignon|courge|potiron|potimarron|fenouil|endive|cresson|roquette|\bmache\b|legume|petit[s]? pois|\bmais\b|olive|echalote|topinambour|salsifis|blette|crudite|ratatouille)/],
  ['plat', /(pizza|burger|hot[- ]dog|sandwich|lasagne|gratin|quiche|soupe|potage|veloute|curry|tajine|paella|chili|bolognaise|carbonara|hachis|cassoulet|sushi|\bmaki\b|\bnem\b|samoussa|burrito|\btaco|kebab|croque|raviol|tortellini|friand|brandade|blanquette|pot[- ]au[- ]feu|choucroute|moussaka|dahl|mafe|bo ?bun|pad thai|tartiflette|fish and chips)/],
  ['complement', /(barre (hyper)?proteinee|proteine en poudre|creatine|bcaa|gel energetique|complement|multivitamine)/],
  ['condiment', /(\bsel\b|poivre|epice|vinaigre|moutarde|ketchup|sauce|bouillon|levure|vanille|cannelle|curcuma|psyllium|gelatine|agar|aromate|basilic|persil|thym|laurier|paprika|cumin|gingembre|wasabi|harissa)/],
]

// Ce qu'un aliment EST, d'après sa composition pour 100 g. Sert quand le nom
// ne dit rien — saisie manuelle, import par capture, intitulé exotique.
export function familyByMacros(per) {
  const { k = 0, p = 0, g = 0, l = 0, fib = 0 } = per || {}
  if (k <= 5) return 'boisson'
  if (l >= 55 && p < 5) return 'matiere_grasse'
  if (l >= 35 && p >= 8) return 'oleagineux'
  if (k < 70 && g < 12 && l < 3) return 'legume'
  if (k < 90 && g >= 8 && l < 3 && p < 3) return 'fruit'
  if (p >= 15 && g < 12) return 'proteine_animale'
  // Les legumineuses passent avant les feculents : des lentilles cuites
  // (9 g de proteines, 8 g de fibres, 20 g de glucides) satisfont sinon la
  // regle des feculents cuits et s y perdraient.
  if (fib >= 5 && p >= 6 && g >= 12 && l < 8) return 'legumineuse'
  if (g >= 35 && l < 12 && fib >= 4) return 'feculent'
  if (g >= 45 && l < 10) return 'feculent'
  // Les feculents CUITS, que les seuils ci-dessus ratent : le riz sec porte
  // 78 g de glucides, le meme riz cuit 28 g — l eau a tout dilue. Sans cette
  // regle, la famille la plus courante du journal passait en « non classe ».
  if (g >= 15 && l < 5 && p < 10 && k >= 90) return 'feculent'
  if (g >= 30 && l >= 12) return 'sucre'
  return null
}

// Valeurs pour 100 g d'une entrée de journal, qui stocke `per` quand elle
// l'a, et sinon des valeurs absolues avec un poids.
function per100Of(e) {
  if (e && e.per) return e.per
  const gr = e && e.grams
  if (!gr) return { k: e.k || 0, p: e.p || 0, g: e.g || 0, l: e.l || 0, fib: e.fib || 0 }
  const f = 100 / gr
  return { k: (e.k || 0) * f, p: (e.p || 0) * f, g: (e.g || 0) * f, l: (e.l || 0) * f, fib: (e.fib || 0) * f }
}

export function familyOf(food) {
  if (!food) return { id: 'autre', by: null }
  const s = normName(food.n)
  for (const [id, re] of NAME_RULES) if (re.test(s)) return { id, by: 'nom' }
  const byMacros = familyByMacros(per100Of(food))
  return byMacros ? { id: byMacros, by: 'profil' } : { id: 'autre', by: null }
}

function todayISO() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
function shiftISO(iso, delta) {
  const [y, m, d] = String(iso).split('-').map(Number)
  const x = new Date(Date.UTC(y, m - 1, d))
  x.setUTCDate(x.getUTCDate() + delta)
  return x.toISOString().slice(0, 10)
}

// Part de chaque famille dans les calories réellement consommées.
//
// Moyenne sur la fenêtre plutôt que sur un jour : une journée n'est jamais
// équilibrée à elle seule, et juger dessus ferait passer un repas de fête
// pour un problème d'alimentation.
export function familyBreakdown(db, { days = 14, today } = {}) {
  const ref = today || todayISO()
  const parFamille = {}
  let total = 0
  let joursNotes = 0
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftISO(ref, -i)
    const entrees = dayEntries(db, date)
    if (!entrees.length) continue
    let duJour = 0
    for (const e of entrees) {
      const kcal = Number(e && e.k) || 0
      if (kcal <= 0) continue
      const { id } = familyOf(e)
      parFamille[id] = (parFamille[id] || 0) + kcal
      total += kcal
      duJour += kcal
    }
    if (duJour > 0) joursNotes++
  }
  if (!joursNotes || total <= 0) return null

  const items = FAMILIES
    .map((f) => {
      const kcal = parFamille[f.id] || 0
      const pct = r1(kcal / total * 100)
      let verdict = 'sans_cible'
      if (f.min != null) {
        if (pct < f.min) verdict = 'bas'
        else if (pct > f.max) verdict = 'haut'
        else verdict = 'ok'
      }
      return { id: f.id, label: f.label, why: f.why, min: f.min, max: f.max, kcal: Math.round(kcal), kcalJour: Math.round(kcal / joursNotes), pct, verdict }
    })
    .filter((x) => x.kcal > 0 || x.min != null)
    .sort((a, b) => b.pct - a.pct)

  const nonClasse = items.find((x) => x.id === 'autre')
  return { days: joursNotes, total: Math.round(total), kcalJour: Math.round(total / joursNotes), items, unknownPct: nonClasse ? nonClasse.pct : 0 }
}

// Les écarts qui méritent d'être dits, du plus parlant au moins parlant.
//
// Seules les familles franchement hors fourchette sont commentées : signaler
// chaque point d'écart noierait ce qui compte sous du bruit.
export const ECART_MIN_PCT = 2

export function familyAdvice(breakdown) {
  if (!breakdown) return []
  const out = []
  for (const it of breakdown.items) {
    if (it.min == null || it.verdict === 'ok') continue
    const manque = it.verdict === 'bas' ? r1(it.min - it.pct) : r1(it.pct - it.max)
    if (manque < ECART_MIN_PCT) continue
    const cible = `${it.min}–${it.max} %`
    if (it.verdict === 'bas') {
      out.push({ id: it.id, level: 'bas', gap: manque,
        text: `${it.label} : ${fr(it.pct)} % de tes calories, contre ${cible} attendus. ${it.why}` })
    } else {
      out.push({ id: it.id, level: 'haut', gap: manque,
        text: `${it.label} : ${fr(it.pct)} % de tes calories, contre ${cible} attendus. ${it.why}` })
    }
  }
  out.sort((a, b) => b.gap - a.gap)
  // Une part non classée importante rendrait les pourcentages trompeurs :
  // mieux vaut le dire que laisser conclure sur une base incomplète.
  if (breakdown.unknownPct >= 15) {
    out.push({ id: 'autre', level: 'info', gap: 0,
      text: `${fr(breakdown.unknownPct)} % de tes calories n’ont pas pu être rattachées à une famille : les parts ci-dessus sont à lire avec cette réserve.` })
  }
  return out
}
