// Chaque ecran est rendu pour de vrai, base vide puis base fournie. Un ecran
// mort — variable non declaree, lecture sur un objet absent, appel qui leve —
// echoue ici. L ecran Progres l a ete pendant cinq commits sans que rien ne le
// signale : ni la compilation, ni les tests d unite.
import '../harness/browser-env.mjs'
import { __render, __reset, __setState } from '../harness/react-stub4.mjs'
import { __setDb } from '../harness/store-hook-stub.mjs'
import { RICH } from './t50fixture.mjs'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

const SCREENS = [
  ['Accueil', '../../src/features/home/AccueilSpace.jsx'],
  ['Sante', '../../src/features/health/HealthHome.jsx'],
  ['Sommeil', '../../src/features/health/Sleep.jsx'],
  ['Cycle', '../../src/features/health/Cycle.jsx'],
  ['Prevention', '../../src/features/health/Prevention.jsx'],
  ['Respiration', '../../src/features/health/Breathing.jsx'],
  ['Complements', '../../src/features/health/Complements.jsx'],
  ['Hydratation', '../../src/features/hydration/Hydration.jsx'],
  ['Nutrition', '../../src/features/nutrition/Nutrition.jsx'],
  ['Tests physiques', '../../src/features/physical-tests/PhysicalTests.jsx'],
  ['Profil', '../../src/features/profil/ProfilSpace.jsx'],
  ['Poids', '../../src/features/profil/WeightSpace.jsx'],
  ['Progres', '../../src/features/progress/ProgressSpace.jsx'],
  ['Records', '../../src/features/progress/RecordsSpace.jsx'],
  ['Coach', '../../src/features/train/CoachSpace.jsx'],
  ['Planning', '../../src/features/train/PlannerSpace.jsx'],
  ['Entrainement', '../../src/features/train/TrainSpace.jsx'],
  ['Recuperation', '../../src/features/train/RecoverySpace.jsx'],
  ['Meteo', '../../src/features/train/WeatherSpace.jsx'],
  ['Pliometrie', '../../src/features/train/PliometrieSpace.jsx'],
  ['Test mobilite', '../../src/features/train/MobilityTest.jsx'],
  ['Catalogue mobilite', '../../src/features/train/MobilityCatalog.jsx'],
  ['Catalogue renfo', '../../src/features/train/RenfoCatalog.jsx'],
  ['Programme', '../../src/features/train/ProgramView.jsx'],
  ['Import d activite', '../../src/features/train/ActivityImport.jsx'],
  ['Routines', '../../src/features/train/RoutinesSpace.jsx'],
]

// Certains ecrans recoivent db et store en props, d autres passent par le hook :
// on fournit les deux formes.
import { buildDb } from '../harness/store-hook-stub.mjs'
const noop = () => {}
const mkProps = (raw) => {
  const { cycle, goals, sensitiveZones, dayRows, ...phys } = raw || {}
  const db = buildDb(phys, cycle || {}, goals || {}, sensitiveZones || [], dayRows || {}, '2026-06-15')
  const store = new Proxy({ get: () => db, set: noop, ensureDay: noop },
    { get: (t, k) => (k in t ? t[k] : noop) })
  return { userId: 'u1', db, store, onClose: noop, onBack: noop, onDone: noop,
    onSelect: noop, onProgram: noop, onOpen: noop, embedded: false }
}
let n = 0
for (const [label, path] of SCREENS) {
  const mod = await import(path)
  const Comp = mod.default
  a(typeof Comp === 'function', label + ' : composant exporte')
  for (const [what, db] of [['base vide', {}], ['base fournie', RICH]]) {
    __reset(); __setDb(db)
    try { __render('s' + (n++), Comp, mkProps(db)) } catch (e) {
      throw new Error('FAIL: ' + label + ' leve sur ' + what + ' -> ' + e.message
        + '\n   ' + (e.stack || '').split('\n').slice(1, 3).join('\n   '))
    }
  }
  a(true, label + ' : rendu sur base vide et base fournie')
}

// L ecran Meteo propose desormais le releve par ville ; la saisie manuelle
// reste disponible, elle seule sert en salle.
const text = (n) => { if (n == null || n === false) return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n) + ' '
  if (Array.isArray(n)) return n.map(text).join('')
  return text(n.children) }
