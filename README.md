# Renfo App — Vite + React + Supabase

Application d'entraînement et de nutrition : planification des séances,
suivi du poids, du sommeil et des macros, analyse de la charge et
rétrospective hebdomadaire.

## Démarrer en local
```bash
npm ci
npm run dev
```
Les clés Supabase sont dans `.env` (non committé, voir `.gitignore`).
Seules deux variables existent, toutes deux publiques par conception :
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Tout ce qui commence par
`VITE_` est inscrit en clair dans le bundle : **une clé `service_role` ne
doit jamais y figurer.**

## Vérifier avant de pousser
```bash
npm run lint
npm test
npm run build
```
`npm test` exécute les suites de `tests/suites` (voir `tests/README.md`).
Le déploiement rejoue les trois.

## Déploiement GitHub Pages
- Repo cible : `renfoNouk`, publié sur
  `https://lamardclement4-dotcom.github.io/renfoNouk/`.
- `vite.config.js` fixe `base: '/renfoNouk/'` — indispensable pour que les
  assets se chargent une fois hébergés.
- `.github/workflows/deploy.yml` construit et publie à chaque poussée sur
  `main`. Les secrets `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
  doivent exister dans les secrets GitHub Actions du dépôt.

## Supabase
- Migrations versionnées dans `supabase/migrations/`, à exécuter dans
  l'ordre depuis le SQL Editor du dashboard :
  - `0001_init.sql` — tables, RLS et policies, trigger de création de profil
  - `0002_fix_profile_privilege_escalation.sql` — empêche un utilisateur de
    se promouvoir admin ou de s'auto-approuver
  - `0003_fix_privilege_trigger_sql_editor.sql` — rétablit les modifications
    faites depuis le SQL Editor, que 0002 bloquait
  - `0004_pin_function_search_path.sql` — fige le `search_path` des fonctions
    `security definer`
- Client : `src/lib.js`.
- Une fois déployé, dans Supabase → Authentication → URL Configuration :
  - Site URL : `https://lamardclement4-dotcom.github.io/renfoNouk/`
  - Redirect URLs : la même URL

## Sécurité

Ce que l'application tient pour acquis, et où c'est appliqué.

**La base est la seule vraie frontière.** La clé anon est publique — elle est
dans le bundle, visible de tous. Ce qui protège les données, ce sont les
policies RLS de `0001_init.sql` : chaque ligne n'est lisible et modifiable
que par son propriétaire (`auth.uid() = user_id`), et seulement si son
profil est `approved`. Aucun contrôle côté client ne remplace cela.

**Les fonctions `security definer` figent leur `search_path`**
(`0004_pin_function_search_path.sql`). Sans cela, `is_admin()` résout
`profiles` selon le `search_path` de l'appelant : un schéma contenant une
fausse table `profiles` placé devant `public` lui ferait répondre « admin »
à n'importe qui, et tout le contrôle d'administration tomberait.

**Rien ne sort vers une adresse non prévue.** Une politique de sécurité du
contenu est posée sur le HTML produit par le plugin `csp-meta` de
`vite.config.js`. Sa directive importante est `connect-src` : même si du
code étranger s'exécutait dans la page, seuls Supabase, Open-Meteo et le CDN
de l'OCR seraient joignables. Elle n'est appliquée qu'au build — en
développement, elle bloquerait le rechargement à chaud.

`frame-ancestors` est absent : la directive est ignorée dans une balise
meta et GitHub Pages ne permet pas de poser d'en-tête HTTP. La page reste
donc encadrable par un site tiers.

**Se déconnecter vide l'appareil.** `resetStore()` efface le cache mémoire du
store et toutes les files d'attente du stockage local, y compris celles
d'autres comptes passés sur le même appareil. Le thème choisi survit : ce
n'est pas une donnée personnelle.

**Les fichiers déposés sont plafonnés** (`src/features/health/fileGuard.js`).
Les captures lues par OCR et les traces GPX/TCX sont chargées d'un bloc en
mémoire ; au-delà du plafond elles sont refusées avec un message clair
plutôt que de faire tomber l'onglet. Seul l'export Apple Santé y échappe :
il est lu par tranches, sa mémoire reste bornée.

**Les données restent sur l'appareil.** L'OCR s'exécute localement, aucune
image n'est envoyée à un serveur. Open-Meteo ne reçoit que des coordonnées,
sans clé ni identifiant.

**Le déploiement installe avec `npm ci`**, pas `npm install` : le lockfile est
respecté à l'octet près, une dépendance ne peut pas changer de version en
silence entre deux déploiements.

Ces garanties sont testées dans `tests/suites/t71.mjs` — la suite échoue si
la politique est desserrée, si un plafond disparaît ou si le déploiement
repasse à `npm install`.
