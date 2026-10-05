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
    const { data, error: erreurSession } = await auth.getSession()
    const jeton = data && data.session ? data.session.access_token : null
    // Une écriture sans session ne doit jamais partir. Avec la seule clé
    // publique, les règles d'accès la rejettent… en silence : « 0 ligne
    // modifiée », sans erreur. La file d'écritures la croyait alors réussie
    // et la saisie était perdue (session expirée, hors ligne trop long).
    // L'erreur levée ici est reconnue comme non rejouable : la saisie reste
    // en file jusqu'à ce que la session revienne.
    const methode = String((init && init.method) || 'GET').toUpperCase()
    if (!jeton && methode !== 'GET' && methode !== 'HEAD') {
      // Session impossible à rafraîchir faute de réseau : c'est provisoire,
      // la file réessaiera d'elle-même (erreur réseau, donc rejouable).
      if (erreurSession && (erreurSession.name === 'AuthRetryableFetchError' || erreurSession.status === 0)) {
        throw new TypeError('Failed to fetch : session à rafraîchir, réseau indisponible')
      }
      throw new Error('JWT absent : écriture refusée sans session')
    }
    const entetes = new Headers(init && init.headers)
    if (!entetes.has('apikey')) entetes.set('apikey', cle)
    if (!entetes.has('Authorization')) entetes.set('Authorization', `Bearer ${jeton || cle}`)
    return reseau(entree, { ...init, headers: entetes })
  }
  const rest = new PostgrestClient(new URL('rest/v1', base).href, { headers: {}, schema: 'public', fetch: fetchAvecJeton })
  return { auth, from: (table) => rest.from(table) }
}

// Session gardée sur l'appareil, lue sans réseau. Hors ligne, le jeton
// expire au bout d'une heure et ne peut pas être rafraîchi : le client
// d'authentification répond alors « pas de session », mais la conserve
// tant que l'échec est dû au réseau (il ne l'efface que sur un refus du
// serveur ou une déconnexion). Sa présence suffit à savoir qui est
// connecté pour ouvrir l'app sur ses données locales ; aucune requête ne
// part avec, elles attendent le retour du réseau et un jeton frais.
export function lireSessionLocale(url, stockage) {
  try {
    const st = stockage || (typeof localStorage !== 'undefined' ? localStorage : null)
    const brute = st && st.getItem(cleDeSession(url))
    const s = brute ? JSON.parse(brute) : null
    const user = s && (s.user || (s.currentSession && s.currentSession.user))
    if (!user || typeof user.id !== 'string') return null
    return { user: { id: user.id, email: user.email || null }, horsLigne: true }
  } catch {
    return null
  }
}