const meteo = (await import('../../src/features/train/WeatherSpace.jsx')).default
__reset(); __setDb({})
const mt = text(__render('meteo', meteo, mkProps({})))
a(/Conditions/.test(mt), 'la carte Conditions est la')
a(/Entre ta ville/.test(mt), 'et la ville se saisit dedans, au-dessus des champs qu elle remplit')
a(/Chercher/.test(mt), 'avec son bouton de recherche')
a(/Importer une capture m[ée]t[ée]o/.test(mt), "l import de capture reste disponible")
a(mt.indexOf('Entre ta ville') < mt.indexOf('Temp'), 'le releve precede les champs qu il remplit')

// Sur un jour passe, le releve annonce la date visee plutot que le jour meme.
const PLACE = { id: '1', name: 'Grenoble', region: 'Auvergne-Rhône-Alpes', country: 'France', lat: 45.19, lon: 5.72, elevation: 212 }
__reset(); __setDb({ weatherPlace: PLACE })
const mt2 = text(__render('meteo2', meteo, mkProps({ weatherPlace: PLACE })))
a(/Relever à/.test(mt2) && /Grenoble/.test(mt2), 'la derniere ville est rappelee : un appui suffit')

// Le champ ville doit rester visible dans TOUS les environnements : il ne
// l etait qu en exterieur, et il disparaissait sans un mot des qu on
// choisissait la salle — on le cherchait alors sans le trouver.
const { ENVIRONMENTS } = await import('../../src/features/train/weatherIntel.js')
for (const e of ENVIRONMENTS) {
  __reset(); __setDb({ weatherLog: { [new Date().toISOString().slice(0, 10)]: { environment: e.id } } })
  const out = text(__render('meteo-' + e.id, meteo, mkProps({ weatherLog: { [new Date().toISOString().slice(0, 10)]: { environment: e.id } } })))
  a(/Entre ta ville/.test(out), `${e.label} : le champ ville est visible`)
  a(/Chercher/.test(out), `${e.label} : et son bouton aussi`)
}



// L ecran d import propose les deux entrees, et n enregistre rien avant
// d avoir montre ce qu il a compris.
const imp = (await import('../../src/features/train/ActivityImport.jsx')).default
__reset(); __setDb({})
const it = text(__render('imp', imp, mkProps({})))
a(/Fichier d.activit/.test(it), 'entree fichier de trace')
a(/GPX ou TCX/.test(it), 'formats annonces')
a(/Strava/.test(it) && /Garmin/.test(it), 'les services courants sont nommes')
a(/Capture d.[ée]cran/.test(it), 'entree capture d ecran')
a(/n.est envoy[ée]e nulle part/.test(it), "et il est dit que l image ne quitte pas l appareil")
a(!/Enregistrer la s[ée]ance/.test(it), "rien n est enregistrable avant d avoir lu quelque chose")
a(/Export Apple Sant[ée]/.test(it), "l export Apple Sante est propose : seule voie automatique sur iPhone")
a(/Sommeil, s[ée]ances, pas/.test(it), 'et ce qu il apporte est dit')
a(/Exporter toutes les donn[ée]es/.test(it), 'avec le chemin exact dans l application Sante')
a(/export\.xml/.test(it), "et le fichier a choisir apres decompression")

// L ecran Nutrition : l editeur d objectifs doit etre dans l onglet « Macros »,
// la ou on le cherche. Il vivait derriere un petit bouton de l onglet Journal,
// et on ne le trouvait pas.
const { MacrosTab } = await import('../../src/features/nutrition/Nutrition.jsx')
for (const [lab, db, attendu] of [
  ['sans objectif', {}, /D[ée]finir mes objectifs/],
  // `foodTargets` vit sous `phys.nutrition`, pas a la racine : c est le store
  // qui l y range.
  ['avec objectif', { nutrition: { foodTargets: { kcal: 2400, prot: 150, gluc: 260, lip: 80, fib: 30 } } }, /Modifier/],
]) {
  __reset(); __setDb(db)
  const props = { ...mkProps(db), body: { poids: 75, taille: 180, age: 30 }, setBody: () => {} }
  const s = text(__render('macrostab-' + lab, MacrosTab, props))
  a(/Mes objectifs/.test(s), `${lab} : le bloc « Mes objectifs » est en tete de l onglet Macros`)
  a(attendu.test(s), `${lab} : et son bouton`)
}
// L objectif enregistre est relu, avec sa lecture par kilo.
__reset()
const avecJours = { nutrition: { foodTargets: { kcal: 2400, prot: 150, gluc: 260, lip: 80, fib: 30, days: { repos: { gluc: 195 }, normal: { gluc: 260 }, gros: { gluc: 351 } } } } }
__setDb(avecJours)
const st = text(__render('macrostab-jours', MacrosTab, { ...mkProps(avecJours), body: { poids: 75 }, setBody: () => {} }))
// L extracteur ajoute une espace apres chaque noeud : « 2400 » et « kcal »
// arrivent separes.
a(/2400\s+kcal/.test(st), 'les calories visees sont rappelees')
a(/2\s+g\/kg de prot[ée]ines/.test(st), '150 g pour 75 kg, soit 2 g/kg')
a(/195\s+g au repos/.test(st) && /351\s+g sur grosse s[ée]ance/.test(st), 'et la modulation des glucides selon le jour')


