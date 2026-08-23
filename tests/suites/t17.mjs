import { dayTotals, daySeries, averages, consistency, proteinPerKg, macroSplit,
  vsTargets, logging, loggedThreshold, nutriAnalysis,
  MIN_LOGGED_KCAL, PROT_MIN_ACTIVE, PROT_MAX_USEFUL, MACRO_RANGES }
  from '../../src/features/nutrition/nutriIntel.js'
import { estimateTDEE } from '../../src/features/profil/weightIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const T = '2026-06-15'
const back = (n) => { const [y, m, d] = T.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d)); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10) }
// un aliment : kcal, prot, gluc, lip, fibres
const f = (k, p, g, l, fib) => ({ id: 'x', n: 'aliment', k, p, g, l, fib: fib || 0 })

// --- totaux ---
a(dayTotals([]).k === 0, 'journee vide -> 0')
a(dayTotals(null).items === 0, 'entrees nulles gerees')
const dt = dayTotals([f(500, 30, 50, 15, 5), f(300, 10, 40, 8, 3)])
a(dt.k === 800 && dt.p === 40 && dt.fib === 8, `totaux additionnes (${dt.k} kcal, ${dt.p} g prot, ${dt.fib} g fibres)`)
a(dayTotals([{ k: 'nawak', p: null }]).k === 0, 'valeurs invalides ignorees')

// --- seuil de journee renseignee ---
a(loggedThreshold(null) === MIN_LOGGED_KCAL, `sans objectif -> seuil ${MIN_LOGGED_KCAL} kcal`)
a(loggedThreshold(2400) === 1200, 'avec objectif -> moitie de la cible')
a(loggedThreshold(800) === MIN_LOGGED_KCAL, 'objectif bas -> le plancher absolu prime')

// --- serie ---
const mk = (byOffset) => ({ foodLog: Object.fromEntries(Object.entries(byOffset).map(([o, arr]) => [back(Number(o)), arr])) })
a(daySeries({}, { today: T }).length === 0, 'journal vide -> aucune journee')
a(daySeries(null, { today: T }).length === 0, 'db nulle geree')
const db = mk({
  0: [f(2000, 120, 200, 70, 25)],
  1: [f(2200, 130, 230, 75, 28)],
  2: [f(90, 1, 22, 0, 3)],          // une banane : saisie interrompue
  3: [f(1900, 110, 190, 68, 22)],
  4: [f(2100, 125, 210, 72, 26)],
  40: [f(2000, 120, 200, 70, 25)],  // hors fenetre
})
const ser = daySeries(db, { today: T, days: 28 })
a(ser.length === 5, `${ser.length} journees dans la fenetre (la 40e jour exclue)`)
a(ser.filter((d) => d.complete).length === 4, '4 journees completes')
a(ser.find((d) => d.k === 90).complete === false, 'la journee a 90 kcal marquee comme partielle')
a(ser[0].date < ser[4].date, 'serie chronologique')

// --- moyennes : LE point, les partielles ne doivent pas tirer vers le bas ---
const avg = averages(ser)
a(avg.days === 4 && avg.partialDays === 1, `moyenne sur ${avg.days} journees completes, ${avg.partialDays} ecartee`)
a(avg.kcal === 2050, `${avg.kcal} kcal de moyenne`)
// ce qu on obtiendrait en comptant la journee partielle
const naive = Math.round(ser.reduce((s, d) => s + d.k, 0) / ser.length)
a(naive === 1658, `en comptant la banane comme une journee : ${naive} kcal, soit ${avg.kcal - naive} kcal d ecart`)
a(averages([]) === null, 'aucune journee -> null')
a(averages([{ k: 100, complete: false }]) === null, 'que des partielles -> null')

