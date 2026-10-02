// L'identite « laboratoire », verrouillee. Papier millimetre, trace vert
// phosphore, angles vifs, aucune ombre ni degrade, titres etroits et
// chiffres a chasse fixe ; clair et sombre soignes a egalite. Ce test tient
// les jetons, la parite des deux apparences, le passage des anciens themes,
// et l absence de retour des anciennes formes (pilules, halos, degrades).
import '../harness/browser-env.mjs'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { __render, __reset } from '../harness/react-stub4.mjs'
import { __setDb, buildDb } from '../harness/store-hook-stub.mjs'
import { RICH } from './t50fixture.mjs'
import { C, THEMES, DEFAULT_THEME, normalizeTheme, applyTheme } from '../../src/features/health/kit.jsx'
import Accueil from '../../src/features/home/AccueilSpace.jsx'
import Progres from '../../src/features/progress/ProgressSpace.jsx'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const text = (n) => { if (n == null || n === false) return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n) + ' '
  if (Array.isArray(n)) return n.map(text).join('')
  return text(n.children) }
const SRC = new URL('../../src/', import.meta.url).pathname

// ─── jetons ───
a(C.radius === 0 && C.radiusSm === 0 && C.radiusXs === 0, 'angles vifs : aucun arrondi')
a(C.shadow === 'none' && C.shadowSm === 'none' && C.shadowLg === 'none', 'aucune ombre : un instrument se lit a plat')
a(C.font === 'var(--f-text)' && C.display === 'var(--f-display)' && C.mono === 'var(--f-mono)', 'trois voix typographiques : texte, titres, mesures')
a(C.trace === 'var(--c-trace)' && C.onFill === 'var(--c-on-fill)', 'le trace et le texte sur aplat sont des jetons')

// ─── apparences ───
a(DEFAULT_THEME === 'auto', 'par defaut, l app suit le telephone')
a(THEMES.map((t) => t.id).join() === 'auto,clair,sombre', 'trois apparences, une seule identite')
a(normalizeTheme('nuit') === 'sombre' && normalizeTheme('foret') === 'clair' && normalizeTheme('couchant') === 'clair', 'les anciens themes sont ramenes a l apparence la plus proche')
a(normalizeTheme('origine') === 'auto' && normalizeTheme(null) === 'auto' && normalizeTheme('n importe quoi') === 'auto', 'le defaut d avant et les valeurs inconnues suivent le telephone')

// applyTheme sur un <html> plus fidele que celui du banc : dataset, styles
// en ligne laisses par les anciens themes.
const ancien = document.documentElement
const props = { '--c-primary': '#c25a3f', '--g-accueil': 'x', '--m-sleep': 'y', '--autre': 'z' }
const style = { colorScheme: '', get length() { return Object.keys(props).length } , removeProperty: (k) => { delete props[k] } }
Object.defineProperty(style, Symbol.iterator, { value: function* () { yield* Object.keys(props) } })
const proxyStyle = new Proxy(style, { get: (t, k) => (typeof k === 'string' && /^\d+$/.test(k) ? Object.keys(props)[k] : t[k]) })
document.documentElement = { style: proxyStyle, dataset: {} }
a(applyTheme('sombre') === 'sombre' && document.documentElement.dataset.theme === 'dark' && proxyStyle.colorScheme === 'dark', 'Sombre pose data-theme="dark"')
a(!('--c-primary' in props) && !('--g-accueil' in props) && !('--m-sleep' in props) && props['--autre'] === 'z', 'les couleurs en ligne des anciens themes sont effacees, rien d autre')
a(applyTheme('clair') === 'clair' && document.documentElement.dataset.theme === 'light', 'Clair pose data-theme="light"')
a(applyTheme('auto') === 'auto' && !('theme' in document.documentElement.dataset) && proxyStyle.colorScheme === '', 'Automatique retire le choix et rend la main au telephone')
a(applyTheme('nuit') === 'sombre' && document.documentElement.dataset.theme === 'dark', 'un ancien choix « Nuit » s applique en sombre')
document.documentElement = ancien
a(applyTheme('sombre') === 'sombre', 'et le banc minimal (sans dataset) ne casse pas')