// Les lectures approfondies doivent apparaitre dans l onglet Macros, pas
// seulement exister dans un module.
const jours = {}
const sess = []
// Les dates sont relatives a aujourd hui, jamais figees. MacrosTab appelle
// macroDeepAnalysis sans lui passer de date : l analyse travaille donc sur la
// fenetre des quatorze derniers jours reels. Un jeu d essai fige au 21 aout
// 2026 passait le jour ou il a ete ecrit, puis a echoue tout seul quelques
// semaines plus tard, quand la fenetre avait glisse au-dela — sans qu aucune
// ligne de l application n ait change.
const base = Date.now()
for (let i = 1; i <= 20; i++) {
  const gros = i % 3 === 0
  const d = new Date(base); d.setUTCDate(d.getUTCDate() - i)
  const iso = d.toISOString().slice(0, 10)
  jours[iso] = [
    { n: 'a', meal: 'matin', k: 300, p: 8, g: 40, l: 8, fib: 3 },
    { n: 'b', meal: 'midi', k: 700, p: 25, g: 90, l: 20, fib: 5 },
    { n: 'c', meal: 'soir', k: gros ? 900 : 1100, p: 100, g: gros ? 90 : 140, l: 30, fib: 6 },
  ]
  if (gros) sess.push({ id: 's' + i, date: iso, sport: 'course', statut: 'realise', duree: '2 h', data: { rpe: 7 } })
}
const dbDeep = { dayRows: {}, planningSessions: sess, nutrition: { foodTargets: { kcal: 2200, prot: 140, gluc: 250, lip: 60, fib: 30 } } }
for (const [d, items] of Object.entries(jours)) dbDeep.dayRows[d] = { food: items }
__reset(); __setDb(dbDeep)
const deepTxt = text(__render('macrostab-deep', MacrosTab, { ...mkProps(dbDeep), body: { poids: 75, taille: 180, age: 30 }, setBody: () => {} }))
a(/R[ée]partition de tes prot[ée]ines/.test(deepTxt), 'la repartition des proteines est affichee')
a(/Petit-d[ée]jeuner/.test(deepTxt) && /D[îi]ner/.test(deepTxt), 'prise par prise')
a(/Glucides et charge/.test(deepTxt), 'et la modulation des glucides selon la charge')
a(!/undefined|NaN/.test(deepTxt), 'aucune valeur malformee a l ecran')

// La repartition par famille : la strate sous les macros. Elle doit
// APPARAITRE, pas seulement se calculer — c est tout l interet d une
// proportion ideale qu on peut comparer a la sienne.
a(/D.o[uù] viennent tes calories/.test(deepTxt), 'la repartition par famille est affichee')
a(/F[ée]culents/.test(deepTxt), 'avec les feculents nommes')
a(/journ[ée]e/.test(deepTxt), 'et la fenetre sur laquelle elle porte')
a(/%/.test(deepTxt), 'les parts sont en pourcentage, comme pour les lipides')


