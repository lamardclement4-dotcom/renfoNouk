// Le client Supabase reduit (src/supabaseClient.js) doit se comporter
// exactement comme le client complet pour tout ce que l app utilise :
// meme cle de session, memes requetes de table, meme connexion, meme
// deconnexion. Les deux tournent ici cote a cote sur un faux reseau et un
// faux stockage : aucune requete ne sort de la machine.
import { createClient } from '@supabase/supabase-js'
import { creerClient, cleDeSession } from '../../src/supabaseClient.js'
const a = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('OK:', m) }

const URL_ = 'https://abcdefghijklmnop.supabase.co'
const CLE = 'cle-publique-de-test'
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const maintenant = Math.floor(Date.now() / 1000)
const JETON = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: 'u1', exp: maintenant + 3600, role: 'authenticated', aud: 'authenticated' }) + '.signature'
const SESSION = { access_token: JETON, refresh_token: 'rafraichir', expires_in: 3600, expires_at: maintenant + 3600, token_type: 'bearer',
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'test@exemple.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }

function fauxStockage(depart = {}) {
  const m = new Map(Object.entries(depart))
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)) }, removeItem: (k) => { m.delete(k) }, m }
}
function fauxReseau() {
  const appels = []
  const f = async (entree, init = {}) => {
    const url = typeof entree === 'string' ? entree : entree.url
    const h = new Headers(init.headers)
    appels.push({ url, methode: init.method || 'GET', entetes: Object.fromEntries([...h.entries()]), corps: init.body || null })
    let corps = [{ id: 'u1' }]
    if (url.includes('/auth/v1/token')) corps = SESSION
    if (url.includes('/auth/v1/logout')) return new Response(null, { status: 204 })
    if (url.includes('/auth/v1/user')) corps = SESSION.user
    if (/single|object/.test(h.get('accept') || '')) corps = { id: 'u1' }
    return new Response(JSON.stringify(corps), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  f.appels = appels
  return f
}
const CLES_COMPAREES = ['apikey', 'authorization', 'accept', 'content-type', 'prefer', 'accept-profile', 'content-profile']
const essentiel = (c) => ({ url: c.url, methode: c.methode, corps: c.corps, ...Object.fromEntries(CLES_COMPAREES.map((k) => [k, c.entetes[k] || null])) })
const memes = (x, y) => JSON.stringify(essentiel(x)) === JSON.stringify(essentiel(y))

function paire(depart) {
  const so = fauxStockage(depart), sm = fauxStockage(depart)
  const ro = fauxReseau(), rm = fauxReseau()
  const officiel = createClient(URL_, CLE, { auth: { storage: so, autoRefreshToken: false }, global: { fetch: ro } })
  const reduit = creerClient(URL_, CLE, { storage: sm, fetch: rm, autoRefreshToken: false })
  return { officiel, reduit, so, sm, ro, rm }
}
const cle = cleDeSession(URL_)

// ─── cle de session ───
{
  const { officiel } = paire()
  a(cle === 'sb-abcdefghijklmnop-auth-token' && officiel.auth.storageKey === cle, 'meme cle de stockage de session que le client complet : ' + cle)
}

// ─── session deja ouverte avant le changement de client ───
{
  const { officiel, reduit } = paire({ [cle]: JSON.stringify(SESSION) })
  const so = (await officiel.auth.getSession()).data.session, sm = (await reduit.auth.getSession()).data.session
  a(so && sm && so.access_token === JETON && sm.access_token === JETON, 'une session ouverte avec le client complet est relue telle quelle')
}

// ─── requetes de table, connecte ───
{
  const p = paire({ [cle]: JSON.stringify(SESSION) })
  await p.officiel.from('profiles').select('*').eq('id', 'u1').single()
  await p.reduit.from('profiles').select('*').eq('id', 'u1').single()
  const o = p.ro.appels.at(-1), m = p.rm.appels.at(-1)
  a(memes(o, m), 'lecture du profil : meme adresse, memes en-tetes, meme corps')
  a(m.entetes.authorization === 'Bearer ' + JETON && m.entetes.apikey === CLE, 'la requete porte le jeton de l utilisateur, pas la cle publique')

  await p.officiel.from('profiles').update({ phys: { poids: 72 } }).eq('id', 'u1')
  await p.reduit.from('profiles').update({ phys: { poids: 72 } }).eq('id', 'u1')
  a(memes(p.ro.appels.at(-1), p.rm.appels.at(-1)) && p.rm.appels.at(-1).methode === 'PATCH', 'mise a jour : meme PATCH, meme corps')

  await p.officiel.from('nutrition_logs').upsert({ user_id: 'u1', day: '2026-10-02', data: {} }, { onConflict: 'user_id,day' })
  await p.reduit.from('nutrition_logs').upsert({ user_id: 'u1', day: '2026-10-02', data: {} }, { onConflict: 'user_id,day' })
  a(memes(p.ro.appels.at(-1), p.rm.appels.at(-1)), 'upsert : meme requete, meme strategie de conflit')

  await p.officiel.from('nutrition_logs').select('day, data').eq('user_id', 'u1').gte('day', '2026-09-01')
  await p.reduit.from('nutrition_logs').select('day, data').eq('user_id', 'u1').gte('day', '2026-09-01')
  a(memes(p.ro.appels.at(-1), p.rm.appels.at(-1)), 'lecture filtree : meme requete')
}

// ─── requetes de table, sans session ───
{
  const p = paire()
  await p.officiel.from('profiles').select('*')
  await p.reduit.from('profiles').select('*')
  a(memes(p.ro.appels.at(-1), p.rm.appels.at(-1)) && p.rm.appels.at(-1).entetes.authorization === 'Bearer ' + CLE, 'sans session : la cle publique, comme le client complet')
}

// ─── connexion et deconnexion ───
{
  const p = paire()
  const ro = await p.officiel.auth.signInWithPassword({ email: 'test@exemple.test', password: 'faux-mot-de-passe-de-test' })
  const rm = await p.reduit.auth.signInWithPassword({ email: 'test@exemple.test', password: 'faux-mot-de-passe-de-test' })
  const co = p.ro.appels.find((c) => c.url.includes('/auth/v1/token')), cm = p.rm.appels.find((c) => c.url.includes('/auth/v1/token'))
  a(co && cm && memes(co, cm), 'connexion : meme adresse, memes en-tetes, meme corps')
  a(!ro.error && !rm.error && rm.data.session && rm.data.session.access_token === JETON, 'la session recue est la meme')
  a(p.so.getItem(cle) && p.sm.getItem(cle) && JSON.parse(p.sm.getItem(cle)).access_token === JSON.parse(p.so.getItem(cle)).access_token, 'et elle est rangee au meme endroit, sous la meme forme')

  await p.officiel.auth.signOut()
  await p.reduit.auth.signOut()
  const lo = p.ro.appels.find((c) => c.url.includes('/auth/v1/logout')), lm = p.rm.appels.find((c) => c.url.includes('/auth/v1/logout'))
  a(lo && lm && memes(lo, lm), 'deconnexion : meme appel au serveur')
  a(p.so.getItem(cle) === null && p.sm.getItem(cle) === null, 'et la session est effacee de l appareil')
}

// ─── entrees invalides ───
let leve = 0
try { creerClient('pas-une-url', CLE) } catch { leve++ }
try { creerClient(URL_, '') } catch { leve++ }
a(leve === 2, 'URL ou cle invalides : erreur immediate plutot qu un client qui echoue en silence')
console.log('\nALL PASS')
