// ============================================================
// Trusted Types : la politique « default ».
//
// La politique de sécurité (vite.config.js) exige que toute injection de
// HTML ou de script passe par une politique déclarée. L'app n'injecte
// jamais de HTML : tout passe par React, qui écrit du texte. Les seules
// URL de script légitimes sont celles du site lui-même : le service worker
// et le moteur de lecture des captures (worker et cœur WebAssembly).
// Tout le reste est refusé — une faille qui tenterait d'injecter du HTML
// ou de charger un script échoue au lieu de s'exécuter.
//
// Doit être chargée avant tout autre code (premier import de main.jsx).
// Sans effet dans les navigateurs qui ne connaissent pas Trusted Types.
// ============================================================
export function urlDeScriptAutorisee(brute, base, origine) {
  let url
  try { url = new URL(String(brute), origine + base) } catch { return null }
  if (url.origin !== origine) return null
  if (url.pathname === base + 'sw.js') return url.href
  if (url.pathname.startsWith(base + 'ocr/') && /\.js$/.test(url.pathname)) return url.href
  return null
}

if (typeof window !== 'undefined' && window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function') {
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/'
  try {
    window.trustedTypes.createPolicy('default', {
      createScriptURL: (brute) => {
        const ok = urlDeScriptAutorisee(brute, base, window.location.origin)
        if (!ok) throw new TypeError('Trusted Types : script refusé (' + String(brute).slice(0, 80) + ')')
        return ok
      },
      createHTML: () => { throw new TypeError('Trusted Types : injection de HTML refusée') },
      createScript: () => { throw new TypeError('Trusted Types : script en ligne refusé') },
    })
  } catch (e) {
    // Politique déjà définie (rechargement à chaud en développement).
    console.warn('[trusted-types]', e && e.message)
  }
}
