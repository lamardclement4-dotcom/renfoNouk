import { dowOf, mondayISO, dureeToMins, sessionLoad, sessionRpe, isHard,
  weekSessions, loadInWindow, acwrVerdict, projectedLoad, weekStructure,
  monotony, adherence, goalFit, plannerAnalysis,
  NEUTRAL_RPE, HARD_RPE, ACWR_SWEET_HIGH, ACWR_DANGER, MONOTONY_HIGH, MAX_CONSECUTIVE }
  from '../../src/features/train/plannerIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
// lundi 15 juin 2026
const LUN = '2026-06-15'
const day = (i) => { const [y, m, d] = LUN.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d)); x.setUTCDate(x.getUTCDate() + i); return x.toISOString().slice(0, 10) }
const S = (dateISO, duree, rpe, statut) => ({ id: 's' + dateISO + (rpe || ''), date: dateISO, sport: 'course', duree, statut: statut || 'planifie', ...(rpe ? { data: { rpe } } : {}) })

// --- bases ---
a(dowOf(LUN) === 0, '15 juin 2026 = lundi')
a(dowOf(day(6)) === 6, 'dimanche en fin de semaine')
a(mondayISO(day(3)) === LUN, 'le lundi de la semaine est retrouve depuis un jeudi')
a(dureeToMins('1 h 30') === 90 && dureeToMins('45 min') === 45, 'durees du selecteur converties')
a(dureeToMins('75 min') === 75, 'duree libre convertie')
a(dureeToMins(null) === 0, 'duree absente -> 0')

// --- charge de seance ---
a(sessionLoad(S(LUN, '1 h')) === 60, `sans RPE : la duree seule (${sessionLoad(S(LUN, '1 h'))})`)
a(sessionLoad(S(LUN, '1 h', NEUTRAL_RPE)) === 60, `RPE ${NEUTRAL_RPE} = neutre, meme poids`)
a(sessionLoad(S(LUN, '1 h', 10)) === 120, 'RPE 10 double la charge')
a(sessionLoad(S(LUN, '1 h', 2)) === 24, 'RPE 2 la reduit fortement')
a(sessionRpe(S(LUN, '1 h', 0)) === null, 'RPE a 0 (champ vide) lu comme absent')
a(sessionLoad({}) === 0, 'seance vide -> 0')
a(isHard(S(LUN, '1 h', HARD_RPE)), `RPE ${HARD_RPE} -> seance exigeante`)
a(!isHard(S(LUN, '1 h', 5)), 'RPE 5 -> pas exigeante')
a(isHard(S(LUN, '2 h')), 'sans RPE, une sortie de 2 h reste exigeante')
a(!isHard(S(LUN, '45 min')), 'sans RPE, 45 min ne l est pas')

// --- semaine ---
const db = { planningSessions: [
  S(LUN, '1 h', 8, 'realise'), S(day(1), '45 min', 5, 'realise'),
  S(day(3), '1 h 30', 9), S(day(5), '1 h', 6),
  S(day(-3), '1 h', 5, 'realise'), // semaine precedente
] }
const w = weekSessions(db, { weekOf: LUN })
a(w.monday === LUN && w.sunday === day(6), 'bornes de semaine correctes')
a(w.all.length === 4, `4 seances dans la semaine (${w.all.length}), celle d avant exclue`)
a(w.done.length === 2 && w.planned.length === 2, '2 realisees, 2 planifiees')

// --- LE point : la charge projetee ---
a(projectedLoad({}, { weekOf: LUN }).available === false, 'sans historique -> pas de projection')
// 4 semaines d historique regulier, puis une semaine chargee planifiee
const hist = []
for (let k = 1; k <= 28; k++) hist.push(S(day(-k), '1 h', 5, 'realise'))
const heavy = { planningSessions: hist.concat([0, 1, 2, 3, 4, 5].map((i) => S(day(i), '1 h 30', 9))) }
const pl = projectedLoad(heavy, { weekOf: LUN, today: LUN })
a(pl.available, 'projection calculable')
a(pl.currentRatio < pl.ratio, `le planning fait monter le ratio de ${pl.currentRatio} a ${pl.ratio}`)
a(pl.ratio > ACWR_DANGER, `semaine prevue en zone dangereuse (${pl.ratio} > ${ACWR_DANGER})`)
a(pl.verdict.level === 'alert', 'verdict en alerte')
a(pl.plannedLoad > 0, `${pl.plannedLoad} points de charge encore a faire`)
// une semaine legere ne declenche rien
const light = { planningSessions: hist.concat([0, 2].map((i) => S(day(i), '45 min', 4))) }
const pll = projectedLoad(light, { weekOf: LUN, today: LUN })
a(pll.verdict.level === 'low' || pll.verdict.level === 'ok', `semaine legere -> ${pll.verdict.level}`)
a(acwrVerdict(1.0).level === 'ok' && acwrVerdict(ACWR_SWEET_HIGH).level === 'ok', 'zone habituelle bornee correctement')
a(acwrVerdict(null) === null, 'ratio absent -> pas de verdict')

