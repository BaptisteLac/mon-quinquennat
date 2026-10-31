# Test n°1 : bilan automatique — corpus `les-republicains-2026-10`

Généré par `npm run evaluate -- bilan --corpus les-republicains-2026-10`. Échantillons tirés avec la graine 2027 (`echantillon.json`).

## Contrôles automatiques (124 mesures publiées)
- Citations exactes : 124 / 124 (100.0 %).
- Chiffres de la fiche présents dans la citation : 124 / 124 (100.0 %).
- Auto-validation : 124 / 124 (100.0 %) ; statuts : auto_validee 124.

## Rappel (lecture indépendante de 20 pages tirées au sort)
Lecteur : Claude (session Claude Code, 2026-10-30), lecture des pages tirées au sort pour relever chaque engagement, y compris secondaire ; même modèle que l'extraction. Consigne : Relever, page par page, chaque engagement de politique publique (ce que le candidat ferait ou ferait faire une fois élu), avec sa citation exacte. Exclus : constats, chiffres de diagnostic, rappels historiques, chiffrages de financement, slogans de thème sans action identifiable. Un engagement qui regroupe plusieurs actions séparables est découpé.

- Engagements relevés : 65 ; appariés automatiquement à une mesure publiée (citations proches) : 47 ; couverts par une mesure à la citation différente (`couverture.json`) : 9.
- Rappel automatique seul : 72.3 % (IC 95 % : 60.4 % – 81.7 %, n = 65).
- **Rappel : 86.2 % (IC 95 % : 75.7 % – 92.5 %, n = 65).**

Couverts par une autre citation :
- « Réaffirmer la liberté de choisir comme la liberté constitutionnelle qu'elle est. » → m-815fafefe403 (La mesure supprime la carte scolaire pour rendre aux familles le choix de l'école : même objet (liberté de choisir l'école).)
- « Rendre le redoublement et l'orientation à la seule souveraineté des conseils de classe. » → m-bef66b460c8c (Le résumé de la mesure reprend « redoublement et orientation décidés par les seuls conseils de classe ».)
- « Installer à Bruxelles une cellule de veille réglementaire chargée d'identifier les textes en préparation dès l'amont » → m-81d4f12ce59c (Le résumé de la mesure mentionne la cellule de veille à Bruxelles.)
- « une loi reconnaissant la réutilisation des friches comme raison impérative d'intérêt public majeur » → m-1ef52c92fedf (Le résumé de la mesure mentionne la réutilisation des friches reconnue d'intérêt public majeur.)
- « les nouvelles techniques génomiques seront pleinement intégrées à la stratégie agricole française » → m-8a7257a34de6 (Le résumé de la mesure mentionne l'intégration des nouvelles techniques génomiques.)
- « Réécrire l'article L. 141-2 du code de l'environnement pour faire de l'agrément associatif un statut strict, sélectif et réversible » → m-91e2040e3ef0 (Le résumé de la mesure mentionne l'agrément associatif rendu strict et réversible.)
- « Permettre aux familles ayant des enfants mineurs à charge de déduire une partie des intérêts de leur emprunt immobilier de leur impôt sur le revenu : 50 % pour un enfant, 75 % pour deux, 100 % à partir de trois. » → m-b1d28e758f60 (Même engagement que la page Logement, fusionné dans une seule mesure (mêmes taux 50 %, 75 %, 100 %).)
- « Imposer aux banques commerciales de permettre le transfert des prêts immobiliers d'un bien sur l'autre. » → m-b1d28e758f60 (La mesure porte la transférabilité des prêts immobiliers.)
- « La gestion est confiée aux partenaires sociaux, sur le modèle de l'Agirc-Arrco, avec des gestionnaires choisis par appel d'offres. » → m-9a2c937727f1 (Le résumé de la mesure mentionne la gestion par les partenaires sociaux.)

