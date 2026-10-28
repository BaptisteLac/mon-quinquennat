# Design system

Référence visuelle : [`design/maquettes/`](../design/maquettes/), en particulier `DA-retenue` et `D-fiche`.

## Interface : « Pop BD »
| Rôle | Valeur |
|---|---|
| Encre (texte, contours) | `#111111` |
| Jaune principal (fonds forts, accents) | `#FFD23F` |
| Crème (fond de page) | `#EFEEE8` |
| Blanc (cartes, ticket) | `#FFFFFF` |
| Lavande | `#C7B8FF` |
| Menthe | `#9BE3C8` |
| Pêche | `#FFB38A` |
| Texte secondaire | `#3A3A36` |

- Contours noirs épais (2–2,5 px), coins arrondis, ombres portées pleines décalées (pas de flou).
- Boutons principaux : fond noir, texte blanc ; secondaires : fond blanc, contour noir.

## Typographie
| Usage | Police |
|---|---|
| Titres, gros chiffres | Bricolage Grotesque 600 / 800, interlettrage négatif |
| Texte courant | DM Sans 400 / 500 / 700 |
| Ticket de caisse, données | DM Mono |

## Illustrations : sticker
- Bustes uniquement, contour blanc façon autocollant + trait noir.
- **Peau jaune unique pour tout le monde** ; vêtements et fonds jamais jaunes, pour que les visages ressortent.
- Avatar choisi selon la **tranche d'âge** (18–24, 25–44, 45–64, 65+) × **genre** (femme, homme, autre/ne pas dire = avatar neutre).
- Enfants ajoutés à côté de l'avatar.
- Interdits : fauteuil roulant, marqueurs religieux ou politiques, caricature. Pas de bouton « changer de look ».

## Candidats
- Photo officielle en **noir et blanc**, même cadrage pour tous (droits à obtenir).
- **Nom complet et nom complet du parti toujours écrits.**
- Repère visuel : **badge de forme** tiré au sort (rond, triangle, carré, losange…), utilisé partout (frise, graphiques, ticket).
- **Jamais de couleur ni de logo de parti**, jamais de caricature.
- Statut affiché : déclaré·e, candidature officielle, retiré·e.

## Ton des textes
- Tutoiement, phrases courtes, concrètes (« Ta première fiche de paie de l'année »).
- Neutre : aucun adjectif évaluatif sur une mesure.
- Les estimations sont toujours marquées `≈` avec leur hypothèse.

## Desktop (1024 px et plus)
Maquettes : [`design/maquettes/desktop/`](../design/maquettes/desktop/). Même parcours, mêmes composants, mêmes couleurs : seule la mise en page change. En dessous de 1024 px, la version mobile reste telle quelle.

- **Gabarit** : contenu centré, 1200 px de large au plus (1280 pour la frise), marges latérales de 40 px. Plus de colonne mobile centrée.
- **En-tête** (72 px, trait noir en bas) : logo à gauche, les 5 étapes du parcours au centre (faites = coche noire, en cours = pastille jaune, à venir = blanche), « Méthode » à droite. Sur l'accueil : « Les programmes », « Méthode », « Commencer ».
- **Accueil** : en deux colonnes, titre et bouton à gauche, exemple de ticket à droite ; « Comment ça marche » et « Rien d'inventé » en 3 colonnes.
- **Personnage (Toi, Ta vie, Affiner)** : deux colonnes. À gauche, la carte « Ton perso » reste fixe pendant le défilement : avatar en grand, enfants à côté, réponses en pastilles qui se remplissent, mention de confidentialité. À droite, les questions en grille de 2 colonnes, les choix sur une ligne (situation : 4 colonnes, logement et lieu de vie : 5). Bouton principal en bas à droite ; Entrée valide.
- **Choix des programmes** : cartes des candidats en grille à gauche, panneau « Ta sélection » fixe à droite (places choisies, programme mystère, bouton « Vivre … »).
- **Frise** : trois colonnes. À gauche, la liste des moments par année (clic = aller au moment). Au centre, les moments, avec les programmes **côte à côte** pour chaque moment. À droite, le compteur fixe sur fond noir : mois, progression 2027 → 2032, gains et pertes par programme, « Moment suivant » (ou flèche ↓), « Aller à 2032 ».
- **Fiche source** : panneau latéral droit de 520 px au lieu de la feuille qui monte du bas ; fond assombri, Échap ferme.
- **Récap** : on garde les chapitres (barre de progression, fermer) en pleine largeur, avec boutons précédent / suivant et flèches ← →. Les tickets choisis et le ticket mystère s'affichent **côte à côte**, lignes dans le même ordre pour comparer ; le mystère se gratte sur place. « En un coup d'œil » devient un tableau.
