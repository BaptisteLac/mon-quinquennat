# Mon quinquennat — instructions pour Claude Code

## Le projet en une phrase
Un simulateur neutre et sourcé : l'utilisateur crée son personnage, choisit jusqu'à 3 candidats à la présidentielle 2027 (+ un programme « mystère » tiré au sort), vit 2027–2032 dans une frise, et repart avec un ticket partageable « Ma vie en 2032 ».

## À lire avant de travailler
Ce dépôt est la seule source de vérité : la conception a eu lieu ailleurs, tout ce qui compte est ici.
- `docs/cadrage.md` — périmètre du MVP, parcours, ticket, pipeline, architecture
- `docs/decisions.md` — ce qui est tranché, ce qui est **écarté** (ne pas le reproposer), ce qui reste à valider
- `docs/design-system.md` — couleurs, typo, illustrations, règles d'affichage des candidats
- `design/maquettes/` — écrans validés (HTML + captures PNG dans `png/`), index dans `design/README.md`. Pour construire un écran, lire sa capture **et** son HTML.
- `docs/faisabilite.md` — étape en cours

Une décision prise en cours de route s'ajoute à `docs/decisions.md` dans le même commit.

## Principes non négociables
Chaque modification de code doit respecter ces cinq règles. En cas de doute, s'arrêter et demander.

1. **Rien d'inventé.** Une mesure n'existe que si elle a une citation exacte d'un programme officiel archivé (`SourceQuote`). Pas de source = pas de mesure, pas de ligne de ticket. Ne jamais écrire de fausse URL, de faux chiffre ou de fausse citation, même dans un test ou une fixture : utiliser des placeholders explicites (`[citation exacte…]`, `a_caler_pendant_le_test`).
2. **Le LLM ne calcule jamais.** Le LLM extrait et reformule. Les montants viennent d'OpenFisca, d'une formule de la liste blanche (`formulaId`), ou d'une estimation explicite (≈) avec hypothèse sourcée. Le LLM ne produit jamais de code exécuté.
3. **Neutralité.** Même gabarit, même ton, mêmes contrôles pour tous les candidats. Pas de couleur ni de logo de parti, pas de caricature. Ordre d'affichage et badges de forme tirés au sort. Noms complets du candidat et du parti toujours écrits.
4. **Transparence.** Chaque chiffre affiché ouvre sa fiche « d'où vient ce chiffre » : citation, page, lien vers la version officielle et l'archive, nature (sûr / estimé / qualitatif), hypothèse.
5. **Confidentialité.** Le profil reste dans le navigateur. L'API est sans état et calcule tous les candidats à chaque appel, pour que le serveur ne sache jamais lesquels ont été choisis. Aucun cookie de suivi, aucun log du profil.

Et une règle d'exploitation : **automatisation maximale**. Pas de validation manuelle par défaut ; l'humain ne traite que la file d'exceptions (issues GitHub « en attente »).

## Stack
- Front : Next.js (App Router), React, TypeScript strict
- Données : Zod (`packages/schema`) comme source de vérité des types ; mesures publiées en JSON statique livré avec le site ; archives brutes des programmes dans Supabase Storage
- Extraction : Vercel AI SDK, sorties structurées validées par Zod
- Calcul : service Python OpenFisca (`calc/`) + formules TypeScript de la liste blanche
- Pipeline : GitHub Actions (cron hebdo, quotidien les 6 dernières semaines avant le 1er tour)
- Partage : images OG générées côté serveur

## Organisation du dépôt
```
apps/web/            Next.js (à créer après les tests de faisabilité)
packages/schema/     Schéma Zod : profil, sources, mesures, tickets
pipeline/            Veille, archivage, extraction, 6 contrôles, routage
calc/                Service OpenFisca + profils de référence
spikes/extraction/   Test de faisabilité n°1
spikes/openfisca/    Test de faisabilité n°2
data/sources.yaml    Liste des programmes officiels suivis
design/maquettes/    Écrans validés (HTML + PNG)
docs/                Cadrage, décisions, design system, faisabilité
```

## Conventions
- TypeScript strict, pas de `any`. Tout ce qui entre ou sort d'un LLM ou d'une API passe par un schéma Zod.
- Tests Vitest à côté du code (`*.test.ts`). Toute erreur corrigée devient un cas de test.
- Interface et textes utilisateur en français, ton neutre et factuel : pas d'adjectif évaluatif sur une mesure (« ambitieuse », « coûteuse »…).
- Code, noms de variables et commits : en anglais pour le code, français accepté pour les valeurs métier (`"locataire_prive"`).
- Prompts versionnés dans le dépôt (`promptVersion` stocké avec chaque extraction).
- Secrets uniquement dans `.env` (jamais commité) ou dans les secrets GitHub.

## Commandes
```bash
npm install
npm run typecheck
npm test
```

## Façon de travailler
- Avancer par petites étapes vérifiables ; lancer `npm run typecheck && npm test` avant chaque commit.
- Toute évolution du schéma : mettre à jour `packages/schema`, ses tests, et `docs/cadrage.md` si une règle change.
- Ne pas commencer `apps/web` avant le feu vert des deux tests de faisabilité.
