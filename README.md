# Renfo App — Vite + React + Supabase

## Démarrer en local
```bash
npm install
npm run dev
```
Les clés Supabase sont déjà dans `.env` (non committé, voir `.gitignore`).

## Build de production
```bash
npm run build
```
Génère `dist/`.

## Déploiement GitHub Pages
- Repo cible : `renfoNouk`
- `vite.config.js` a `base: '/renfoNouk/'` — indispensable pour que les assets se chargent correctement une fois hébergé sur `https://lamardclement4-dotcom.github.io/renfoNouk/`.
- Pense à ajouter les mêmes variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) dans les secrets GitHub Actions si tu automatises le déploiement, ou à builder en local avant de pousser `dist/`.

## Supabase
- Migration SQL versionnée : `supabase/migrations/0001_init.sql` (déjà exécutée sur le dashboard).
- Client configuré : `src/lib/supabase.js`.
- Une fois déployé sur GitHub Pages, mets à jour dans Supabase → Authentication → URL Configuration :
  - Site URL : `https://lamardclement4-dotcom.github.io/renfoNouk/`
  - Redirect URLs : la même URL

## Prochaine étape (Phase suivante)
Aucun écran n'est encore construit — seul le socle (Vite, Supabase, Dexie offline, migration SQL) est en place. La suite : écran de connexion (`src/features/auth`), puis migration des écrans de l'ancienne app autonome.
