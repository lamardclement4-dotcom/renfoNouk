// Forme du jour, troisieme etage : detail du calcul, seance d'hier, jours
// enchaines, douleur, consigne, serie de 7 jours, coucher conseille,
// endormissement et decalage du week-end.
import { formeDuJour, formeSerie, coucherConseille, regulariteHoraires, libelleDuree } from '../../src/features/health/sommeilForme.js'
import { formeContexte, formeDb, formeSemaine, coucherDuSoir } from '../../src/features/health/formeContexte.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-09' // vendredi

// ─── Detail du calcul ───
const nuit = { [J]: { hours: 7, quality: 3, reveil: { energie: 3, sensations: ['groggy'] } } }
const f = formeDuJour(nuit, J, 0)
const somme = f.parts.reduce((x, p) => x + p.pts, 0) + f.ajustements.reduce((x, p) => x + p.pts, 0)
a(f.parts.map((p) => p.id).join() === 'duree,dette,energie,qualite' && f.parts.reduce((x, p) => x + p.max, 0) === 100, 'quatre parts, 100 points au total')
a(somme === f.score, 'le detail additionne exactement la note (' + somme + ' = ' + f.score + ')')
a(f.parts[0].texte === '7 h pour 8 h de besoin' && f.parts[2].texte === '3/5, correct', 'chaque part dit d ou viennent ses points')
a(f.ajustements.length === 1 && f.ajustements[0].id === 'sensations' && f.ajustements[0].pts === -5 && f.ajustements[0].texte === 'Groggy', 'sensations en ajustement nomme')
a(typeof f.consigne === 'string' && f.consigne.length > 20, 'une consigne concrete pour la seance')

// Ancienne forme (minutes de la semaine) toujours acceptee
a(formeDuJour(nuit, J, 400).besoin === 8.5 && formeDuJour(nuit, J, { minutesSemaine: 400 }).besoin === 8.5, 'contexte nombre ou objet : meme besoin')

// ─── Seance d'hier ───
const bonne = { [J]: { hours: 8, quality: 4, reveil: { energie: 4, sensations: [] } } }
const base = formeDuJour(bonne, J, {}).score
const dure = formeDuJour(bonne, J, { chargeHier: 200, chargeHabituelle: 90 })
const aj = dure.ajustements.find((x) => x.id === 'charge')
a(aj && aj.pts === -10 && /2,2 fois ta séance habituelle/.test(aj.texte) && dure.score === base - 10, 'seance d hier 2,2 fois l habitude : -10 (' + (aj && aj.texte) + ')')
const plus = formeDuJour(bonne, J, { chargeHier: 120, chargeHabituelle: 90 }).ajustements.find((x) => x.id === 'charge')
a(plus.pts === -6 && /33 % de plus/.test(plus.texte), 'un tiers de plus que d habitude : -6')
const normale = formeDuJour(bonne, J, { chargeHier: 80, chargeHabituelle: 90 }).ajustements.find((x) => x.id === 'charge')
a(normale.pts === 0 && /dans ton habitude/.test(normale.texte), 'seance habituelle : montree, sans penalite')
a(formeDuJour(bonne, J, { chargeHier: 0 }).ajustements.length === 0, 'repos hier : rien a ajuster')

// ─── Jours enchaines ───
a(formeDuJour(bonne, J, { joursDaffilee: 3 }).ajustements[0].pts === -4 && formeDuJour(bonne, J, { joursDaffilee: 6 }).ajustements[0].pts === -6, 'trois jours d affilee : -4, cinq et plus : -6')
a(formeDuJour(bonne, J, { joursDaffilee: 2 }).ajustements.length === 0, 'deux jours : normal')

// ─── Douleur ───
const dl = formeDuJour(bonne, J, { douleur: { region: 'genou', jours: 9, urgent: false } })
a(dl.ajustements[0].pts === -10 && dl.ajustements[0].texte === 'Genou, depuis 9 jours' && /zone douloureuse \(genou\)/.test(dl.consigne), 'douleur depuis plus d une semaine : -10 et consigne de menager la zone')
const du = formeDuJour(bonne, J, { douleur: { region: 'hanche / bassin', jours: 1, urgent: true } })
a(du.niveau === 'basse' && /avis/.test(du.consigne) && /faire voir/.test(du.verdict), 'douleur a faire voir : repos de la zone, quelle que soit la note')
const fievre = formeDuJour({ [J]: { hours: 8, quality: 5, reveil: { energie: 4, sensations: ['malade'] } } }, J, {})
a(fievre.niveau === 'basse' && /fièvre/.test(fievre.consigne), 'fievre : consigne de reprise en douceur')

// ─── Serie de 7 jours ───
const log7 = {}
for (let k = 0; k < 7; k++) if (k !== 2) log7[decaler(J, -k)] = { hours: 6 + k * 0.25, reveil: { energie: 3, sensations: [] } }
const serie = formeSerie(log7, J, () => 0, 7)
a(serie.length === 7 && serie[6].iso === J && serie[0].iso === decaler(J, -6), 'serie du plus ancien au plus recent')
a(serie[4].score === null && serie.filter((x) => x.score != null).length === 6, 'nuit manquante : case vide, pas de note inventee')

