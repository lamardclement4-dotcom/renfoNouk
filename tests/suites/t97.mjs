// Coeur : FC au repos (tendance, semaine), VFC (zone), FC max, zones de
// Karvonen, VO2max estimee, FC des seances, bilan.
import { serie, sourceRepos, tendanceRepos, zoneVfc, fcMax, zonesKarvonen, zoneDe, vo2Estime, seancesFc, bilanCoeur } from '../../src/features/health/coeurIntel.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-17'

// FC au repos qui baisse de 60 a 54 bpm sur 90 jours (montre)
const vit = {}
for (let k = 0; k < 90; k++) vit[decaler(J, -k)] = { restingHr: Math.round(54 + 6 * k / 89) }
const db = { vitalsLog: vit, sleepLog: { [J]: { pouls: 52 } }, profilePhys: { age: 30 }, planningSessions: [] }
a(sourceRepos(db, J) === 'sante', 'la montre (mesure quotidienne) l emporte sur le pouls saisi')
const t = tendanceRepos(db, J)
a(t.pente <= -1.5 && t.pente >= -2.5 && /baisse, ton cœur s’entraîne/.test(t.texte), 'pente : environ -2 bpm par mois, dite en clair (' + t.pente + ')')
a(t.m7 < t.m30 && t.derniere.v === 54, 'semaine sous la moyenne du mois, derniere valeur')

// Semaine fatiguee : +5 bpm
const vit2 = {}
for (let k = 0; k < 40; k++) vit2[decaler(J, -k)] = { restingHr: k < 7 ? 57 : 52 }
const t2 = tendanceRepos({ vitalsLog: vit2 }, J)
a(t2.ecart7 >= 3 && /récupération incomplète/.test(t2.texte), 'semaine au-dessus de la normale : signalee (' + t2.ecart7 + ')')
a(tendanceRepos({}, J) === null, 'aucune mesure : rien')

// Pouls saisi seul
const r = { sleepLog: {} }
for (let k = 0; k < 10; k++) r.sleepLog[decaler(J, -k)] = { pouls: 50 + (k % 3) }
a(sourceRepos(r, J) === 'reveil' && tendanceRepos(r, J).m7 != null && serie(r, J, 'reveil', 30).length === 10, 'pouls au reveil saisi : serie propre')

// VFC : zone habituelle et semaine basse
const hv = {}
for (let k = 0; k < 30; k++) hv[decaler(J, -k)] = { hrv: k < 4 ? 30 : 50 + (k % 5) - 2 }
const v = zoneVfc({ vitalsLog: hv }, J)
a(v.statut === 'sous' && v.joursSous === 4 && /sous ta zone habituelle/.test(v.texte), 'VFC basse 4 jours de suite : semaine sous la zone (' + v.m7 + ' ms, zone ' + v.bas + '–' + v.haut + ')')
a(zoneVfc({ vitalsLog: { [J]: { hrv: 40 } } }, J).statut === null, 'moins de 10 mesures : pas de verdict')

// FC max : saisie > seances > age
a(fcMax({ profilePhys: { fcMax: 192, age: 30 } }, J).valeur === 192 && fcMax({ profilePhys: { fcMax: 192 } }, J).source === 'saisie', 'FC max saisie prioritaire')
const seances = [{ statut: 'realise', date: decaler(J, -20), data: { fc_max: 188, fc: 150 }, sport: 'course', duree: '1 h' }, { statut: 'realise', date: decaler(J, -3), data: { fc: 142 }, sport: 'velo', duree: '1 h 30' }, { statut: 'planifie', date: J, data: { fc_max: 210 } }]
a(fcMax({ profilePhys: { age: 30 }, planningSessions: seances }, J).valeur === 188, 'sinon la plus haute relevee en seance')
a(fcMax({ profilePhys: { age: 30 } }, J).valeur === 187 && fcMax({ profilePhys: { age: 30 } }, J).source === 'age', 'sinon Tanaka : 208 - 0,7 x 30 = 187')
a(fcMax({}, J) === null, 'rien de connu : pas de FC max inventee')

// Zones de Karvonen et VO2max
const z = zonesKarvonen(190, 50)
a(z.length === 5 && z[0].min === 120 && z[1].min === 134 && z[3].max === 176 && z[4].max === 190, 'zones : repos + % de la reserve (Z1 120–134, Z4 jusqu a 176)')
a(zoneDe(150, z) === 3 && zoneDe(100, z) === 0 && zoneDe(195, z) === 5, 'zone d une FC')
a(zonesKarvonen(100, 80) === null, 'reserve trop faible : pas de zones')
a(vo2Estime(190, 50) === 58 && vo2Estime(190, 0) === null, 'VO2max estimee (Uth) : 15,3 x 190 / 50 = 58')

// FC des seances
const sf = seancesFc({ planningSessions: seances }, J, 8, z, 190)
a(sf.length === 2 && sf[0].sport === 'Vélo / cyclisme' && sf[0].fc === 142 && sf[0].zone === 2 && sf[0].pct === 75 && sf[0].mins === 90, 'seances avec FC : plus recente d abord, zone et % de la FC max')

// Bilan
const bilan = bilanCoeur({ vitalsLog: Object.fromEntries(Object.entries(vit2).map(([d, x]) => [d, { ...x, hrv: hv[d] ? hv[d].hrv : 50 }])) }, J)
a(bilan.niveau === 'incomplete' && bilan.alertes.length >= 2, 'FC haute et VFC basse : recuperation incomplete (' + bilan.alertes.join(' | ') + ')')
a(bilanCoeur(db, J).niveau === 'bonne', 'tendance qui baisse, rien d anormal : bonne')
a(bilanCoeur({}, J).niveau === null, 'sans mesure : pas de bilan')
console.log('\nALL PASS')
