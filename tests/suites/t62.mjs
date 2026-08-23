// Dette de sommeil.
import { sleepSeries, sleepDebt, sleepAnalysis, plausibleHours, neededHours,
  MIN_PLAUSIBLE_H, MAX_PLAUSIBLE_H, MAX_CREDIT_PER_NIGHT, BASE_NEED }
  from '../../src/features/health/sleepIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const T = '2026-08-21'
const back = (n) => { const d = new Date(Date.UTC(2026, 7, 21)); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
const mk = (hours) => { const l = {}; hours.forEach((h, i) => { l[back(i)] = { hours: h } }); return l }

// ─── bornes du plausible ───
// La saisie manuelle est bridee entre 3 et 12 h par l ecran, mais l import
// Apple Sante ecrit ce qu il trouve.
a(plausibleHours(7.5) === 7.5, 'une nuit ordinaire passe')
a(plausibleHours(MAX_PLAUSIBLE_H) === MAX_PLAUSIBLE_H && plausibleHours(MIN_PLAUSIBLE_H) === MIN_PLAUSIBLE_H, 'les bornes elles-memes passent')
a(plausibleHours(30) === null, 'une nuit de 30 h est ecartee')
a(plausibleHours(0.2) === null, 'douze minutes ne sont pas une nuit')
a(plausibleHours(null) === null && plausibleHours('') === null, 'valeur absente -> ecartee')
a(sleepSeries(mk([30, 5]), { days: 14, today: T }).length === 1, 'la serie ne retient que la nuit plausible')

// LE cas : une seule saisie aberrante effacait des semaines de deficit reel.
const avecAberrante = sleepDebt(sleepSeries(mk([30, 5, 5, 5, 5]), { days: 14, today: T }), 8)
a(avecAberrante.net === 12, `${avecAberrante.net} h de dette : la nuit de 30 h n a rien efface`)
a(avecAberrante.nights === 4, 'et elle ne compte pas parmi les nuits')

// ─── le surplus ne repaie pas heure pour heure ───
// Deux grasses matinees ramenaient 18 h de dette a 11, alors que l analyse
// ajoutait deux lignes plus bas que « le besoin est la toute la semaine ».
const semaine = mk([6, 6.5, 6, 6.5, 6, 10, 9.5, 6, 6.5, 6, 6.5, 6, 10, 9.5])
const d = sleepDebt(sleepSeries(semaine, { days: 14, today: T }), 8)
a(d.debt === 18, `${d.debt} h de dette brute`)
a(d.surplus === 7, `${d.surplus} h dormies en plus le week-end`)
a(d.credit === 4, `mais ${d.credit} h creditees seulement : ${MAX_CREDIT_PER_NIGHT} h par nuit au plus`)
a(d.net === 14, `dette nette de ${d.net} h, non de 11`)
a(d.credit < d.surplus, 'le corps ne met pas le sommeil en reserve')

// une dette ne devient jamais une avance
const dodo = sleepDebt(sleepSeries(mk([11, 11, 11, 11]), { days: 14, today: T }), 8)
a(dodo.net === 0, 'que du sommeil en exces -> dette nulle, jamais negative')
a(dodo.debt === 0 && dodo.surplus === 12, 'le surplus reste rapporte a part')

// ─── coherence avec le besoin ───
a(neededHours(0) === BASE_NEED && neededHours(600) === BASE_NEED + 1, 'le besoin suit le volume d entrainement')
const dur = sleepDebt(sleepSeries(mk([7, 7, 7, 7]), { days: 14, today: T }), neededHours(600))
a(dur.net === 8, `a 9 h de besoin, quatre nuits de 7 h font ${dur.net} h de dette`)

// ─── ecriture francaise ───
const ana = sleepAnalysis({ sleepLog: semaine }, { today: T })
const tous = ana.tips.join(' ')
a(!/\d+\.\d/.test(tous), 'aucun nombre a point decimal dans les conseils')
a(/3,6 h de plus le week-end/.test(tous), 'les decimales s ecrivent avec une virgule')
a(/Dette de 14 h/.test(tous), 'et la dette annoncee est la dette corrigee')

// ─── cas limites ───
a(sleepDebt([], 8) === null && sleepDebt(null, 8) === null, 'aucune nuit -> null')
a(sleepDebt([{ hours: 7 }], 0) === null, 'sans besoin defini -> null')
a(!sleepAnalysis({}, { today: T }).debt, 'aucun journal -> aucune dette inventee')
console.log('\nALL PASS')
