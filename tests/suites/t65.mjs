// Routines de mobilite et de pliometrie, composees a la main.
import { ROUTINE_KINDS, kindOf, movementsFor, makeRoutine, routineValid, routineMins,
  routineList, routinesToday, routinesDue, markDone, unmarkDone, lastDone, daysSince,
  routineStreak, dowOf, DOW_LABELS, MAX_MOVES,
  fitToDuration, durationOptions, DURATION_CHOICES, MIN_MOVES_KEPT }
  from '../../src/features/train/routines.js'
import { getSession, EX } from '../../src/features/train/trainData.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── catalogue ───
a(ROUTINE_KINDS.length === 2, 'deux types : mobilite et pliometrie')
const mob = movementsFor('mobilite')
const plyo = movementsFor('pliometrie')
a(mob.length > 100, `${mob.length} mouvements de mobilite, tires du catalogue existant`)
a(plyo.length > 20, `${plyo.length} mouvements de pliometrie`)
a(!mob.some((m) => plyo.some((p) => p.key === m.key)), 'les deux listes ne se recoupent pas')
a(mob.every((m) => EX[m.key] && !EX[m.key].isRest), 'aucune recuperation dans la liste : on ne compose pas une routine de pauses')
a(mob.every((m, i) => i === 0 || mob[i - 1].name.localeCompare(m.name, 'fr') <= 0), 'triee par nom')
a(movementsFor('nawak').length === mob.length, 'type inconnu -> mobilite par defaut')

// ─── creation ───
const r = makeRoutine({ kind: 'mobilite', name: '  Réveil matin  ', keys: [mob[0].key, mob[1].key], sets: 2, restSecs: 15, dows: [0, 3] })
a(r.name === 'Réveil matin', 'le nom est nettoye')
a(r.keys.length === 2 && r.sets === 2 && r.restSecs === 15, 'mouvements, tours et recuperation')
a(r.dows.length === 2 && r.dows.includes(0) && r.dows.includes(3), 'les jours retenus')
a(r.cat === 'mobilite' && r.custom === true, 'categorie et provenance')
a(routineValid(r), 'routine valide')
a(!routineValid(makeRoutine({ kind: 'mobilite', name: 'Vide', keys: [] })), 'sans mouvement -> invalide')
a(makeRoutine({ kind: 'mobilite', name: '' }).name.length > 0, 'un nom vide recoit un libelle par defaut')
a(makeRoutine({ kind: 'mobilite', keys: ['nawak', mob[0].key] }).keys.length === 1, 'une cle inconnue est ecartee')
a(makeRoutine({ kind: 'mobilite', keys: ['rest', mob[0].key] }).keys.length === 1, 'la recuperation ne se compose pas')
a(makeRoutine({ kind: 'mobilite', keys: mob.slice(0, 40).map((m) => m.key) }).keys.length === MAX_MOVES, `au plus ${MAX_MOVES} mouvements`)
a(makeRoutine({ kind: 'mobilite', keys: [mob[0].key], sets: 99 }).sets <= 10, 'nombre de tours borne')
a(makeRoutine({ kind: 'mobilite', keys: [mob[0].key], dows: [9, -1, 2] }).dows.length === 1, 'les jours hors semaine sont ecartes')
a(routineMins(r) > 0, `duree estimee : ${routineMins(r)} min`)
a(routineMins({ keys: [] }) === 0, 'aucune duree sans mouvement')
a(kindOf('pliometrie').defaultSets > kindOf('mobilite').defaultSets, 'la pliometrie propose plus de tours par defaut que la mobilite')

// ─── LE point : une routine est jouable comme une seance ───
a(getSession(r.id, null, [r]) === r, 'le lecteur retrouve la routine par le meme chemin qu une seance')
a(getSession('nawak', null, [r]) === null, 'un identifiant inconnu reste introuvable')
a(getSession(r.id, null, null) === null, 'sans routines fournies, rien')

// ─── les jours retenus ───
// Lundi 2026-08-10.
a(dowOf('2026-08-10') === 0 && dowOf('2026-08-16') === 6, 'lundi en tete, dimanche en fin')
a(dowOf('nawak') === null, 'date invalide -> null')
const db = { routines: [r], routineLog: {} }
a(routinesToday(db, { today: '2026-08-10' }).length === 1, 'lundi : la routine du lundi apparait')
a(routinesToday(db, { today: '2026-08-11' }).length === 0, 'mardi : elle ne se rappelle pas')
a(routinesToday(db, { today: '2026-08-13' }).length === 1, 'jeudi : elle revient')
const sansJour = { routines: [makeRoutine({ kind: 'mobilite', name: 'Libre', keys: [mob[0].key], dows: [] })] }
a(routinesToday(sansJour, { today: '2026-08-10' }).length === 0, 'une routine sans jour ne se rappelle a personne')

