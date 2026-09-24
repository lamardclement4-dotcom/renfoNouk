// Sécurité : ce qui reste sur l'appareil, ce qu'on accepte de lire, et ce
// qui est joignable depuis la page.
//
// Quatre défauts couverts ici :
// - la file d'attente d'un compte survivait à sa déconnexion dans le
//   stockage local, avec un profil entier dedans ;
// - quatre écrans lisaient un fichier déposé sans plafond de taille, et le
//   chargeaient d'un bloc en mémoire ;
// - rien ne limitait les adresses joignables depuis la page : une donnée de
//   santé pouvait partir n'importe où ;
// - le déploiement installait les dépendances sans respecter le lockfile.
//
// Ces tests sont des garde-fous : ils échouent si quelqu'un desserre la
// politique plus tard sans s'en rendre compte.
import { readFileSync, existsSync } from 'node:fs'
import { clearAllStoredQueues, createSyncQueue, STORAGE_PREFIX } from '../../src/features/nutrition/syncQueue.js'
import { resetStore } from '../../src/features/nutrition/useNutritionStore.js'
import { tooLarge, imageTooLarge, traceTooLarge, MAX_IMAGE_BYTES, MAX_TRACE_BYTES, mo } from '../../src/features/health/fileGuard.js'

const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

// Un stockage de mine, avec l'API indexée d'un vrai : c'est `length` +
// `key(i)` qui piègent, pas `getItem`.
function fakeStore(initial = {}) {
  const m = new Map(Object.entries(initial))
  return {
    get length() { return m.size },
    key: (i) => { const ks = [...m.keys()]; return i < ks.length ? ks[i] : null },
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)) },
    removeItem: (k) => { m.delete(k) },
    keys: () => [...m.keys()],
  }
}

// ─── le balayage du stockage à la déconnexion ───

a(STORAGE_PREFIX === 'renfo:sync:', `le prefixe des files est « ${STORAGE_PREFIX} »`)

const s1 = fakeStore({
  'renfo:sync:user-a': '{"phys":{"poids":72}}',
  'renfo:sync:user-b': '{"phys":{"poids":64}}',
  'renfo:sync:anon': '{}',
  'renfo:theme': 'origine',
  'autre-app:token': 'xyz',
})
const n = clearAllStoredQueues(s1)
a(n === 3, `${n} files effacees, celles des trois comptes`)
a(s1.keys().filter((k) => k.startsWith(STORAGE_PREFIX)).length === 0,
  'plus aucune file ne subsiste — y compris celles d autres comptes passes sur l appareil')

// LE piege : supprimer en parcourant l index decale les cles suivantes, et
// une sur deux est sautee. Avec cinq files, un balayage naif en laisse deux.
const s2 = fakeStore(Object.fromEntries(
  ['a', 'b', 'c', 'd', 'e'].map((x) => [STORAGE_PREFIX + x, '{}'])))
a(clearAllStoredQueues(s2) === 5, 'cinq files annoncees effacees')
a(s2.length === 0, 'et le stockage est reellement vide : aucune cle sautee par le decalage d index')

// Le theme n est pas une donnee personnelle : l effacer rendrait l app
// blanche a la reconnexion sans rien proteger.
a(s1.getItem('renfo:theme') === 'origine', 'le theme choisi survit a la deconnexion')
a(s1.getItem('autre-app:token') === 'xyz', 'et rien qui n appartienne pas a l app n est touche')

// Un stockage absent ou recalcitrant ne doit pas faire echouer la
// deconnexion : mieux vaut ne pas nettoyer que rester connecte.
a(clearAllStoredQueues(null) === 0, 'sans stockage : renvoie 0 sans lever')
const hostile = { get length() { throw new Error('stockage bloque') }, key: () => null, removeItem: () => {} }
a(clearAllStoredQueues(hostile) === 0, 'stockage qui refuse de repondre : renvoie 0 sans lever')

