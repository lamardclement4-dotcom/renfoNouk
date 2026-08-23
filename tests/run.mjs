// Lanceur des suites. Chaque suite écrit « OK: … » par assertion et se
// termine par « ALL PASS » ; toute autre issue est un échec.
//
// Les suites ont longtemps vécu dans un répertoire temporaire, hors du
// dépôt. Le système en a effacé une partie en cours de route, et rien ne
// permettait de les retrouver : elles sont désormais versionnées ici.
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const SUITES = join(HERE, 'suites')

// Le rendu d'écran a besoin du DOM simulé et d'un createElement complet ;
// les tests du store ont besoin du faux Supabase ; le reste se contente du
// chargeur simple.
function loaderFor(file, src) {
  if (/browser-env|__render|react-stub4/.test(src)) return 'loader3.mjs'
  if (/useNutritionStore|syncQueue|react-stub3/.test(src)) return 'loader2.mjs'
  return 'loader.mjs'
}

const files = readdirSync(SUITES).filter((f) => /^t.*\.mjs$/.test(f) && !/fixture/.test(f))
  .sort((a, b) => (parseInt(a.slice(1), 10) || 0) - (parseInt(b.slice(1), 10) || 0))

let ok = 0
let ko = 0
let asserts = 0
const failed = []
for (const f of files) {
  const path = join(SUITES, f)
  const src = readdirSync(SUITES).includes(f) ? spawnSync('cat', [path]).stdout.toString() : ''
  const loader = loaderFor(f, src)
  const res = spawnSync(process.execPath,
    ['--experimental-loader', join(HERE, 'harness', loader), path],
    // Exécuté depuis `suites/` : « ../../src » désigne alors la même chose
    // pour un import et pour une lecture de fichier, qui se résout, elle,
    // depuis le répertoire courant.
    { encoding: 'utf8', cwd: SUITES })
  const out = (res.stdout || '') + (res.stderr || '')
  const n = (out.match(/^OK:/gm) || []).length
  if (out.includes('ALL PASS')) { ok++; asserts += n } else {
    // Un script de rapport ne pose pas d'assertion : il n'échoue que s'il lève.
    if (n === 0 && res.status === 0) continue
    ko++
    failed.push({ f, line: (out.match(/^(?:Error|.*FAIL[^\n]*)/m) || [''])[0].slice(0, 140) })
  }
}
console.log(`suites : ${ok} OK / ${ko} KO — ${asserts} assertions`)
for (const x of failed) console.log(`  ${x.f}  ${x.line}`)
process.exit(ko ? 1 : 0)
