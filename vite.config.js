import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

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
// Aucune origine tierce n'est autorisée pour du code : tout script vient
// du site lui-même. Le moteur de lecture des captures (tesseract.js), qui
// venait de cdn.jsdelivr.net — un CDN qui sert n'importe quel paquet npm,
// donc n'importe quel code —, est désormais servi depuis /ocr/ (voir
// servirOcr plus bas).
//
// Les autorisations restantes, et pourquoi :
// - `wasm-unsafe-eval` : compilation du cœur WebAssembly de l'OCR. Cette
//   directive n'autorise que WebAssembly, pas eval() sur du JavaScript.
// - `connect-src blob:` : l'image à lire est passée au moteur sous forme
//   d'URL blob locale ; elle ne quitte pas l'appareil.
// - open-meteo.com : la météo du jour, pour pondérer la charge.
//
// `frame-ancestors` est absent volontairement : la directive est ignorée
// dans une balise meta, elle n'a d'effet qu'en en-tête HTTP. GitHub Pages
// ne permettant pas d'en poser, la protection contre l'encadrement de la
// page par un site tiers n'est pas atteignable ici.
// ============================================================
const CSP_SOURCES = (supabase) => [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  // Pas de 'unsafe-inline' : les styles des composants sont posés par
  // React via le CSSOM (element.style), que la politique ne bloque pas ;
  // seuls les <style> et attributs style écrits en dur le seraient, et
  // l'app n'en a aucun. Une injection de CSS ne peut donc rien appliquer.
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' blob: ${supabase} https://*.open-meteo.com`,
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
    // Pas de wss:// : le temps réel de Supabase n'est plus embarqué
    // (voir src/supabaseClient.js), aucune connexion websocket n'est ouverte.
    return u.origin
  } catch {
    // Repli, jamais souhaitable en production : sans la variable, mieux vaut
    // une politique large qu'une application qui ne joint plus sa base. Le
    // build publié dispose du secret, ce message signale le cas contraire.
    console.warn('[csp] VITE_SUPABASE_URL absente ou invalide — connect-src retombe sur le joker *.supabase.co.')
    return 'https://*.supabase.co'
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

// Préchargement des polices du premier écran. Sans lui, le navigateur ne
// découvre une police qu'après avoir lu la feuille de style puis rencontré
// un texte qui l'utilise : le titre s'affiche d'abord dans la police de
// secours, puis saute. Seules les trois graisses visibles dès l'écran de
// connexion sont préchargées ; les autres viennent à la demande.
const POLICES_PRECHARGEES = ['big-shoulders-display-latin-800-normal', 'martian-mono-latin-600-normal', 'instrument-sans-latin-400-normal']
const prechargePolices = () => {
  let base = '/'
  return {
    name: 'precharge-polices',
    apply: 'build',
    configResolved: (config) => { base = config.base },
    transformIndexHtml: {
      order: 'post',
      handler: (html, ctx) => Object.keys(ctx.bundle || {})
        .filter((f) => f.endsWith('.woff2') && POLICES_PRECHARGEES.some((m) => f.includes(m)))
        .map((f) => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: base + f }, injectTo: 'head' })),
    },
  }
}

// Moteur de lecture des captures servi par le site lui-même, depuis
// /ocr/ : worker, cœur WebAssembly (trois variantes ; le moteur choisit
// selon ce que le téléphone sait faire, une seule est téléchargée) et
// données de langue. Les fichiers sont pris dans node_modules, aux
// versions fixées par package-lock : rien de binaire dans le dépôt. Un
// fichier absent fait échouer le build, plutôt qu'une lecture qui
// casserait en silence chez l'utilisateur.
const nm = (...p) => join(process.cwd(), 'node_modules', ...p)
const FICHIERS_OCR = {
  'worker.min.js': nm('tesseract.js', 'dist', 'worker.min.js'),
  'tesseract-core-lstm.wasm.js': nm('tesseract.js-core', 'tesseract-core-lstm.wasm.js'),
  'tesseract-core-simd-lstm.wasm.js': nm('tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'),
  'tesseract-core-relaxedsimd-lstm.wasm.js': nm('tesseract.js-core', 'tesseract-core-relaxedsimd-lstm.wasm.js'),
  'fra.traineddata.gz': nm('@tesseract.js-data', 'fra', '4.0.0_best_int', 'fra.traineddata.gz'),
  'eng.traineddata.gz': nm('@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'),
}
const servirOcr = () => {
  let base = '/'
  return {
    name: 'ocr-local',
    configResolved: (config) => { base = config.base },
    // En développement, les mêmes fichiers sont servis à la même adresse.
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        const prefixe = base + 'ocr/'
        if (!req.url || !req.url.startsWith(prefixe)) return next()
        const chemin = FICHIERS_OCR[decodeURIComponent(req.url.slice(prefixe.length).split('?')[0])]
        if (!chemin) return next()
        res.setHeader('Content-Type', chemin.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
        res.end(readFileSync(chemin))
      })
    },
    generateBundle() {
      for (const [nom, chemin] of Object.entries(FICHIERS_OCR)) {
        this.emitFile({ type: 'asset', fileName: 'ocr/' + nom, source: readFileSync(chemin) })
      }
    },
  }
}

// Service worker (src/sw/sw-modele.js) : complété ici avec la liste des
// fichiers de l'app et une version tirée de leurs noms — qui changent avec
// leur contenu —, puis publié en /sw.js. Les anciennes polices .woff ne
// sont pas gardées : tous les navigateurs actuels lisent le .woff2.
const versionPaquet = (...p) => JSON.parse(readFileSync(nm(...p, 'package.json'), 'utf8')).version
const serviceWorker = () => {
  let base = '/'
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved: (config) => { base = config.base },
    generateBundle(_, bundle) {
      const fichiers = Object.keys(bundle).filter((f) => f.startsWith('assets/') && !f.endsWith('.map') && !f.endsWith('.woff')).sort()
      const version = createHash('sha256').update(fichiers.join('\n')).digest('hex').slice(0, 12)
      const ocr = [versionPaquet('tesseract.js'), versionPaquet('tesseract.js-core'), versionPaquet('@tesseract.js-data', 'fra'), versionPaquet('@tesseract.js-data', 'eng')].join('-')
      const source = readFileSync('src/sw/sw-modele.js', 'utf8')
        .replace("'__VERSION__'", JSON.stringify(version))
        .replace("'__BASE__'", JSON.stringify(base))
        .replace("JSON.parse('__FICHIERS__')", JSON.stringify(fichiers))
        .replace('__OCR__', ocr)
      if (/__[A-Z]+__/.test(source)) throw new Error('service worker : un marqueur du modèle n’a pas été rempli')
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
// base: obligatoire pour GitHub Pages, doit correspondre au nom du repo
// (l'app est servie depuis https://<user>.github.io/renfoNouk/, pas la racine)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const csp = CSP_SOURCES(supabaseSources(env.VITE_SUPABASE_URL))
  return {
    plugins: [react(), cspMeta(csp), prechargePolices(), servirOcr(), serviceWorker()],
    base: '/renfoNouk/',
  }
})
