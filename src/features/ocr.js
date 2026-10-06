// ============================================================
// Lecture du texte d'une capture d'écran (Tesseract), en un seul endroit.
//
// Tesseract allait chercher sur cdn.jsdelivr.net son worker, son cœur
// WebAssembly et ses données de langue. Ce CDN sert n'importe quel paquet
// npm : l'autoriser dans la politique de sécurité ouvrait la porte à du
// code arbitraire. Tous ces fichiers sont désormais servis par le site
// lui-même, depuis /ocr/ (copiés depuis node_modules au build, voir
// vite.config.js), et la politique n'autorise plus aucune origine tierce
// pour le code.
//
// Le moteur pèse plusieurs mégaoctets : il n'est chargé qu'au premier
// appel, et l'image ne quitte jamais l'appareil.
// ============================================================
export function dossierOcr() {
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/'
  return new URL(base + 'ocr/', window.location.href).href
}

export async function lireImage(image, { logger } = {}) {
  const { default: Tesseract } = await import('tesseract.js')
  const dossier = dossierOcr()
  return Tesseract.recognize(image, 'fra+eng', {
    workerPath: dossier + 'worker.min.js',
    corePath: dossier,
    langPath: dossier,
    // Worker chargé depuis son fichier plutôt que recopié dans une URL
    // blob : la politique n'a plus à autoriser blob: pour les scripts.
    workerBlobURL: false,
    // Passé seulement s'il existe : un « logger » vide remplaçait celui du
    // moteur et le faisait lever à chaque étape.
    ...(typeof logger === 'function' ? { logger } : {}),
  })
}
