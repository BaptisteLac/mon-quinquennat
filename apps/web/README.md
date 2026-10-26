# Application web (Next.js)

Plan et jalons : `docs/plan.md`. Écrans : `design/maquettes/` (capture et HTML).

```bash
npm run dev -w apps/web      # http://localhost:3000
npm run build -w apps/web    # pages statiques, échoue si une donnée publiée est invalide
npm test -w apps/web         # Vitest
npm run e2e -w apps/web      # Playwright, après le build
npm run tirer-badges -w apps/web   # badge de forme des nouveaux candidats (fait par le workflow de collecte)
```

- Données lues au build dans `data/` (`src/lib/data.ts`) : candidats (`sources.yaml`), badges, mesures publiées, manifestes des archives.
- Parcours (profil, choix des programmes) gardé dans le navigateur seulement (`src/lib/journey.ts`, `src/lib/journey-store.ts`).
- Communes : `public/communes/*.json`, générés avant `dev` et `build` depuis le paquet `codes-postaux` (non versionnés).
- `CALC_URL` (serveur) : adresse du service de calcul, réveillé par `/api/sante`. Sans elle, la route répond `non_configure`.
- Ordre des candidats tiré au sort dans le navigateur à chaque visite.
