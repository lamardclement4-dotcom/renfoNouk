// ============================================================
// Service worker : l'app s'ouvre sans réseau.
//
// Modèle complété au build (vite.config.js, plugin serviceWorker) : la
// liste des fichiers de l'app et leur version y sont inscrites, puis il est
// publié en /sw.js. Il n'est pas importé par l'app.
//
// Ce qu'il garde, et ce qu'il ne garde jamais :
// - les fichiers de l'app (code, styles, polices) : gardés dès
//   l'installation, servis depuis le cache. Leur nom change à chaque
//   version, une copie gardée est donc toujours exacte ;
// - la page elle-même : réseau d'abord (pour recevoir les mises à jour),
//   copie gardée si le réseau ne répond pas en quelques secondes ;
// - le moteur de lecture des captures (/ocr/) : gardé au premier usage
//   seulement, il pèse plusieurs mégaoctets ;
// - Supabase, la météo, tout autre site : jamais. Aucune donnée
//   personnelle ne passe par ce cache ; les données hors ligne vivent dans
//   la copie du store, effacée à la déconnexion.
// ============================================================
const VERSION = '__VERSION__'
const BASE = '__BASE__'
const FICHIERS = JSON.parse('__FICHIERS__')
const CACHE_APP = 'renfo-app-' + VERSION
const CACHE_OCR = 'renfo-ocr-__OCR__'
const DELAI_PAGE_MS = 4000

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP)
    await cache.addAll([BASE, ...FICHIERS.map((f) => BASE + f)])
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const cle of await caches.keys()) {
      const ancienneApp = cle.startsWith('renfo-app-') && cle !== CACHE_APP
      const ancienOcr = cle.startsWith('renfo-ocr-') && cle !== CACHE_OCR
      if (ancienneApp || ancienOcr) await caches.delete(cle)
    }
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Tout ce qui ne vient pas de l'app passe sans détour par le réseau.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return
  if (req.mode === 'navigate') { e.respondWith(page(req)); return }
  const chemin = url.pathname.slice(BASE.length)
  if (chemin.startsWith('assets/')) { e.respondWith(depuisCache(req, CACHE_APP)); return }
  if (chemin.startsWith('ocr/')) { e.respondWith(depuisCache(req, CACHE_OCR)); return }
})

// Réseau d'abord, copie gardée en repli : en ligne, on reçoit toujours la
// dernière version ; dans une salle sans réseau, l'app s'ouvre quand même.
async function page(req) {
  const cache = await caches.open(CACHE_APP)
  try {
    const rep = await avecDelai(fetch(req), DELAI_PAGE_MS)
    if (rep && rep.ok) await cache.put(BASE, rep.clone())
    return rep
  } catch {
    return (await cache.match(BASE, { ignoreVary: true })) || Response.error()
  }
}

async function depuisCache(req, nom) {
  const cache = await caches.open(nom)
  // ignoreVary : le serveur répond « Vary: Origin » ou « Accept-Encoding »,
  // et les scripts sont demandés en mode crossorigin. Sans cette option, la
  // copie gardée à l'installation (requête sans Origin) n'était jamais
  // reconnue : hors ligne, la page s'ouvrait… sans son code. Les noms de
  // fichiers changent avec leur contenu, l'URL suffit à les identifier.
  const garde = await cache.match(req, { ignoreVary: true })
  if (garde) return garde
  const rep = await fetch(req)
  if (rep && rep.ok) await cache.put(req, rep.clone())
  return rep
}

function avecDelai(promesse, ms) {
  return new Promise((resoudre, rejeter) => {
    const t = setTimeout(() => rejeter(new Error('délai dépassé')), ms)
    promesse.then((r) => { clearTimeout(t); resoudre(r) }, (e) => { clearTimeout(t); rejeter(e) })
  })
}
