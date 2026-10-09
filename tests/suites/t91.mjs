// Forme du jour, quatrieme etage : le coeur (pouls au reveil, FC de repos
// et VFC importees), les heures des nuits importees d Apple Sante, et la
// seance du jour reglee sur la forme.
import { formeDuJour } from '../../src/features/health/sommeilForme.js'
import { formeContexte, signauxCorps, normaleDuPouls, dureeAllegee, reglagesSeance, formeDb } from '../../src/features/health/formeContexte.js'
import { decaler } from '../../src/features/health/sommeilReveil.js'
import { readHealthText, blocPrincipal, horairesNuit, heureOf, toPatch, SLEEP_TYPE } from '../../src/features/train/healthImport.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const J = '2026-10-09'
const nuit = { hours: 8, quality: 4, reveil: { energie: 4, sensations: [] } }

// ─── Signaux du coeur ───
const log = { [J]: { ...nuit, pouls: 59 } }
for (let k = 1; k <= 10; k++) log[decaler(J, -k)] = { hours: 7.5, pouls: 51 + (k % 3) - 1 }
const sg = signauxCorps({ sleepLog: log }, J)
a(sg.pouls.valeur === 59 && sg.pouls.normale === 51 && sg.pouls.source === 'reveil' && sg.pouls.mesures === 10, 'pouls du jour et normale des 4 semaines (' + sg.pouls.normale + ')')
const base = formeDuJour({ [J]: nuit }, J, {}).score
const f8 = formeDuJour({ [J]: nuit }, J, { signaux: sg })
const aj = f8.ajustements.find((x) => x.id === 'pouls')
a(aj.pts === -8 && aj.texte === '59 bpm, 8 au-dessus de ta normale (51)' && f8.score === base - 8, 'pouls 8 au-dessus : -8, dit en clair')
a(/cœur n’a pas fini de récupérer/.test(f8.consigne), 'et la consigne retient l intensite')
const f4 = formeDuJour({ [J]: nuit }, J, { signaux: { pouls: { valeur: 55, normale: 51, source: 'reveil' } } })
a(f4.ajustements[0].pts === -4 && !/cœur/.test(f4.consigne), '4 au-dessus : -4, sans alerte')
const f0 = formeDuJour({ [J]: nuit }, J, { signaux: { pouls: { valeur: 49, normale: 51, source: 'reveil' } } })
a(f0.ajustements[0].pts === 0 && /2 sous ta normale/.test(f0.ajustements[0].texte), 'sous la normale : rien a retirer')
const fn = formeDuJour({ [J]: nuit }, J, { signaux: { pouls: { valeur: 60, normale: null, mesures: 2, source: 'reveil' } } })
a(fn.ajustements[0].pts === 0 && /après 5 mesures \(2 pour l’instant\)/.test(fn.ajustements[0].texte), 'sans normale : montre la mesure, ne juge pas')
const fv = formeDuJour({ [J]: nuit }, J, { signaux: { vfc: { valeur: 42, normale: 50 } } })
a(fv.ajustements[0].pts === -8 && /16 % sous ta normale \(50 ms\)/.test(fv.ajustements[0].texte), 'VFC 16 % sous la normale : -8')
a(formeDuJour({ [J]: nuit }, J, { signaux: { vfc: { valeur: 46, normale: 50 } } }).ajustements[0].pts === -4, 'VFC 8 % sous : -4')

// Source : le pouls saisi passe avant la FC de repos importee
const vit = {}
for (let k = 0; k <= 8; k++) vit[decaler(J, -k)] = { restingHr: k === 0 ? 66 : 58, hrv: k === 0 ? 30 : 45 }
const s2 = signauxCorps({ sleepLog: { [J]: nuit }, vitalsLog: vit }, J)
a(s2.pouls.source === 'sante' && s2.pouls.valeur === 66 && s2.pouls.normale === 58 && s2.vfc.valeur === 30 && s2.vfc.normale === 45, 'sans pouls saisi : FC de repos et VFC importees')
const s3 = signauxCorps({ sleepLog: log, vitalsLog: vit }, J)
a(s3.pouls.source === 'reveil' && s3.pouls.valeur === 59, 'pouls saisi prioritaire, compare a sa propre normale')
a(signauxCorps({ sleepLog: { [J]: { pouls: 250 } } }, J).pouls === null && signauxCorps({}, J).vfc === null, 'valeur aberrante ou absente : ignoree')
const fd = formeDb({ sleepLog: { [J]: nuit }, vitalsLog: vit }, J)
a(fd.ajustements.map((x) => x.id).join() === 'pouls,vfc' && fd.ajustements.every((x) => x.pts === -8), 'la forme tient compte du coeur importe')
a(normaleDuPouls({ sleepLog: log }, J).normale === 51 && normaleDuPouls({}, J).normale === null, 'normale montree pendant la saisie')
const nouvelle = formeDb({ sleepLog: log }, J, { ...log, [J]: { ...nuit, pouls: 52 } })
a(nouvelle.ajustements.find((x) => x.id === 'pouls').pts === 0, 'la nuit qu on vient de saisir sert aussi au contexte')

