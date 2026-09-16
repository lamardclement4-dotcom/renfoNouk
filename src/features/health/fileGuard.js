// ============================================================
// Plafonds de taille sur les fichiers que l'utilisateur dépose.
//
// Trois écrans lisent une image par OCR (import d'activité, balance,
// conditions météo) et un quatrième lit une trace GPX/TCX. Tous chargent le
// fichier d'un bloc en mémoire — `file.text()` ou le moteur de lecture.
// Sur un mauvais fichier (vidéo prise pour une capture, archive entière,
// export de plusieurs années), l'onglet tombe sans rien expliquer.
//
// Seul l'export Santé échappe à ces plafonds : il est lu par tranches et sa
// mémoire reste bornée quelle que soit sa taille.
//
// Les plafonds vivent ici plutôt que recopiés dans chaque écran : une
// limite recopiée quatre fois finit par diverger, et c'est l'écran oublié
// qui plante.
// ============================================================

// Une capture d'écran de téléphone pèse moins de 2 Mo. 20 Mo laisse passer
// une photo d'appareil sans laisser passer une vidéo.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

// Un GPX ou TCX d'une seule activité, même longue et à la seconde, reste
// sous quelques mégaoctets.
export const MAX_TRACE_BYTES = 8 * 1024 * 1024

export const mo = (n) => Math.round(Number(n) / (1024 * 1024))

// Renvoie un message d'erreur si le fichier dépasse, sinon null — pour que
// l'appelant puisse écrire `const err = tooLarge(...); if (err) { … }`.
//
// Un fichier absent ou sans taille lisible n'est pas refusé ici : ce n'est
// pas un problème de taille, et le laisser passer donne un message plus
// juste en aval.
export function tooLarge(file, max, kind = 'Fichier') {
  const size = file && Number(file.size)
  if (!Number.isFinite(size) || size <= 0) return null
  if (size <= max) return null
  return `${kind} trop lourd (${mo(size)} Mo, maximum ${mo(max)} Mo).`
}

export const imageTooLarge = (file) => {
  const err = tooLarge(file, MAX_IMAGE_BYTES, 'Image')
  return err && `${err} Une capture d’écran de téléphone en fait moins de deux.`
}

export const traceTooLarge = (file) => {
  const err = tooLarge(file, MAX_TRACE_BYTES, 'Fichier')
  return err && `${err} Un GPX ou TCX d’une seule activité dépasse rarement quelques mégaoctets.`
}