// ─── fait, pas fait ───
const patch = markDone(db, r.id, { today: '2026-08-10' })
const done = { ...db, ...patch }
a(routinesToday(done, { today: '2026-08-10' })[0].done === true, 'marquee faite')
a(routinesDue(done, { today: '2026-08-10' }).length === 0, 'et elle ne reste plus a faire')
a(markDone(done, r.id, { today: '2026-08-10' }).routineLog['2026-08-10'].length === 1, 'la marquer deux fois ne la compte pas deux fois')
const undone = { ...done, ...unmarkDone(done, r.id, { today: '2026-08-10' }) }
a(routinesDue(undone, { today: '2026-08-10' }).length === 1, 'on peut revenir en arriere')
a(undone.routineLog['2026-08-10'] === undefined, 'et le jour vide ne reste pas dans le journal')
a(lastDone(done, r.id) === '2026-08-10', 'la derniere fois est retrouvee')
a(daysSince('2026-08-10', '2026-08-17') === 7, 'sept jours d ecart')

// ─── observance ───
const assidu = { routines: [r], routineLog: {} }
for (const d of ['2026-08-10', '2026-08-13', '2026-08-17', '2026-08-20']) assidu.routineLog[d] = [r.id]
const st = routineStreak(assidu, r.id, { today: '2026-08-21', days: 28 })
a(st.count === 4, `${st.count} fois sur 28 jours`)
a(st.perWeek === 1, `soit ${st.perWeek} fois par semaine`)
a(routineStreak({}, 'nawak', { today: '2026-08-21' }).count === 0, 'aucun journal -> zero, sans lever')

// ─── robustesse ───
a(routineList({ routines: {} }).length === 0, 'un journal mal forme ne leve pas')
a(routineList({ routines: [null, r] }).length === 1, 'les entrees nulles sont ecartees')
a(routinesToday({}, { today: '2026-08-10' }).length === 0, 'base vide -> aucune routine')

// ─── ajuster une routine a une duree ───
// « J ai dix minutes » est la question qu on se pose avant celle des mouvements.
const { templateRoutine } = await import('../../src/features/train/routineTemplates.js')
const modele = templateRoutine('mob-hanches', 1)
a(modele.keys.length === 5, `modele de ${modele.keys.length} mouvements, ~${routineMins(modele)} min`)

for (const t of DURATION_CHOICES) {
  const f = fitToDuration(modele, t)
  a(f.fitted && f.keys.length >= MIN_MOVES_KEPT, `${t} min : au moins ${MIN_MOVES_KEPT} mouvements gardes`)
  a(f.sets >= 1, `${t} min : au moins un tour`)
  a(Math.abs(routineMins(f) - t) <= 6, `${t} min visees -> ${routineMins(f)} min`)
  a(f.keys.every((k) => modele.keys.includes(k)), `${t} min : aucun mouvement invente`)
  // Les modeles listent du plus important au moins : ce qui tombe est la fin.
  a(f.keys.join() === modele.keys.slice(0, f.keys.length).join(), `${t} min : les mouvements retires sont ceux de la fin`)
}
// Une duree plus longue ne donne jamais une routine plus courte.
const courte = fitToDuration(modele, 10)
const longue = fitToDuration(modele, 30)
a(routineMins(longue) > routineMins(courte), `10 min -> ${routineMins(courte)} min, 30 min -> ${routineMins(longue)} min`)
a(fitToDuration(modele, 0).fitted === false, 'aucune duree demandee -> routine inchangee')
a(fitToDuration({ keys: [] }, 10) === null, 'routine invalide -> null')

const opts = durationOptions(modele)
a(opts.length === DURATION_CHOICES.length, `${opts.length} durees proposees`)
a(opts.every((o) => o.moves >= MIN_MOVES_KEPT && o.sets >= 1), 'chaque proposition reste une routine')
a(opts.filter((o) => o.exact).length >= 3, `${opts.filter((o) => o.exact).length} durees atteintes a la minute pres`)
a(durationOptions({ keys: [] }).length === 0, 'routine invalide -> aucune proposition')

console.log('\nALL PASS')
