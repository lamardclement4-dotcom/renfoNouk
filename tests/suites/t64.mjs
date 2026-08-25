// Retrospective detaillee.
import { retroAnalysis, dayDetail, dimensions, weekShape, conditions, fueling,
  takeaway, weekDays, weekBounds, loadTarget, minutesFor, weekPrescription,
  habits, allocate, proposeWeek, proposalToSessions, proposalStatus, dureeLabel,
  DOW_LABELS, EASY_RPE, MIN_SESSION_MINS, PROGRESSION_MAX,
  DIMENSIONS, MEANINGFUL_PCT, WEEK_UNDERFUEL_PCT, BASELINE_WEEKS, REST_DAYS_MIN, SLEEP_CATCHUP_MAX }
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

// ─── conseils chiffres pour la semaine qui vient ───
// Un conseil sans nombre ne se suit pas, et un nombre sans provenance ne se
// croit pas : chaque consigne porte les deux.
a(loadTarget({ meanBase: 0 }) === null, 'sans charge habituelle, aucune cible')
const stable = loadTarget({ meanBase: 300, lastLoad: 300 })
a(stable.lo <= 300 && stable.hi > 300, `semaine conforme : viser ${stable.lo} a ${stable.hi}`)
a(!stable.capped, 'et rien ne plafonne')
const grosse = loadTarget({ meanBase: 300, lastLoad: 450 })
a(grosse.hi <= 300, `semaine a 150 % : la suivante se joue sous l habitude (${grosse.lo}-${grosse.hi})`)
a(/le temps d'absorber/.test(grosse.reason), 'et la raison est dite')
const legere = loadTarget({ meanBase: 300, lastLoad: 150 })
a(legere.lo >= 240 && legere.hi <= 330, `semaine legere : remonter progressivement (${legere.lo}-${legere.hi})`)
a(/plut[ôo]t que d'un coup/.test(legere.reason), 'sans repartir trop fort')
// La recuperation commande : on n augmente pas sur une dette.
const bride = loadTarget({ meanBase: 300, lastLoad: 300, sleepDebt: 9 })
a(bride.capped && bride.hi === 300, 'dette de sommeil -> plafonne a l habitude')
a(loadTarget({ meanBase: 300, lastLoad: 300, underfuelled: true }).capped, 'sous-apport -> plafonne aussi')
a(/se supporte avec ce qu.on r[ée]cup[èe]re/.test(bride.text), 'et le principe est enonce')

const mn = minutesFor({ lo: 230, hi: 290 }, week)
a(mn && mn.lo > 0 && mn.hi > mn.lo, `converti en minutes : ${mn.lo} a ${mn.hi} min`)
a(mn.lo % 5 === 0 && mn.hi % 5 === 0, 'arrondi a cinq minutes : un planning ne se fait pas a la minute')
a(minutesFor({ lo: 200, hi: 300 }, weekDays({}, { weekOf: MON, today: D(6) })) === null, 'sans minutes de reference, pas de conversion')

// avec un historique complet, la prescription se remplit
const p = retroAnalysis(hist, { weekOf: MON, today: D(6), sportMeta: meta }).prescription
a(p.length >= 3, `${p.length} consignes`)
a(p.every((x) => x.value && x.why), 'chaque consigne porte un nombre et sa raison')
a(p.every((x) => !/undefined|NaN/.test(`${x.value} ${x.detail || ''} ${x.why}`)), 'aucune consigne malformee')
a(p.some((x) => x.id === 'charge'), 'la charge cible en fait partie')
const psom = p.find((x) => x.id === 'sommeil')
a(psom && /^\+/.test(psom.value), `sommeil : ${psom.value} ${psom.unit}`)
a(parseFloat(psom.value.replace(',', '.').slice(1)) <= SLEEP_CATCHUP_MAX, `le rattrapage ne depasse pas ${SLEEP_CATCHUP_MAX} h par nuit`)
a(/coucher avanc[ée], pas par une grasse matin[ée]e/.test(psom.why), 'et la facon de le faire est dite')
const ap = p.find((x) => x.id === 'apport')
a(ap && /^\+\d+$/.test(ap.value), `apport : ${ap.value} kcal les jours de seance`)
a(/m[êe]me total sur la semaine, simplement d[ée]plac[ée]/.test(ap.why), 'sans demander de manger plus au total')

// une base vide ne fabrique aucune consigne
a(retroAnalysis({}, { weekOf: MON, today: D(6) }).prescription.length === 0, 'aucune donnee -> aucune consigne inventee')


// ─── la semaine proposee, jour par jour ───
// Une fourchette de charge ne se planifie pas : il faut le jour, le sport, les
// minutes et l intensite.
const long = JSON.parse(JSON.stringify(db))
long.foodTargets = { kcal: 2600, prot: 140, gluc: 300, lip: 80, fib: 30 }
for (let k = 1; k <= 8; k++) {
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(2026, 7, 10)); d.setUTCDate(d.getUTCDate() - 7 * k + i)
    const iso = d.toISOString().slice(0, 10)
    long.sleepLog[iso] = { hours: 7.5 }
    long.foodLog[iso] = [{ n: 'r', meal: 'midi', k: 2400, p: 130, g: 260, l: 70, fib: 20 }]
    if ([0, 2, 4].includes(i)) long.planningSessions.push({ id: 'h' + k + i, date: iso, sport: i === 2 ? 'velo' : 'course', statut: 'realise', duree: '1 h', data: { rpe: 6 } })
    if (i === 5) long.planningSessions.push({ id: 'm' + k + i, date: iso, sport: 'muscu', statut: 'realise', duree: '45 min', data: { rpe: 7 } })
  }
}