// ─── ce que la file ecrit, le balayage doit le retrouver ───
// Les deux moities doivent s accorder sur la forme des cles : c est la
// seule chose qui garantit que le nettoyage trouve quelque chose.
const s3 = fakeStore()
const q = createSyncQueue({ userId: 'user-c', storage: s3, online: () => false })
q.enqueue('phys', { poids: 70, blessures: ['genou'] })
const written = s3.keys().filter((k) => k.startsWith(STORAGE_PREFIX))
a(written.length === 1, `la file a ecrit ${written.length} cle sous le prefixe`)
a(s3.getItem(written[0]).includes('genou'), 'et la donnee personnelle est bien dedans, en clair')
a(clearAllStoredQueues(s3) === 1, 'le balayage la retrouve et l efface')
a(s3.length === 0, 'le stockage est vide apres deconnexion')
q.clear() // libere le minuteur, sinon la suite ne rend pas la main

// ─── resetStore : le cache memoire du module ───
a(typeof resetStore === 'function', 'resetStore est exporte, appelable hors de tout composant')
a(typeof resetStore() === 'number', 'et repond sans lever meme sans aucun compte charge')

// ─── plafonds de taille sur les fichiers deposes ───

a(MAX_TRACE_BYTES < MAX_IMAGE_BYTES, 'une trace est du texte : son plafond est plus strict qu une image')

a(tooLarge(null, MAX_IMAGE_BYTES) === null, 'pas de fichier : ce n est pas un probleme de taille')
a(tooLarge({}, MAX_IMAGE_BYTES) === null, 'taille illisible : laisse passer, le message juste viendra en aval')
a(tooLarge({ size: 0 }, MAX_IMAGE_BYTES) === null, 'fichier vide : refuse plus loin, pas ici')
a(tooLarge({ size: Number.NaN }, MAX_IMAGE_BYTES) === null, 'taille NaN : pas de refus a tort')
a(tooLarge({ size: MAX_IMAGE_BYTES }, MAX_IMAGE_BYTES) === null, 'pile au plafond : accepte, la limite est inclusive')
a(typeof tooLarge({ size: MAX_IMAGE_BYTES + 1 }, MAX_IMAGE_BYTES) === 'string', 'un octet au-dessus : refuse')

const gros = imageTooLarge({ size: 25 * 1024 * 1024 })
a(/25 Mo/.test(gros), `la taille reelle est dite : « ${gros.slice(0, 40)}… »`)
a(/20 Mo/.test(gros), 'et le plafond aussi, pour que le refus soit comprehensible')
a(imageTooLarge({ size: 1024 * 1024 }) === null, 'une capture d ecran normale passe')

const trace = traceTooLarge({ size: 9 * 1024 * 1024 })
a(/GPX/.test(trace), 'le refus d une trace parle de GPX, pas d image')
a(traceTooLarge({ size: 400 * 1024 }) === null, 'un GPX de sortie longue passe')

// Les nombres affiches sont des entiers : pas de « 2.5 Mo » a l anglaise.
for (const msg of [gros, trace, tooLarge({ size: 12345678 }, 1024, 'Fichier')]) {
  a(!/\d+\.\d/.test(msg), `aucune decimale a l anglaise dans « ${String(msg).slice(0, 30)}… »`)
}
a(mo(1024 * 1024) === 1, 'un mega-octet s affiche 1')

// ─── la politique de securite du contenu ───

const cfg = readFileSync('../../vite.config.js', 'utf8')
const csp = cfg.slice(cfg.indexOf('const CSP'), cfg.indexOf('cspMeta'))

for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "worker-src 'self' blob:"]) {
  a(csp.includes(d), `la politique pose ${d}`)
}
for (const host of ['https://*.open-meteo.com', 'https://cdn.jsdelivr.net']) {
  a(csp.includes(host), `${host} est joignable`)
}

// L origine Supabase est epinglee sur le projet reel, lue au build. Un joker
// *.supabase.co paraissait equivalent : il ne l est pas, n importe qui peut
// creer un projet Supabase et obtenir un sous-domaine en .supabase.co. Le
// poids, le sommeil et les blessures pouvaient donc partir chez un tiers.
a(/\$\{supabase\}/.test(csp), 'connect-src prend l origine Supabase d une variable, pas d un joker')
a(cfg.includes('function supabaseSources'), 'cette origine est derivee de VITE_SUPABASE_URL')
a(cfg.includes('loadEnv'), 'lue au build par loadEnv')
const repli = cfg.slice(cfg.indexOf('function supabaseSources'))
a(/catch[\s\S]{0,500}\*\.supabase\.co/.test(repli), 'le joker ne subsiste que comme repli, quand la variable manque')

