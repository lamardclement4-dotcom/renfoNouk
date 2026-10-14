// Apple Watch : le texte depose par le Raccourci iOS devient des nuits
// (heures, phases), des FC au repos et des VFC ; la cle ; la migration.
import { readFileSync } from 'node:fs'
import { dateRaccourci, valeurSommeil, lireDepot, genererCle, empreinteCle, resumeReleve } from '../../src/features/health/montre.js'
import { toPatch, readHealthText, SLEEP_TYPE, phasesNuit } from '../../src/features/train/healthImport.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── Dates du Raccourci ───
a(dateRaccourci('2026-10-14T23:14:00+02:00') === '2026-10-14 23:14:00 +0200', 'ISO 8601 avec decalage')
a(dateRaccourci('2026-10-14T21:14:00Z') === '2026-10-14 21:14:00 +0000', 'ISO 8601 en UTC')
a(/^2026-10-14 23:14:00 [+-]\d{4}$/.test(dateRaccourci('14 oct. 2026 à 23:14')), 'format affiche par l iPhone (« 14 oct. 2026 a 23:14 »)')
a(/^2026-10-15 07:02:00/.test(dateRaccourci('15 octobre 2026 07:02')) && /^2026-10-15 07:02:00/.test(dateRaccourci('15/10/2026 07:02')), 'mois en toutes lettres, ou en chiffres')
a(/^2026-10-14 23:14:00/.test(dateRaccourci('Oct 14, 2026 at 11:14 PM')) && /^2026-10-15 06:58:00/.test(dateRaccourci('Oct 15, 2026, 6:58 AM')) && dateRaccourci('n importe quoi') === null, 'iPhone en anglais (« Oct 14, 2026 at 11:14 PM »), illisible : null')
a(/^2026-08-03 06:30/.test(dateRaccourci('3 août 2026 à 06:30')), 'accents des mois')

// ─── Valeurs de sommeil ───
a(valeurSommeil('Au lit') === 'HKCategoryValueSleepAnalysisInBed' && valeurSommeil('In Bed') === 'HKCategoryValueSleepAnalysisInBed', 'au lit')
a(valeurSommeil('Profond') === 'HKCategoryValueSleepAnalysisAsleepDeep' && valeurSommeil('Paradoxal') === 'HKCategoryValueSleepAnalysisAsleepREM' && valeurSommeil('REM') === 'HKCategoryValueSleepAnalysisAsleepREM', 'profond, paradoxal')
a(valeurSommeil('Principal') === 'HKCategoryValueSleepAnalysisAsleepCore' && valeurSommeil('Core') === 'HKCategoryValueSleepAnalysisAsleepCore', 'principal (core)')
a(valeurSommeil('4') === 'HKCategoryValueSleepAnalysisAsleepDeep' && valeurSommeil('0') === 'HKCategoryValueSleepAnalysisInBed' && valeurSommeil('Sommeil paradoxal') === 'HKCategoryValueSleepAnalysisAsleepREM', 'valeurs brutes en chiffre, libelles longs')
a(valeurSommeil('Éveillé') === 'HKCategoryValueSleepAnalysisAwake' && valeurSommeil('Endormi') === 'HKCategoryValueSleepAnalysisAsleepUnspecified' && valeurSommeil('Licorne') === null, 'eveille, endormi, inconnu')

// ─── Un depot complet ───
const depot = `sommeil;2026-10-14T22:50:00+02:00;2026-10-15T07:05:00+02:00;Au lit
sommeil;2026-10-14T23:10:00+02:00;2026-10-15T00:40:00+02:00;Principal
sommeil;2026-10-15T00:40:00+02:00;2026-10-15T01:40:00+02:00;Profond
sommeil;2026-10-15T01:40:00+02:00;2026-10-15T02:00:00+02:00;Éveillé
sommeil;2026-10-15T02:00:00+02:00;2026-10-15T05:00:00+02:00;Principal
sommeil;2026-10-15T05:00:00+02:00;2026-10-15T06:30:00+02:00;Paradoxal
sommeil;2026-10-15T06:30:00+02:00;2026-10-15T06:50:00+02:00;Principal
fc;2026-10-15T08:00:00+02:00;49
fc;2026-10-14T08:00:00+02:00;52 bpm
vfc;2026-10-15T03:00:00+02:00;61
vfc;2026-10-15T05:00:00+02:00;55,5
n importe quoi
sommeil;cassé;cassé;Profond`
const r = lireDepot(depot)
const n = r.sleep['2026-10-15']
a(r.lues === 11 && r.ecartees === 2, '11 mesures lues, 2 lignes illisibles ecartees')
a(n && n.hours === 7.3 && n.coucher === '22:50' && n.lever === '06:50' && n.endormissement === 20, 'nuit du 15 : 7 h 20 endormi, coucher 22:50, lever 06:50, 20 min pour s endormir — ' + JSON.stringify(n))
a(n.phases && n.phases.profond === 60 && n.phases.paradoxal === 90 && n.phases.leger === 290 && n.phases.eveille === 20, 'phases : profond 60, paradoxal 90, leger 290, eveille 20 — ' + JSON.stringify(n.phases))
a(r.restingHr['2026-10-15'] === 49 && r.restingHr['2026-10-14'] === 52 && r.hrv['2026-10-15'] === 58, 'FC au repos par jour, VFC moyennee sur la nuit (58)')
a(lireDepot('').lues === 0 && Object.keys(lireDepot('fc;2026-10-15T08:00:00+02:00;400').restingHr).length === 0, 'vide ou aberrant : rien')