// --- structure ---
const noRest = { planningSessions: [0, 1, 2, 3, 4, 5, 6].map((i) => S(day(i), '1 h', 5)) }
const st = weekStructure(noRest, { weekOf: LUN })
a(st.days.length === 7, '7 jours decrits')
a(st.restDays === 0 && st.longestStreak === 7, 'aucun repos, 7 jours d affilee')
a(st.flags.some((f) => f.id === 'repos'), 'absence de repos signalee')
a(st.flags.some((f) => f.id === 'enchaine'), `plus de ${MAX_CONSECUTIVE} jours consecutifs signale`)
const b2b = { planningSessions: [S(day(0), '1 h', 9), S(day(1), '1 h', 9), S(day(4), '1 h', 5)] }
const stb = weekStructure(b2b, { weekOf: LUN })
a(stb.backToBack.length === 1, 'deux seances dures collees detectees')
a(stb.flags.some((f) => f.id === 'dur-dur'), 'et signalees')
a(/alternance dur \/ facile/.test(stb.flags.find((f) => f.id === 'dur-dur').text), 'avec la raison')
const clean = { planningSessions: [S(day(0), '1 h', 9), S(day(2), '45 min', 4), S(day(4), '1 h', 8)] }
a(weekStructure(clean, { weekOf: LUN }).flags.length === 0, 'semaine bien construite -> aucun signalement')
a(weekStructure({}, { weekOf: LUN }).flags.length === 0, 'semaine vide -> aucun reproche')

// --- monotonie ---
a(monotony([]) === null, 'moins de 7 jours -> null')
const flat = weekStructure({ planningSessions: [0, 1, 2, 3, 4, 5, 6].map((i) => S(day(i), '1 h', 5)) }, { weekOf: LUN })
const mf = monotony(flat.days)
a(mf.level === 'alert' && mf.value === null, 'sept journees identiques -> cas extreme signale, pas d infini')
a(/aucune alternance/.test(mf.text), 'et explique : ' + mf.text.slice(0, 55))
const varied = weekStructure({ planningSessions: [S(day(0), '2 h', 9), S(day(2), '30 min', 3), S(day(4), '1 h 30', 8)] }, { weekOf: LUN })
const mv = monotony(varied.days)
a(mv.value !== null && mv.level === 'ok', `semaine contrastee -> monotonie ${mv.value}`)
a(mv.strain > 0 && mv.weekly > 0, `contrainte ${mv.strain} pour ${mv.weekly} de charge`)
const uniform = weekStructure({ planningSessions: [0,1,2,3,4,5,6].map((i) => S(day(i), i === 0 ? '1 h 30' : '1 h', 5)) }, { weekOf: LUN })
const mu = monotony(uniform.days)
a(mu.value >= MONOTONY_HIGH && mu.level === 'warn', `semaine quasi uniforme -> monotonie ${mu.value} signalee`)

// --- respect du planning ---
a(adherence({}, { today: LUN }) === null, 'aucune seance passee -> null')
const kept = { planningSessions: [] }
for (let k = 1; k <= 20; k++) kept.planningSessions.push(S(day(-k), '1 h', 6, k <= 18 ? 'realise' : 'planifie'))
const ad = adherence(kept, { today: LUN })
a(ad.done === 18 && ad.missed === 2, `${ad.done} tenues, ${ad.missed} restees au planning`)
a(ad.pct === 90 && ad.level === 'ok', 'bon respect du planning')
const dropped = { planningSessions: [] }
for (let k = 1; k <= 20; k++) dropped.planningSessions.push(S(day(-k), '1 h', 6, k <= 6 ? 'realise' : 'planifie'))
const ad2 = adherence(dropped, { today: LUN })
a(ad2.level === 'warn' && /plus ambitieux/.test(ad2.text), 'planning irrealiste signale')

// --- objectif hebdomadaire ---
a(goalFit({}, { weekOf: LUN }) === null, 'sans objectif -> null')
const g = goalFit({ ...db, goals: { weeklySessions: 4 } }, { weekOf: LUN })
a(g.count === 4 && g.level === 'ok', 'objectif atteint')
const gu = goalFit({ ...db, goals: { weeklySessions: 6 } }, { weekOf: LUN })
a(gu.level === 'under' && gu.diff === -2, 'il manque 2 seances')