// --- regularite ---
a(consistency(ser.slice(0, 2)) === null, 'moins de 4 journees -> pas de verdict')
a(consistency(ser).level === 'ok', 'apports reguliers')
const erratic = daySeries(mk({ 0: [f(1200, 60, 120, 40)], 1: [f(3200, 160, 320, 110)], 2: [f(1200, 60, 120, 40)], 3: [f(3200, 160, 320, 110)] }), { today: T })
const ec = consistency(erratic)
a(ec.level === 'warn' && ec.cv > 25, `alternance 1200/3200 -> variation ${ec.cv} % signalee`)
a(ec.mean === 2200, `moyenne correcte de ${ec.mean} kcal malgre l irregularite : ce que la moyenne seule cache`)

// --- proteines par kilo ---
a(proteinPerKg(null, 80) === null && proteinPerKg(avg, 0) === null, 'entrees manquantes -> null')
const p80 = proteinPerKg(avg, 80)
a(p80.perKg > 1.4 && p80.perKg < 1.6 && p80.level === 'ok', `${p80.perKg} g/kg a 80 kg -> dans la fourchette`)
// meme apport, poids different : le point de la fonction
const p110 = proteinPerKg(avg, 110)
a(p110.level === 'low', `le meme apport a 110 kg tombe a ${p110.perKg} g/kg -> insuffisant`)
a(p110.targetMin === 154 && p110.targetMax === 242, `cible personnalisee ${p110.targetMin}-${p110.targetMax} g`)
a(proteinPerKg({ prot: 200 }, 60).level === 'high', 'au-dela de 2,2 g/kg -> excedentaire')
a(PROT_MIN_ACTIVE === 1.4 && PROT_MAX_USEFUL === 2.2, 'reperes explicites')

// --- repartition des macros ---
a(macroSplit(null) === null, 'sans moyenne -> null')
const sp = macroSplit(avg)
a(Math.abs(sp.p + sp.g + sp.l - 100) < 0.2, `les parts somment a 100 % (${sp.p}+${sp.g}+${sp.l})`)
a(sp.items.length === 3 && sp.items.every((m) => m.lo && m.hi), 'chaque macro porte sa fourchette de reference')
a(sp.items.find((m) => m.key === 'p').level === 'ok', 'proteines dans la fourchette 10-35 %')
a(sp.items.find((m) => m.key === 'l').level === 'ok', 'lipides dans la fourchette 20-35 %')
// 42,4 % de glucides est bien sous la fourchette de reference 45-65 %
a(sp.items.find((m) => m.key === 'g').level === 'low', `glucides a ${sp.g} % -> sous la fourchette ${MACRO_RANGES.g[0]}-${MACRO_RANGES.g[1]} %`)
const balanced = macroSplit({ prot: 120, gluc: 280, lip: 60, kcal: 2140 })
a(balanced.items.every((m) => m.level === 'ok'), `repartition equilibree -> les 3 macros dans leur fourchette (${balanced.p}/${balanced.g}/${balanced.l})`)
// macros incompletes : l ecart doit ressortir
const gapDb = daySeries(mk({ 0: [f(2000, 20, 20, 5)], 1: [f(2000, 20, 20, 5)], 2: [f(2000, 20, 20, 5)], 3: [f(2000, 20, 20, 5)] }), { today: T })
const gsp = macroSplit(averages(gapDb))
a(gsp.gap < -50, `macros ne couvrant que ${Math.round(100 + gsp.gap)} % des calories -> ecart detecte`)

// --- ecart aux objectifs ---
a(vsTargets(avg, null) === null, 'sans objectifs -> null')
const gaps = vsTargets(avg, { kcal: 2000, prot: 150, gluc: 220, lip: 70, fib: 30 })
a(gaps.length === 5, '5 comparaisons')
a(gaps.find((g) => g.key === 'kcal').level === 'ok', 'calories a moins de 10 % -> conforme')
a(gaps.find((g) => g.key === 'prot').level === 'under', 'proteines sous la cible')
// les fibres ont une cible de reference par defaut (30 g) meme sans objectif saisi
const zeroT = vsTargets(avg, { kcal: 0, prot: 150 })
a(!zeroT.some((g) => g.key === 'kcal'), 'objectif calorique a zero ignore')
a(zeroT.some((g) => g.key === 'fib'), 'les fibres gardent leur cible de reference de 30 g')

