// Coach : la forme du jour repondue en clair, et accolee a la seance du
// jour, au sommeil et a la fatigue.
import { coachReply, STARTER_CHIPS } from '../../src/features/train/coachChat.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const d = new Date(), p = (n) => String(n).padStart(2, '0')
const J = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())

const vide = coachReply('ma forme du jour', { sleepLog: {} })
a(/saisis ta nuit/.test(vide.text) && vide.action === 'sommeil', 'sans nuit : invite a la saisir, sans note inventee')

const db = {
  sleepLog: { [J]: { hours: 6, quality: 2, reveil: { energie: 2, sensations: ['groggy'] } } },
  planningSessions: [
    { statut: 'realise', date: decaler(J, -1), duree: '2 h', data: { rpe: 9 } },
    { statut: 'realise', date: decaler(J, -5), duree: '1 h', data: { rpe: 5 } },
    { statut: 'realise', date: decaler(J, -8), duree: '1 h', data: { rpe: 5 } },
    { statut: 'realise', date: decaler(J, -12), duree: '1 h', data: { rpe: 5 } },
    { statut: 'planifie', date: J, sport: 'course', duree: '1 h' },
  ],
  sleepRoutine: { enabled: true, wake: '07:00', bedtime: '23:00' },
}
const f = coachReply('ma forme du jour', db)
a(/^Forme du jour : \d+\/100\./.test(f.text), 'la note en tete : ' + f.text.slice(0, 40))
a(/Ce qui pèse : /.test(f.text) && /séance d’hier/.test(f.text), 'dit ce qui fait baisser la note')
a(/Ce soir, au lit vers \d\d:\d\d/.test(f.text), 'donne l heure du coucher')
a(coachReply('est-ce que je suis en forme ?', db).text.startsWith('Forme du jour'), 'question en langage courant reconnue')
a(!/Forme du jour/.test(coachReply('mon pic de forme', db).text.slice(0, 20)), 'le pic de forme reste une autre question')

const s = coachReply("quelle séance aujourd'hui ?", db)
a(/Ta forme du jour : \d+\/100 — /.test(s.text), 'la seance prevue vient avec la forme et la consigne')

const n = coachReply('mon sommeil', db)
a(/Cette nuit : 6 h, qualité 2\/5, énergie au réveil 2\/5 \(fatigué\)/.test(n.text) && /Forme du jour : \d+\/100/.test(n.text), 'sommeil : duree ecrite en heures, energie, forme (' + n.text.slice(0, 70) + ')')

const fat = coachReply('je suis crevé', db)
a(/Ta forme du jour est à \d+\/100/.test(fat.text), 'fatigue : la forme du jour citee')
a(STARTER_CHIPS[0] === 'Ma forme du jour', 'premiere suggestion : la forme du jour')
console.log('\nALL PASS')
