// Retrospective detaillee.
import { retroAnalysis, dayDetail, dimensions, weekShape, conditions, fueling,
  takeaway, weekDays, weekBounds, DIMENSIONS, MEANINGFUL_PCT, WEEK_UNDERFUEL_PCT, BASELINE_WEEKS }
  from '../../src/features/train/retroIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
// Lundi 2026-08-10 au dimanche 2026-08-16.
const MON = '2026-08-10'
const D = (i) => { const d = new Date(Date.UTC(2026, 7, 10)); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10) }
const S = (i, sport, duree, rpe) => ({ id: sport + i, date: D(i), sport, statut: 'realise', duree, data: { rpe } })
const meta = (id) => ({ label: id === 'course' ? 'Course à pied' : 'Vélo', color: '#000' })

const db = {
  planningSessions: [S(0, 'course', '1 h', 6), S(2, 'velo', '2 h', 7), S(4, 'course', '45 min', 5), S(5, 'course', '1 h 30', 8)],
  sleepLog: {}, weatherLog: {}, dayRows: {}, vitalsLog: {},
  profilePhys: { poids: 75 },
}
for (let i = 0; i < 7; i++) {
  db.sleepLog[D(i)] = { hours: i === 5 ? 5.5 : 7 }
  db.vitalsLog[D(i)] = { steps: 8000 + i * 100 }
}
db.weatherLog[D(2)] = { environment: 'exterieur', tempC: 34, humidity: 60, sun: 'plein' }
const foodLog = {}
for (let i = 0; i < 7; i++) {
  const actif = [0, 2, 4, 5].includes(i)
  foodLog[D(i)] = [{ n: 'repas', meal: 'midi', k: actif ? 1900 : 2400, p: 95, g: 200, l: 70, fib: 20 }]
}
db.foodLog = foodLog

// ─── jour par jour ───
const week = weekDays(db, { weekOf: MON, today: D(6) })
const det = dayDetail(db, week, meta)
a(det.length === 7, 'sept jours')
a(det[0].sessions.length === 1 && det[0].sessions[0].label === 'Course à pied', 'les seances portent leur libelle')
a(det[0].sessions[0].mins === 60 && det[0].sessions[0].rpe === 6, 'duree et ressenti')
a(det[5].sleep === 5.5, 'la nuit du samedi est rendue')
a(det[0].kcal === 1900 && det[0].prot === 95, 'apport du jour')
a(det[2].feels != null && det[2].feels >= 34, `conditions du mercredi : ${det[2].feels} °C ressentis`)
a(det[1].steps === 8100, 'les pas issus de Sante')
a(det[1].sessions.length === 0 && det[1].active === false, 'un jour sans seance reste dans le detail')

// ─── dimensions ───
const dims = dimensions(db, { weekOf: MON, today: D(6) })
a(dims.length === DIMENSIONS.length, `${dims.length} dimensions comparees`)
const som = dims.find((d) => d.key === 'sleep')
a(som.value === 6.8, `sommeil moyen ${som.value} h`)
a(dims.find((d) => d.key === 'sessions').value === 4, '4 seances')
a(dims.find((d) => d.key === 'prot').value === 95, '95 g de proteines par jour')
a(dims.every((d) => d.base === null), 'aucune semaine de reference -> aucune comparaison inventee')
// avec un historique, la comparaison apparait
const hist = JSON.parse(JSON.stringify(db))
for (let k = 1; k <= BASELINE_WEEKS; k++) {
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(2026, 7, 10)); d.setUTCDate(d.getUTCDate() - 7 * k + i)
    const iso = d.toISOString().slice(0, 10)
    hist.sleepLog[iso] = { hours: 8 }
    hist.foodLog[iso] = [{ n: 'r', meal: 'midi', k: 2400, p: 140, g: 250, l: 70, fib: 20 }]
    if (i % 2 === 0) hist.planningSessions.push({ id: 'h' + k + i, date: iso, sport: 'course', statut: 'realise', duree: '1 h', data: { rpe: 6 } })
  }
}
const dims2 = dimensions(hist, { weekOf: MON, today: D(6) })
const som2 = dims2.find((d) => d.key === 'sleep')
a(som2.base === 8 && som2.pct === -15, `sommeil ${som2.pct} % sous la reference de ${som2.base} h`)
a(som2.level === 'down', 'et signale comme en baisse')
const prot2 = dims2.find((d) => d.key === 'prot')
a(prot2.pct < -MEANINGFUL_PCT && prot2.level === 'down', `proteines ${prot2.pct} %`)

