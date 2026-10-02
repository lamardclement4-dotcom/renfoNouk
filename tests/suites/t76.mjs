// Courbe de la semaine (accueil) : charge sur 7 jours glissants, zone
// habituelle, et accord exact avec le rapport aigu/chronique de l app.
import { weekTrace, traceGeometry } from '../../src/features/home/weekTrace.js'
import { acwrRisk } from '../../src/features/train/renfoIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

const REF = '2026-10-02' // un vendredi
const back = (ref, n) => { const [y, m, d] = ref.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d - n)); return x.toISOString().slice(0, 10) }
const S = (n, duree, rpe, extra = {}) => ({ id: 's' + n + duree, date: back(REF, n), sport: 'course', statut: 'realise', duree, data: rpe == null ? {} : { rpe }, ...extra })

// ─── base vide ───
let t = weekTrace({}, { today: REF })
a(t.days.length === 7, '7 points, un par jour')
a(t.empty && t.acute === 0 && t.band === null && t.ratio === null, 'base vide : courbe plate, pas de zone ni de rapport')
a(t.days[6].isToday && t.days[6].iso === REF && t.days[0].iso === back(REF, 6), 'du plus ancien a aujourd hui')
a(t.days.map((d) => d.letter).join('') === 'SDLMMJV', 'initiales des jours, samedi a vendredi')

// ─── fenetre glissante ───
t = weekTrace({ planningSessions: [S(0, '1 h', 5)] }, { today: REF })
a(t.acute === 60 && t.days[6].value === 60 && t.days[5].value === 0, 'une heure a RPE 5 aujourd hui : 60, et rien la veille')
a(t.days[6].sessions === 1 && t.days[5].sessions === 0, 'le jour de seance est marque')
t = weekTrace({ planningSessions: [S(3, '30 min')] }, { today: REF })
a(t.days.map((d) => d.value).join(',') === '0,0,0,30,30,30,30', 'une seance d il y a 3 jours pese sur les 4 derniers points glissants')
t = weekTrace({ planningSessions: [S(0, '1 h', 8)] }, { today: REF })
a(t.acute === 96, 'RPE 8 : 60 x 8/5 = 96 minutes equivalentes')
t = weekTrace({ planningSessions: [S(0, '1 h', null)] }, { today: REF })
a(t.acute === 60, 'sans RPE, les minutes seules')
t = weekTrace({ planningSessions: [S(0, '1 h', 5)], weatherLog: { [REF]: { tempC: 34 } } }, { today: REF })
a(t.acute > 60, 'la chaleur alourdit la charge, comme dans le rapport aigu/chronique')

// ─── zone habituelle ───
const reg = [S(0, '1 h', 5), S(7, '1 h', 5), S(14, '1 h', 5), S(21, '1 h', 5)]
t = weekTrace({ planningSessions: reg }, { today: REF })
a(t.band && t.band.mean === 60 && t.band.lo === 48 && t.band.hi === 78, 'zone : 0,8 a 1,3 fois la semaine habituelle sur 28 jours')
a(t.ratio === 1, 'rapport 1 quand la semaine ressemble aux precedentes')
t = weekTrace({ planningSessions: [S(0, '1 h', 5), S(10, '1 h', 5)] }, { today: REF })
a(t.band === null && t.ratio === null, 'moins de 14 jours d historique : pas de zone')

// ─── accord avec acwrRisk, sur la vraie date du jour ───
const p = (n) => String(n).padStart(2, '0')
const loc = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) }
const vrai = { planningSessions: [0, 2, 5, 9, 12, 16, 20, 26].map((k, i) => ({ id: 'v' + i, date: loc(k), sport: 'course', statut: 'realise', duree: ['30 min', '45 min', '1 h', '1 h 30'][i % 4], data: { rpe: 3 + (i % 5) } })) }
const r = acwrRisk(vrai)
t = weekTrace(vrai)
a(r.available && t.acute === r.acuteMin, 'le dernier point est exactement la charge aigue de l app (' + t.acute + ')')
a(Math.abs(t.ratio - r.ratio) < 0.011, 'et le rapport concorde (' + t.ratio + ' / ' + r.ratio + ')')

// ─── donnees abimees ───
const casse = { planningSessions: { a: 1 } }
a(weekTrace(casse, { today: REF }).empty, 'une liste stockee en objet ne casse rien')
t = weekTrace({ planningSessions: [null, {}, { statut: 'realise', date: 'hier', duree: '1 h' }, { statut: 'realise', date: REF, duree: 'longtemps' }, { statut: 'realise', date: REF, duree: '-1 h' }, { statut: 'planifie', date: REF, duree: '1 h' }, { statut: 'realise', date: back(REF, -2), duree: '1 h' }] }, { today: REF })
a(t.empty, 'null, dates invalides, durees illisibles ou negatives, seances prevues et futures sont ignorees')
t = weekTrace({ planningSessions: [S(0, '99999 h', 1e9)] }, { today: REF })
a(t.acute > 0 && t.acute <= 1440, 'une seance aberrante est plafonnee au lieu d ecraser la courbe')
a(weekTrace({ weatherLog: [] }, { today: REF }).empty, 'meteo stockee en liste : ignoree')
a(weekTrace({}, { today: 'n importe quoi' }).days.length === 7, 'date de reference invalide : retombe sur aujourd hui')

// ─── changement d heure : compte en jours de calendrier ───
t = weekTrace({ planningSessions: [{ id: 'd', date: '2026-03-28', statut: 'realise', duree: '1 h' }] }, { today: '2026-03-31' })
a(t.days[3].iso === '2026-03-28' && t.days[3].sessions === 1, 'une seance avant le passage a l heure d ete reste sur son jour')

// ─── geometrie ───
t = weekTrace({ planningSessions: reg }, { today: REF })
const g = traceGeometry(t, { width: 340, height: 150, left: 8, right: 8, top: 20, bottom: 20 })
a(g.points.length === 7 && g.points[0][0] === 8 && g.points[6][0] === 332, 'les points couvrent toute la largeur utile')
a(g.points.every(([, y]) => y >= g.top && y <= g.baseline), 'aucun point ne sort du cadre')
a(t.days.every((d) => d.value === 60) && new Set(g.points.map(([, y]) => y)).size === 1, 'une seance tous les 7 jours : charge glissante constante, tracé horizontal')
const g0 = traceGeometry(weekTrace({ planningSessions: [S(3, '30 min')] }, { today: REF }), { width: 340, height: 150, left: 8, right: 8, top: 20, bottom: 20 })
a(g0.points[0][1] === g0.baseline && g0.points[6][1] < g0.baseline, 'une charge nulle est posee sur la ligne de base, une charge positive au-dessus')
a(g.band && g.band.y1 < g.band.y2, 'la zone a une hauteur positive, haut au-dessus du bas')
console.log('\nALL PASS')
