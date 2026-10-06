// ============================================================
// Annonces : courts messages après une action (« Pesée supprimée »),
// avec un éventuel bouton « Annuler ». Module sans interface — le store
// l'utilise, le composant Annonces (kit.jsx) les affiche et les lit aux
// lecteurs d'écran.
// ============================================================
const abonnes = new Set()
let courante = null
let minuteur = null
let suivant = 1

export function annoncer(texte, { annuler, duree = 6000 } = {}) {
  clearTimeout(minuteur)
  courante = { id: suivant++, texte, annuler: typeof annuler === 'function' ? annuler : null }
  for (const f of abonnes) f(courante)
  minuteur = setTimeout(fermerAnnonce, duree)
  return courante.id
}

export function fermerAnnonce() {
  clearTimeout(minuteur)
  courante = null
  for (const f of abonnes) f(null)
}

export function ecouterAnnonces(f) {
  abonnes.add(f)
  f(courante)
  return () => abonnes.delete(f)
}