// Format date de l iPhone, separateurs varies
const fr = lireDepot(`sommeil ; 14 oct. 2026 à 23:30 ; 15 oct. 2026 à 06:30 ; Endormi
fc|15 oct. 2026 à 08:00|50`)
a(fr.sleep['2026-10-15'] && fr.sleep['2026-10-15'].hours === 7 && fr.restingHr['2026-10-15'] === 50, 'dates « 14 oct. 2026 a 23:30 », separateurs « ; » et « | »')

// Depot du raccourci tout pret : lignes rebaties par le serveur (0006)
const simple = lireDepot('sommeil;14 oct. 2026 à 23:10;15 oct. 2026 à 01:00;Principal\nsommeil;15 oct. 2026 à 01:00;15 oct. 2026 à 02:05;Profond\nsommeil;15 oct. 2026 à 02:05;15 oct. 2026 à 06:40;3\n')
a(simple.lues === 3 && simple.sleep['2026-10-15'] && simple.sleep['2026-10-15'].phases.profond === 65 && simple.sleep['2026-10-15'].phases.leger === 385, 'depot du raccourci tout pret : nuit et phases (' + JSON.stringify(simple.sleep['2026-10-15']) + ')')

const coeur = lireDepot('fc;15 oct. 2026 à 08:00;52\nvfc;15 oct. 2026 à 02:00;48,5\nvfc;15 oct. 2026 à 04:00;55\n')
a(coeur.restingHr['2026-10-15'] === 52 && coeur.hrv['2026-10-15'] === 52, 'FC et VFC du raccourci (dates de l iPhone, virgule decimale) : FC 52, VFC moyenne 52')

// ─── Rangement dans le journal ───
const db = { sleepLog: { '2026-10-14': { hours: 6.5, quality: 3 } }, vitalsLog: { '2026-10-15': { restingHr: 47 } }, planningSessions: [] }
const { patch, summary } = toPatch(r, db, { source: 'montre' })
a(patch.sleepLog['2026-10-15'].source === 'montre' && patch.sleepLog['2026-10-15'].phases.profond === 60 && patch.sleepLog['2026-10-15'].coucher === '22:50', 'nuit ajoutee, source « montre », avec phases et heures')
a(patch.sleepLog['2026-10-14'].hours === 6.5 && patch.sleepLog['2026-10-14'].quality === 3, 'une nuit notee a la main n est pas touchee')
a(patch.vitalsLog['2026-10-15'].restingHr === 47 && patch.vitalsLog['2026-10-15'].hrv === 58 && patch.vitalsLog['2026-10-14'].restingHr === 52, 'FC deja connue gardee, VFC ajoutee, jour manquant comble')
const encore = toPatch(r, { ...db, sleepLog: patch.sleepLog, vitalsLog: patch.vitalsLog }, { source: 'montre' })
a(encore.summary.sleepAdded === 0 && encore.summary.sleepTimes === 0 && encore.summary.vitalsAdded === 0, 'deposer deux fois la meme nuit : rien en double')
const complete = toPatch(r, { sleepLog: { '2026-10-15': { hours: 7.3, source: 'sante' } }, planningSessions: [] }, { source: 'montre' })
a(complete.patch.sleepLog['2026-10-15'].phases && complete.summary.sleepTimes === 1, 'une nuit importee sans phases est completee')
a(resumeReleve(summary) === 'Montre : 1 nuit ajoutée, signaux de 2 jours' && resumeReleve({}) === null, 'releve dit en une phrase : ' + resumeReleve(summary))

