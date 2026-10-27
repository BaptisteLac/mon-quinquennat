# Plan de construction du site (`apps/web`)

Point de départ : les deux tests de faisabilité ont leur feu vert (2026-10-26). Lancement visé : fin février – mars 2027, avant le 1er tour (avril 2027). Ce plan découpe le travail en jalons livrables : chaque jalon est une PR fusionnable, testée, et laisse le site dans un état publiable.

## Principes de construction
- **Une tranche verticale avant la largeur.** Le premier parcours complet (personnage → candidats → frise → ticket) passe avant les écrans secondaires : c'est lui qui valide l'architecture de bout en bout.
- **Des données réelles dès le premier écran.** Les écrans lisent les mesures publiées (`data/measures/*.json`, validées par `@mon-quinquennat/schema`) ; aucun chiffre ni texte inventé, même en développement. Un emplacement sans donnée est un état vide, jamais une valeur fictive.
- **Le serveur ne garde rien.** Profil et progression dans le navigateur (stockage local, schéma Zod versionné) ; l'API de ticket est sans état et calcule tous les candidats à chaque appel.
- **Fidèle aux maquettes.** Chaque écran part de sa capture **et** de son HTML (`design/maquettes/`) ; les jetons du design system sont centralisés (couleurs, polices, contours, ombres).
- **Tests à chaque niveau.** Vitest pour la logique (données, profil, ticket), Playwright pour le parcours (navigateur déjà installé), et `next build` en CI.

## Architecture retenue
| Brique | Choix | Raison |
|---|---|---|
| Front | Next.js 16 (App Router), React 19, TypeScript strict, dans le monorepo npm | stack du cadrage ; les paquets `schema` et `formulas` sont importés directement |
| Styles | CSS Modules + variables CSS du design system | pas de dépendance, styles des maquettes repris tels quels |
| Polices | Bricolage Grotesque, DM Sans, DM Mono auto-hébergées (`@fontsource`) | aucun appel à Google Fonts depuis le navigateur du visiteur (confidentialité) |
| Mesures | JSON statique lu au build, validé par Zod | décision « JSON statique » ; pas de base de données à interroger |
| Calcul | route `POST /api/ticket` (Next) → service OpenFisca (`calc/`, Scaleway, éteint au repos) + formules TypeScript de la liste blanche | API sans état ; réveil du service pendant la création du personnage |
| Partage | lien encodant le seul résultat choisi par l'utilisateur, image OG générée côté serveur | le profil ne quitte pas le navigateur sans action de l'utilisateur |
| Hébergement du front | Vercel, offre gratuite (à valider) | Next.js et images OG natifs, déploiement par PR |
| Audience | mesure sans cookie, à choisir au jalon 6 | règle de confidentialité |

## Jalons

### Jalon 0 — Socle (livré)
- `apps/web` : Next.js, TypeScript strict, jetons du design system, polices auto-hébergées, mise en page mobile 390 px.
- Couche de données : chargement et validation des mesures publiées et des candidats (`data/sources.yaml`), ordre d'affichage tiré au sort côté navigateur.
- Profil : stockage local versionné (`Profile` Zod), lecture tolérante (profil invalide → on repart de zéro).
- Écrans : Accueil (`E0-accueil`) et Programme en mesures (`PG1-programme`) avec les vraies mesures de Nouvelle Énergie.
- CI : typecheck, tests, `next build`.
- Livré : accueil `/` et `/programme/<candidat>` (page statique par programme publié), filtres par thème, badges tirés au sort (`data/badges.json`), profil dans le stockage local. Le bouton « Vivre mon quinquennat » reste inactif jusqu'au jalon 1.