// ─── Coucher conseille ───
const c1 = coucherConseille({}, J, { besoin: 8, routine: { enabled: true, wake: '07:00' } })
a(c1 && c1.coucher === '22:45' && c1.source === 'routine' && c1.endormissement === 15, 'lever 7 h, besoin 8 h, 15 min : au lit a 22:45')
const avecDette = coucherConseille({}, J, { besoin: 8.5, routine: { enabled: true, wake: '06:30' }, dette: 6 })
a(avecDette.coucher === '21:15' && avecDette.bonus === 30 && /résorber la dette/.test(avecDette.texte), 'dette de 6 h : une demi-heure de plus (' + avecDette.coucher + ')')
const hab = {}
;['07:00', '07:10', '06:50', '07:00'].forEach((l, k) => { hab[decaler(J, -k)] = { hours: 7, coucher: '23:30', lever: l, endormissement: 30 } })
const c2 = coucherConseille(hab, J, { besoin: 8 })
a(c2.source === 'habitude' && c2.lever === '07:00' && c2.endormissement === 30 && c2.coucher === '22:30', 'sans routine : lever et endormissement habituels (' + c2.coucher + ')')
a(coucherConseille({}, J, { besoin: 8 }) === null && coucherConseille({}, J, { besoin: 8, routine: { enabled: false, wake: '07:00' } }) === null, 'ni routine suivie ni heures saisies : pas de conseil invente')

// ─── Endormissement et decalage du week-end ───
// Semaine : 23:00 -> 07:00. Week-end (reveil samedi et dimanche) : 01:00 -> 10:00.
const sw = {}
for (let k = 0; k < 14; k++) {
  const iso = decaler(J, -k)
  const jour = new Date(iso + 'T00:00:00Z').getUTCDay()
  const we = jour === 0 || jour === 6
  sw[iso] = { hours: 7.5, coucher: we ? '01:00' : '23:00', lever: we ? '10:00' : '07:00', endormissement: 40 }
}
const r = regulariteHoraires(sw, J)
a(r.endormissement === 40 && /20 minutes/.test(r.texteEndormissement), 'endormissement de 40 min : conseil de se relever')
a(r.decalage === 150 && /2 h 30 plus tard le week-end/.test(r.texteDecalage), 'nuit qui glisse de 2 h 30 le week-end (' + r.decalage + ' min)')

// ─── Contexte tire des donnees ───
const db = {
  sleepLog: bonne,
  planningSessions: [
    { statut: 'realise', date: decaler(J, -1), duree: '2 h', data: { rpe: 9 } },
    { statut: 'realise', date: decaler(J, -2), duree: '1 h', data: { rpe: 5 } },
    { statut: 'realise', date: decaler(J, -3), duree: '1 h', data: { rpe: 5 } },
    { statut: 'realise', date: decaler(J, -8), duree: '1 h', data: { rpe: 5 } },
    { statut: 'realise', date: decaler(J, -12), duree: '1 h', data: { rpe: 5 } },
    { statut: 'planifie', date: J, duree: '1 h' },
    { statut: 'realise', date: J, duree: '3 h', data: { rpe: 10 } },
  ],
  painEpisodes: [{ region: 'genou', start: decaler(J, -4), end: null, urgent: false }, { region: 'dos', start: decaler(J, -40), end: decaler(J, -30) }],
}
const ctx = formeContexte(db, J)
a(ctx.chargeHier === 216 && ctx.chargeHabituelle === 60, 'hier : 2 h a 9/10 = 216 points, seance habituelle 60 (' + ctx.chargeHier + ' / ' + ctx.chargeHabituelle + ')')
a(ctx.joursDaffilee === 3, 'trois jours enchaines avant aujourd hui')
a(ctx.douleur && ctx.douleur.region === 'genou' && ctx.douleur.jours === 4 && !ctx.douleur.urgent, 'douleur en cours retrouvee, l ancienne ignoree')
a(ctx.minutesSemaine === 420, 'volume des 7 derniers jours transmis (' + ctx.minutesSemaine + ' min)')
const fd = formeDb(db, J)
a(fd.ajustements.map((x) => x.id).join() === 'charge,affilee,douleur', 'la forme tient compte des trois (' + fd.ajustements.map((x) => x.id + ' ' + x.pts).join(', ') + ')')
a(formeContexte(db, decaler(J, -10)).douleur === null, 'avant le debut de la douleur : pas de douleur')
a(formeContexte({}, J).chargeHier === 0 && formeContexte({}, J).chargeHabituelle === null && formeContexte({ planningSessions: { x: 1 } }, J).joursDaffilee === 0, 'donnees absentes ou abimees : contexte neutre')
const sem = formeSemaine(db, J)
a(sem.length === 7 && sem[6].score === fd.score, 'semaine : le dernier jour est la forme du jour')
const soir = coucherDuSoir({ sleepLog: {}, sleepRoutine: { enabled: true, wake: '07:00' } }, J)
a(soir && soir.coucher === '22:45', 'coucher du soir depuis la routine')
a(libelleDuree(0.5) === '30 min' && libelleDuree(1.05) === '1 h 03', 'libelle sous l heure et minutes arrondies')
console.log('\nALL PASS')
