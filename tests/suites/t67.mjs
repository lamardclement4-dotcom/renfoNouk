// Echauffement et educatifs : une seance ne commence pas a la premiere
// repetition.
import { WARMUP_KINDS, WARMUP_MINUTES, warmupSummary, DRILLS, DRILL_ALIASES,
  drillsFor, drillById, drillsSummary } from '../../src/features/train/drillsData.js'
import { warmupHabit, drillHabit, WARMUP_MIN_MINS } from '../../src/features/train/plannerIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const T = '2026-08-21'
const back = (n) => { const d = new Date(Date.UTC(2026, 7, 21)); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10) }

// ─── catalogue ───
a(WARMUP_KINDS.length === 3, 'trois formes d echauffement')
a(WARMUP_KINDS.map((k) => k.id).join() === 'general,mobilite,specifique', 'dans l ordre ou elles se pratiquent')
a(WARMUP_KINDS.every((k) => k.hint && k.hint.length > 30), 'chacune explique ce qu elle couvre')
a(WARMUP_MINUTES.includes(0), 'on peut declarer n avoir pas echauffe : le nier serait pire')

a(drillsFor('course').length >= 8, `${drillsFor('course').length} educatifs de course`)
a(drillsFor('natation').length >= 6, `${drillsFor('natation').length} en natation`)
a(drillsFor('nawak').length === 0, 'sport sans educatif -> liste vide, pas d invention')
// Les collectifs partagent leur liste : quatre listes identiques seraient
// quatre fois la meme maintenance.
a(drillsFor('football') === drillsFor('basket'), 'les sports collectifs partagent leurs educatifs')
a(drillsFor('demi') === drillsFor('course') && drillsFor('vtt') === drillsFor('velo'), 'les disciplines proches aussi')
for (const [sport, list] of Object.entries(DRILLS)) {
  a(list.every((d) => d.id && d.label && d.aim), `${sport} : chaque educatif dit ce qu il travaille`)
  a(new Set(list.map((d) => d.id)).size === list.length, `${sport} : aucun doublon`)
}
a(Object.values(DRILL_ALIASES).every((v) => DRILLS[v]), 'chaque alias pointe vers une liste qui existe')
a(drillById('course', 'askip').label === 'A-skips', 'acces par identifiant')
a(drillById('course', 'nawak') === null, 'identifiant inconnu -> null')

// ─── resumes ───
a(warmupSummary(null) === null && warmupSummary({}) === null, 'aucun echauffement -> null')
const w = warmupSummary({ mins: 15, kinds: ['general', 'mobilite'] })
a(w.mins === 15 && /15 min/.test(w.text), 'duree resumee')
a(/g[ée]n[ée]ral \+ mobilit[ée]/.test(w.text), 'et les formes retenues')
a(w.complete, '15 min et deux formes : echauffement complet')
a(!warmupSummary({ mins: 5, kinds: ['general'] }).complete, '5 min et une forme : incomplet')
a(drillsSummary('course', ['askip', 'talons']).count === 2, 'deux educatifs resumes')
a(drillsSummary('course', ['askip', 'nawak']).count === 1, 'un identifiant inconnu est ecarte')
a(drillsSummary('course', []) === null, 'aucun educatif -> null')

// ─── relecture : le cas qui compte ───
const S = (n, opts) => ({ id: 's' + n, date: back(n), sport: 'course', statut: 'realise', duree: '1 h',
  data: { rpe: (opts && opts.rpe) || 5, echauffement: opts && opts.wu, educatifs: opts && opts.dr } })
a(warmupHabit({}, { today: T }) === null, 'aucune seance -> null')
// Deux seances dures sans echauffement : c est la que le manque se paie.
const dures = { planningSessions: [S(1, { rpe: 8 }), S(3, { rpe: 8 }), S(5, { rpe: 4, wu: { mins: 15, kinds: ['general'] } })] }
const h1 = warmupHabit(dures, { today: T })
a(h1.hardWithout === 2 && h1.level === 'warn', `${h1.hardWithout} seances dures sans echauffement`)
a(/c.est l[àa] que le manque se paie/i.test(h1.text), 'et la raison est donnee')
a(/sortie facile, le corps a le temps/.test(h1.text), 'sans reprocher l absence sur une seance facile')
// Bien echauffe : rien a signaler.
const bien = { planningSessions: [1, 3, 5, 7].map((n) => S(n, { rpe: 8, wu: { mins: 15, kinds: ['general', 'mobilite'] } })) }
const h2 = warmupHabit(bien, { today: T })
a(h2.pct === 100 && h2.level === 'ok' && h2.text === null, 'toutes echauffees -> aucun reproche')
a(warmupHabit({ planningSessions: [S(1, { rpe: 8, wu: { mins: 5 } })] }, { today: T }).withWarmup === 0,
  `5 min ne comptent pas comme un echauffement (seuil ${WARMUP_MIN_MINS} min)`)

// ─── educatifs relus ───
a(drillHabit({}, { today: T }) === null, 'aucune seance -> null')
const sansEduc = { planningSessions: [1, 3, 5, 7].map((n) => S(n, { rpe: 6 })) }
const d1 = drillHabit(sansEduc, { today: T })
a(d1.worst.pct === 0, 'aucun educatif note')
a(/changent le geste plut[ôo]t que la condition/.test(d1.text), 'et ce qu on y perd est dit')
const partiel = { planningSessions: [1, 3, 5, 7].map((n) => S(n, { rpe: 6, dr: ['askip'] })) }
const d2 = drillHabit(partiel, { today: T })
a(d2.worst.pct === 100 && d2.worst.never.length > 0, `${d2.worst.never.length} educatifs jamais faits malgre tout`)
a(/jamais faits/.test(d2.text), 'et ils sont nommes')
a(drillHabit({ planningSessions: [S(1, { rpe: 6 })] }, { today: T }) === null, 'moins de trois seances -> aucune conclusion')
console.log('\nALL PASS')