// ─── habitudes ───
const hb = habits(long, { weekOf: MON, today: D(6) })
a(hb.sports.length === 3, `${hb.sports.length} sports pratiques`)
a(hb.sports[0].sport === 'course', 'le plus pratique en tete')
a(hb.sports[0].meanMins === 60, 'duree habituelle par sport')
a(Math.round(hb.sessionsPerWeek) === 4, `${hb.sessionsPerWeek} seances par semaine`)
a(hb.dowRank[0].n > 0, 'les jours les plus frequents sont classes')
a(habits({}, { weekOf: MON, today: D(6) }) === null, 'aucun historique -> aucune habitude')

// ─── allocation ───
const sp = [{ sport: 'course', meanMins: 60, longest: 60 }, { sport: 'velo', meanMins: 60, longest: 60 }]
const al = allocate(300, sp)
a(al.length === 2 && al[0].rpe > al[1].rpe, 'une seance dure, le reste en facile')
// Deux seances plafonnees a 66 min ne peuvent pas peser 300 points : on
// verifie qu elle fait au mieux, sans inventer une sortie demesuree.
const charge = al.reduce((x, y) => x + y.mins * (y.rpe / 5), 0)
a(charge < 300 && al.every((x) => x.mins >= 65), `cible inatteignable : ${Math.round(charge)} points, chaque seance poussee a son plafond`)
// Une cible atteignable, elle, est atteinte.
const al2 = allocate(150, sp)
const charge2 = al2.reduce((x, y) => x + y.mins * (y.rpe / 5), 0)
a(Math.abs(charge2 - 150) <= 10, `cible atteignable : ${Math.round(charge2)} points pour 150 vises`)
const al3 = allocate(80, sp)
const charge3 = al3.reduce((x, y) => x + y.mins * (y.rpe / 5), 0)
a(Math.abs(charge3 - 80) <= 10, `cible basse : ${Math.round(charge3)} points pour 80`)
a(al.every((x) => x.mins >= MIN_SESSION_MINS), 'aucune seance sous le minimum')
a(al.every((x) => x.mins <= Math.round(60 * PROGRESSION_MAX) + 4), `aucune seance au-dela de ${Math.round((PROGRESSION_MAX - 1) * 100)} % de la plus longue deja faite`)
a(al.every((x) => x.mins % 5 === 0), 'durees arrondies a cinq minutes')
a(allocate(0, sp).length === 0 && allocate(300, []).length === 0, 'sans cible ou sans sport -> rien')

