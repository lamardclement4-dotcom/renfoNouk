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

console.log('\nALL PASS')
