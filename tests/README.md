# Tests

`npm run test`

Chaque suite écrit une ligne `OK: …` par assertion et se termine par
`ALL PASS`. Le lanceur (`run.mjs`) choisit le chargeur qui convient, compte
les assertions et sort en erreur si une suite échoue.

Trois chargeurs, dans `harness/` :

- `loader.mjs` — modules d'analyse purs. React et l'accès Supabase sont
  remplacés par des doublures.
- `loader2.mjs` — tests du store : ajoute le faux Supabase qui enregistre
  chaque écriture, ce qui permet de les compter et d'en rejouer le désordre.
- `loader3.mjs` — rendu d'écran : `createElement` construit un vrai arbre,
  et `browser-env.mjs` fournit le minimum de DOM que Node n'a pas.

Ces suites ont longtemps vécu dans un répertoire temporaire, hors du dépôt.
Le système en a effacé une partie en cours de route, sans moyen de les
retrouver. Elles sont versionnées ici pour cette raison.
