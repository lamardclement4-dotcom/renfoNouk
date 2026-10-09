// Sommeil, deuxieme etage : heures, facteurs de la veille, influences,
// regularite des horaires, forme du jour.
import { minutesDe, hhmm, dureeDepuisHeures, libelleDuree, facteursDe, influences, regulariteHoraires, formeDuJour } from '../../src/features/health/sommeilForme.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-09'

a(minutesDe('23:30') === 1410 && minutesDe('7:05') === 425 && minutesDe('25:00') === null && minutesDe('abc') === null, 'lecture des heures, valeurs absurdes refusees')
a(hhmm(-30) === '23:30' && hhmm(1500) === '01:00', 'heures ramenees sur 24 h')
a(dureeDepuisHeures('23:00', '07:00') === 8 && dureeDepuisHeures('23:00', '07:00', 20) === 7.75, 'coucher 23 h, lever 7 h : 8 h, ou 7 h 45 apres 20 min pour s endormir')
a(dureeDepuisHeures('01:30', '06:00') === 4.5, 'coucher apres minuit')
a(dureeDepuisHeures('07:00', '07:00') === null && dureeDepuisHeures('', '07:00') === null, 'durees incoherentes refusees')
a(libelleDuree(7.25) === '7 h 15' && libelleDuree(8) === '8 h', 'libelle au quart d heure')
a(facteursDe({ facteurs: ['ecrans', 'inconnu', null] }).join() === 'ecrans' && facteursDe(null).length === 0, 'facteurs inconnus ecartes')

// Influences : ecrans = 45 min de moins et energie plus basse
const log = {}
for (let k = 0; k < 12; k++) {
  const ecrans = k % 2 === 0
  log[decaler(J, -k)] = { hours: ecrans ? 6.5 : 7.25, quality: ecrans ? 2 : 4, reveil: { energie: ecrans ? 2 : 4, sensations: [] }, facteurs: ecrans ? ['ecrans'] : (k === 3 ? ['alcool'] : []) }
}
const inf = influences(log, J, 30)
a(inf.length === 1 && inf[0].id === 'ecrans' && inf[0].nefaste, 'seul un facteur assez note et vraiment influent ressort')
a(/45 min de sommeil en moins/.test(inf[0].texte) && /énergie au réveil 2 points plus basse/.test(inf[0].texte) && /6 nuits/.test(inf[0].texte), 'explication chiffree : ' + inf[0].texte)
a(influences({}, J).length === 0, 'sans donnees : rien')

// Regularite des horaires, coucher autour de minuit
const reg = {}
const couchers = ['23:30', '00:15', '23:45', '00:00', '23:50', '00:10']
couchers.forEach((c, k) => { reg[decaler(J, -k)] = { hours: 7, coucher: c, lever: '07:30' } })
const r = regulariteHoraires(reg, J)
a(r && r.coucher === '23:55' && r.ecartCoucher < 20 && r.niveau === 'ok', 'coucher moyen 23:55 malgre le passage de minuit (' + (r && r.coucher) + ', ± ' + (r && r.ecartCoucher) + ' min)')
const irr = {}
;['21:30', '01:30', '23:00', '02:00', '22:00'].forEach((c, k) => { irr[decaler(J, -k)] = { hours: 7, coucher: c } })
a(regulariteHoraires(irr, J).niveau === 'alert', 'horaires tres variables reperes')
a(regulariteHoraires({ [J]: { hours: 7, coucher: '23:00' } }, J) === null, 'trop peu de nuits : pas de verdict')

// Forme du jour
const nuitBonne = { [J]: { hours: 8, quality: 5, reveil: { energie: 5, sensations: ['repose'] } } }
const f1 = formeDuJour(nuitBonne, J, 0)
a(f1.score >= 90 && f1.niveau === 'haute', 'bonne nuit, bonne energie : pleine forme (' + f1.score + ')')
const nuitCourte = { [J]: { hours: 5, quality: 2, reveil: { energie: 2, sensations: ['courbatures', 'groggy'] } } }
for (let k = 1; k < 6; k++) nuitCourte[decaler(J, -k)] = { hours: 5.5 }
const f2 = formeDuJour(nuitCourte, J, 400)
a(f2.score < 35 && f2.niveau === 'basse' && /dette/.test(f2.details.join()), 'nuits courtes, dette, courbatures : recuperation (' + f2.score + ')')
const f3 = formeDuJour({ [J]: { hours: 8, quality: 5, reveil: { energie: 4, sensations: ['malade'] } } }, J, 0)
a(f3.niveau === 'basse' && /maladie/.test(f3.verdict), 'fievre : repos, quelle que soit la note (' + f3.score + ')')
const f4 = formeDuJour({ [J]: { hours: 7.5 } }, J, 0)
a(f4 && f4.score > 55 && f4.score < 85, 'saisie minimale (duree seule) : pas de penalite pour ce qui manque (' + f4.score + ')')
a(formeDuJour({}, J) === null, 'nuit non saisie : pas de forme inventee')
console.log('\nALL PASS')
