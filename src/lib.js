// Client réduit à l'authentification et aux tables (voir supabaseClient.js).
import { creerClient, lireSessionLocale } from './supabaseClient'

// --- Client Supabase ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Variables d\'environnement manquantes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
}

export const supabase = creerClient(supabaseUrl, supabaseAnonKey)

// Session conservée sur l'appareil, pour ouvrir l'app hors ligne.
export const sessionLocale = () => lireSessionLocale(supabaseUrl)

// Une base locale Dexie (IndexedDB « renfo ») était déclarée ici, avec des
// tables profil / séances / nutrition / sommeil / tests de mobilité. Plus
// aucun écran ne s'en servait : l'état hors ligne passe par la file
// d'attente de syncQueue.js, et le cache mémoire par useNutritionStore.
//
// Elle est retirée plutôt que laissée dormante. Une base de données de
// santé ouverte sur l'appareil, que rien ne remplit mais que rien ne vide
// non plus, n'est qu'une fuite en attente d'être remplie par mégarde.
