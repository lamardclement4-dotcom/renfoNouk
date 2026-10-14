// Rappels des notifications de la montre (0008) : ce que le site prepare
// pour aujourd hui et demain.
import { rappelsMontre, bandesForme, texteSeances, instantLocal } from '../../src/features/health/rappelsMontre.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
import { readFileSync } from 'node:fs'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-15'

a(/^2026-10-15T04:00:00[+-]\d{2}:\d{2}$/.test(instantLocal(J, 4)) && /^2026-10-16T00:00:00/.test(instantLocal(J, 24)), 'heures locales avec decalage ; 24 h = minuit du lendemain')

const db = {
  sleepLog: {}, vitalsLog: {}, sleepRoutine: { enabled: true, wake: '07:00', bedtime: '23:00' },
  planningSessions: [
    { id: 's1', date: J, statut: 'planifie', sport: 'course', heure: '18:30', duree: '1 h' },
    { id: 's2', date: J, statut: 'planifie', sport: 'muscu', heure: '07:30', duree: '45 min' },
    { id: 's3', date: J, statut: 'realise', sport: 'course', duree: '1 h' },
  ],
}
for (let k = 1; k <= 7; k++) db.sleepLog[decaler(J, -k)] = { hours: 7.5 }

a(texteSeances(db, J) === 'Séances du jour : Musculation à 07:30, 45 min ; Course à pied à 18:30, 1 h.' || /^Séances du jour : .* à 07:30, 45 min ; Course à pied à 18:30, 1 h\.$/.test(texteSeances(db, J)), 'seances prevues du jour, dans l ordre : ' + texteSeances(db, J))
a(texteSeances(db, decaler(J, 1)) === null, 'pas de seance prevue : pas de rappel de midi')

const bandes = bandesForme(db, J)
a(bandes.length >= 3 && bandes.every((b, i) => i === 0 || b.min > bandes[i - 1].min) && bandes[0].min === 240, 'bandes de forme de 4 h a 10 h, croissantes (' + bandes.length + ')')
a(bandes.every((b) => /^Forme du jour : \d+\/100\. /.test(b.texte) && /^Forme \d+ : /.test(b.court)), 'chaque bande : note complete et resume court')
const s4 = Number(/(\d+)\/100/.exec(bandes[0].texte)[1]), s9 = Number(/(\d+)\/100/.exec(bandes[bandes.length - 1].texte)[1])
a(s9 > s4, 'plus la nuit est longue, meilleure la note (' + s4 + ' → ' + s9 + ')')

const r = rappelsMontre(db, J)
const du = (jour, m) => r.find((x) => x.jour === jour && x.moment === m)
a(du(J, 'matin') && du(J, 'matin').bandes && du(J, 'midi') && du(J, 'apresmidi') && du(J, 'soir'), 'aujourd hui : matin (bandes), midi, apres-midi, soir')
a(/\{forme\}$/.test(du(J, 'midi').texte), 'midi : la forme du matin sera ajoutee par le serveur')
a(du(J, 'apresmidi').texte === 'Eau : {bu} sur {cible}. Il reste {reste}.' && du(J, 'apresmidi').cible_eau >= 500, 'apres-midi : eau, cible fournie, quantite lue par le serveur')
a(/^Ce soir : au lit vers \d\d:\d\d pour dormir \d+ h/.test(du(J, 'soir').texte), 'soir : coucher conseille : ' + du(J, 'soir').texte)
a(du(decaler(J, 1), 'matin') && !du(decaler(J, 1), 'midi'), 'demain prepare aussi (sans seance prevue : pas de midi)')
a(/T04:00/.test(du(J, 'matin').debut) && /T11:00/.test(du(J, 'matin').fin) && /T11:00/.test(du(J, 'midi').debut) && /T13:00/.test(du(J, 'apresmidi').debut) && /T18:00/.test(du(J, 'soir').debut), 'creneaux : matin 4-11 h, midi 11-15 h, apres-midi 13-18 h, soir 18-24 h')

// Nuit deja connue : note exacte, pas de bandes ; midi avec la forme
const db2 = { ...db, sleepLog: { ...db.sleepLog, [J]: { hours: 8, quality: 4, reveil: { energie: 4, sensations: [] } } } }
const r2 = rappelsMontre(db2, J)
const m2 = r2.find((x) => x.jour === J && x.moment === 'matin'), d2 = r2.find((x) => x.jour === J && x.moment === 'midi')
a(m2 && !m2.bandes && /^Forme du jour : \d+\/100/.test(m2.texte) && /Forme \d+ : /.test(d2.texte) && !/\{forme\}/.test(d2.texte), 'nuit deja saisie : forme exacte, midi complet')
a(r.length <= 16 && JSON.stringify(r).length < 20000, 'au plus 16 rappels, taille raisonnable (' + JSON.stringify(r).length + ' octets)')

const sql = readFileSync(new URL('../../supabase/migrations/0008_rappels_montre.sql', import.meta.url), 'utf8')
a(/alter table rappels_montre enable row level security/.test(sql) && /revoke all on rappels_montre from anon/.test(sql) && /grant execute on function preparer_rappels_montre\(jsonb\) to authenticated/.test(sql) && /revoke all on function rappels_du_moment\(uuid, int\) from public/.test(sql), '0008 : RLS, preparation reservee a la session, calcul interne ferme')
a(/jsonb_array_length\(lignes\) > 16/.test(sql) && /char_length\(texte\) between 1 and 600/.test(sql), '0008 : nombre et taille des rappels bornes')
a(/create domain public\."text\/plain" as text/.test(sql) && /returns "text\/plain"/.test(sql), '0008 : reponse typee « text/plain » (sinon PostgREST 12 repond 406 au raccourci)')
console.log('\nALL PASS')
