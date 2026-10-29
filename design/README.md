# Maquettes

Écrans validés pendant la phase de conception (mobile 390 px de large, sauf mention).
Pour chaque écran : le HTML (styles exacts, textes, structure) et une capture PNG (`png/`).

**Statut : référence de design, pas du code de production.** Les textes entre crochets (`[Candidat·e 7]`, `+XX,00 €`, `[2029]`) sont des emplacements : ils seront remplis par de vraies données sourcées, jamais par des valeurs inventées.

Le design system est décrit dans [`../docs/design-system.md`](../docs/design-system.md).

## Parcours principal
| # | Écran | Fichiers |
|---|---|---|
| 0 | Accueil | `E0-accueil` |
| 0 | Reprendre une partie (retour sur le site) | `E0b-reprise` |
| 0 | Arrivée par un lien partagé | `E0c-lien` |
| 1 | Personnage · Toi (âge, genre, famille) | `Main` |
| 2 | Personnage · Ta vie (travail, revenus, logement…) | `A-perso-2` |
| 3 | Affiner (facultatif) | `A-affiner` |
| 4 | Choix des programmes (+ mystère) | `A-candidats` |
| 5 | Le quinquennat, frise à faire défiler | `A-couloirs` |

## Récap (style « Wrapped »)
| # | Écran | Fichiers |
|---|---|---|
| 6.1 | Intro du récap | `R1-intro` |
| 6.2 | Tickets 1 à 3 « Ma vie en 2032 » | `D-fiche` |
| 6.2 | Ticket 4, mystère à gratter | `R2b-mystere-ticket` |
| 6.3 | Le mystère révélé | `R5-mystere` |
| 6.4 | En un coup d'œil | `R3-cote` |
| 6.5 | Ce qui bouge le plus | `R4-themes` |
| 6.6 | La certitude | `R6-certitude` |
| 6.7 | À toi de jouer | `R7-fin` |

## Autour du parcours
| Écran | Fichiers |
|---|---|
| Aperçu avant partage | `P1-partage` |
| Aperçu du lien partagé (image OG 1200×630) | `OG1-apercu-lien` |
| Source d'une ligne du ticket | `S1-source` |
| Fiche mesure | `F1-fiche-mesure` |
| Programme en mesures | `PG1-programme` |
| Page Méthode | `M1-methode` |
| Cas limite : ticket vide | `T0-vide` |
| Calcul en cours | `X1-calcul` |
| Erreur ou coupure | `X2-erreur` |
| Entre-deux-tours : accueil du duel | `DUEL1-accueil` |
| Entre-deux-tours : ticket duel | `DUEL2-ticket` |

## Direction artistique
| Planche | Fichiers |
|---|---|
| DA retenue : sticker, peau jaune, avatars par âge et genre | `DA-retenue` |
| Représentation des candidats | `DA-candidats` |

## Desktop (1024 px et plus)
Dans [`maquettes/desktop/`](maquettes/desktop/), pages de 1440 px de large, captures dans `desktop/png/`. Règles de mise en page : `docs/design-system.md`, section « Desktop ».

| Écran | Fichiers |
|---|---|
| 0 · Accueil | `DK-accueil` |
| 1 · Personnage · Toi | `DK-toi` |
| 2 · Personnage · Ta vie | `DK-vie` |
| 3 · Affiner (facultatif) | `DK-affiner` |
| 4 · Choix des programmes | `DK-candidats` |
| 5 · Le quinquennat (frise) | `DK-frise` |
| Source d'une ligne (panneau latéral) | `DK-source` |
| 6.1 · Intro du récap | `DK-recap-intro` |
| 6.2 · Les tickets côte à côte | `DK-recap-tickets` |
| 6.4 · En un coup d'œil | `DK-recap-coup-oeil` |
| 6.7 · À toi de jouer | `DK-recap-fin` |

Les autres chapitres du récap (6.3, 6.5, 6.6) suivent le même gabarit que 6.4.

## Ouvrir une maquette
Ouvrir le fichier `.html` dans un navigateur (les polices viennent de Google Fonts). `index.json` liste les écrans avec leurs dimensions.
