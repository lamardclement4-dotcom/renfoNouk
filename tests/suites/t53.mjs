// Repli des champs par sport. Un triathlon en propose douze, un football
// dix : presentes d un bloc, ils se remplissent rarement au-dela des deux
// premiers.
import '../harness/browser-env.mjs'
import { splitFields, hasValue, ESSENTIAL_FIELDS, ALWAYS_SHOWN }
  from '../../src/features/train/PlannerSpace.jsx'
import { SPORT_FIELDS } from '../../src/features/train/plannerData.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// ─── ce qui compte comme rempli ───
a(!hasValue(undefined) && !hasValue(null) && !hasValue(''), 'vide, nul, absent : non renseigne')
a(!hasValue('   '), 'des espaces ne valent pas une saisie')
a(!hasValue([]), 'une liste vide non plus')
a(!hasValue(false), "un booleen a « non » n est pas une saisie a conserver a l ecran")
a(hasValue(0) && hasValue('0'), 'un zero est une valeur : un match sans but se note')
a(hasValue(true) && hasValue(['crawl']) && hasValue('12,5'), 'oui, liste garnie et nombre comptent')

// ─── decoupage ───
const tri = SPORT_FIELDS.triathlon.fields
const t0 = splitFields(tri, {})
a(tri.length === 12, 'le triathlon declare 12 champs')
a(t0.shown.length === ESSENTIAL_FIELDS + 1, `${t0.shown.length} champs visibles a l ouverture`)
a(t0.folded.length === 7, `${t0.folded.length} replies derriere le bouton`)
a(t0.shown.some((f) => f.k === 'rpe'), 'le ressenti reste visible bien qu ecrit en dernier')

// un champ deja renseigne ne se cache pas
const hidden = t0.folded[2]
const t1 = splitFields(tri, { [hidden.k]: '42' })
a(t1.shown.some((f) => f.k === hidden.k), `« ${hidden.lab} » renseigne remonte parmi les champs visibles`)
a(t1.folded.length === t0.folded.length - 1, 'et quitte le repli')
a(!splitFields(tri, { [hidden.k]: '' }).shown.some((f) => f.k === hidden.k), 'une saisie effacee le renvoie au repli')

// ─── invariants sur les 35 sports ───
let maxShown = 0, totalFolded = 0
for (const [id, cfg] of Object.entries(SPORT_FIELDS)) {
  const { shown, folded } = splitFields(cfg.fields, {})
  const keys = [...shown, ...folded].map((f) => f.k)
  a(keys.length === cfg.fields.length, id + ' : aucun champ perdu')
  a(new Set(keys).size === keys.length, id + ' : aucun champ affiche deux fois')
  a(shown.length <= ESSENTIAL_FIELDS + ALWAYS_SHOWN.length, id + ' : jamais plus de ' + (ESSENTIAL_FIELDS + ALWAYS_SHOWN.length) + ' champs a l ouverture')
  if (cfg.fields.some((f) => f.k === 'rpe'))
    a(shown.some((f) => f.k === 'rpe'), id + ' : le ressenti est visible')
  maxShown = Math.max(maxShown, shown.length)
  totalFolded += folded.length
}
a(maxShown <= 5, `au plus ${maxShown} champs a l ouverture, tous sports confondus`)
a(totalFolded >= 100, `${totalFolded} champs replies sur les ${Object.values(SPORT_FIELDS).reduce((n, c) => n + c.fields.length, 0)} declares`)

// tout redevient visible une fois la seance remplie
const full = Object.fromEntries(tri.map((f) => [f.k, f.t === 'bool' ? true : f.t === 'pills' ? ['x'] : '1']))
a(splitFields(tri, full).folded.length === 0, 'une seance entierement remplie n a plus rien de replie')
console.log('\nALL PASS')
