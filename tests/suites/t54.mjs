// Un fond ou un filet ecrit en dur ne suit pas le theme : il reste blanc sur
// le theme sombre. Trois cas de ce genre laissaient deux ecrans de chargement
// en blanc franc sur Nuit. Ce test relit les sources pour qu il n en revienne
// pas d autres — la logique ne peut pas l attraper, seul le texte le peut.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const ROOT = '../../src'

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.jsx?$/.test(p)) out.push(p)
  }
  return out
}

// Les neutres : blancs, gris et fonds de page. Une teinte de categorie
// (le rose de la prevention, l ambre des tests) reste volontairement fixe —
// elle identifie la rubrique et ne depend pas du theme.
const NEUTRAL = String.raw`#(fff|ffffff|eee|eeeeee|ddd|dddddd|ccc|f6f7f9|e8ebef|faf9f5|f5f4ef|e6e3dd|f1f3f6)\b`
const RE = new RegExp(String.raw`(background(?:Color)?|border(?:Top|Bottom|Left|Right)?|borderColor)\s*:\s*['"\`][^'"\`]*` + NEUTRAL, 'i')

const files = walk(ROOT).filter((f) => !f.endsWith('kit.jsx'))
a(files.length > 20, `${files.length} fichiers relus (kit.jsx exclu : c est lui qui definit la palette)`)

const faults = []
for (const f of files) {
  readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
    const m = RE.exec(l)
    if (m) faults.push(`${f.slice(ROOT.length + 1)}:${i + 1}  ${m[0].slice(0, 60)}`)
  })
}
a(faults.length === 0, faults.length ? 'fonds/filets en dur :\n   ' + faults.join('\n   ') : 'aucun fond ni filet ecrit en dur hors de la palette')

// Le motif est bien detecte : sans quoi le test passerait pour de mauvaises raisons.
a(RE.test("style: { background: '#fff' }"), 'un fond blanc en dur serait signale')
a(RE.test("border: '1px solid #ddd'"), 'un filet gris aussi')
a(RE.test("background: 'color-mix(in srgb, #c4a03a 10%, #fff)'"), 'y compris melange a une teinte')
a(!RE.test("background: C.surface"), 'un jeton de palette ne l est pas')
a(!RE.test("color: '#fff'"), "le texte blanc sur pastille coloree reste permis")
a(!RE.test("background: 'color-mix(in srgb, #b5566a 9%, ' + C.surface + ')'"), 'ni un melange qui retombe sur un jeton')
console.log('\nALL PASS')