### Jalon 1 — Personnage et candidats (livré)
- `Main` (Toi), `A-perso-2` (Ta vie), `A-affiner` (facultatif), `A-candidats` (jusqu'à 3 + mystère), `E0b-reprise`.
- Réveil du service de calcul (`/sante`) au premier écran du personnage.
- Avatars (bustes sticker, 4 tranches d'âge × 3 genres) : à produire d'après `DA-retenue`.
- Tests Playwright du parcours de saisie.
- Livré : `/personnage`, `/personnage/vie`, `/personnage/affiner`, `/candidats`, reprise sur l'accueil ; parcours dans le navigateur (`src/lib/journey.ts`), questions conditionnelles du profil, commune par code postal, route `/api/sante` (variable `CALC_URL`), avatars de `DA-retenue`, tests Playwright en CI (dont : aucune requête hors du site).
- Reste pour plus tard : « Ou vivre la vie d'un Français tiré au hasard » (il faut des profils tirés d'une distribution INSEE sourcée, jalon 5) ; photos des candidats (droits) ; le bouton de `/candidats` mène à la frise au jalon 3, où le mystère est tiré au sort.

### Jalon 2 — Moteur de ticket (livré, déploiement à configurer)
- `calc/` : le service OpenFisca passe du spike au service (image, tests, déploiement Scaleway).
- `POST /api/ticket` : profil → montants actuels et par candidat (OpenFisca, formules de la liste blanche), effets qualitatifs filtrés par `appliesTo`, solde en fourchette, part « dont certain », cumul sur 5 ans selon les dates d'effet.
- Tests sur les profils de référence ; aucun chiffre produit hors OpenFisca, formules ou estimations ≈ sourcées.
- Livré : `calc/` (lit les mesures publiées, renvoie leur version), `src/lib/ticket/` (conditions, assemblage, client du service), `/api/ticket`, test d'intégration en CI (site + vrai service), workflow `calc-image.yml`.
- Reste : créer le compte Scaleway et ses réglages GitHub (`calc/README.md`) pour que le déploiement se fasse ; formules `revalorisation_pension`, `smic_mensuel_net` et estimations ≈ quand une mesure publiée en aura besoin.

### Jalon 3 — Frise et sources (livré)
- `A-couloirs` (frise 2027 → 2032), `S1-source` (d'où vient ce chiffre), `F1-fiche-mesure`, `X1-calcul`, `X2-erreur`, `T0-vide`.
- Livré : `/quinquennat` (calcul, erreur, frise, fiche source), `/programme/<candidat>/<mesure>` (fiche de chaque mesure), catalogue statique des mesures, tickets gardés sur l'appareil, reprise dans la frise. `T0-vide` (ticket vide) passe au jalon 4 avec le ticket.
- Reste : étapes de vie dans la frise (rentrée d'un enfant, retraite).

### Jalon 4 — Récap et partage (en cours)
- `R1` à `R7`, `D-fiche` (tickets), `T0-vide`, `R2b`/`R5` (mystère), `P1-partage`, `OG1` (image OG), `E0c-lien` (arrivée par lien).

### Jalon 5 — Pages autour et contenu
- `M1-methode` (taux d'erreur mesuré, limites, bilan du test n°1), mentions légales, signalement d'erreur.
- Programmes : chaque nouveau programme passe par collecte → extraction → bilan (`npm run evaluate`).

### Jalon 6 — Mise en ligne
- Hébergement, domaine, audience sans cookie, accessibilité (contrastes, clavier, lecteurs d'écran), performance mobile.
- Juridique (`docs/cadrage.md`) : droit de citation, photos des candidats, période électorale, RGPD.

### Après le 1er tour
- Duel d'entre-deux-tours (`DUEL1`, `DUEL2`), passage de la veille en quotidien 6 semaines avant le 1er tour.

## Pistes parallèles (hors code du site)
- **Programmes** : extraction de La France insoumise après la publication du 6 novembre 2026 (détectée par la veille), puis chaque candidat qui publie.
- **Photos des candidats** : droits à obtenir (noir et blanc, même cadrage).
- **Juridique** : liste de `docs/cadrage.md`, à traiter avant le jalon 6.