// Verification sur le HTML reellement produit, si un build est present.
if (existsSync('../../dist/index.html')) {
  const bati = readFileSync('../../dist/index.html', 'utf8')
  a(!bati.includes('*.supabase.co'), 'le HTML produit ne porte aucun joker supabase')
  a(/connect-src[^"]*https:\/\/[a-z0-9]+\.supabase\.co/.test(bati), 'mais une origine Supabase precise')
}

// Le coeur de la protection : aucune autre adresse. Si connect-src gagne un
// joker general, une donnee de sante peut repartir n importe ou.
// connect-src est un gabarit (backticks) depuis que l origine Supabase y est
// injectee : chercher seulement des guillemets doubles ne trouvait plus rien.
const connect = (csp.match(/[`"]connect-src[^`"]*[`"]/) || [''])[0]
a(connect.length > 0, 'connect-src est defini')
a(!/\s\*[\s"]/.test(connect), 'connect-src ne contient aucun joker general')

// Une politique qui autorise le script en ligne ne protege plus de rien :
// c est exactement ce qu injecterait une faille XSS.
const script = (csp.match(/[`"]script-src[^`"]*[`"]/) || [''])[0]
a(!script.includes("'unsafe-inline'"), 'script-src n autorise pas le script en ligne')
a(!script.includes("'unsafe-eval'"), "script-src n autorise pas eval() — seul 'wasm-unsafe-eval' est la, pour l OCR")
a(script.includes("'wasm-unsafe-eval'"), 'mais WebAssembly reste compilable, sinon la lecture des captures tombe')

// Posee au build seulement : en developpement elle bloquerait le
// rechargement a chaud, et quelqu un finirait par la retirer pour de bon.
a(/apply:\s*'build'/.test(cfg), 'la politique est posee au build, pas en developpement')
a(!readFileSync('../../index.html', 'utf8').includes('Content-Security-Policy'),
  'le HTML source n en porte pas : npm run dev reste utilisable')

// ─── chaine d approvisionnement du deploiement ───

// Le durcissement du deploiement (npm ci, droits reduits par job, lint et
// tests avant publication) est ecrit mais differe : le jeton de cette
// machine n a pas la portee `workflow`, et GitHub refuse toute poussee qui
// modifie un fichier de workflow sans elle. Il bloquait a lui seul huit
// commits, dont des correctifs de securite. Les assertions reviendront avec
// lui — voir la branche `durcissement-deploiement`.
const wf = readFileSync('../../.github/workflows/deploy.yml', 'utf8')
a(/runs-on:/.test(wf), 'le workflow de deploiement est en place')

// ─── aucun secret serveur dans le depot ───

for (const f of ['0001_init.sql', '0002_fix_profile_privilege_escalation.sql', '0003_fix_privilege_trigger_sql_editor.sql', '0004_pin_function_search_path.sql']) {
  const sql = readFileSync('../../supabase/migrations/' + f, 'utf8')
  a(!/service_role|eyJ[A-Za-z0-9_-]{20}/.test(sql), `${f} ne contient aucune cle de service`)
}

// Les fonctions security definer doivent figer leur search_path, sinon
// is_admin() peut etre detournee vers une fausse table profiles.
const m4 = readFileSync('../../supabase/migrations/0004_pin_function_search_path.sql', 'utf8')
// En debut de ligne seulement : le commentaire d en-tete parle lui aussi de
// `security definer`, et le compter ferait passer le test pour une raison
// qui n a rien a voir avec le SQL reellement execute.
const definers = (m4.match(/^security definer$/gm) || []).length
const pinned = (m4.match(/set search_path\s*=\s*public,\s*pg_temp/g) || []).length
a(definers === 3, `${definers} fonctions security definer reprises`)
a(pinned === definers, `et les ${pinned} ont leur search_path fige`)
for (const fn of ['is_admin', 'handle_new_user', 'prevent_self_privilege_escalation']) {
  a(m4.includes(fn), `${fn} est du lot`)
}

console.log('\nALL PASS')