// La retrospective detaillee doit s afficher, pas seulement se calculer.
const prog = (await import('../../src/features/progress/ProgressSpace.jsx')).default
const lundi = (() => { const d = new Date(); const j = (d.getDay() + 6) % 7; d.setDate(d.getDate() - j); return d })()
const jourISO = (i) => { const d = new Date(lundi); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10) }
const retroDb = { planningSessions: [], sleepLog: {}, dayRows: {}, weatherLog: {}, profilePhys: { poids: 75 } }
for (let i = 0; i < 5; i++) {
  retroDb.planningSessions.push({ id: 'r' + i, date: jourISO(i), sport: 'course', statut: 'realise', duree: i === 2 ? '2 h' : '1 h', data: { rpe: 6 } })
  retroDb.sleepLog[jourISO(i)] = { hours: 6.5 }
  retroDb.dayRows[jourISO(i)] = { food: [{ n: 'r', meal: 'midi', k: 2000, p: 100, g: 220, l: 60, fib: 20 }] }
}
__reset(); __setDb(retroDb)
const rt = text(__render('progres-retro', prog, mkProps(retroDb)))
a(/Jour par jour/.test(rt), 'la semaine est detaillee jour par jour')
a(/[ÀA] retenir/.test(rt), 'et se termine par ce qu il faut retenir')
a(!/undefined|NaN/.test(rt), 'aucune valeur malformee dans la retrospective')
// La retrospective existante reste entiere : les consignes s ajoutent, elles
// ne remplacent rien.
a(/s[ée]ances? sur/.test(rt) || /points de charge/.test(rt), 'le recit de la semaine est toujours la')
a(/Jour par jour/.test(rt), 'le detail jour par jour aussi')
a(/Pour la semaine qui vient/.test(rt), 'la retrospective debouche sur des consignes')
a(/Chaque consigne est tir[ée]e de la semaine [ée]coul[ée]e/.test(rt), 'et dit d ou elle sort')
// Avec assez d historique, la semaine proposee s affiche jour par jour.
for (let k = 1; k <= 8; k++) {
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi); d.setDate(d.getDate() - 7 * k + i)
    const iso = d.toISOString().slice(0, 10)
    retroDb.sleepLog[iso] = { hours: 7 }
    retroDb.dayRows[iso] = { food: [{ n: 'r', meal: 'midi', k: 2300, p: 120, g: 250, l: 65, fib: 20 }] }
    if ([0, 2, 4].includes(i)) retroDb.planningSessions.push({ id: 'p' + k + i, date: iso, sport: 'course', statut: 'realise', duree: '1 h', data: { rpe: 6 } })
  }
}
__reset(); __setDb(retroDb)
const rt2 = text(__render('progres-proposal', prog, mkProps(retroDb)))
a(/Ta semaine propos[ée]e/.test(rt2), 'la semaine proposee s affiche')
a(/Lundi/.test(rt2) && /Dimanche/.test(rt2), 'jour par jour, du lundi au dimanche')
a(/RPE/.test(rt2), 'avec l intensite de chaque seance')
a(!/undefined|NaN/.test(rt2), 'aucune valeur malformee')
a(/Inscrire ces/.test(rt2), 'la proposition est actionnable : un bouton l inscrit au planning')


// Les routines doivent se voir a l accueil, comme une seance planifiee :
// une routine qu on oublie ne sert a rien.
const { makeRoutine, movementsFor } = await import('../../src/features/train/routines.js')
const accueil = (await import('../../src/features/home/AccueilSpace.jsx')).default
const mobKeys = movementsFor('mobilite').slice(0, 3).map((m) => m.key)
const todayDow = (new Date().getDay() + 6) % 7
const routineDuJour = makeRoutine({ kind: 'mobilite', name: 'Réveil hanches', keys: mobKeys, dows: [todayDow] })
__reset(); __setDb({ routines: [routineDuJour] })
const at = text(__render('accueil-routines', accueil, mkProps({ routines: [routineDuJour] })))
a(/R[ée]veil hanches/.test(at), "la routine du jour apparait a l accueil")
a(/Mobilit[ée]/.test(at), 'avec son type')
a(!/undefined|NaN/.test(at), 'aucune valeur malformee')
// Une routine n est pas une seance planifiee : elle a son propre bloc.
a(/Tes routines du jour/.test(at), 'les routines ont leur propre titre a l accueil')
a(/1 [àa] faire/.test(at), 'avec le compte de ce qui reste')
// Un autre jour, elle ne se rappelle pas.
const autre = makeRoutine({ kind: 'mobilite', name: 'Ailleurs', keys: mobKeys, dows: [(todayDow + 3) % 7] })
__reset(); __setDb({ routines: [autre] })
a(!/Ailleurs/.test(text(__render('accueil-autre', accueil, mkProps({ routines: [autre] })))), "une routine d un autre jour ne s affiche pas")


