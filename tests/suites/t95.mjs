// Ecran Apple Watch : trois etapes (cle, installer le raccourci tout pret,
// automatisation), la methode manuelle repliee en secours.
import '../harness/browser-env.mjs'
import { __render, __reset } from '../harness/react-stub4.mjs'
import { readFileSync } from 'node:fs'
import MontrePanneau from '../../src/features/health/MontrePanneau.jsx'
import { lienEnvoyerMaintenant, retourDeMontre } from '../../src/features/health/montreDrapeau.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const text = (n) => { if (n == null || n === false) return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n) + ' '
  if (Array.isArray(n)) return n.map(text).join('')
  return text(n.children) }
const trouver = (n, f) => { if (!n || typeof n !== 'object') return null; if (Array.isArray(n)) { for (const x of n) { const r = trouver(x, f); if (r) return r } return null } if (f(n)) return n; return trouver(n.children, f) }
__reset()
const arbre = __render('montre', MontrePanneau, { userId: 'u1', store: {}, onRetour: () => {} })
const t = text(arbre).replace(/\u00a0/g, ' ')
a(/Étape 1 · Créer ta clé/.test(t) && /Étape 2 · Installer le raccourci/.test(t) && /Étape 3 · Le lancer une fois/.test(t) && /Étape 4 · Chaque matin, tout seul/.test(t), 'quatre etapes')
a(/« Télécharger »/.test(t) && /Fichiers › Téléchargements/.test(t) && /« Coller »/.test(t) && /« Toujours autoriser »/.test(t) && /« Exécuter immédiatement »/.test(t) && /« Autoriser »/.test(t), 'chaque bouton a toucher est nomme')
a(/ta respiration, ton oxygène sanguin et ta température au poignet la nuit, tes minutes d’exercice, ta VO2max, ta récupération cardiaque après les séances, ta FC à la marche, tes pesées et tes séances de pleine conscience/.test(t) && /« Tout activer »/.test(t), 'tout ce qui part est annonce, autorisation Sante complete')
a(/Fréquence respiratoire, Saturation en oxygène, Minutes d’exercice/.test(t) && /migrations 0005 à 0011/.test(t) && /Oxygène sanguin › mesures activées/.test(t), 'oxygene : autorisation Sante, migrations et reglage de la montre dits')
a(/Pas de température, de VO2max ou de récupération/.test(t) && /troisième envoi/.test(t), 'mesures du troisieme envoi : ce qu il faut regler sur la montre')
a(/Étape 5 · Plusieurs envois par jour/.test(t) && /« Heure de la journée »/.test(t) && /13:00/.test(t) && /20:00/.test(t) && /rien n’est compté deux fois/.test(t), 'plusieurs envois par jour : etapes et garanties')
a(/Tes rappels dans ces notifications/.test(t) && /Au réveil : ta forme du jour/.test(t) && /Ce soir : au lit vers/.test(t) && /Eau : 0,8 L sur 2,5 L/.test(t), 'rappels expliques avec exemples')
a(/Ça ne marche pas \?/.test(t) && /clé refusée/.test(t) && /aucune nuit trouvée/.test(t) && /Réglages › Santé/.test(t), 'depannage : chaque message du serveur a sa marche a suivre')
const lien = trouver(arbre, (n) => n.type === 'a')
a(lien && /raccourci\/Envoyer%20ma%20nuit\.shortcut$/.test(lien.props.href) && lien.props.target === '_blank', 'bouton « Installer » vers le raccourci signe publie avec le site')
a(/Rien à installer depuis l’App Store/.test(t) && !/(touche|choisis|Lance) « Renfo »/.test(t) && /tuile « Envoyer ma nuit »/.test(t), 'Renfo est un site : rien a installer, raccourci nomme « Envoyer ma nuit »')
a(/« Colle ta clé… »/.test(t) && /Choisis « Réveil »/.test(t) && /Est arrêté/.test(t), 'consignes : coller la cle, automatisation du reveil')
a(/Construire le raccourci à la main/.test(t), 'methode manuelle gardee, repliee')
const sig = readFileSync(new URL('../../public/raccourci/Envoyer ma nuit.shortcut', import.meta.url))
a(sig.slice(0, 4).toString() === 'AEA1', 'raccourci publie signe (format AEA1)')
const src = readFileSync(new URL('../../outils/raccourci/Envoyer-ma-nuit.plist', import.meta.url), 'utf8')
a(/is\.workflow\.actions\.filter\.health\.quantity/.test(src) && /<string>Sleep<\/string>/.test(src) && /deposer_nuit_montre\?apikey=/.test(src) && /WFTextActionText/.test(src) && /Colle ta clé \(site Renfo/.test(src) && /is\.workflow\.actions\.notification/.test(src) && /text\/plain/.test(src) && /<string>Resting Heart Rate<\/string>/.test(src) && /<string>Heart Rate Variability<\/string>/.test(src) && /<string>fc_dates<\/string>/.test(src) && /<string>vfc<\/string>/.test(src) && /<string>Respiratory Rate<\/string>/.test(src) && /<string>Exercise Minutes<\/string>/.test(src) && /deposer_signaux_montre\?apikey=/.test(src) && src.indexOf('deposer_nuit_montre') < src.indexOf('deposer_signaux_montre') && src.indexOf('is.workflow.actions.notification') < src.indexOf('Resting Heart Rate') && /<string>Envoyer ma nuit<\/string>/.test(src), 'source du raccourci : Sante « Sleep », envoi a deposer_nuit_montre, cle demandee a l installation')
a(/is\.workflow\.actions\.conditional/.test(src) && /<string>"code"<\/string>/.test(src) && /Le serveur de Renfo n’a pas pu recevoir ta nuit/.test(src) && (src.match(/is\.workflow\.actions\.conditional/g) || []).length === 3, 'notification toujours en francais : erreur technique remplacee (Si / Sinon / Fin)')
a(!/colle-ta-cle-renfo[^<]{20,}/.test(src) && !/[A-Za-z0-9_-]{43}<\/string>\s*<key>Category/.test(src), 'aucune cle personnelle dans le raccourci publie')
const lien2 = lienEnvoyerMaintenant('https://site.test/renfoNouk/?montre=1')
a(lien2 === 'shortcuts://x-callback-url/run-shortcut?name=Envoyer%20ma%20nuit&x-success=https%3A%2F%2Fsite.test%2FrenfoNouk%2F%3Fmontre%3D1', 'lancer le raccourci depuis le site, retour sur le site avec ?montre=1')
window.history = { state: null, replaceState: (_e, _t, u) => { window.location.href = 'http://localhost' + u } }
window.location.href = 'http://localhost/renfoNouk/?montre=1'
a(retourDeMontre() === true && !/montre/.test(window.location.href) && retourDeMontre() === false, 'retour du raccourci : lu une fois, retire de l adresse')
const src2 = readFileSync(new URL('../../src/features/home/AccueilSpace.jsx', import.meta.url), 'utf8')
a(/retour \? m\.releverMontre\(store, \{ force: true \}\)/.test(src2), 'au retour, l accueil releve aussitot (sans attendre les 10 minutes)')
import('../../src/features/health/montreDrapeau.js').then(({ garderCleLocale, lireCleLocale }) => {
  globalThis.localStorage = globalThis.localStorage || (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } })()
  garderCleLocale('u1', 'cle-test')
  a(lireCleLocale('u1') === 'cle-test' && localStorage.getItem('renfo:sync:cle-montre:u1') === 'cle-test', 'cle gardee sur l appareil, sous le prefixe efface a la deconnexion')
  garderCleLocale('u1', null)
  a(lireCleLocale('u1') === null, 'cle oubliee a la suppression')
  console.log('\nALL PASS')
})
