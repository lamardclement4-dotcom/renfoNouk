// Sommeil, cinquieme etage : chronotype, la forme qui annonce (ou non) le
// ressenti des seances, et le coucher conseille tenu ou pas.
import { chronotype } from '../../src/features/health/sommeilForme.js'
import { formeEtSeances, respectCoucher } from '../../src/features/health/formeContexte.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
import { coachReply } from '../../src/features/train/coachChat.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-09' // vendredi
const we = (iso) => { const j = new Date(iso + 'T00:00:00Z').getUTCDay(); return j === 0 || j === 6 }

// ─── Chronotype ───
const mk = (semaine, weekend) => {
  const log = {}
  for (let k = 0; k < 21; k++) { const iso = decaler(J, -k); log[iso] = { hours: 7.5, endormissement: 15, ...(we(iso) ? weekend : semaine) } }
  return log
}
const inter = chronotype(mk({ coucher: '23:15', lever: '07:00' }, { coucher: '00:40', lever: '08:30' }), J)
a(inter.id === 'intermediaire' && inter.estime && inter.milieu === '04:41', 'week-end 00:40-08:30 : intermediaire, milieu de nuit 04:41 (' + (inter && inter.milieu) + ')')
a(/milieu d’après-midi/.test(inter.texte), 'avec l heure de pic de performance')
const soir = chronotype(mk({ coucher: '00:30', lever: '07:30' }, { coucher: '03:00', lever: '11:30' }), J)
a(soir.id === 'tres-soir' && /soirée/.test(soir.texte), 'week-end 3 h - 11 h 30 : tres du soir')
const matin = chronotype(mk({ coucher: '21:30', lever: '05:30' }, { coucher: '21:45', lever: '05:45' }), J)
a(matin.id === 'tres-matin' || matin.id === 'matin', 'couche-tot leve-tot : du matin (' + matin.lab + ')')
// Rattrapage du week-end : corrige
const rattrape = chronotype(mk({ coucher: '23:30', lever: '06:00' }, { coucher: '23:30', lever: '10:30' }), J)
a(rattrape.milieu === '03:31', 'week-end rattrape (10 h 45 contre 6 h 15) : milieu de nuit avance de 05:07 a ' + rattrape.milieu + ', pour ne pas confondre fatigue et horloge')
const sansWe = {}
for (let k = 0; k < 7; k++) { const iso = decaler(J, -k); if (!we(iso)) sansWe[iso] = { hours: 7.5, coucher: '23:00', lever: '07:00', endormissement: 15 } }
const est = chronotype(sansWe, J)
a(est && !est.estime && /plus juste/.test(est.texte), 'sans week-end : estimation sur toutes les nuits, dite comme telle')
a(chronotype({ [J]: { hours: 7, coucher: '23:00', lever: '07:00' } }, J) === null && chronotype({}, J) === null, 'trop peu de nuits : pas de profil invente')

// ─── La forme et les seances ───
const db = { sleepLog: {}, planningSessions: [] }
for (let k = 0; k < 12; k++) {
  const iso = decaler(J, -k * 2), bonne = k % 2 === 0
  db.sleepLog[iso] = bonne ? { hours: 8.5, quality: 5, reveil: { energie: 5, sensations: [] } } : { hours: 5, quality: 1, reveil: { energie: 1, sensations: ['groggy'] } }
  db.planningSessions.push({ id: 's' + k, date: iso, statut: 'realise', sport: 'course', duree: '45 min', ressenti: bonne ? 5 : 2 })
}
const fs = formeEtSeances(db, J)
a(fs.haute === 6 && fs.basse === 6 && fs.ressentiHaute === 5 && fs.ressentiBasse === 2 && fs.ecart === 3, 'ressenti 5/5 en bonne forme contre 2/5 en forme faible')
a(/annonce bien tes séances/.test(fs.texte) && /5\/5 en bonne forme contre 2\/5/.test(fs.texte), 'dit que la note tient la route')
const peu = formeEtSeances({ ...db, planningSessions: db.planningSessions.slice(0, 3) }, J)
a(peu.ecart === null && /il en faut 3 de chaque/.test(peu.texte), 'trop peu de seances : le dit, sans conclure')
a(formeEtSeances({}, J).seances === 0, 'aucune seance notee : rien')

// ─── Coucher conseille tenu ───
const r = { sleepRoutine: { enabled: true, wake: '07:00' }, sleepLog: {} }
;['22:45', '22:50', '23:45', '22:40', '23:45', '22:45'].forEach((c, k) => { r.sleepLog[decaler(J, -k)] = { hours: 8, coucher: c, lever: '07:00' } })
const t = respectCoucher(r, J)
a(t && t.nuits === 6 && t.tenus === 4 && t.retard === 60, 'tenu 4 soirs sur 6, une heure plus tard les autres (' + (t && t.texte) + ')')
a(/4 soirs sur 6/.test(t.texte) && /1 h plus tard/.test(t.texte), 'dit en clair')
const sansLever = {}
for (const [d, e] of Object.entries(r.sleepLog)) sansLever[d] = { hours: 8, coucher: e.coucher }
a(respectCoucher({ sleepLog: sansLever }, J) === null, 'ni routine ni lever connu : pas de conseil, pas de verdict')
a(respectCoucher({ sleepLog: r.sleepLog }, J).nuits === 3 && respectCoucher({ sleepLog: r.sleepLog }, J).tenus === 2, 'sans routine : le lever habituel sert de reference, des qu il est connu (3 levers avant le soir)')

// ─── Coach : meilleur moment ───
const c = coachReply('quel est mon chronotype ?', { sleepLog: mk({ coucher: '23:15', lever: '07:00' }, { coucher: '00:40', lever: '08:30' }) })
a(/Profil intermédiaire/.test(c.text), 'coach : chronotype et pic de performance')
a(/il me faut tes heures/.test(coachReply('meilleur moment pour m entrainer', { sleepLog: {} }).text), 'coach : sans heures, explique quoi saisir')
console.log('\nALL PASS')