// ─── forme de la semaine ───
const shape = weekShape(week)
a(shape && shape.restDays === 3, `${shape.restDays} jours sans charge`)
// 2 h a RPE 7 pese 168, contre 144 pour 1 h 30 a RPE 8 : le pic est le mercredi.
a(shape.peakDate === D(2), `le pic de charge est situe (${shape.peakLoad} points)`)
const plate = weekDays({ planningSessions: [0,1,2,3,4,5,6].map((i) => S(i, 'course', '1 h', 6)) }, { weekOf: MON, today: D(6) })
const sh2 = weekShape(plate)
const vide = weekShape(weekDays({}, { weekOf: MON, today: D(6) }))
a(vide.level === null && vide.restDays === 7, 'semaine sans charge : sept jours de repos, aucune monotonie calculee')
a(vide.value === null && !Number.isNaN(vide.mean), 'et aucun NaN')
a(sh2.restDays === 0 && sh2.high, 'sept jours identiques : monotonie maximale, pas une absence de resultat')
a(sh2.text && /uniforme|m[êe]me/.test(sh2.text), 'et c est dit')

// ─── conditions ───
const cond = conditions(db, week)
a(cond && cond.days === 1, 'une seance documentee cote conditions')
a(cond.hottest.feels >= 34, `la plus chaude a ${Math.round(cond.hottest.feels)} °C ressentis`)
a(/alourdissent l.effort/.test(cond.text), 'et l effet sur l effort est dit')
a(conditions({ weatherLog: {} }, week) === null, 'aucune condition notee -> null')

// ─── carburant ───
const fuel = fueling(db, week, 75)
a(fuel.trainingDays === 4 && fuel.restDays === 3, '4 jours actifs, 3 sans')
a(fuel.onKcal === 1900 && fuel.offKcal === 2400, 'apport de chaque sorte de jour')
a(fuel.pct <= WEEK_UNDERFUEL_PCT && fuel.under, `${fuel.pct} % : sous-apport les jours de seance`)
a(/fatigue qu.on attribue d.ordinaire au sommeil/.test(fuel.text), 'et la confusion frequente est nommee')
a(fueling({ foodLog: {} }, week, 75) === null, 'aucun apport note -> null')

// ─── ce qu il faut retenir ───
a(takeaway({ fuel }).level === 'warn' && takeaway({ fuel }).text === fuel.text, 'le sous-apport passe avant tout')
a(takeaway({}).level === 'ok', 'rien a signaler -> semaine coherente')
a(/dette de sommeil/.test(takeaway({ ctx: { sleep: { debt: 9 } } }).text), 'la dette de sommeil vient ensuite')

// ─── synthese ───
const ana = retroAnalysis(db, { weekOf: MON, today: D(6), sportMeta: meta })
a(ana.detail.length === 7 && ana.dimensions.length === DIMENSIONS.length, 'la synthese porte le detail et les dimensions')
a(ana.takeaway && ana.takeaway.text, 'et une conclusion')
a(ana.story.length >= 4, `${ana.story.length} lignes de recit`)
a(ana.story.some((t) => /kcal de moins les jours de s[ée]ance/.test(t)), 'le carburant entre dans le recit')
a(ana.story.some((t) => /ressentis/.test(t)), 'les conditions aussi')
a(ana.story.every((t) => !/undefined|NaN/.test(t)), 'aucune ligne malformee')
a(!ana.story.join(' ').match(/\d+\.\d/), 'ecriture francaise dans tout le recit')
a(retroAnalysis({}, { weekOf: MON, today: D(6) }).story.length > 0, 'base vide -> recit sans crash')
console.log('\nALL PASS')
