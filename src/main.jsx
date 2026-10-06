// En premier : la politique Trusted Types doit exister avant tout autre code.
import './typesDeConfiance'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Polices embarquées plutôt que chargées depuis Google : la politique de
// sécurité n'autorise aucune origine tierce pour les polices, et elles sont
// ainsi servies avec le reste du site. Seules les graisses utilisées sont
// importées, et le navigateur ne télécharge que celles réellement affichées.
import '@fontsource/big-shoulders-display/latin-700'
import '@fontsource/big-shoulders-display/latin-800'
import '@fontsource/martian-mono/latin-400'
import '@fontsource/martian-mono/latin-600'
import '@fontsource/instrument-sans/latin-400'
import '@fontsource/instrument-sans/latin-500'
import '@fontsource/instrument-sans/latin-600'
import '@fontsource/instrument-sans/latin-700'
import './index.css'
import App from './App.jsx'
import { applyTheme, THEME_KEY, applyPalette, PALETTE_KEY } from './features/health/kit'
import { GardeEcran } from './GardeEcran'
import { rechargerUneFois } from './rechargement'

// L'apparence et la palette sont posées avant le premier rendu, depuis le stockage local :
// le profil arrive de façon asynchrone et attendre le réseau ferait
// clignoter l'interface dans la mauvaise teinte à chaque lancement.
applyTheme(localStorage.getItem(THEME_KEY))
applyPalette(localStorage.getItem(PALETTE_KEY))

// Anti-encadrement. Un site tiers pourrait afficher l'app dans un cadre
// invisible et faire cliquer l'utilisateur à son insu (« clickjacking »).
// La parade normale (en-tête frame-ancestors) est impossible : GitHub Pages
// ne permet pas de poser d'en-tête, et la directive est ignorée dans une
// balise meta. L'app refuse donc simplement de s'afficher dans un cadre, et
// propose de s'ouvrir dans sa propre fenêtre.
function estEncadree() {
  try { return window.top !== window.self } catch { return true }
}

if (estEncadree()) {
  const racine = document.getElementById('root')
  const lien = document.createElement('a')
  lien.href = window.location.href
  lien.target = '_blank'
  lien.rel = 'noopener noreferrer'
  lien.textContent = 'Ouvrir Renfo dans sa propre fenêtre'
  racine.replaceChildren(lien)
} else {
  // Service worker : l'app s'ouvre sans réseau (voir src/sw/sw-modele.js).
  // En production seulement : en développement, il servirait des fichiers
  // périmés au lieu des modifications en cours.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    // La page est servie depuis le cache : une nouvelle version s'installe
    // en arrière-plan et prend la main au retour suivant dans l'app, plutôt
    // que de recharger sous les doigts pendant une saisie.
    const avaitUnControleur = !!navigator.serviceWorker.controller
    let miseAJourPrete = false
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (avaitUnControleur) miseAJourPrete = true })
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL, updateViaCache: 'none' })
        .then((reg) => {
          // Vérifier les mises à jour à chaque retour dans l'app.
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible') return
            if (miseAJourPrete) { window.location.reload(); return }
            reg.update().catch(() => {})
          })
        })
        .catch((e) => console.warn('[sw] enregistrement impossible :', e))
    })
  }
  // Fichier d'écran introuvable après une mise en ligne (voir GardeEcran) :
  // Vite le signale ici avant même l'erreur ; un rechargement suffit.
  window.addEventListener('vite:preloadError', (e) => { if (rechargerUneFois()) e.preventDefault() })
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <GardeEcran>
        <App />
      </GardeEcran>
    </StrictMode>,
  )
}
