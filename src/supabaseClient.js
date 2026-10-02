// ============================================================
// Client Supabase réduit à ce que l'app utilise : l'authentification et
// les requêtes de table.
//
// Le client complet (@supabase/supabase-js) embarque aussi le temps réel,
// le stockage de fichiers et les fonctions — environ 85 kB que l'écran de
// connexion devait télécharger et lire avant de s'afficher, sans jamais
// s'en servir. Celui-ci assemble les deux mêmes briques officielles
// (@supabase/auth-js et @supabase/postgrest-js) exactement comme le client
// complet le fait : même clé de stockage de session (une session ouverte
// avant le changement reste ouverte), mêmes options d'authentification,
// même jeton joint à chaque requête.
//
// Un test (t77) fait tourner ce client à côté du client complet sur un
// faux réseau et vérifie que les requêtes envoyées et la session lue sont
// identiques : si une mise à jour de Supabase change sa façon de faire, ce
// test le signalera.
// ============================================================
import { AuthClient } from '@supabase/auth-js'
import { PostgrestClient } from '@supabase/postgrest-js'

function urlDeBase(url) {
  const brute = typeof url === 'string' ? url.trim() : ''
  if (!/^https?:\/\//i.test(brute)) throw new Error('URL Supabase invalide : elle doit commencer par http(s)://')
  return new URL(brute.endsWith('/') ? brute : brute + '/')
}

// La clé sous laquelle le client complet range la session : la reprendre
// à l'identique évite de déconnecter tout le monde au changement de client.
export function cleDeSession(url) {
  return `sb-${urlDeBase(url).hostname.split('.')[0]}-auth-token`
}

export function creerClient(url, cle, options = {}) {
  if (!cle) throw new Error('Clé Supabase manquante.')
  const base = urlDeBase(url)
  const reseau = options.fetch ? (...a) => options.fetch(...a) : (...a) => fetch(...a)
  const auth = new AuthClient({
    url: new URL('auth/v1', base).href,
    headers: { Authorization: `Bearer ${cle}`, apikey: cle },
    storageKey: cleDeSession(url),
    autoRefreshToken: options.autoRefreshToken ?? true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storage: options.storage,
    fetch: options.fetch,
    hasCustomAuthorizationHeader: false,
  })
  // Chaque requête de table porte le jeton de la session en cours, ou la
  // clé publique à défaut — les règles d'accès de la base (RLS) décident
  // ensuite de ce qui est visible.
  const fetchAvecJeton = async (entree, init) => {
    const { data } = await auth.getSession()
    const jeton = data && data.session ? data.session.access_token : null
    const entetes = new Headers(init && init.headers)
    if (!entetes.has('apikey')) entetes.set('apikey', cle)
    if (!entetes.has('Authorization')) entetes.set('Authorization', `Bearer ${jeton || cle}`)
    return reseau(entree, { ...init, headers: entetes })
  }
  const rest = new PostgrestClient(new URL('rest/v1', base).href, { headers: {}, schema: 'public', fetch: fetchAvecJeton })
  return { auth, from: (table) => rest.from(table) }
}
