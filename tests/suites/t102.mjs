// Arcade 8 bits : XP et niveaux recalcules depuis les donnees, moments
// forts, chiffres qui roulent, jauges a crans, mise en scene le premier
// passage du jour, sons coupes par defaut.
import '../harness/browser-env.mjs'
import { readFileSync } from 'node:fs'
import { __render, __reset } from '../harness/react-stub4.mjs'
import { xpDetail, xpRenfo, xpTotal, niveau, recordsBattus, gains, BAREME, PALIER } from '../../src/features/home/xpIntel.js'
import { Score, Jauge, modeAnim, C } from '../../src/features/health/kit.jsx'
import { sonsActifs, reglerSons } from '../../src/features/home/sons8bits.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-22'

// ─── Records battus : la premiere fois ne compte pas ───
const muscu = (date, charge) => ({ id: date, date, sport: 'muscu', statut: 'realise', duree: '1 h', data: {}, exercises: [{ name: 'Squat', sets: [{ charge, reps: 5 }, { charge: charge - 10, reps: 8 }] }] })
const seances = [muscu('2026-09-01', 80), muscu('2026-09-08', 85), muscu('2026-09-15', 85), muscu('2026-09-22', 90),
  { id: 'p1', date: '2026-09-10', sport: 'perche', statut: 'realise', duree: '1 h', data: { hauteur: '3.20' } },
  { id: 'p2', date: '2026-09-20', sport: 'perche', statut: 'realise', duree: '1 h', data: { hauteur: '3.40' } },
  { id: 'x', date: '2026-10-01', sport: 'muscu', statut: 'planifie', duree: '1 h', exercises: [{ name: 'Squat', sets: [{ charge: 200 }] }] }]
a(recordsBattus({ planningSessions: seances }) === 3, 'records : 85 puis 90 au squat, 3,40 a la perche (le premier passage et l egalite ne comptent pas, le planifie non plus)')

// ─── Detail et total ───
const sleepLog = {}
for (let k = 0; k < 6; k++) sleepLog[decaler(J, -k)] = { hours: k < 4 ? 9 : 5 }
const hydroLog = { [J]: [{ ml: 3000 }], [decaler(J, -1)]: [{ ml: 500 }] }
const db = { planningSessions: seances, sleepLog, hydroLog, customGoals: [{ id: 'g1', done: true }, { id: 'g2', done: false }], profilePhys: { poids: 70 } }
const d = xpDetail(db)
a(d.seance === 6 && d.nuit === 4 && d.eau === 1 && d.objectif === 1 && d.record === 3, 'detail : 6 seances realisees, 4 nuits completes, 1 jour d eau, 1 objectif, 3 records (' + JSON.stringify(d) + ')')
const total = 6 * 50 + 4 * 20 + 10 + 30 + 3 * 100
a(xpTotal(d) === total && BAREME.seance === 50 && BAREME.record === 100, 'total : ' + total + ' XP au bareme annonce')
const n = xpRenfo(db)
a(n.niveau === 1 && n.dansNiveau === total && n.palier === PALIER && PALIER === 1000, 'niveau 1, ' + n.dansNiveau + '/1000')
a(niveau(2450).niveau === 3 && niveau(2450).dansNiveau === 450, 'un niveau tous les 1 000 XP')
a(xpRenfo({}).total === 0 && xpRenfo({}).niveau === 1, 'sans donnees : niveau 1, 0 XP')

// ─── Moments forts ───
a(gains(null, d) === null, 'premier passage : rien a feter, on note seulement')
a(gains(d, d) === null, 'rien de neuf : pas de bandeau')
const g = gains(d, { ...d, seance: d.seance + 1, eau: d.eau + 1 })
a(g.titre === 'STAGE CLEAR' && g.xp === 60 && g.plus.seance === 1 && g.plus.eau === 1 && g.levelUp === null, 'seance + eau : STAGE CLEAR, +60 XP')
const r = gains(d, { ...d, record: d.record + 1, seance: d.seance + 1 })
a(r.titre === 'NEW RECORD' && r.xp === 150, 'record : le plus marquant passe en tete (NEW RECORD, +150)')
const presque = { seance: 19, nuit: 0, eau: 0, objectif: 0, record: 0 }
const lv = gains(presque, { ...presque, seance: 20 })
a(lv.levelUp === 2, '950 -> 1000 XP : LEVEL UP niveau 2')
a(gains({ ...d, seance: d.seance + 1 }, d) === null, 'une seance supprimee ne fete rien (et retire ses points)')

