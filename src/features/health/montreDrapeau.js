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
