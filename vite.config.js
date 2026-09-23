import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ============================================================
// Politique de sécurité du contenu (CSP)
//
// L'app est un site statique servi par GitHub Pages : aucun serveur à nous
// ne peut poser d'en-tête HTTP, la politique passe donc par une balise
// meta posée sur le HTML produit.
//
// Ce qu'elle protège vraiment : `connect-src`. Un carnet d'entraînement,
// c'est du poids, du sommeil, des blessures. Même si du code étranger
// arrivait à s'exécuter dans la page, il n'aurait aucune adresse vers
// laquelle envoyer quoi que ce soit.
//
// Les autorisations inhabituelles, et pourquoi elles sont nécessaires :
// - `blob:` et `cdn.jsdelivr.net` : tesseract.js (lecture des captures
//   d'écran) télécharge depuis ce CDN son worker, son cœur WebAssembly et
//   ses données de langue, puis exécute le worker via une URL blob.
// - `wasm-unsafe-eval` : compilation du cœur WebAssembly de l'OCR. Cette
//   directive n'autorise que WebAssembly, pas eval() sur du JavaScript.
// - `style-src 'unsafe-inline'` : la feuille produite par Vite est servie
//   depuis l'origine, mais les styles en ligne des composants passent par
//   cette directive.
//
// Limite connue et assumée : `cdn.jsdelivr.net` sert n'importe quel paquet
// npm, donc un point d'injection pourrait y charger du code. La resserrer
// par chemin casserait l'OCR au premier changement de version, sans moyen
// de s'en apercevoir. Le vrai remède serait d'embarquer le moteur.
//
// `frame-ancestors` est absent volontairement : la directive est ignorée
// dans une balise meta, elle n'a d'effet qu'en en-tête HTTP. GitHub Pages
// ne permettant pas d'en poser, la protection contre l'encadrement de la
// page par un site tiers n'est pas atteignable ici.
// ============================================================
const CSP_SOURCES = (supabase) => [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' blob: ${supabase} https://*.open-meteo.com https://cdn.jsdelivr.net`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

// L'origine Supabase est épinglée sur le projet réel, lue au build.
//
// Un joker `https://*.supabase.co` paraissait équivalent, et ne l'est pas :
// n'importe qui peut créer un projet Supabase gratuit et obtenir un
// sous-domaine en .supabase.co. Le joker autorisait donc l'envoi du poids,
// du sommeil et des blessures vers le projet d'un tiers — exactement ce que
// connect-src est censé empêcher.
function supabaseSources(url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') throw new Error('origine non https')
    return `${u.origin} wss://${u.host}`
  } catch {
    // Repli, jamais souhaitable en production : sans la variable, mieux vaut
    // une politique large qu'une application qui ne joint plus sa base. Le
    // build publié dispose du secret, ce message signale le cas contraire.
    console.warn('[csp] VITE_SUPABASE_URL absente ou invalide — connect-src retombe sur le joker *.supabase.co.')
    return 'https://*.supabase.co wss://*.supabase.co'
  }
}

// Posée au build seulement. En développement, Vite a besoin d'un websocket
// vers localhost et d'un script en ligne pour le rechargement à chaud :
// cette politique les bloquerait, et `npm run dev` deviendrait pénible.
const cspMeta = (csp) => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: (html) => ({
    html,
    tags: [{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
      injectTo: 'head-prepend',
    }],
  }),
})

// https://vite.dev/config/
// base: obligatoire pour GitHub Pages, doit correspondre au nom du repo
// (l'app est servie depuis https://<user>.github.io/renfoNouk/, pas la racine)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const csp = CSP_SOURCES(supabaseSources(env.VITE_SUPABASE_URL))
  return {
    plugins: [react(), cspMeta(csp)],
    base: '/renfoNouk/',
  }
})
