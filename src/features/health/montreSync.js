// ============================================================
// Montre : la clé du Raccourci et le relevé de la boîte de dépôt.
//
// Chargé à la demande (import dynamique) : l'écran qui l'appelle n'a pas à
// embarquer le client Supabase pour rien, et les tests d'écran n'y passent
// pas.
// ============================================================
import { supabase } from '../../lib'
import { toPatch } from '../train/healthImport'
import { lireDepot, genererCle, empreinteCle, resumeReleve } from './montre'
import { annoncer } from '../../annonces'

// La migration 0005 n'a pas été appliquée : tables absentes.
const absente = (e) => !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table/i.test(e.message || ''))

export async function etatMontre(userId) {
  const { data, error } = await supabase.from('jetons_montre').select('cree_le, dernier_depot').eq('user_id', userId).maybeSingle()
  if (error) return { erreur: absente(error) ? 'migration' : 'reseau' }
  return { configuree: !!data, creeLe: data ? data.cree_le : null, dernierDepot: data ? data.dernier_depot : null }
}

// Nouvelle clé : remplace l'ancienne, qui cesse aussitôt de marcher.
export async function nouvelleCle(userId) {
  const cle = genererCle()
  const jeton_hash = await empreinteCle(cle)
  const { error } = await supabase.from('jetons_montre').upsert({ user_id: userId, jeton_hash, cree_le: new Date().toISOString(), dernier_depot: null }, { onConflict: 'user_id' })
  if (error) return { erreur: absente(error) ? 'migration' : 'reseau' }
  return { cle }
}

export async function supprimerCle(userId) {
  const { error } = await supabase.from('jetons_montre').delete().eq('user_id', userId)
  return error ? { erreur: absente(error) ? 'migration' : 'reseau' } : { ok: true }
}

// Relève la boîte : range les mesures dans le journal (comme un import
// Santé, sans rien écraser de ce qui a été noté à la main), puis efface
// les dépôts relevés. Rien n'est effacé si l'écriture n'a pas pu partir.
let dernierReleve = 0
export async function releverMontre(store, { force = false, silencieux = false } = {}) {
  if (!force && Date.now() - dernierReleve < 10 * 60 * 1000) return { saute: true }
  dernierReleve = Date.now()
  const { data, error } = await supabase.from('depots_montre').select('id, recu_le, texte').order('recu_le', { ascending: true }).limit(60)
  if (error) return { erreur: absente(error) ? 'migration' : 'reseau' }
  if (!data || !data.length) return { vide: true }
  const res = lireDepot(data.map((d) => d.texte).join('\n'))
  let summary = null
  store.set((sx) => {
    const r = toPatch(res, sx || {}, { source: 'montre' })
    summary = r.summary
    return { sleepLog: r.patch.sleepLog, vitalsLog: r.patch.vitalsLog }
  })
  if (!summary) return { erreur: 'ecriture' }
  await supabase.from('depots_montre').delete().in('id', data.map((d) => d.id))
  const phrase = resumeReleve(summary)
  if (phrase && !silencieux) annoncer(phrase)
  return { summary, lues: res.lues, ecartees: res.ecartees, depots: data.length, phrase }
}

// Relevé discret à l'ouverture d'un écran : jamais d'erreur affichée,
// jamais plus d'une fois toutes les dix minutes.
export function releverEnFond(store) {
  releverMontre(store).catch(() => {})
}
