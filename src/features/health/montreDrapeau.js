// Montre reliée sur cet appareil ? Un simple drapeau local, pour ne
// relever la boîte de dépôt que chez qui a créé une clé : les autres
// n'envoient aucune requête pour rien. Aucune donnée personnelle dedans.
export const drapeauMontre = (userId) => 'renfo:montre:' + userId
export function montreReliee(userId) {
  try { return !!userId && localStorage.getItem(drapeauMontre(userId)) === '1' } catch { return false }
}
export function marquerMontre(userId, oui) {
  try { if (oui) localStorage.setItem(drapeauMontre(userId), '1'); else localStorage.removeItem(drapeauMontre(userId)) } catch { /* stockage indisponible */ }
}

// Lancer le raccourci depuis le site, sans automatisation : Safari ouvre
// Raccourcis, qui exécute « Envoyer ma nuit » puis revient ici
// (x-success) avec ?montre=1 — le site relève alors aussitôt la boîte.
export const NOM_RACCOURCI = 'Envoyer ma nuit'
export function lienEnvoyerMaintenant(retour) {
  return 'shortcuts://x-callback-url/run-shortcut?name=' + encodeURIComponent(NOM_RACCOURCI)
    + '&x-success=' + encodeURIComponent(retour)
}
export function adresseRetour() {
  try {
    const base = (import.meta.env && import.meta.env.BASE_URL) || '/'
    return window.location.origin + base + '?montre=1'
  } catch { return '' }
}
// Retour du raccourci : le paramètre est lu une fois, puis retiré de
// l'adresse pour qu'un rechargement ne relève pas à nouveau.
export function retourDeMontre() {
  try {
    const u = new URL(window.location.href)
    if (!u.searchParams.has('montre')) return false
    u.searchParams.delete('montre')
    window.history.replaceState(window.history.state, '', u.pathname + (u.search || '') + u.hash)
    return true
  } catch { return false }
}