// ─── Respiration et exercice (signaux, second envoi) ───
const sig = lireDepot('resp;15 oct. 2026 à 01:00;14,5\nresp;15 oct. 2026 à 03:00;15,5\nexo;14 oct. 2026 à 18:00;14 oct. 2026 à 18:01;1\nexo;14 oct. 2026 à 18:01;14 oct. 2026 à 18:30;29\nexo;15 oct. 2026 à 07:00;15 oct. 2026 à 07:10;10\n')
a(sig.resp['2026-10-15'] === 15 && sig.respN['2026-10-15'] === 2 && sig.exoMin['2026-10-14'] === 30 && sig.exoMin['2026-10-15'] === 10, 'respiration moyennee (15/min sur 2 mesures), exercice additionne par jour (30 et 10 min)')
const psig = toPatch(sig, { vitalsLog: { '2026-10-14': { exoMin: 12 } }, planningSessions: [] }, { source: 'montre' }).patch.vitalsLog
a(psig['2026-10-15'].resp === 15 && psig['2026-10-14'].exoMin === 30, 'exercice : la valeur la plus complete de la journee remplace la partielle')
a(toPatch(sig, { vitalsLog: { '2026-10-14': { exoMin: 45 } }, planningSessions: [] }, { source: 'montre' }).patch.vitalsLog['2026-10-14'].exoMin === 45, 'exercice : une valeur plus petite ne remplace pas')

// ─── Plusieurs envois par jour ───
const matin = lireDepot('sommeil;2026-10-14T23:10:00+02:00;2026-10-15T04:10:00+02:00;Principal\nvfc;2026-10-15T02:00:00+02:00;40\nvfc;2026-10-15T03:00:00+02:00;50\n')
const j1 = toPatch(matin, { sleepLog: {}, planningSessions: [] }, { source: 'montre' }).patch
a(j1.sleepLog['2026-10-15'].hours === 5 && j1.vitalsLog['2026-10-15'].hrv === 45 && j1.vitalsLog['2026-10-15'].hrvN === 2, 'envoi de 7 h : nuit incomplete (5 h), VFC sur 2 mesures')
const midi = lireDepot('sommeil;2026-10-14T23:10:00+02:00;2026-10-15T04:10:00+02:00;Principal\nsommeil;2026-10-15T04:10:00+02:00;2026-10-15T06:40:00+02:00;Profond\nvfc;2026-10-15T02:00:00+02:00;40\nvfc;2026-10-15T03:00:00+02:00;50\nvfc;2026-10-15T05:00:00+02:00;60\n')
const deux = toPatch(midi, { sleepLog: { '2026-10-15': { ...j1.sleepLog['2026-10-15'], quality: 4 } }, vitalsLog: j1.vitalsLog, planningSessions: [] }, { source: 'montre' })
a(deux.summary.sleepUpdated === 1 && deux.patch.sleepLog['2026-10-15'].hours === 7.5 && deux.patch.sleepLog['2026-10-15'].quality === 4 && deux.patch.sleepLog['2026-10-15'].phases.profond === 150, 'envoi de 13 h : la nuit complete remplace la partielle, la qualite notee reste')
a(deux.patch.vitalsLog['2026-10-15'].hrv === 50 && deux.patch.vitalsLog['2026-10-15'].hrvN === 3, 'VFC sur 3 mesures remplace celle sur 2')
const soir = lireDepot('vfc;2026-10-15T23:00:00+02:00;80\n')
const trois = toPatch(soir, { sleepLog: deux.patch.sleepLog, vitalsLog: { '2026-10-15': { hrv: 50, hrvN: 3 } }, planningSessions: [] }, { source: 'montre' })
a(trois.patch.vitalsLog['2026-10-15'].hrv === 50, 'envoi du soir avec moins de mesures : la moyenne complete reste')
const corrigee = toPatch(midi, { sleepLog: { '2026-10-15': { hours: 6, source: 'montre', corrigee: true } }, planningSessions: [] }, { source: 'montre' })
a(corrigee.patch.sleepLog['2026-10-15'].hours === 6 && corrigee.summary.sleepUpdated === 0, 'nuit corrigee a la main : jamais remplacee')
const manuelle = toPatch(midi, { sleepLog: { '2026-10-15': { hours: 6 } }, planningSessions: [] }, { source: 'montre' })
a(manuelle.patch.sleepLog['2026-10-15'].hours === 6, 'nuit notee a la main : jamais remplacee')
a(resumeReleve(deux.summary) === 'Montre : 1 nuit mise à jour, signaux de 1 jour', 'releve dit la mise a jour : ' + resumeReleve(deux.summary))
const sleepSrc = readFileSync(new URL('../../src/features/health/Sleep.jsx', import.meta.url), 'utf8')
a(/existing\.source && \(dureeChangee \|\| mode === 'heures'\) \? \{ corrigee: true \}/.test(sleepSrc) && /existing\.coucher && existing\.lever && !mesuree \? 'heures' : 'duree'/.test(sleepSrc), 'une nuit importee n est figee que si sa duree ou ses heures sont changees ; elle s ouvre sur sa duree mesuree')

