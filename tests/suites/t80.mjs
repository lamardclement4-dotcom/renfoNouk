// Service worker : l app s ouvre sans reseau, sans jamais garder de donnees
// personnelles. Verifie sur le modele, la configuration de build et, s il
// existe, le fichier publie.
import { readFileSync, existsSync } from 'node:fs'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const modele = readFileSync('../../src/sw/sw-modele.js', 'utf8')
const code = modele.replace(/\/\/.*$/gm, '')
a(/if \(url\.origin !== self\.location\.origin \|\| !url\.pathname\.startsWith\(BASE\)\) return/.test(code), 'les requetes vers d autres sites (Supabase, meteo) ne passent jamais par le cache')
a(/req\.method !== 'GET'\) return/.test(code), 'seules les lectures sont concernees, jamais une ecriture')
a(/ignoreVary: true/.test(code) && (code.match(/ignoreVary: true/g) || []).length >= 2, 'le cache ignore Vary : sans cela, hors ligne, la page s ouvrait sans son code')
a(/req\.mode === 'navigate'/.test(code) && /DELAI_PAGE_MS/.test(code), 'la page : reseau d abord, copie gardee si le reseau ne repond pas')
a(/startsWith\('renfo-app-'\) && cle !== CACHE_APP/.test(code), 'les anciennes versions de l app sont retirees du cache')
a(!/supabase|localStorage|indexedDB/i.test(code), 'aucune donnee personnelle ni stockage de compte dans le service worker')

const cfg = readFileSync('../../vite.config.js', 'utf8')
a(/serviceWorker\(\)\]/.test(cfg), 'le service worker est produit a chaque build')
a(/__\[A-Z\]\+__/.test(cfg), 'le build echoue si un marqueur du modele reste vide')
const entree = readFileSync('../../src/main.jsx', 'utf8')
a(/import\.meta\.env\.PROD && 'serviceWorker' in navigator/.test(entree), 'enregistre en production seulement, jamais en developpement')

if (existsSync('../../dist/sw.js')) {
  const sw = readFileSync('../../dist/sw.js', 'utf8')
  a(!/__[A-Z]+__/.test(sw), 'le service worker publie n a plus aucun marqueur')
  const liste = JSON.parse(sw.match(/const FICHIERS = (\[[^\]]*\])/)[1])
  const page = readFileSync('../../dist/index.html', 'utf8')
  const references = [...page.matchAll(/(?:src|href)="\/renfoNouk\/(assets\/[^"]+)"/g)].map((m) => m[1])
  a(references.length > 0 && references.every((f) => liste.includes(f)), 'tout ce que la page charge au demarrage est garde (' + references.length + ' fichiers)')
  a(liste.some((f) => /AccueilSpace-.*\.js$/.test(f)), 'l accueil aussi, pour s ouvrir hors ligne apres connexion')
  a(!liste.some((f) => f.startsWith('ocr/') || f.endsWith('.map') || f.endsWith('.woff')), 'ni le moteur OCR (garde au premier usage), ni cartes de source, ni anciennes polices')
}
console.log('\nALL PASS')
