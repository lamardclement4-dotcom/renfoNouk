// Ecran Apple Watch : trois etapes (cle, installer le raccourci tout pret,
// automatisation), la methode manuelle repliee en secours.
import '../harness/browser-env.mjs'
import { __render, __reset } from '../harness/react-stub4.mjs'
import { readFileSync } from 'node:fs'
import MontrePanneau from '../../src/features/health/MontrePanneau.jsx'
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
a(/ta fréquence cardiaque au repos et ta variabilité cardiaque/.test(t) && /« Tout activer »/.test(t), 'FC au repos et VFC annoncees, autorisation Sante complete')
a(/Ça ne marche pas \?/.test(t) && /clé refusée/.test(t) && /aucune nuit trouvée/.test(t) && /Réglages › Santé/.test(t), 'depannage : chaque message du serveur a sa marche a suivre')
const lien = trouver(arbre, (n) => n.type === 'a')
a(lien && /raccourci\/Envoyer%20ma%20nuit\.shortcut$/.test(lien.props.href) && lien.props.target === '_blank', 'bouton « Installer » vers le raccourci signe publie avec le site')
a(/Rien à installer depuis l’App Store/.test(t) && !/(touche|choisis|Lance) « Renfo »/.test(t) && /tuile « Envoyer ma nuit »/.test(t), 'Renfo est un site : rien a installer, raccourci nomme « Envoyer ma nuit »')
a(/« Colle ta clé… »/.test(t) && /Choisis « Réveil »/.test(t) && /Est arrêté/.test(t), 'consignes : coller la cle, automatisation du reveil')
a(/Construire le raccourci à la main/.test(t), 'methode manuelle gardee, repliee')
const sig = readFileSync(new URL('../../public/raccourci/Envoyer ma nuit.shortcut', import.meta.url))
a(sig.slice(0, 4).toString() === 'AEA1', 'raccourci publie signe (format AEA1)')
const src = readFileSync(new URL('../../outils/raccourci/Envoyer-ma-nuit.plist', import.meta.url), 'utf8')
a(/is\.workflow\.actions\.filter\.health\.quantity/.test(src) && /<string>Sleep<\/string>/.test(src) && /deposer_nuit_montre\?apikey=/.test(src) && /WFTextActionText/.test(src) && /Colle ta clé \(site Renfo/.test(src) && /is\.workflow\.actions\.notification/.test(src) && /text\/plain/.test(src) && /<string>Resting Heart Rate<\/string>/.test(src) && /<string>Heart Rate Variability<\/string>/.test(src) && /<string>fc_dates<\/string>/.test(src) && /<string>vfc<\/string>/.test(src) && /<string>Envoyer ma nuit<\/string>/.test(src), 'source du raccourci : Sante « Sleep », envoi a deposer_nuit_montre, cle demandee a l installation')
a(!/colle-ta-cle-renfo[^<]{20,}/.test(src) && !/[A-Za-z0-9_-]{43}<\/string>\s*<key>Category/.test(src), 'aucune cle personnelle dans le raccourci publie')
console.log('\nALL PASS')
