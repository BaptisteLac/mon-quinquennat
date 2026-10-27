# Test n°1 : bilan automatique — corpus `nouvelle-energie-2026-10`

Généré par `npm run evaluate -- bilan --corpus nouvelle-energie-2026-10`. Échantillons tirés avec la graine 2027 (`echantillon.json`).

## Contrôles automatiques (260 mesures publiées)
- Citations exactes : 260 / 260 (100.0 %).
- Chiffres de la fiche présents dans la citation : 260 / 260 (100.0 %).
- Auto-validation : 260 / 260 (100.0 %) ; statuts : auto_validee 260.

## Rappel (lecture indépendante de 20 pages tirées au sort)
Lecteur : Claude (session Claude Code, 2026-10-26), lecture faite avant d'ouvrir la liste des mesures publiées. Consigne : Relever, page par page, chaque engagement de politique publique (ce que le candidat ferait ou ferait faire une fois élu), avec sa citation exacte. Exclus : constats, chiffres de diagnostic, rappels historiques, bilan de maire, stratégie électorale (primaire, alliances, consignes de vote), soutiens. Un engagement qui regroupe plusieurs actions séparables est découpé.

- Engagements relevés : 43 ; appariés automatiquement à une mesure publiée (citations proches) : 33 ; couverts par une mesure à la citation différente (`couverture.json`) : 6.
- Rappel automatique seul : 76.7 % (IC 95 % : 62.3 % – 86.8 %, n = 43).
- **Rappel : 90.7 % (IC 95 % : 78.4 % – 96.3 %, n = 43).**

Couverts par une autre citation :
- « Il demandait à l’État de sortir du « tout-fibre », y compris dans les zones peu denses, au profit d’une constellation satellitaire en orbite basse » → m-723fb1ab4c8c (Le programme prévoit le déploiement de la fibre « ou/et l’internet par satellite » contre l'enclavement.)
- « une organisation territoriale simplifiée « sous la seule autorité des préfets de départements » » → m-a353f046b4d7 (Préfet interlocuteur unique déconcentré.)
- « Il propose de basculer progressivement vers un système composé aux deux tiers de répartition et pour un tiers de capitalisation collective obligatoire, amorcé par un investissement public temporaire » → m-befbb59aa25e (Même engagement (part de capitalisation obligatoire) ; la page Questions cite une tribune de 2023 (un tiers), le programme retient environ 40 % : le programme prévaut (docs/decisions.md).)
- « l’État proposerait des bourses sur critères sociaux et de performance scolaire » → m-b598ea3c36da (« développement des bourses sociales et au mérite ».)
- « les écoles disposant en contrepartie d’une plus grande autonomie de gestion » → m-fff4921ab3ad (Autonomie des chefs d'établissement.)
- « David Lisnard veut restaurer l’autorité de l’adulte à l’école » → m-d5e266982fbe (« nous rétablirons l’autorité du professeur ».)

Engagements non couverts :
- nouvelle-energie-2026-10-quel-candidat-a-une-vision-sur-l-intelligence-artificielle p. 1 : « Il veut moins réglementer pour produire davantage » — Moins réglementer l'intelligence artificielle pour en produire davantage.
- nouvelle-energie-2026-10-quel-candidat-a-une-vision-sur-l-intelligence-artificielle p. 1 : « investir dans le calcul » — Investir dans les infrastructures de calcul.
- nouvelle-energie-2026-10-quel-candidat-a-une-vision-sur-l-intelligence-artificielle p. 1 : « apprendre aux futurs adultes à exercer leur raison critique et leur créativité, et à « décoder le monde » plutôt qu’à coder » — Apprendre aux élèves à « décoder le monde » plutôt qu'à coder.
- nouvelle-energie-2026-10-questions-david-lisnard-veut-il-baisser-les-impots p. 1 : « David Lisnard refuse la baisse d’impôt financée par la dette » — Pas de baisse d'impôt financée par la dette : baisser la dépense d'abord.

## Précision et paramètres (relecture de 40 mesures tirées au sort)
Lecteur : Claude (session Claude Code, 2026-10-26), relecture de chaque fiche contre ses citations et, au besoin, la phrase source. Consigne : Sens : la fiche (titre, résumés, phrases d'effet) dit ce que dit la citation, sans ajout, omission qui change le sens, ni engagement plus fort ou plus faible. Paramètres : taux, montants, durées, seuils et date d'effet conformes au programme ; « sans_parametre » si la fiche n'en porte aucun.

- **Précision : 97.5 % (IC 95 % : 87.1 % – 99.6 %, n = 40).**
- **Paramètres justes : 92.9 % (IC 95 % : 68.5 % – 98.7 %, n = 14).**

Écarts relevés :
- m-49b683740def : sens incorrect, paramètres sans_parametre — Titre « Créer un délit… » alors que le programme dit « engager une réflexion […] et envisager » ce délit ; le résumé, lui, est fidèle.
- m-55ecac48c641 : sens correct, paramètres faux — Date d'effet par défaut (1er janvier 2028, « date non annoncée ») alors que le programme annonce « Le premier jour » et « le jour même ».

## Coût d'une extraction par l'API (estimation ≈)
Volumes réels : corpus 677 737 caractères (203 pages), sorties d'extraction 296 075 caractères, 260 mesures. Hypothèses : ≈ 3 caractères par jeton ; deux extractions indépendantes (A et B), chaque page envoyée avec le prompt `extract-v1` ; relecture croisée de chaque mesure (`crosscheck-v1`, ≈ 200 jetons de sortie) ; tarifs de `src/cost.ts` (USD par million de jetons), sans cache.

| Modèle | Coût par programme | Avec l'API Batch (−50 %) |
|---|---|---|
| claude-sonnet-5-5 | 5.11 $ | 2.56 $ |
| claude-opus-5-5 | 10.23 $ | 5.11 $ |
