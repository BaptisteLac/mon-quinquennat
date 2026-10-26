# Test de faisabilité n°2 — Calcul (OpenFisca)

État au 2026-10-24. Critères : `docs/faisabilite.md`.

## Ce qui est construit

| Élément | Où | État |
|---|---|---|
| Profil → situation OpenFisca → montants | `mq_calc/` (OpenFisca-France 176.1.3, paramètres à jour jusqu'à 2026) | fait, testé |
| Correspondance `Profile` → variables OpenFisca | `mq_calc/situation.py`, résumée ci-dessous | fait |
| Profil Python aligné sur le schéma Zod | `tests/test_profile_schema.py` (via `packages/schema/json/profile.schema.json`) | fait |
| Réforme paramétrique (barème de l'impôt) | `mq_calc/reforms.py`, liste blanche de paramètres | fait, testée |
| Formule TypeScript de la liste blanche | `packages/formulas` (`retraite_age_depart`) | mécanique faite et testée ; barème réel à sourcer |
| Temps de calcul, 8 candidats × 1 profil | `scripts/bench.py` | **1,85 s** (médiane), 2,02 s (max) |
| Service HTTP sans état + image Docker | `mq_calc/api.py`, `Dockerfile` | fait, testé en conteneur |
| 5 profils de référence | `profiles/reference.json`, `scripts/run_reference.py` | calculés ; **montants officiels à relever** |

Montants produits (€/mois) : impôt sur le revenu (revenus 2025, payé en 2026, ramené au mois), prime d'activité, aides au logement, allocations familiales (octobre 2026).

## Feu vert : où on en est

| Critère | Résultat |
|---|---|
| Écart ≤ 2 % ou ≤ 10 €/mois avec les simulateurs officiels | **non mesuré** : les simulateurs officiels (impots.gouv.fr, caf.fr, service-public.fr) ne sont pas joignables depuis l'environnement de travail. Les montants attendus restent `null` / `a_caler_pendant_le_test` ; aucun n'a été estimé à la main. |
| Réforme paramétrique fonctionnelle et testée | **oui** : baisser de 2 points le taux de la 2e tranche baisse l'impôt d'exactement 2 % de la tranche (à l'euro d'arrondi annuel près) ; réforme neutre sans effet ; paramètre hors liste blanche refusé. |
| Temps de réponse < 2 s pour tous les candidats d'un profil | **oui, de justesse** sur 1 cœur : 1,85 s en médiane dans le cas défavorable (2 candidats sur 8 touchent la prime d'activité). |
| Hébergement identifié, avec son coût | besoins mesurés (ci-dessous) ; coût à relever sur les grilles des hébergeurs (non joignables d'ici). |

## Correspondance profil → OpenFisca

| Profil | OpenFisca | Remarque |
|---|---|---|
| `revenusNetsMensuels` (salarié, fonctionnaire, chômeur) | `salaire_de_base`, `traitement_indiciaire_brut`, `chomage_brut` | brut trouvé par point fixe pour retrouver le net déclaré (au centime) |
| `pensionMensuelle` (retraité) | `retraite_brute` | idem ; le taux de CSG dépend du RFR de N-2 (voir erreurs corrigées) |
| indépendant en micro-entreprise | `mbic_impv`, `mbic_imps`, `mbnc_impo` | le net déclaré ne suffit pas : chiffre d'affaires et type d'activité nécessaires |
| `situationFamiliale` | foyers fiscaux, famille, ménage | marié/pacsé : un foyer fiscal ; couple non marié : deux foyers, enfants rattachés au demandeur ; seul avec enfants : case T |
| `enfants[].ageBand` | `date_naissance` | milieu de tranche (≈) si l'âge exact manque |
| `logement` | `statut_occupation_logement` | + `loyer` si fourni |
| `lieuDeVie` | `zone_apl` | déduite (≈) faute de commune |
| `handicapOuAidant` absent ou « non » | `aah` = 0 | évite de calculer l'AAH (moitié du temps de la prime d'activité) |

Chaque hypothèse (≈) est renvoyée avec le résultat, pour la fiche « d'où vient ce chiffre ».

## Questions à ajouter au profil

Sans elles, un montant n'est pas calculé ou devient estimé (proposition ajoutée à `docs/decisions.md`) :
- **loyer hors charges** : sans lui, pas d'aides au logement ;
- **code postal** : zone des aides au logement ;
- **année de naissance des enfants** : la tranche 11–17 ans ne dit pas si la majoration des allocations familiales (14 ans) s'applique ;
- **indépendant** : chiffre d'affaires annuel et type d'activité (vente, services, libéral) ;
- **conjoint** : sa situation professionnelle (aujourd'hui supposée salariée).

## Erreurs trouvées et corrigées (chacune devenue un test)

1. **CSG des retraites nulle.** Le RFR de N-2, qui fixe le taux de CSG, est calculé par une chaîne N → N-2 → N-4… qu'OpenFisca coupe en renvoyant 0. Correction : RFR fourni pour 2023 et 2024, trouvé par point fixe. Près d'un seuil de taux, il n'existe pas toujours de point fixe (le taux saute) : on retient alors le taux le plus favorable et l'hypothèse est signalée.
2. **Calcul 3 fois plus lent avec plusieurs systèmes fiscaux.** OpenFisca met en cache les paramètres par date dans un `lru_cache` de 128 entrées partagé par tous les systèmes ; avec la législation actuelle et 8 candidats, il se vide sans cesse. Correction : cache sans limite.
3. **Arrondi de l'impôt** à l'euro par an : les écarts de réforme se testent à 1 €/an près.

## Temps de calcul

Mesuré sur 4 vCPU, un seul processus (`scripts/bench.py`, 15 appels sur les 5 profils) :

| Étape | Temps |
|---|---|
| Trouver le brut et le RFR (une fois par profil) | 0,15 à 0,5 s |
| Législation actuelle, 4 montants | ≈ 0,4 s |
| Un candidat qui ne touche que l'impôt | ≈ 0,08 s |
| Un candidat qui touche la prime d'activité | ≈ 0,3 s |
| **Appel complet, actuel + 8 candidats** | **1,85 s médiane, 2,02 s max** |

Chaque candidat ne recalcule que les montants que ses réformes peuvent toucher (`reforms.affected_outputs`) ; le reste est repris de la législation actuelle. Marges si besoin : un processus par cœur pour les candidats (≈ 4 fois plus rapide sur 4 cœurs), ou un cache par profil identique.

## Hébergement : besoins mesurés

- Image Docker : 660 Mo. Démarrage : ≈ 4 s sans candidat, ≈ 13 s avec 8 candidats (chargement et préchauffage).
- Mémoire : 224 Mo sans candidat, ≈ 650 Mo avec 8 candidats, par processus.
- Une instance doit rester allumée (démarrage à froid trop long pour une requête). Un processus traite un appel à la fois, ≈ 0,5 appel/s par cœur.
- Candidats : conteneurs managés avec instance minimale (ex. Scaleway Serverless Containers, Clever Cloud, Fly.io, Google Cloud Run). Le coût est à relever sur leurs grilles tarifaires, non joignables d'ici.

## Reste à faire pour le feu vert

1. Relever les montants officiels des 5 profils (`profiles/reference.json`) : impots.gouv.fr (impôt), caf.fr (prime d'activité, aides au logement), service-public.fr ou caf.fr (allocations familiales). Puis `uv run python scripts/run_reference.py`.
2. Sourcer le barème de l'âge légal par génération sur Légifrance (`packages/formulas/data/age-legal-actuel.json`), avec citation exacte de chaque ligne.
3. Relever le coût de l'hébergement retenu.

## Commandes

```bash
cd spikes/openfisca
uv sync
uv run pytest -q
uv run python scripts/run_reference.py
uv run python scripts/bench.py
docker build -t mq-calc . && docker run -p 8000:8000 mq-calc
```