// Mobilite et pliometrie ne se rangent pas ensemble.
const routinesEcran = (await import('../../src/features/train/RoutinesSpace.jsx')).default
const deux = [
  makeRoutine({ kind: 'mobilite', name: 'Hanches', keys: mobKeys, dows: [0] }),
  makeRoutine({ kind: 'pliometrie', name: 'Bondissements', keys: movementsFor('pliometrie').slice(0, 2).map((m) => m.key), dows: [2] }),
]
__reset(); __setDb({ routines: deux })
const rs = text(__render('routines-ecran', routinesEcran, { ...mkProps({ routines: deux }), onPlay: () => {} }))
a(/Mobilit[ée]/.test(rs) && /Pliom[ée]trie/.test(rs), 'les deux familles ont leur en-tete')
a(rs.indexOf('Hanches') !== -1 && rs.indexOf('Bondissements') !== -1, 'et chacune sa routine')
a(rs.indexOf('Mobilit') < rs.indexOf('Hanches'), 'la routine de mobilite est rangee sous son en-tete')
a(rs.indexOf('Pliom') < rs.indexOf('Bondissements'), 'celle de pliometrie sous le sien')
a(/Niveau\s+1\s*\//.test(rs), 'les echelles toutes faites sont proposees a cote')
a(/Copier/.test(rs) && /Lancer/.test(rs), 'chacune se lance ou se copie')
a(/Combien de temps as-tu/.test(rs), 'la duree se choisit avant de lancer')
a(/10\s+min/.test(rs) && /15\s+min/.test(rs) && /20\s+min/.test(rs), 'les durees proposees sont la')
a(/Compl[èe]te/.test(rs), 'et l option « telle qu elle est composee »')

// Les recommandations personnalisees doivent s afficher, avec leur raison.
const profilDb = {
  routines: deux,
  mobility: { zones: [{ id: 'chevilles', val: 1 }, { id: 'hanches', val: 2 }] },
  sensitiveZones: ['dos'],
  painEpisodes: [{ start: '2026-08-15', region: 'cheville' }],
}
__reset(); __setDb(profilDb)
const rp = text(__render('routines-reco', routinesEcran, { ...mkProps(profilDb), onPlay: () => {} }))
a(/Pour toi aujourd.hui/.test(rp), 'le bloc personnalise est la')
a(/Propos[ée]e parce que/.test(rp), 'chaque proposition dit pourquoi')
a(/Chevilles et pieds/.test(rp), 'la famille qui traite la douleur est proposee')
a(/[ÉE]cart[ée]e tant que cette douleur dure/.test(rp), 'et la pliometrie est ecartee, en le disant')
a(!/undefined|NaN/.test(rp), 'aucune valeur malformee')
// Une famille vide le dit, plutot que de disparaitre.
__reset(); __setDb({ routines: [deux[0]] })
const rs2 = text(__render('routines-une', routinesEcran, { ...mkProps({ routines: [deux[0]] }), onPlay: () => {} }))
// Une famille sans routine composee ne montre plus un message d absence : elle
// propose son echelle toute faite, ce qui vaut mieux qu un vide.
a(/Appuis et ressort/.test(rs2), 'la famille vide propose son echelle')
a(/Niveau\s+1\s*\/\s*5/.test(rs2), 'au premier niveau')
a(/Appuis courts/.test(rs2), 'avec le nom du niveau')

// L import d une capture de plat doit se VOIR, pas seulement exister. Le
// bouton « + Aliment personnalise » voisin, lui, est cache derriere
// « aucun resultat » : on ne le trouve qu en cherchant un aliment absent.
// Deux fonctionnalites livrees ont deja ete invisibles faute de ce controle.
const { FoodTab } = await import('../../src/features/nutrition/Nutrition.jsx')
__reset(); __setDb({})
const foodProps = { ...mkProps({}), db: buildDb({}, {}, {}, [], {}, '2026-06-15') }
__render('foodtab', FoodTab, foodProps)
// index 1 = le hook `mode` de FoodTab (date, mode, q, ...)
__setState('foodtab', 1, 'search')
const ft = text(__render('foodtab', FoodTab, foodProps))
a(/Importer une capture/.test(ft), 'l import d une capture est visible des l ouverture de la recherche')
a(/envoy[ée]e nulle part/.test(ft), 'et il est dit que l image ne quitte pas l appareil')
a(/[EÉ]tiquette/.test(ft), 'le type de capture attendu est annonce')
// La recherche vide renvoie des resultats : si le bouton apparait quand meme,
// c est qu il n est pas enferme dans la branche « aucun resultat ».
a(/Tous les aliments/.test(ft), 'la liste est bien peuplee dans ce rendu')

// Les calories bues comptent dans la journee. Elles l etaient deja partout
// ailleurs — retrospective, macros, familles passent par dayEntries — mais
// le total affiche dans le Journal lisait foodLog seul. L ecran contredisait
// ses propres analyses.
const auj = new Date().toISOString().slice(0, 10)
const dbBoisson = { dayRows: { [auj]: {
  food: [{ id: 'f1', n: 'Riz blanc cuit', grams: 200, meal: 'midi',
    per: { k: 130, p: 2.5, g: 28, l: 0.3, fib: 0.4 }, k: 260, p: 5, g: 56, l: 0.6, fib: 0.8 }],
  hydration: [
    { id: 'd1', n: 'Biere blonde, demi', ml: 250, kcal: 101, prot: 0, carb: 8, fat: 0, alc: 9.9, sugar: 8 },
    { id: 'd2', n: 'Eau plate', ml: 500, kcal: 0, prot: 0, carb: 0, fat: 0, alc: 0, sugar: 0 },
  ] } } }
__reset(); __setDb(dbBoisson)
const jt = text(__render('foodtab-boisson', FoodTab, { ...mkProps(dbBoisson), db: mkProps(dbBoisson).db }))
a(/361\s+kcal/.test(jt), 'le total du jour vaut 361 kcal : 260 manges + 101 bus')
a(/Boissons/.test(jt), 'une carte « Boissons » rend le total verifiable')
a(/Biere blonde/.test(jt), 'la boisson calorique y figure')
a(/101\s+kcal/.test(jt), 'avec ses calories')
a(/9,9 g/.test(jt), 'et ses grammes d alcool, a la francaise')
a(/Hydratation/.test(jt), 'en disant d ou elles viennent')
a(!/Eau plate/.test(jt), 'l eau n encombre pas le journal alimentaire : zero calorie, zero ligne')

// Les recettes doivent se VOIR depuis la recherche d aliments : c est de la
// qu on ajoute un repas, pas depuis un menu enfoui.
__reset(); __setDb({})
__render('foodtab-rec', FoodTab, mkProps({}))
__setState('foodtab-rec', 1, 'search')
const recTxt = text(__render('foodtab-rec', FoodTab, mkProps({})))
a(/Mes recettes/.test(recTxt), 'l acces aux recettes est visible des l ouverture de la recherche')
a(/Compose un repas une fois/.test(recTxt), 'et ce qu elles servent est dit quand il n y en a aucune')

// Une recette enregistree remonte en raccourci, sans passer par la liste.
const maRecette = { id: 'r1', n: 'Bowl poulet-quinoa', servings: 2, items: [
  { n: 'Blanc de poulet', grams: 200, per: { k: 165, p: 31, g: 0, l: 3.6, fib: 0 } },
  { n: 'Quinoa cuit', grams: 150, per: { k: 120, p: 4.4, g: 21, l: 1.9, fib: 2.8 } },
] }
const dbMaRecette = { nutrition: { recipes: [maRecette] } }
__reset(); __setDb(dbMaRecette)
__render('foodtab-rec2', FoodTab, mkProps(dbMaRecette))
__setState('foodtab-rec2', 1, 'search')
const recTxt2 = text(__render('foodtab-rec2', FoodTab, mkProps(dbMaRecette)))
a(/Bowl poulet-quinoa/.test(recTxt2), 'la recette enregistree apparait en raccourci')
// L extracteur ajoute une espace apres chaque noeud : « Mes recettes » et
// « (1) » arrivent separes.
a(/Mes recettes\s+\(1\)/.test(recTxt2), 'et leur nombre est annonce')

console.log('\nALL PASS')