// ─── la proposition ───
const pr = proposeWeek(long, retroAnalysis(long, { weekOf: MON, today: D(6), sportMeta: meta }), { today: D(6), weekOf: MON })
a(pr.days.length === 7, 'sept jours proposes')
a(pr.days.every((d) => d.label && DOW_LABELS.includes(d.label)), 'chaque jour est nomme')
a(pr.sessions === 4, `${pr.sessions} seances, comme d habitude`)
a(pr.restDays === 3, `${pr.restDays} jours de repos`)
a(pr.inRange, `charge totale ${pr.total} dans la fourchette ${pr.range.lo}-${pr.range.hi}`)
const withS = pr.days.filter((d) => d.session)
a(withS.length === 4, 'quatre journees portent une seance')
a(withS.filter((d) => d.session.hard).length === 1, 'une seule seance dure')
a(withS.every((d) => d.session.mins >= MIN_SESSION_MINS && d.session.mins % 5 === 0), 'durees plausibles et rondes')
a(withS.every((d) => ['course', 'velo', 'muscu'].includes(d.session.sport)), 'uniquement des sports deja pratiques')
// le carburant suit la journee proposee
const gros = pr.days.find((d) => d.dayType === 'gros')
const repos = pr.days.find((d) => d.dayType === 'repos')
a(gros && repos && gros.gluc > repos.gluc, `${gros.gluc} g de glucides le jour charge contre ${repos.gluc} au repos`)
a(pr.days.every((d) => d.kcal > 0), 'chaque jour porte son apport')
a(pr.sleep && pr.sleep.target >= pr.sleep.mean, 'et la cible de sommeil')
a(/sport/.test(pr.basedOn) && /semaine/.test(pr.basedOn), 'la proposition dit sur quoi elle se fonde : ' + pr.basedOn)
a(proposeWeek({}, retroAnalysis({}, { weekOf: MON, today: D(6) }), { today: D(6) }) === null, 'sans historique -> aucune proposition inventee')


// ─── de la proposition au planning ───
// Une semaine proposee qu il faut retaper ne sert pas a grand-chose.
a(dureeLabel(60) === '1 h' && dureeLabel(90) === '1 h 30' && dureeLabel(45) === '45 min', 'les durees usuelles gardent leur libelle')
a(dureeLabel(65) === '65 min', 'une duree hors table reste lisible par le planning')
a(dureeLabel(0) === '1 min' && dureeLabel(null) === '1 min', 'jamais de duree nulle')

const sess = proposalToSessions(pr, { stamp: 42 })
a(sess.length === 4, `${sess.length} seances inscrites, comme proposees`)
a(sess.every((x) => x.statut === 'planifie'), 'inscrites comme prevues, pas comme faites')
a(sess.every((x) => x.data && x.data.rpe > 0), 'le RPE vise est enregistre : c est lui qui portera la charge projetee')
a(sess.every((x) => x.source === 'proposition'), 'leur provenance est conservee')
a(new Set(sess.map((x) => x.id)).size === 4, 'identifiants distincts')
a(sess.every((x) => x.date > MON), 'toutes datees de la semaine suivante')
// La duree inscrite doit se relire : sinon la charge tombe a zero.
const { dureeToMins } = await import('../../src/features/train/plannerIntel.js')
a(sess.every((x) => dureeToMins(x.duree) > 0), 'chaque duree est relue par le planning')
a(sess.every((x, i) => dureeToMins(x.duree) === pr.days.filter((d) => d.session)[i].session.mins), 'et vaut exactement ce qui etait propose')
a(proposalToSessions(null).length === 0, 'aucune proposition -> aucune seance')

// ─── on n ecrase rien ───
const st = proposalStatus(long, pr)
a(st.can && st.count === 4, 'semaine suivante vide -> on peut inscrire')
const occupe = { planningSessions: [{ id: 'x', date: pr.days.find((d) => d.session).date, sport: 'course', statut: 'planifie', duree: '1 h' }] }
const st2 = proposalStatus(occupe, pr)
a(!st2.can && st2.existing === 1, 'une seance deja inscrite -> on ne propose plus')
a(/rien n.est [ée]cras[ée]/.test(st2.reason), 'et on le dit')
a(proposalStatus({}, null).can === false, 'aucune proposition -> rien a inscrire')

console.log('\nALL PASS')
