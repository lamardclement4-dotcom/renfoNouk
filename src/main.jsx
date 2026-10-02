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
import { applyTheme, THEME_KEY } from './features/health/kit'

// L'apparence est posée avant le premier rendu, depuis le stockage local :
// le profil arrive de façon asynchrone et attendre le réseau ferait
// clignoter l'interface dans la mauvaise teinte à chaque lancement.
applyTheme(localStorage.getItem(THEME_KEY))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