Engagements non couverts :
- les-republicains-2026-10-evaluer-et-certifier-chaque-etablissement-decentraliser-et p. 1 : « La distribution des prix sera rétablie au collège et au lycée, un programme national de détection des talents sera lancé » — Rétablir la distribution des prix et lancer un programme de détection des talents.
- les-republicains-2026-10-evaluer-et-certifier-chaque-etablissement-decentraliser-et p. 1 : « le brevet comme le baccalauréat seront remis chaque année le 14 juillet » — Remettre brevet et baccalauréat le 14 juillet.
- les-republicains-2026-10-limiter-le-cout-des-nouvelles-regles-pour-les-entreprises p. 1 : « La loi, y compris existante, sera recentrée sur les principes essentiels ; le reste relèvera du règlement, plus aisément modifiable. » — Recentrer la loi sur les principes, le reste au règlement.
- les-republicains-2026-10-limiter-le-cout-des-nouvelles-regles-pour-les-entreprises p. 1 : « des adaptations locales pourront être décidées sous l'autorité de l'État » — Adaptations locales des règles nationales sous l'autorité de l'État.
- les-republicains-2026-10-confier-la-voie-professionnelle-aux-regions-et-aux-branches p. 1 : « La modernisation des plateaux techniques sera soutenue par un sur-amortissement fiscal incitant les entreprises à équiper les établissements qui forment leurs futurs salariés. » — Sur-amortissement fiscal pour équiper les plateaux techniques.
- les-republicains-2026-10-projet-mesure-reconquerir-les-friches-industrielles p. 1 : « un préfet interlocuteur unique, un délai d'instruction opposable de neuf mois au-delà duquel le silence vaut acceptation » — Préfet interlocuteur unique et délai d'instruction de neuf mois.
- les-republicains-2026-10-projet-mesure-reconquerir-les-friches-industrielles p. 1 : « des sociétés foncières publiques porteront le foncier : des SEM régionales pour les surfaces inférieures à deux hectares, et une Société foncière pour l'industrie chargée de maintenir en permanence 1 000 hectares immédiatement disponibles pour les grands projets » — Sociétés foncières publiques, dont 1 000 hectares disponibles en permanence.
- les-republicains-2026-10-raccourcir-les-recours-et-renforcer-l-etiquetage-agricole p. 1 : « les campagnes de dénigrement fondées sur des données fausses appelleront une réponse publique et factuelle » — Réponse publique de l'État aux campagnes de dénigrement.
- les-republicains-2026-10-mesure-donner-a-chaque-francais-un-capital-pour-sa-retraite p. 1 : « À la retraite, chacun choisira de sortir son épargne en capital ou en rente. » — Sortie en capital ou en rente au choix.

## Précision et paramètres (relecture de 40 mesures tirées au sort)
Lecteur : Claude (session Claude Code, 2026-10-30), relecture de chaque fiche tirée contre ses citations et la page source ; même modèle que l'extraction. Consigne : Sens : la fiche (titre, résumés, phrases d'effet) dit ce que dit la citation, sans ajout, omission qui change le sens, ni engagement plus fort ou plus faible. Paramètres : taux, montants, durées, seuils et date d'effet conformes au programme ; « sans_parametre » si la fiche n'en porte aucun.

- **Précision : 100.0 % (IC 95 % : 91.2 % – 100.0 %, n = 40).**
- **Paramètres justes : 100.0 % (IC 95 % : 86.7 % – 100.0 %, n = 25).**

Écarts relevés :
- aucun

## Coût d'une extraction par l'API (estimation ≈)
Volumes réels : corpus 1 159 227 caractères (136 pages), sorties d'extraction 202 603 caractères, 124 mesures. Hypothèses : ≈ 3 caractères par jeton ; deux extractions indépendantes (A et B), chaque page envoyée avec le prompt `extract-v1` ; relecture croisée de chaque mesure (`crosscheck-v1`, ≈ 200 jetons de sortie) ; tarifs de `src/cost.ts` (USD par million de jetons), sans cache.

| Modèle | Coût par programme | Avec l'API Batch (−50 %) |
|---|---|---|
| claude-sonnet-5-5 | 4.23 $ | 2.12 $ |
| claude-opus-5-5 | 8.47 $ | 4.23 $ |