// ─── Import Apple Sante : heures des nuits ───
a(heureOf('2026-01-05 07:12:00 +0100') === '07:12' && heureOf('cassé') === null, 'heure locale lue telle quelle')
const H = (h) => Date.parse('2026-01-05T' + h + ':00+01:00')
const bloc = blocPrincipal([{ a: H('01:00'), b: H('06:30'), ha: '01:00', hb: '06:30' }, { a: H('14:00'), b: H('14:30'), ha: '14:00', hb: '14:30' }])
a(bloc.ha === '01:00' && bloc.hb === '06:30', 'une sieste le meme jour ne deplace pas le lever')
const xml = `<Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2026-01-04 23:00:00 +0100" endDate="2026-01-05 03:00:00 +0100"/>
<Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisAwake" startDate="2026-01-05 03:00:00 +0100" endDate="2026-01-05 03:20:00 +0100"/>
<Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisAsleepDeep" startDate="2026-01-05 03:20:00 +0100" endDate="2026-01-05 06:30:00 +0100"/>
<Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisInBed" startDate="2026-01-04 22:40:00 +0100" endDate="2026-01-05 07:00:00 +0100"/>
<Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisInBed" startDate="2026-01-05 23:00:00 +0100" endDate="2026-01-06 07:00:00 +0100"/>`
const out = readHealthText(xml)
const n5 = out.sleep['2026-01-05']
a(n5.coucher === '22:40' && n5.lever === '06:30' && n5.endormissement === 20, 'coucher a l entree au lit, lever au reveil, 20 min pour s endormir')
a(out.sleep['2026-01-06'].coucher === '23:00' && out.sleep['2026-01-06'].endormissement === null, 'temps au lit seul : heures du lit, endormissement inconnu')
const p1 = toPatch(out, { sleepLog: {} }).patch.sleepLog['2026-01-05']
a(p1.coucher === '22:40' && p1.lever === '06:30' && p1.source === 'sante', 'les heures entrent dans le journal')
const re = toPatch(out, { sleepLog: { '2026-01-05': { hours: 7.2, source: 'sante' }, '2026-01-06': { hours: 6.5, quality: 3 } } })
a(re.patch.sleepLog['2026-01-05'].coucher === '22:40' && re.summary.sleepTimes === 1, 'un ancien import sans heures est complete')
a(!re.patch.sleepLog['2026-01-06'].coucher && re.patch.sleepLog['2026-01-06'].hours === 6.5, 'une nuit notee a la main garde ses heures, ou leur absence')

// ─── Seance du jour reglee sur la forme ───
a(dureeAllegee('1 h') === '45 min' && dureeAllegee('1 h 30') === '1 h' && dureeAllegee('30 min') === '15 min' && dureeAllegee('2 h') === '1 h 30', 'un tiers de moins, au palier le plus proche')
a(dureeAllegee('15 min') === null && dureeAllegee(null) === null, 'trop court pour alleger : rien')
const seance = { id: 's1', date: J, statut: 'planifie', duree: '1 h' }
a(reglagesSeance({ niveau: 'bonne' }, seance).length === 0, 'bonne forme : rien a regler')
const moy = reglagesSeance({ niveau: 'moyenne' }, seance)
a(moy.length === 1 && moy[0].lab === 'Alléger : 1 h → 45 min', 'forme moyenne : alleger')
const bas = reglagesSeance({ niveau: 'basse' }, seance)
a(bas.map((r) => r.id).join() === 'alleger,decaler' && bas[1].date === '2026-10-10', 'recuperation : alleger ou decaler a demain')
a(reglagesSeance({ niveau: 'basse' }, { ...seance, statut: 'realise' }).length === 0, 'seance deja faite : rien')
a(reglagesSeance({ niveau: 'basse' }, { ...seance, duree: '45 min', reglage: { type: 'alleger', duree: '1 h' } }).map((r) => r.id).join() === 'decaler', 'deja allegee : pas une deuxieme fois, decaler reste possible')
a(formeContexte({}, J).signaux.pouls === null, 'contexte sans mesure du coeur : neutre')
console.log('\nALL PASS')