// --- synthese ---
a(plannerAnalysis(null, { weekOf: LUN }).tips.length > 0, 'db nulle -> synthese sans crash')
a(/Aucune s[ée]ance au planning/.test(plannerAnalysis({}, { weekOf: LUN }).tips[0]), 'semaine vide -> invitation')
const ana = plannerAnalysis(heavy, { weekOf: LUN, today: LUN })
a(/Si tu fais tout ce qui est pr[ée]vu/.test(ana.tips[0]), 'la projection passe en premier : ' + ana.tips[0].slice(0, 70))
a(/pour l'instant/.test(ana.tips[0]), 'et distingue la charge deja faite de celle a venir')
const good = plannerAnalysis({ planningSessions: hist.concat([S(day(0), '1 h', 6), S(day(2), '45 min', 4), S(day(4), '1 h', 7)]) }, { weekOf: LUN, today: LUN })
a(good.tips.length === 1 && /Semaine coh[ée]rente/.test(good.tips[0]), 'semaine saine -> un seul message positif')

// ─── la meteo pese aussi la charge projetee ───
// La charge realisee etait ponderee par les conditions depuis longtemps ; la
// projection ne l etait pas. Une semaine planifiee sous 35 degres affichait
// donc le meme ratio qu une semaine identique sous 15 degres, et ne pouvait
// pas avertir d une canicule.
const CHAUD = { environment: 'exterieur', tempC: 35, humidity: 55, sun: 'plein' }
const DOUX = { environment: 'exterieur', tempC: 15, humidity: 55, sun: 'variable' }
const base = { duree: '1 h', data: { rpe: 5 } }
a(sessionLoad(base) === 60, 'sans conditions : la duree, a intensite neutre')
a(sessionLoad(base, DOUX) === 60, '15 degres : rien a majorer')
const chaud = sessionLoad(base, CHAUD)
a(chaud > 60, `35 degres : ${chaud} au lieu de 60`)
a(sessionLoad(base, null) === 60, 'conditions absentes -> charge inchangee, pas inventee')

// L acclimatation attenue la majoration. `loadMultiplier` lit `.factor` sur
// l objet : lui passer le seul nombre de jours ferait taire l attenuation.
const acclimate = sessionLoad(base, CHAUD, { days: 10, factor: 0.6, ratio: 1 })
a(acclimate < chaud && acclimate > 60, `dix jours d exposition : ${acclimate}, entre les deux`)
a(sessionLoad(base, CHAUD, { days: 10 }) === chaud, 'un objet sans facteur n attenue rien')

// ─── projection : une semaine caniculaire remonte le ratio ───
const jour = (n) => { const d = new Date(Date.UTC(2026, 7, 16)); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }
const SEANCES = []
for (let n = 27; n >= 0; n--) {
  if (n % 2) continue
  SEANCES.push({ id: 's' + n, date: jour(n), sport: 'course', statut: n <= 6 ? 'planifie' : 'realise', duree: '1 h', data: { rpe: 5 } })
}
const REF = { today: jour(0), weekOf: jour(0) }
const sansMeteo = projectedLoad({ planningSessions: SEANCES }, REF)
a(sansMeteo.available, 'projection calculable')
// canicule sur la seule semaine planifiee
const chaudLog = {}
for (let n = 0; n <= 6; n++) chaudLog[jour(n)] = CHAUD
const avecMeteo = projectedLoad({ planningSessions: SEANCES, weatherLog: chaudLog }, REF)
a(avecMeteo.acute > sansMeteo.acute, `charge aigue ${sansMeteo.acute} -> ${avecMeteo.acute} sous 35 degres`)
a(avecMeteo.ratio > sansMeteo.ratio, `ratio projete ${sansMeteo.ratio} -> ${avecMeteo.ratio} : la canicule se voit enfin`)

// la meme chaleur sur les quatre semaines ne doit pas gonfler le ratio :
// c est un rapport, et les deux fenetres montent ensemble.
const partout = {}
for (let n = 0; n <= 27; n++) partout[jour(n)] = CHAUD
const uniforme = projectedLoad({ planningSessions: SEANCES, weatherLog: partout }, REF)
a(Math.abs(uniforme.ratio - sansMeteo.ratio) < 0.05, `chaleur constante : ratio ${uniforme.ratio}, inchange — c est un rapport`)
a(uniforme.acute > sansMeteo.acute, 'mais la charge absolue, elle, monte')

console.log('\nALL PASS')
