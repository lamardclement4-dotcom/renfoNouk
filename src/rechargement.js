// ============================================================
// Mise en ligne pendant que l'app est ouverte.
//
// Les fichiers d'écrans portent un nom qui change à chaque version et les
// anciens disparaissent du serveur : ouvrir un onglet réclame alors un
// fichier qui n'existe plus. Un rechargement suffit. Il est fait
// automatiquement, une seule fois par minute, pour ne jamais boucler si le
// problème est ailleurs.
// ============================================================
const MARQUE = 'renfo:rechargement'

export function estErreurDeChargement(erreur) {
  const m = String((erreur && (erreur.message || erreur)) || '')
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk .* failed/i.test(m)
}

export function rechargerUneFois() {
  try {
    const dernier = Number(sessionStorage.getItem(MARQUE) || 0)
    if (Date.now() - dernier < 60000) return false
    sessionStorage.setItem(MARQUE, String(Date.now()))
  } catch {
    // Stockage indisponible : on ne recharge pas, faute de pouvoir
    // garantir qu'on ne bouclera pas.
    return false
  }
  window.location.reload()
  return true
}