// --- assiduite ---
const lg = logging(ser, 28)
a(lg.full === 4 && lg.partial === 1 && lg.pct === 14, `${lg.full}/28 journees completes (${lg.pct} %)`)
a(lg.level === 'low' && /ne portent que sur/.test(lg.text), 'suivi trop partiel -> on le dit')
a(logging([], 28).level === 'none', 'aucune journee -> niveau none')

// --- correction de estimateTDEE ---
// meme jeu : poids stable, apports 2000 kcal, plus une journee "banane"
const wLog = [{ date: back(28), kg: 80 }, { date: back(0), kg: 80 }]
const foodLog = {}
for (let i = 0; i <= 20; i++) foodLog[back(i)] = [f(2000, 120, 200, 70)]
foodLog[back(5)] = [f(90, 1, 22, 0)]
const fixed = estimateTDEE(wLog, foodLog, { windowDays: 28 })
a(fixed && fixed.meanIntake === 2000, `journee partielle ecartee -> apport moyen ${fixed.meanIntake} kcal`)
const naiveTdee = estimateTDEE(wLog, foodLog, { windowDays: 28, minKcalPerDay: 1 })
a(naiveTdee.meanIntake === 1909, `en la comptant : ${naiveTdee.meanIntake} kcal, soit ${fixed.meanIntake - naiveTdee.meanIntake} kcal de metabolisme sous-estime`)
a(fixed.tdee > naiveTdee.tdee, 'le metabolisme estime remonte apres correction')

// --- synthese ---
a(nutriAnalysis(null, { today: T }).tips.length > 0, 'db nulle -> synthese sans crash')
a(/Aucune journ[ée]e compl[èe]te/.test(nutriAnalysis({}, { today: T }).tips[0]), 'journal vide -> explication du seuil')
const full = nutriAnalysis({ ...db, profilePhys: { poids: 110 }, foodTargets: { kcal: 2000, prot: 180, gluc: 220, lip: 70, fib: 30 } }, { today: T, days: 28 })
a(full.protein.level === 'low', 'proteines insuffisantes au poids reel')
a(full.tips.some((t) => /g\/kg/.test(t)), 'conseil sur les proteines par kilo')
a(full.tips.some((t) => /journ[ée]es compl[èe]tes sur 28/.test(t)), 'assiduite remontee')
a(full.averages.days === 4, 'moyennes sur les journees completes uniquement')
const noTargets = nutriAnalysis(db, { today: T, days: 28 })
a(noTargets.tips.some((t) => /Aucun objectif d[ée]fini/.test(t)), 'absence d objectifs signalee')
// le pourcentage affiche ne doit pas trainer de decimales flottantes
const gapTip = nutriAnalysis({ foodLog: Object.fromEntries([0,1,2,3].map((i) => [back(i), [f(2000, 20, 20, 5)]])) }, { today: T }).tips.find((t) => /ne couvrent que/.test(t))
a(gapTip && !/\.\d{3}/.test(gapTip), 'pourcentage arrondi dans le conseil : ' + (gapTip || '').slice(0, 62))
// affichage francais des decimales dans les textes
const frTip = proteinPerKg({ prot: 100 }, 90)
a(/1,11 g\/kg/.test(frTip.text), 'la valeur s affiche avec une virgule : ' + frTip.text.slice(0, 40))
a(!/[0-9]\.[0-9]/.test(frTip.text), 'aucun point decimal residuel dans le texte')
const okTip = proteinPerKg({ prot: 140 }, 80)
a(/1,4 [àa] 2,2 g\/kg/.test(okTip.text), 'les bornes de la fourchette aussi : ' + okTip.text.slice(-30))
console.log('\nALL PASS')
