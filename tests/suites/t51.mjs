// Chaque ecran est rendu pour de vrai, base vide puis base fournie. Un ecran
// mort — variable non declaree, lecture sur un objet absent, appel qui leve —
// echoue ici. L ecran Progres l a ete pendant cinq commits sans que rien ne le
// signale : ni la compilation, ni les tests d unite.
import '../harness/browser-env.mjs'
import { __render, __reset } from '../harness/react-stub4.mjs'
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
for (let i = 1; i <= 20; i++) {
  const gros = i % 3 === 0
  const d = new Date(Date.UTC(2026, 7, 21)); d.setUTCDate(d.getUTCDate() - i)
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

console.log('\nALL PASS')