// L export Sante XML gagne aussi les phases
const xml = readHealthText(`<Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisAsleepDeep" startDate="2026-01-05 01:00:00 +0100" endDate="2026-01-05 02:00:00 +0100"/>
<Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2026-01-05 02:00:00 +0100" endDate="2026-01-05 06:00:00 +0100"/>
<Record type="${SLEEP_TYPE}" value="HKCategoryValueSleepAnalysisAsleepREM" startDate="2026-01-05 06:00:00 +0100" endDate="2026-01-05 07:00:00 +0100"/>`)
a(xml.sleep['2026-01-05'].phases.profond === 60 && xml.sleep['2026-01-05'].phases.paradoxal === 60 && xml.sleep['2026-01-05'].phases.leger === 240, 'export Sante XML : phases lues aussi')
a(phasesNuit(null) === null && phasesNuit({ eveille: [{ a: 0, b: 60000 }] }) === null, 'sans phase de sommeil mesuree : pas de phases')

// ─── Cle ───
const cle = genererCle((k) => new Uint8Array(k).map((_, i) => i * 7))
a(cle.length === 43 && /^[A-Za-z0-9_-]+$/.test(cle), 'cle : 43 caracteres base64 URL')
a(genererCle() !== genererCle(), 'deux cles tirees au hasard different')
a(await empreinteCle('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'empreinte SHA-256 (meme calcul que le serveur)')

// ─── Migration ───
const sql = readFileSync(new URL('../../supabase/migrations/0005_montre.sql', import.meta.url), 'utf8')
const sql6 = readFileSync(new URL('../../supabase/migrations/0006_montre_raccourci_simple.sql', import.meta.url), 'utf8')
const sql7 = readFileSync(new URL('../../supabase/migrations/0007_montre_coeur.sql', import.meta.url), 'utf8')
a(/drop function if exists deposer_nuit_montre\(text, jsonb, jsonb, jsonb\);/.test(sql7) && /fc_dates jsonb default null/.test(sql7) && /perform deposer_mesures_montre\(jeton, lignes\)/.test(sql7) && /'fc;'/.test(sql7) && /'vfc;'/.test(sql7) && /grant execute on function deposer_nuit_montre\(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb\) to anon, authenticated/.test(sql7), '0007 : FC et VFC remises en lignes fc;/vfc;, ancienne signature retiree, memes controles')
a(/perform deposer_mesures_montre\(jeton, lignes\)/.test(sql6) && /returns text/.test(sql6) && /Nuit envoyée à Renfo/.test(sql6) && /clé refusée/.test(sql6) && /security definer\s+set search_path = public, pg_temp/.test(sql6) && /revoke all on function liste_montre\(jsonb\) from public/.test(sql6) && /grant execute on function deposer_nuit_montre\(text, jsonb, jsonb, jsonb\) to anon, authenticated/.test(sql6), '0006 : passe par la porte de 0005 (memes controles), utilitaire ferme')
a(/alter table jetons_montre enable row level security/.test(sql) && /alter table depots_montre enable row level security/.test(sql), 'RLS sur les deux tables')
a(/security definer\s+set search_path = public, pg_temp/.test(sql), 'fonction security definer au search_path fige (cf. 0004)')
a(/revoke all on function deposer_mesures_montre\(text, text\) from public;/.test(sql) && /grant execute on function deposer_mesures_montre\(text, text\) to anon, authenticated;/.test(sql), 'seule la fonction est ouverte au role anonyme')
a(/revoke all on jetons_montre from anon;/.test(sql) && /revoke all on depots_montre from anon;/.test(sql) && /revoke insert, update on depots_montre from authenticated;/.test(sql), 'tables fermees au role anonyme, aucun depot direct')
a(/extensions\.digest\(jeton, 'sha256'\)/.test(sql) && /p\.status = 'approved'/.test(sql) && /interval '1 hour'/.test(sql) && /60000/.test(sql), 'cle hachee, compte approuve, quota horaire, taille bornee')
a(!/phys/.test(sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')), 'la fonction ne touche pas a profiles.phys')
console.log('\nALL PASS')
