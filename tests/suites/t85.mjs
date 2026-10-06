// Comprehension : chaque « ? » pose dans l app a son explication, et la
// charge se lit en clair (ecart a l habitude + conseil), sans jargon.
import '../harness/browser-env.mjs'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { GLOSSAIRE, definition } from '../../src/features/aide/glossaire.js'
import { ecartHabitude, CONSEIL_CHARGE } from '../../src/features/home/AccueilSpace.jsx'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const SRC = new URL('../../src/', import.meta.url).pathname
const fichiers = []
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.jsx?$/.test(f)) fichiers.push(p) } }
walk(SRC)
const termes = new Set()
for (const f of fichiers) {
  const t = readFileSync(f, 'utf8')
  for (const m of t.matchAll(/terme: '([a-zA-Z]+)'/g)) termes.add(m[1])
  for (const m of t.matchAll(/Titre\('[^']*', [^,]*, '([a-zA-Z]+)'\)/g)) termes.add(m[1])
}
a(termes.size >= 8, termes.size + ' termes expliques dans l app')
const manquants = [...termes].filter((t) => !definition(t))
a(!manquants.length, 'chaque « ? » a sa definition' + (manquants.length ? ' — manquent : ' + manquants.join(', ') : ''))
a(Object.values(GLOSSAIRE).every((d) => d.titre && d.texte && d.texte.length > 40 && !/undefined|NaN/.test(d.texte)), 'chaque definition a un titre et une vraie phrase')

a(ecartHabitude(1.02) === 'autant' && ecartHabitude(0.95) === 'autant', 'proche de 1 : « autant que ton habitude »')
a(ecartHabitude(1.12) === '12 % de plus' && ecartHabitude(0.7) === '30 % de moins', 'ecart modere en pourcentage')
a(ecartHabitude(2.05) === '2,1 fois plus', 'gros ecart en « fois plus », avec virgule')
a(ecartHabitude(NaN) === null, 'valeur absente : rien plutot que « NaN »')
a(['Sous-charge', 'Zone optimale', 'Vigilance', 'Vigilance renforcée'].every((l) => CONSEIL_CHARGE[l] && /:/.test(CONSEIL_CHARGE[l])), 'chaque niveau de charge a un conseil concret')

// Le jargon retire de l affichage ne revient pas.
const affichage = fichiers.filter((f) => /\.jsx$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n')
for (const [motif, nom] of [[/'[^'\n]*Rapport aigu\/chronique[^'\n]*'/, 'Rapport aigu/chronique'], [/'min éq\.'/, 'min éq.'], [/' min · RPE '/, 'RPE affiche'], [/'kcal \/ TDEE'/, 'kcal / TDEE'], [/'Log du jour'/, 'Log du jour']])
  a(!motif.test(affichage), 'plus de « ' + nom + ' » a l ecran')
console.log('\nALL PASS')
