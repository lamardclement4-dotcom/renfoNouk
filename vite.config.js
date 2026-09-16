import { defineConfig } from 'vite'
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
// laquelle envoyer quoi que ce soit — seuls Supabase, Open-Meteo et le CDN
// de l'OCR sont joignables.
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
// `frame-ancestors` est absent volontairement : la directive est ignorée
// dans une balise meta, elle n'a d'effet qu'en en-tête HTTP. GitHub Pages
// ne permettant pas d'en poser, la protection contre l'encadrement de la
// page par un site tiers n'est pas atteignable ici.
// ============================================================
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://*.open-meteo.com https://cdn.jsdelivr.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

// Posée au build seulement. En développement, Vite a besoin d'un websocket
// vers localhost et d'un script en ligne pour le rechargement à chaud :
// cette politique les bloquerait, et `npm run dev` deviendrait pénible.
const cspMeta = () => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: (html) => ({
    html,
    tags: [{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
      injectTo: 'head-prepend',
    }],
  }),
})

// https://vite.dev/config/
// base: obligatoire pour GitHub Pages, doit correspondre au nom du repo
// (l'app est servie depuis https://<user>.github.io/renfoNouk/, pas la racine)
export default defineConfig({
  plugins: [react(), cspMeta()],
  base: '/renfoNouk/',
})
