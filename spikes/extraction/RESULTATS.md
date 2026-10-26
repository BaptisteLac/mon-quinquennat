# Test n°1 — Résultats

Bilan automatique, sans vérité terrain saisie à la main (`docs/decisions.md`). Chiffres issus de `data/evaluations/nouvelle-energie-2026-10/rapport.md` (`npm run evaluate -- bilan --corpus nouvelle-energie-2026-10`), généré le 2026-10-26 avant les corrections décrites plus bas.

## Matériau
- Programme : David Lisnard, Nouvelle Énergie — corpus `nouvelle-energie-2026-10` : 131 documents (126 pages web, 5 PDF), 203 pages de citation ; manifeste sha256 `4a534314996dc145392a879ba302394f5b5f7075cc93933ce40ed3bcfc76b863`, collecté le 2026-10-23.
- Pages d'entrée officielles : https://www.unenouvelleenergie.fr/notre-programme/ et https://www.unenouvelleenergie.fr/questions/ — préfixes suivis : ces deux pages et les PDF de campagne (`data/sources.yaml`) — rendu JavaScript : oui.
- Archives : texte et fichiers bruts dans `data/archives/nouvelle-energie-2026-10/` ; pas de dépôt Internet Archive.
- Vérité terrain : remplacée par une lecture indépendante de 20 pages tirées au sort (graine 2027) : 43 engagements relevés le 2026-10-26, avant d'ouvrir la liste des mesures publiées (`engagements.json`).

## Configuration
- Extraction : écrite dans une session Claude Code (abonnement, sans appel d'API), fichiers `data/extractions/nouvelle-energie-2026-10/*.json`, prompt de référence `extract-v1` (`f2fb0897388d235f`). Pas de seconde extraction indépendante ni de relecture croisée par un autre fournisseur : ces deux contrôles, facultatifs dans le schéma, n'ont pas été exercés.
- Relecture du sens : même session, liée à l'empreinte du contenu de chaque mesure (`relecture.json`).
- Bilan : lecture indépendante et relecture d'échantillon faites par le même modèle que l'extraction. **Limite** : ce n'est pas une vérification par un humain ni par un autre modèle ; les intervalles de confiance ne couvrent que l'aléa d'échantillonnage.

## Indicateurs

| Indicateur | Résultat | Seuil | Feu vert |
|---|---|---|---|
| Citations exactes (publiées) | 260 / 260 (100 %) | 100 % | oui |
| Précision (auto-validées) | 39 / 40 = 97,5 % (IC 95 % : 87,1 – 99,6 %) | ≥ 95 % | oui |
| Rappel | 39 / 43 = 90,7 % (IC 95 % : 78,4 – 96,3 %) ; 76,7 % par appariement automatique seul | ≥ 80 % | oui |
| Paramètres justes (auto-validées) | 13 / 14 = 92,9 % (IC 95 % : 68,5 – 98,7 %) | ≥ 95 % | non, cause corrigée (ci-dessous) |
| Auto-validation | 260 / 260 (100 %) | ≥ 60 % | oui |
| Coût par programme (API, estimation ≈) | Claude Sonnet 5.5 : 5,11 $, 2,55 $ avec l'API Batch ; Claude Opus 5.5 : 10,22 $, 5,11 $ avec l'API Batch | < 5 € | oui avec l'API Batch et Sonnet |

Coût : volumes réels (corpus de 677 737 caractères, 295 444 caractères de sortie, 260 mesures), ≈ 3 caractères par jeton, deux extractions et une relecture croisée par mesure, sans cache de prompt. 2,55 $ reste sous 5 € pour tout taux de change inférieur à 1,96 € par dollar. L'extraction actuelle, faite en session, ne coûte rien de plus que l'abonnement.

Mesures adjudiquées : 6 engagements couverts par une mesure à la citation différente (`couverture.json`), 40 verdicts de relecture (`verdicts.json`).

## Exemples d'erreurs
- Citations inexactes : aucune (contrôle bloquant).
- Mesures manquées (4 sur 43), toutes sur la page Questions consacrée à l'intelligence artificielle ou sur un principe budgétaire :
  - « Il veut moins réglementer pour produire davantage » (intelligence artificielle) ;
  - « investir dans le calcul » ;
  - « apprendre aux futurs adultes à […] « décoder le monde » plutôt qu’à coder » ;
  - « David Lisnard refuse la baisse d’impôt financée par la dette ».
- Sens inexact (1 sur 40) : m-49b683740def titrée « Créer un délit de recel… » quand le programme dit « engager une réflexion […] et envisager » ce délit (le résumé était fidèle).
- Paramètre faux (1 sur 14) : m-55ecac48c641 publiée avec la date par défaut (1er janvier 2028, « date non annoncée ») alors que le programme annonce « Le premier jour ».
- Relecture croisée en désaccord : non exercée.

## Décision
- [ ] Feu vert
- [x] Feu vert avec périmètre réduit : cinq critères sur six atteints ; paramètres justes à 92,9 % sur 14 mesures chiffrées (une erreur de date), cause corrigée et contrôlée. Le bilan sera refait sur le second programme (Jean-Luc Mélenchon, après sa publication du 6 novembre) pour confirmer. À indiquer sur la page Méthode : le bilan est fait par le modèle qui extrait, sans relecture humaine.
- [ ] Échec

Feu vert donné par le porteur du projet le 2026-10-26.

Cas de test ajoutés à partir des erreurs :
- `src/figures.test.ts` — « refuse la date par défaut pour une mesure annoncée « le premier jour » » : le contrôle `chiffres_fideles` bloque désormais une date d'effet postérieure au début du mandat (14 mai 2027) quand la citation annonce une mise en œuvre immédiate. Il a trouvé une seconde mesure dans ce cas (m-4081facb513f, suppression des ZFE « dès son arrivée au pouvoir »). Les deux sont corrigées, ainsi que le titre de m-49b683740def ; relecture mise à jour, 260 mesures publiées.
- `src/evaluation.test.ts` — tirage reproductible, appariement des engagements, intervalle de Wilson.
