# Test n°1 : bilan automatique — corpus `les-republicains-2026-11`

Généré par `npm run evaluate -- bilan --corpus les-republicains-2026-11`. Échantillons tirés avec la graine 2027 (`echantillon.json`).

## Contrôles automatiques (137 mesures publiées)
- Citations exactes : 137 / 137 (100.0 %).
- Chiffres de la fiche présents dans la citation : 137 / 137 (100.0 %).
- Auto-validation : 137 / 137 (100.0 %) ; statuts : auto_validee 137.

## Rappel (lecture indépendante de 20 pages tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-26), lecture des pages tirées au sort pour relever chaque engagement ; pour les pages déjà relues lors de l'évaluation du corpus les-republicains-2026-10 et restées identiques, reprise des engagements relevés alors ; même modèle que l'extraction. Consigne : Relever, page par page, chaque engagement de politique publique (ce que le candidat ferait ou ferait faire une fois élu), avec sa citation exacte. Exclus : constats, chiffres de diagnostic, rappels historiques, chiffrages de financement, slogans de thème sans action identifiable. Un engagement qui regroupe plusieurs actions séparables est découpé.

- Engagements relevés : 71 ; appariés automatiquement à une mesure publiée (citations proches) : 58 ; couverts par une mesure à la citation différente (`couverture.json`) : 8.
- Rappel automatique seul : 81.7 % (IC 95 % : 71.2 % – 89.0 %, n = 71).
- **Rappel : 93.0 % (IC 95 % : 84.6 % – 97.0 %, n = 71).**

Couverts par une autre citation :
- « à la dispersion des « éducations à » ceci ou cela : ces heures seront rendues au français » → m-02c8c6640114 (La fiche reprend les heures des « éducations à » rendues au français, au calcul et à l'anglais.)
- « L'accord deviendra la règle prioritaire dans l'entreprise, à défaut dans la branche » → m-97e3f5e7fa75 (La fiche reprend la priorité de l'accord d'entreprise sur l'accord de branche.)
- « Sanctuariser l'industrie et la technologie, ingénieurs et BUT industriels compris, jusqu'au master » → m-a67fc6f9b051 (La fiche reprend l'industrie et la technologie sanctuarisées jusqu'au master.)
- « une loi reconnaissant la réutilisation des friches comme raison impérative d'intérêt public majeur » → m-1ef52c92fedf (La fiche reprend la réutilisation des friches reconnue d'intérêt public majeur.)
- « les nouvelles techniques génomiques seront pleinement intégrées à la stratégie agricole française » → m-8a7257a34de6 (La fiche reprend l'intégration des nouvelles techniques génomiques.)
- « Ces mesures bénéficieront aussi aux PME et aux TPE, et pas seulement aux grands groupes » → m-d8b6ff619555 (La fiche précise « y compris dans les PME et TPE ».)
- « Il s'agit de reprendre les travaux interrompus en 2019 avec l'arrêt du programme ASTRID » → m-0d6119454166 (La relance des programmes de recherche sur un démonstrateur de quatrième génération est la reprise des travaux d'ASTRID.)
- « La gestion est confiée aux partenaires sociaux, sur le modèle de l'Agirc-Arrco, avec des gestionnaires choisis par appel d'offres. » → m-9a2c937727f1 (La fiche reprend la gestion par les partenaires sociaux.)

Engagements non couverts :
- les-republicains-2026-11-mesure-liberer-les-etablissements-et-rendre-aux-familles-la p. 1 : « Ne retenir que les méthodes dont l'efficacité est explicitement prouvée » — Ne retenir que les méthodes dont l'efficacité est explicitement prouvée
- les-republicains-2026-11-projet-mesure-reconquerir-les-friches-industrielles p. 1 : « un préfet interlocuteur unique, un délai d'instruction opposable de neuf mois au-delà duquel le silence vaut acceptation » — Préfet interlocuteur unique et délai d'instruction de neuf mois.
- les-republicains-2026-11-projet-mesure-reconquerir-les-friches-industrielles p. 1 : « des sociétés foncières publiques porteront le foncier : des SEM régionales pour les surfaces inférieures à deux hectares, et une Société foncière pour l'industrie chargée de maintenir en permanence 1 000 hectares immédiatement disponibles pour les grands projets » — Sociétés foncières publiques, dont 1 000 hectares disponibles en permanence.
- les-republicains-2026-11-encadrer-les-negociations-et-controler-les-importations p. 1 : « Le contrôle renforcé des importations et les clauses de réciprocité, décrits dans la page Entreprises, s'appliquent en priorité aux produits agricoles » — Le contrôle renforcé des importations et les clauses de réciprocité, décrits dans la page Entreprises, s'appliquent en priorité aux produits agricoles
- les-republicains-2026-11-mesure-donner-a-chaque-francais-un-capital-pour-sa-retraite p. 1 : « À la retraite, chacun choisira de sortir son épargne en capital ou en rente. » — Sortie en capital ou en rente au choix.

## Précision et paramètres (relecture de 40 mesures tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-26), relecture de chaque fiche tirée contre ses citations et la page source ; verdicts du corpus les-republicains-2026-10 repris pour les mesures inchangées ; même modèle que l'extraction. Consigne : Sens : la fiche (titre, résumés, phrases d'effet) dit ce que dit la citation, sans ajout, omission qui change le sens, ni engagement plus fort ou plus faible. Paramètres : taux, montants, durées, seuils et date d'effet conformes au programme ; « sans_parametre » si la fiche n'en porte aucun.

- **Précision : 100.0 % (IC 95 % : 91.2 % – 100.0 %, n = 40).**
- **Paramètres justes : 100.0 % (IC 95 % : 84.5 % – 100.0 %, n = 21).**

Écarts relevés :
- aucun

## Coût d'une extraction par l'API (estimation ≈)
Volumes réels : corpus 1 244 969 caractères (154 pages), sorties d'extraction 225 445 caractères, 137 mesures. Hypothèses : ≈ 3 caractères par jeton ; deux extractions indépendantes (A et B), chaque page envoyée avec le prompt `extract-v1` ; relecture croisée de chaque mesure (`crosscheck-v1`, ≈ 200 jetons de sortie) ; tarifs de `src/cost.ts` (USD par million de jetons), sans cache.

| Modèle | Coût par programme | Avec l'API Batch (−50 %) |
|---|---|---|
| claude-sonnet-5-5 | 4.66 $ | 2.33 $ |
| claude-opus-5-5 | 9.32 $ | 4.66 $ |
