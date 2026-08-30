// Doublons de mouvements en musculation.
//
// Le meme exercice pouvait figurer deux fois dans une seance : deux entrees
// separees, deux listes de series. Outre l encombrement, la seconde ecrasait
// la premiere dans l historique des charges — un bloc de decharge a 60 kg
// apres une serie lourde a 100 kg faisait proposer moins la fois suivante.
import { EXERCISES_DB, searchExercises, exercisesOfGroup } from '../../src/features/train/plannerData.js'
import { setRows, exerciseProgress, lastPerformance } from '../../src/features/train/muscuIntel.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── le catalogue lui-meme ───
const all = []
for (const [g, list] of Object.entries(EXERCISES_DB)) for (const n of list) all.push({ n, g })
a(all.length > 150, `${all.length} exercices au catalogue`)
a(new Set(all.map((x) => x.n)).size === all.length, 'aucun nom en double entre les groupes')
const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
a(new Set(all.map((x) => norm(x.n))).size === all.length, 'ni a la casse et aux accents pres')
for (const [g, list] of Object.entries(EXERCISES_DB)) {
  a(new Set(list).size === list.length, `${g} : aucun doublon interne`)
}

// ─── la recherche ne repete pas ───
for (const q of ['developpe', 'curl', 'squat', 'tirage', 'e']) {
  const r = searchExercises(q, { limit: 40 })
  a(new Set(r.map((x) => x.n)).size === r.length, `« ${q} » : ${r.length} resultats, aucun repete`)
}
for (const g of Object.keys(EXERCISES_DB)) {
  const r = exercisesOfGroup(g)
  a(new Set(r.map((x) => (typeof x === 'string' ? x : x.n))).size === r.length, `groupe ${g} : liste sans repetition`)
}

// ─── LE defaut : deux entrees du meme exercice dans une seance ───
const seance = {
  id: 's1', date: '2026-08-20', sport: 'muscu', statut: 'realise', duree: '1 h',
  exercises: [
    { name: 'Développé couché', group: 'Pectoraux', sets: [{ mode: 'reps', series: 3, reps: 5, charge: 100, rpe: 8 }] },
    { name: 'Développé couché', group: 'Pectoraux', sets: [{ mode: 'reps', series: 3, reps: 12, charge: 60, rpe: 6 }] },
  ],
}
const db = { planningSessions: [seance] }
// Le volume, lui, est bien la somme des deux : les series ont ete faites.
const rows = setRows(db, { days: 90, today: '2026-08-21' })
const dc = rows.filter((r) => r.name === 'Développé couché')
a(dc.length === 2, 'les deux blocs de series comptent dans le volume : ils ont ete faits')
// Mais la charge de reference doit rester la plus lourde.
const prog = exerciseProgress(db, 'Développé couché', { days: 90, today: '2026-08-21' })
a(prog && prog.best, 'une progression est calculee')
a(prog.best.topCharge === 100, `la charge de reference est ${prog.best.topCharge} kg, la plus lourde des deux blocs`)
a(prog.best.best1RM >= 100, `et la force estimee suit (${prog.best.best1RM} kg)`)
const last = lastPerformance(db, 'Développé couché', { days: 90, today: '2026-08-21' })
a(!last || last.charge === 100, 'la derniere performance retenue est la plus lourde, pas la derniere saisie')
console.log('\nALL PASS')
