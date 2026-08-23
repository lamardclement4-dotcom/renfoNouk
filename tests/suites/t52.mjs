// L'habillage d'origine, verrouille. La refonte du 7 aout avait remplace la
// palette terracotta par du bleu, les coins 16 par 22 et les ombres courtes
// par des halos diffus ; l en-tete de Progres et les tuiles de l Accueil
// avaient change de forme. Tout cela est revenu, et ce test le tient.
import '../harness/browser-env.mjs'
import { __render, __reset } from '../harness/react-stub4.mjs'
import { __setDb, buildDb } from '../harness/store-hook-stub.mjs'
import { RICH } from './t50fixture.mjs'
import { C, THEMES, DEFAULT_THEME } from '../../src/features/health/kit.jsx'
import Accueil from '../../src/features/home/AccueilSpace.jsx'
import Progres from '../../src/features/progress/ProgressSpace.jsx'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }
const text = (n) => { if (n == null || n === false) return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n) + ' '
  if (Array.isArray(n)) return n.map(text).join('')
  return text(n.children) }

// ─── jetons non thematiques ───
a(C.radius === 16 && C.radiusSm === 12 && C.radiusXs === 10, 'coins de 16 / 12 / 10, pas 22 / 16 / 12')
a(/rgba\(43,43,43/.test(C.shadow), 'ombres chaudes et courtes d origine')
a(!/SF Pro Display|Inter/.test(C.font), 'pile de polices d origine')

// ─── palette par defaut ───
a(DEFAULT_THEME === 'origine', 'le theme par defaut est Origine')
const o = THEMES.find((t) => t.id === 'origine')
a(o && THEMES[0].id === 'origine', 'et il figure en tete de la liste')
a(o.vars['--c-primary'] === '#c25a3f', 'terracotta #c25a3f')
a(o.vars['--c-bg'] === '#faf9f5', 'fond creme #faf9f5')
a(o.vars['--c-surface2'] === '#f5f4ef' && o.vars['--c-line'] === '#e6e3dd', 'surfaces et filets d origine')
a(o.vars['--c-ink'] === '#2b2b2b' && o.vars['--c-ink2'] === '#666666', 'encres d origine')
for (const g of ['--g-accueil', '--g-progres', '--g-entrainer', '--g-sante', '--g-profil'])
  a(/#faf9f5 0%, #faf9f5 100%/.test(o.vars[g]), 'fond uni sur ' + g.slice(4) + ', sans degrade')
a(THEMES.some((t) => t.id === 'clair') && THEMES.some((t) => t.id === 'nuit'), 'les autres themes restent proposes')

// ─── formes d ecran ───
const noop = () => {}
const { cycle, goals, sensitiveZones, dayRows, ...phys } = RICH
const db = buildDb(phys, cycle || {}, goals || {}, sensitiveZones || [], dayRows || {}, '2026-06-15')
const store = new Proxy({ get: () => db, set: noop, ensureDay: noop }, { get: (t, k) => (k in t ? t[k] : noop) })
const props = { userId: 'u1', db, store, onClose: noop, onProfil: noop, onBack: noop }
const render = (Comp, id) => { __reset(); __setDb(RICH); return text(__render(id, Comp, props)) }

const acc = render(Accueil, 'acc')
a(/Renfo/.test(acc), "l en-tete Accueil affiche le mot-marque 'Renfo'")
for (const lab of ['jours de suite', 'min cette semaine', 'séances faites'])
  a(acc.includes(lab), 'tuile « ' + lab + " » d origine")

const pro = render(Progres, 'pro')
a(/jours de suite 🔥/.test(pro), "l en-tete Progres retrouve sa carte de serie")
a(/Record :/.test(pro), 'avec le record dessous')
a(/Cette semaine/.test(pro), 'le volume de la semaine reste lisible plus bas')
a(/Tendance/.test(pro) && /1 mois/.test(pro) && /6 mois/.test(pro), 'le selecteur de profondeur est conserve')
a(/Records personnels/.test(pro), 'et les blocs d analyse ajoutes depuis sont gardes')
console.log('\nALL PASS')
