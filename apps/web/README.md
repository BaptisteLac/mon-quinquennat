# Application web (Next.js)

Plan et jalons : `docs/plan.md`. Écrans : `design/maquettes/` (capture et HTML).

```bash
npm run dev -w apps/web      # http://localhost:3000
npm run build -w apps/web    # pages statiques, échoue si une donnée publiée est invalide
npm test -w apps/web
npm run tirer-badges -w apps/web   # badge de forme des nouveaux candidats (fait par le workflow de collecte)
```

- Données lues au build dans `data/` (`src/lib/data.ts`) : candidats (`sources.yaml`), badges, mesures publiées, manifestes des archives.
- Le profil ne quitte pas le navigateur (`src/lib/profile-store.ts`).
- Ordre des candidats tiré au sort dans le navigateur à chaque visite (`src/components/ProgrammeChips.tsx`).
