# Cadrage du MVP

## Objectif
Montrer à chaque électeur, de façon neutre et vérifiable, ce que chaque programme changerait concrètement pour lui entre 2027 et 2032, sous une forme ludique et partageable.

Hypothèse de simulation : l'utilisateur est un électeur français (aucune question de nationalité).

## Parcours

| Étape | Écran | Contenu |
|---|---|---|
| 0 | Accueil | Accroche, « Commencer », reprise si une partie est en cours (stockage du navigateur) |
| 1 | Toi | Âge, genre (pour l'avatar), situation familiale, enfants |
| 2 | Ton quotidien | Travail, revenus, logement, lieu de vie, mobilité + questions conditionnelles |
| 3 | Affiner (facultatif) | Handicap ou aidant, patrimoine |
| 4 | Candidats | Jusqu'à 3 candidats + option « mystère » (programme tiré au sort, révélé à la fin) |
| 5 | Frise | Défilement 2027 → 2032, une case par mesure qui te touche, à sa date d'application |
| 6 | Récap | Intro → ticket « Ma vie en 2032 » → révélation du mystère → comparatif d'un coup d'œil → thèmes → niveau de certitude → fin |
| — | Autour | Partage (image + lien), fiche source, fiche mesure, page programme, page Méthode, états vides et erreurs, duel |

## Le ticket
- Trois sections : **Ton portefeuille** (€/mois), **Ton temps** (âge de départ, temps de travail), **Ta vie** (phrases factuelles).
- Chaque ligne a une nature : **sûr** (barème calculé), **estimé ≈** (hypothèse de consommation moyenne affichée), **qualitatif** (sans montant).
- Solde affiché en fourchette, avec la part « dont certain ».
- Comparé aux règles actuelles, « une fois toutes les mesures appliquées », plus un cumul sur 5 ans qui tient compte des dates d'application (annoncées ou estimées).
- Le financement est montré : si une hausse de TVA finance une baisse d'impôt, les deux sont sur le ticket.
- Le genre n'entre dans un calcul que si une mesure en dépend explicitement (ex. trimestres de retraite des mères).

## Sources et données
- **Seule source des mesures : les programmes officiels** (PDF ou pages officielles de campagne), listés dans `data/sources.yaml`. Pas de collecte sur le reste du web.
- Un programme est un **corpus** : les pages web du site officiel sous les préfixes déclarés dans `data/sources.yaml`, plus les PDF du même site liés depuis ces pages. Collecte automatique (robots.txt respecté), avec rendu JavaScript si le site l'exige.
- Chaque version est archivée (Internet Archive) avec son empreinte sha256 ; les citations pointent vers une version précise. Pour une page web, `page` vaut 1 (ou le numéro de partie d'une très longue page) et le lien affiché mène à l'URL officielle.
- Chiffres de contexte et hypothèses : statistiques publiques (INSEE, Légifrance, barèmes officiels), toujours citées.
- Candidats : déclarés **et** avec un programme publié. Statuts : déclaré·e, officiel·le (liste du Conseil constitutionnel), retiré·e. Les marchés de prédiction servent seulement de liste de veille.

## Pipeline automatisé
1. **Veille** : GitHub Actions, hebdomadaire (quotidien les 6 dernières semaines avant le 1er tour). Nouvelle collecte de chaque corpus, comparaison de l'empreinte du texte extrait de chaque page (le HTML brut varie à chaque visite) ; nouvelle page ou page disparue = changement.
2. **Archivage** de toute version nouvelle.
3. **Extraction** uniquement sur les pages modifiées : session Claude Code programmée (abonnement, sans clé API) qui ouvre une PR ; à terme, appel direct par l'API si l'on veut se passer de session (Vercel AI SDK, sortie structurée Zod).
4. **Contrôles** : les programmes officiels font foi ; on vérifie seulement que l'extraction n'en change ni les phrases, ni les chiffres, ni le sens.
   1. format (schéma Zod) — bloquant ;
   2. citation exacte présente dans le texte archivé — bloquant ;
   3. chiffres fidèles : chaque nombre de la fiche (résumés, paramètres, date annoncée) figure dans la citation ;
   4. relecture du sens : seconde lecture qui compare chaque résumé à sa citation. Le verdict est lié à une empreinte du contenu relu : toute modification ultérieure de la mesure l'annule et la renvoie en relecture. Une mesure dont les sources officielles se contredisent (deux pages du même candidat) est marquée « à revoir » avec la note de l'écart.
   Facultatifs, si le score s'avère insuffisant : relecture croisée par un modèle d'un autre fournisseur, double extraction, vraisemblance sur profils de référence, neutralité.
5. **Score de confiance et routage** : chaque mesure reçoit un score (part des contrôles passés). Au-dessus du seuil fixé → publication automatique ; en dessous → « en attente » (issue GitHub, traitée par commentaire : `/approuver`, `/rejeter raison`, `/corriger taux=0.09`). Le seuil se fixe sur la répartition réelle des scores.
6. **Qualité** : audit hebdomadaire d'un échantillon ; le taux d'erreur mesuré est affiché sur la page Méthode. Chaque correction et chaque signalement d'utilisateur devient un cas de test.

## Calcul
- OpenFisca pour les barèmes (impôt, prestations, cotisations), vérifié sur 20 à 30 profils de référence contrôlés avec les simulateurs officiels.
- Formules maison sur liste blanche quand OpenFisca ne couvre pas (âge de départ, revalorisation des pensions…).
- Estimations (≈) à partir de moyennes INSEE, hypothèse affichée.
- Le LLM ne calcule aucun chiffre.

## Architecture
- Next.js (front + routes API), Supabase Postgres (mesures publiées, versions, sources), service Python OpenFisca, GitHub Actions (pipeline), images OG pour le partage.
- API sans état : reçoit le profil, renvoie les tickets de **tous** les candidats ; le navigateur affiche ceux choisis.
- Profil, progression et tickets dans le stockage du navigateur. Mesure d'audience sans cookie.

## Direction artistique
- Interface « Pop BD » : contours noirs, jaune `#FFD23F`, crème `#EFEEE8` ; Bricolage Grotesque, DM Sans, DM Mono.
- Illustrations style sticker : bustes, peau jaune uniforme pour tous, 4 tranches d'âge (18–24, 25–44, 45–64, 65+) × genre (femme, homme, neutre). Enfants à côté de l'avatar. Aucun marqueur religieux ou politique.
- Palette d'accompagnement : lavande `#C7B8FF`, menthe `#9BE3C8`, pêche `#FFB38A`.
- Candidats : photo officielle en noir et blanc (droits à obtenir), badge de forme tiré au sort, nom complet et parti écrits. Jamais de couleur ni de logo de parti.

## Juridique (à vérifier avant lancement)
- [ ] Droit de citation : extraits courts, source et lien systématiques
- [ ] Droits des photos des candidats
- [ ] Mentions légales et page Méthode (dont limites et taux d'erreur)
- [ ] Règles applicables en période électorale (neutralité, pas de sondage)
- [ ] RGPD : aucune donnée personnelle côté serveur, à documenter

## Périmètre
**MVP** : parcours complet, ticket, partage, fiches sources, page Méthode, pipeline automatisé.
**V1** : « ticket de la France » (dette, coût des programmes avec plusieurs chiffrages), scénarios « Et si… », duel enrichi.

## Calendrier indicatif
Environ 18 semaines à 4–5 h par semaine. Lancement visé fin février – mars 2027. Première étape : les deux tests de faisabilité (`docs/faisabilite.md`), avec un feu vert avant de construire l'interface.