// ─── Mise en scene : complete la premiere fois du jour, courte ensuite ───
localStorage.clear()
a(modeAnim('accueil', J) === 'long' && modeAnim('accueil', J) === 'court' && modeAnim('progres', J) === 'long', 'premier passage du jour : complet ; ensuite court ; par ecran')
a(modeAnim('accueil', decaler(J, 1)) === 'long', 'le lendemain, de nouveau complet')
const mm = globalThis.matchMedia
globalThis.matchMedia = () => ({ matches: true })
a(modeAnim('coeur', J) === 'aucun', 'le telephone demande moins d animations : rien ne bouge')
globalThis.matchMedia = mm

// ─── Score et jauge ───
__reset()
const s = __render('s', Score, { valeur: 720, anim: 'long' })
a(s.children[0] === '720' && s.props['aria-label'] === '720', 'sans affichage (banc) : la valeur finale directement, lisible par le lecteur d ecran')
const s2 = __render('s2', Score, { valeur: 1.3, rendu: (x) => x.toFixed(1).replace('.', ','), anim: 'aucun' })
a(s2.children[0] === '1,3', 'mise en forme conservee (virgule)')
const j = __render('j', Jauge, { valeur: 0.43, crans: 10, couleur: 'red', anim: 'long', label: 'Eau' })
const cases = j.children
a(cases.length === 10 && cases.filter((c) => c.props.style.background === 'red').length === 4, 'jauge : 10 cases, 4 allumees pour 43 %')
a(cases[3].props.className === 'cran-allume' && cases[3].props.style.animationDelay === '165ms' && cases[4].props.className === undefined, 'les cases s allument une a une (55 ms d ecart en mise en scene complete)')
a(j.props.role === 'meter' && j.props['aria-valuenow'] === 43, 'jauge lisible : role meter, 43 %')
const j2 = __render('j2', Jauge, { valeur: 0.01, crans: 10 })
a(j2.children.filter((c) => c.props.style.background !== C.surface2).length === 1, 'un debut de progres allume deja une case')
const j3 = __render('j3', Jauge, { valeur: 1.4, crans: 8, anim: 'court' })
a(/bandeauClignote/.test(j3.children[7].props.style.animation || ''), 'au-dela de la cible, la derniere case clignote')
a(cases.every((c) => !c.props.style.borderRadius), 'cases a angles vifs')

// ─── Sons : coupes par defaut ───
localStorage.clear()
a(sonsActifs() === false, 'sons coupes tant qu on ne les active pas')
reglerSons(true)
a(sonsActifs() === true, 'actives dans Profil, retenus sur l appareil')

// ─── Feuille de style et police ───
const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8')
a(/--f-pixel: "Press Start 2P"/.test(css) && /@keyframes scoreFige/.test(css) && /@keyframes jaugeCran/.test(css) && /@keyframes bandeauClignote/.test(css) && /@keyframes xpMonte/.test(css), 'police pixel et animations arcade declarees')
a(/\.score-fige \{ animation: scoreFige [^;]*steps\(1, end\) 2;/.test(css), 'le score se fige en clignotant deux fois, par crans')
const main = readFileSync(new URL('../../src/main.jsx', import.meta.url), 'utf8')
a(main.includes("@fontsource/press-start-2p/latin-400"), 'la police pixel est embarquee (pas chargee d un tiers)')
const app = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8')
a(/<MomentsForts userId=\{userId\} \/>/.test(app), 'les moments forts veillent sur tout le site')
const mf = readFileSync(new URL('../../src/features/home/MomentsForts.jsx', import.meta.url), 'utf8')
a(/className: 'ecran'/.test(mf) && /role: 'status'/.test(mf), 'bandeau : ecran sombre de borne, annonce au lecteur d ecran')
console.log('\nALL PASS')
