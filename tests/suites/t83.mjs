// Export des donnees : complet, fusionne avec l etat local, sans secret.
import { construireExport, nomFichier, VERSION_EXPORT } from '../../src/features/profil/exportDonnees.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const etat = { phys: { weightLog: [{ date: '2026-09-01', kg: 71 }], onboardingDone: true }, cycle: { len: 28 }, goals: { dailyMin: 10 }, sensitiveZones: ['genoux'] }
const serveur = [{ date: '2026-01-05', data: { food: [{ n: 'Riz', k: 200 }], hydration: [] } }, { date: '2026-10-05', data: { food: [], hydration: [{ ml: 500 }] } }]
const locales = { '2026-10-05': { food: [{ n: 'Pomme', k: 52 }], hydration: [{ ml: 500 }, { ml: 250 }] }, '2026-10-06': { food: [], hydration: [{ ml: 300 }] } }
const ex = construireExport({ profil: { id: 'u1', first_name: 'Lamard' }, etat, journeesServeur: serveur, journeesLocales: locales, complet: true, maintenant: new Date('2026-10-06T10:00:00Z') })
a(ex.application === 'Renfo' && ex.version === VERSION_EXPORT && ex.exporteLe === '2026-10-06T10:00:00.000Z', 'fichier identifie et date')
a(ex.journeesCompletes === true && Object.keys(ex.journees).join() === '2026-01-05,2026-10-05,2026-10-06', 'toutes les journees du serveur, dans l ordre, y compris les anciennes')
a(ex.journees['2026-10-05'].hydration.length === 2 && ex.journees['2026-10-05'].food[0].n === 'Pomme', 'l etat local (saisies recentes) l emporte sur le serveur')
a(ex.profil.weightLog.length === 1 && ex.cycle.len === 28 && ex.objectifs.dailyMin === 10 && ex.zonesSensibles[0] === 'genoux', 'profil, cycle, objectifs et zones inclus')
const texte = JSON.stringify(ex)
a(!/access_token|refresh_token|password|apikey|Bearer/i.test(texte), 'aucun jeton, mot de passe ni cle dans le fichier')
const partiel = construireExport({ profil: { id: 'u1' }, etat, journeesServeur: [], journeesLocales: locales, complet: false })
a(partiel.journeesCompletes === false && Object.keys(partiel.journees).length === 2, 'hors ligne : export partiel, signale comme tel')
a(nomFichier(new Date(2026, 9, 6)) === 'renfo-donnees-2026-10-06.json', 'nom de fichier date')
console.log('\nALL PASS')
