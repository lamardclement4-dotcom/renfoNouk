import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: obligatoire pour GitHub Pages, doit correspondre au nom du repo
// (l'app est servie depuis https://<user>.github.io/renfoNouk/, pas la racine)
export default defineConfig({
  plugins: [react()],
  base: '/renfoNouk/',
})
