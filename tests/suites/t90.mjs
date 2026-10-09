// Accueil : la forme du jour avec sa consigne sous « A faire », et le soir
// l heure du coucher conseillee.
import '../harness/browser-env.mjs'
import { __render, __reset } from '../harness/react-stub4.mjs'
import { __setDb } from '../harness/store-hook-stub.mjs'
import { RICH } from './t50fixture.mjs'
import Accueil from '../../src/features/home/AccueilSpace.jsx'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const text = (n) => { if (n == null || n === false) return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n) + ' '
  if (Array.isArray(n)) return n.map(text).join('')
  return text(n.children) }
const d = new Date(), p = (n) => String(n).padStart(2, '0')
const J = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
const noop = () => {}
const props = { userId: 'u1', onClose: noop, onProfil: noop, onBack: noop }
const heures = Date.prototype.getHours
const rendu = (h, extra) => {
  Date.prototype.getHours = function () { return h }
  try { __reset(); __setDb({ ...RICH, ...extra }); return text(__render('acc' + h, Accueil, props)) } finally { Date.prototype.getHours = heures }
}

const avec = { sleepRoutine: { enabled: true, bedtime: '23:00', wake: '07:00' }, sleepLog: { [J]: { hours: 7.5, quality: 4, reveil: { energie: 4, sensations: [] } } } }
const soir = rendu(20, avec)
a(/Forme du jour/.test(soir) && /Séance prévue|Allège|Repos/.test(soir), 'forme du jour et consigne sous « À faire »')
a(/Ce soir : au lit vers \d\d:\d\d/.test(soir) && /avant ton lever de 07:00/.test(soir), 'le soir : heure du coucher conseillee')
const matin = rendu(9, avec)
a(!/Ce soir : au lit/.test(matin), 'le matin : pas de rappel du coucher')
const sansNuit = rendu(9, { sleepLog: {} })
a(/Comment as-tu dormi \?/.test(sansNuit) && !/Forme du jour —/.test(sansNuit), 'nuit non saisie : rappel, pas de forme inventee')
console.log('\nALL PASS')
