import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, THEME_KEY } from './features/health/kit'

// Le thème est posé avant le premier rendu, depuis le stockage local : le
// profil arrive de façon asynchrone et attendre le réseau ferait clignoter
// l'interface dans les couleurs par défaut à chaque lancement.
applyTheme(localStorage.getItem(THEME_KEY))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
