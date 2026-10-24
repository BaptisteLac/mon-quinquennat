# Journal des décisions

Ce qui a été tranché pendant la conception, pour ne pas le rediscuter. Les idées **écartées** ne doivent pas être reproposées sans élément nouveau.
Toute nouvelle décision s'ajoute ici (date, décision, raison).

## Produit
- **Nom : « Mon quinquennat ».** Le ticket final s'appelle « Ma vie en 2032 ». (L'ancien nom de travail « Ma vie en 2028 » est abandonné.)
- **Concept** : simulation vécue mois par mois façon frise (inspiration : expérience narrative à la « 1 sur 8 milliards »), pas un questionnaire.
- **Choix des candidats** : jusqu'à 3 + option « mystère » (programme tiré au sort, ticket à gratter, révélé **avant** le comparatif).
- **Récap style « Wrapped »** : intro → tickets → mystère → coup d'œil → thèmes → certitude → fin.
- **Reprise** : progression sauvegardée dans le navigateur.
- **Duel d'entre-deux-tours** prévu dans le MVP.
- **Questions du profil** : âge, genre, famille, enfants, travail, revenus, logement, lieu de vie, mobilité, puis questions conditionnelles ; étape « Affiner » facultative limitée à handicap/aidant et patrimoine.
- **Genre** : demandé, sert à l'avatar ; n'entre dans un calcul que si une mesure en dépend explicitement.
- **Hypothèse** : l'utilisateur est un électeur français (pas de question de nationalité).
- **Ticket** : sections portefeuille / temps / vie ; fourchette + « dont certain » ; comparé aux règles actuelles ; horizon « une fois tout appliqué » + cumul 5 ans ; financement visible (ex. hausse de TVA).
- **Candidats retenus** : déclarés **et** avec un programme publié. Les marchés de prédiction ne servent que de liste de veille.
- **V1, pas MVP** : « ticket de la France » (dette, coût, plusieurs chiffrages), scénarios « Et si… ».

## Données et automatisation
- **Seule source des mesures : les programmes officiels des candidats.** Pas de collecte sur le reste du web.
- **Le programme fait foi** (2026-10-24). Sur le site officiel, le programme (pages programme et documents qu'elles publient : livrets, carnets, discours) prime sur les autres pages (questions-réponses, prises de position). Celles-ci peuvent préciser ou compléter une mesure, jamais la contredire : en cas d'écart, on garde la version du programme et on retire l'élément contradictoire. Seul un écart sur un point que le programme ne tranche pas va en file d'exceptions.
- **Aucune validation manuelle par défaut.** Six contrôles automatiques ; l'humain ne traite que la file d'exceptions (issues GitHub, commandes `/approuver`, `/rejeter`, `/corriger`).
- **Le LLM ne calcule jamais** : OpenFisca, formules sur liste blanche, estimations INSEE marquées ≈.
- **Taux d'erreur mesuré** par audit d'échantillon, publié sur la page Méthode.
- **Confidentialité** : API sans état qui calcule tous les candidats ; profil dans le navigateur ; mesure d'audience sans cookie.

## Design
- Interface Pop BD, illustrations sticker à peau jaune unique — voir `docs/design-system.md`.
- Avatar petit, par tranche d'âge × genre, bustes uniquement.

## Écarté (ne pas reproposer)
- Vote ou choix « à l'aveugle » des programmes : déjà fait ailleurs.
- Questionnaire de positionnement classique : déjà fait ailleurs.
- Ligne « carburant » sur le ticket : chiffre non fondé.
- Gestion des non-votants ; question de nationalité.
- Couleurs ou logos de partis ; caricatures.
- Fauteuil roulant, avatars en pied, âges détaillés : bustes et tranches d'âge seulement.
- Bouton « changer de look ».
- Validation manuelle de chaque mesure dans un back-office.
- Variantes de maquettes B, C, D et « fusion » : seules les versions A sont retenues.

## Proposé, à valider
- **Collecte web des programmes** (les partis publient des sites à onglets, pas de PDF) : robot Playwright limité au domaine officiel, clic sur les onglets, extraction du texte avec ses titres, archivage par page (HTML, texte, capture, sha256, Internet Archive), diff par section.
- **Citation localisée par page web + chemin de section** au lieu d'un numéro de page PDF ; lien vers le site officiel avec la phrase surlignée (`#:~:text=`).
- **Contrôle des chiffres** : tout nombre d'une mesure doit figurer dans sa citation, sinon la mesure est `floue`.
- **Évaluation sans saisie manuelle** : vérification ✅/❌ d'un échantillon, couverture calculée automatiquement (deux modèles repèrent les engagements phrase par phrase), rejeu sur les programmes 2022 contre des listes tierces.
