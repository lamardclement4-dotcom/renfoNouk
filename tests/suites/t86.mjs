// Sommeil : sensations au reveil et nuits passees.
import { libelleNuit, nuitsRecentes, nuitsManquantes, reveilDe, resumeReveil, resumeNuit, decaler, ENERGIES } from '../../src/features/health/sommeilReveil.js'
import { recommendations } from '../../src/features/train/renfoIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-09' // un vendredi
a(libelleNuit(J) === 'Nuit du jeu. 8 au ven. 9 oct.', 'libelle : ' + libelleNuit(J))
a(libelleNuit('2026-11-01') === 'Nuit du sam. 31 oct. au dim. 1 nov.', 'a cheval sur deux mois : ' + libelleNuit('2026-11-01'))
a(decaler('2026-03-29', -1) === '2026-03-28' && decaler('2026-10-25', 1) === '2026-10-26', 'changements d heure sans decalage')

const log = { [J]: { hours: 7 }, [decaler(J, -2)]: { hours: 6.5 }, [decaler(J, -3)]: { hours: 0 } }
const n = nuitsRecentes(log, J, 7)
a(n.length === 7 && n[0].titre === 'Cette nuit' && n[1].titre === 'Hier' && n[2].titre === 'mer. 7', 'les 7 dernieres nuits, nommees simplement')
a(n[0].renseignee && !n[1].renseignee && n[2].renseignee && !n[3].renseignee, 'une nuit a 0 h compte comme non renseignee')
a(nuitsManquantes(log, J, 7).length === 5, 'les oublis de la semaine sont listes (5)')

a(reveilDe(null).energie === null && reveilDe({ reveil: 'nawak' }).sensations.length === 0, 'reveil absent ou abime : rien ne casse')
a(reveilDe({ reveil: { energie: 9, sensations: ['groggy', 'inconnu', null] } }).energie === null && reveilDe({ reveil: { energie: 9, sensations: ['groggy', 'inconnu'] } }).sensations.join() === 'groggy', 'valeurs hors bornes et sensations inconnues ecartees')
a(resumeNuit({ reveil: { energie: 4, sensations: ['courbatures'] } }) === 'En forme · Courbatures', 'resume d une nuit lisible')
a(ENERGIES.length === 5, 'cinq niveaux d energie')

const R = (k, energie, sensations = []) => [decaler(J, -k), { hours: 7, reveil: { energie, sensations } }]
const vide = resumeReveil({}, J)
a(vide.nuits === 0 && vide.alertes.length === 0, 'sans reveil note : pas d analyse')
const malade = resumeReveil(Object.fromEntries([R(0, 2, ['malade'])]), J)
a(malade.alertes.some((t) => /rhume/.test(t)), 'fievre ce matin : alerte repos')
const fatigues = resumeReveil(Object.fromEntries([R(0, 2), R(1, 1), R(3, 2), R(4, 4)]), J)
a(fatigues.alertes.some((t) => /fatigués/.test(t)) && fatigues.energieMoy === 2.3, 'reveils fatigues repetes : alerte (energie moyenne 2,3)')
const courb = resumeReveil(Object.fromEntries([R(0, 3, ['courbatures']), R(2, 3, ['courbatures', 'repose']), R(5, 4, ['courbatures'])]), J)
a(courb.alertes.some((t) => /Courbatures/.test(t)) && courb.frequentes[0].id === 'courbatures' && courb.frequentes[0].n === 3, 'courbatures frequentes : alerte, et en tete des sensations')
const bien = resumeReveil(Object.fromEntries([R(0, 5, ['repose', 'motive']), R(1, 4, ['repose'])]), J)
a(bien.alertes.length === 0 && bien.energieMoy === 4.5, 'bons reveils : aucune alerte')
const ancien = resumeReveil(Object.fromEntries([R(3, 2, ['malade'])]), J)
a(!ancien.alertes.some((t) => /rhume/.test(t)), 'une fievre d il y a trois jours n alerte plus aujourd hui')

// L alerte remonte dans les recommandations (accueil, score sante).
const p = (x) => String(x).padStart(2, '0'), d = new Date()
const auj = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
const recos = recommendations({ sleepLog: { [auj]: { hours: 7, reveil: { energie: 1, sensations: ['malade'] } } }, planningSessions: [], weightLog: [] })
const r = recos.find((x) => /rhume/.test(x.text))
a(r && r.level === 'alert' && r.action === 'sleep', 'fievre au reveil : recommandation prioritaire qui ouvre le sommeil')
console.log('\nALL PASS')