// ─── feuille de style : clair et sombre a egalite ───
const css = readFileSync(join(SRC, 'index.css'), 'utf8')
const bloc = (re) => { const m = css.match(re); return m ? m[1] : '' }
const noms = (b) => new Set([...b.matchAll(/(--(?:c|ch|grid)[\w-]*):\s*#/g)].map((m) => m[1]))
const clair = noms(bloc(/:root \{([\s\S]*?)\n\}/))
const sombreTel = noms(bloc(/prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{([\s\S]*?)\}/))
const sombreChoix = noms(bloc(/:root\[data-theme="dark"\], \.ecran \{([\s\S]*?)\}/))
a(clair.size >= 19, 'le clair definit ses couleurs (' + clair.size + ')')
a([...clair].every((k) => sombreTel.has(k)), 'chaque couleur du clair est redefinie en sombre automatique')
a([...clair].every((k) => sombreChoix.has(k)), 'et en sombre choisi, et pour l ecran du lecteur')
a(/--c-primary: #5BF08F/i.test(css) && /--c-on-fill: #06120B/i.test(css), 'vert phosphore en sombre, texte presque noir sur ses aplats')
a(/--g-paper:/.test(css) && /background-image: var\(--g-paper\)/.test(css), 'le papier millimetre est le fond de toute l app')
a(/--r-pill: 0px/.test(css), 'les anciennes pilules sont a angles vifs')
a(/@keyframes traceDraw/.test(css) && /@keyframes dialRise/.test(css), 'traces qui s ecrivent, aiguilles qui montent')
a(/prefers-reduced-motion: reduce/.test(css), 'et tout s arrete si le telephone le demande')
const main = readFileSync(join(SRC, 'main.jsx'), 'utf8')
a(['big-shoulders-display', 'martian-mono', 'instrument-sans'].every((f) => main.includes('@fontsource/' + f)), 'les trois polices sont embarquees, pas chargees d un tiers')

// ─── pas de retour des anciennes formes dans le code ───
const fichiers = []
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.jsx?$/.test(f)) fichiers.push(p) } }
walk(SRC)
const fautes = []
for (const f of fichiers) {
  const s = readFileSync(f, 'utf8'), court = f.slice(SRC.length)
  if (/borderRadius: ?\d{2,}/.test(s)) fautes.push(court + ' : arrondi code en dur')
  if (/boxShadow: ?[`'](?!none)/.test(s)) fautes.push(court + ' : ombre')
  if (/(linear|radial)-gradient/.test(s)) fautes.push(court + ' : degrade')
  if (!/Player\.jsx|MuscleMap\.jsx/.test(court) && /['"]#fff(fff)?['"]/.test(s)) fautes.push(court + ' : blanc fixe (illisible sur un aplat vif en sombre)')
  // Fond pastel : une teinte diluee a moins de 20 % sur la surface. Seuls les
  // etats conditionnels (selection sans autre indice visuel) y ont droit.
  for (const m of s.matchAll(/(\?\s*)?background: ?[`']color-mix\(in srgb, ?[^%]{1,40}? (\d+)%, ?(?:\$\{(?:C\.)?(?:surface|SURFACE)\w*\}|var\(--c-surface\w*\)|' \+ [\w.]+ \+ ')/g))
    if (!m[1] && Number(m[2]) <= 20) fautes.push(court + ' : fond pastel ' + m[2] + ' %')
}
a(!fautes.length, 'aucune pilule, ombre, degrade ni blanc fixe dans les ecrans' + (fautes.length ? ' :\n   ' + fautes.join('\n   ') : ''))
const player = readFileSync(join(SRC, 'features/train/Player.jsx'), 'utf8')
a(/className: 'ecran'/.test(player), 'le lecteur d exercices reste un ecran sombre, quelle que soit l apparence')

// ─── formes d ecran ───
const noop = () => {}
const { cycle, goals, sensitiveZones, dayRows, ...phys } = RICH
const db = buildDb(phys, cycle || {}, goals || {}, sensitiveZones || [], dayRows || {}, '2026-06-15')
const store = new Proxy({ get: () => db, set: noop, ensureDay: noop }, { get: (t, k) => (k in t ? t[k] : noop) })
const rprops = { userId: 'u1', db, store, onClose: noop, onProfil: noop, onBack: noop }
const render = (Comp, id) => { __reset(); __setDb(RICH); return text(__render(id, Comp, rprops)) }

const acc = render(Accueil, 'acc')
a(/Renfo/.test(acc), "l en-tete Accueil affiche le mot-marque 'Renfo'")
a(/Charge · 7 jours/.test(acc) && /min éq\./.test(acc), 'l accueil s ouvre sur la courbe de charge de la semaine')
a(/Relevés du jour/.test(acc) && ['Sommeil', 'Eau', 'Protéines'].every((x) => acc.includes(x)), 'avec les cadrans du jour : sommeil, eau, proteines')
a(/À faire/.test(acc) && /Ouvrir →/.test(acc), 'et la seance a faire')
for (const lab of ['jours de suite', 'min cette semaine', 'séances faites'])
  a(acc.includes(lab), 'releve « ' + lab + ' » garde')

const pro = render(Progres, 'pro')
a(/jours de suite 🔥/.test(pro), "l en-tete Progres garde sa carte de serie")
a(/Record :/.test(pro), 'avec le record dessous')
a(/Cette semaine/.test(pro), 'le volume de la semaine reste lisible plus bas')
a(/Tendance/.test(pro) && /1 mois/.test(pro) && /6 mois/.test(pro), 'le selecteur de profondeur est conserve')
a(/Records personnels/.test(pro), 'et les blocs d analyse ajoutes depuis sont gardes')
console.log('\nALL PASS')
