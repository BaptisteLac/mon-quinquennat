# Test de faisabilité n°2 — Calcul (OpenFisca)

État au 2026-10-24. Critères : `docs/faisabilite.md`.

## Ce qui est construit

| Élément | Où | État |
|---|---|---|
| Profil → situation OpenFisca → montants | `mq_calc/` (OpenFisca-France 176.1.3, paramètres à jour jusqu'à 2026) | fait, testé |
| Correspondance `Profile` → variables OpenFisca | `mq_calc/situation.py`, résumée ci-dessous | fait |
| Profil Python aligné sur le schéma Zod | `tests/test_profile_schema.py` (via `packages/schema/json/profile.schema.json`) | fait |
| Réforme paramétrique (barème de l'impôt) | `mq_calc/reforms.py`, liste blanche de paramètres | fait, testée |
| Formule TypeScript de la liste blanche | `packages/formulas` (`retraite_age_depart`) | faite et testée ; barème officiel sourcé (service-public.gouv.fr F14043, vérifié le 14 août 2026), chaque ligne citée mot pour mot dans la page archivée |
| Temps de calcul, 8 candidats × 1 profil | `scripts/bench.py` | **1,85 s** (médiane), 2,02 s (max) |
| Service HTTP sans état + image Docker | `mq_calc/api.py`, `Dockerfile` | fait, testé en conteneur |
| 5 profils de référence | `profiles/reference.json`, `scripts/run_reference.py` | calculés ; comparés aux références officielles (13 montants relevés sur les simulateurs, impôt des 5 profils par le code de la DGFiP) |

Montants produits (€/mois) : impôt sur le revenu (revenus 2025, payé en 2026, ramené au mois), prime d'activité, aides au logement, allocations familiales (octobre 2026).

## Feu vert : où on en est

| Critère | Résultat |
|---|---|
| Écart ≤ 2 % ou ≤ 10 €/mois avec les simulateurs officiels | **oui** : 13 montants relevés sur les simulateurs (prime d'activité ×5, allocations familiales ×5, aides au logement ×3), écart maximal 1,87 € ; impôt sur le revenu identique à l'euro près au code officiel de la DGFiP pour les 5 profils (revenus 2023, dernière année exécutable publiée). |
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
| `enfants[].anneeNaissance` | `date_naissance` | naissance supposée au 1er juillet (≈) |
| `logement`, `loyerMensuel` | `statut_occupation_logement`, `loyer` | sans loyer, pas d'aides au logement |
| `codeCommune` | `depcom` → `zone_apl` | arrondissements ramenés à leur commune ; zonage embarqué par OpenFisca daté de 2011 : commune absente → zone déduite du lieu de vie (≈), signalée |
| `situationProConjoint` | situation du conjoint | à défaut, salarié s'il a un revenu (≈) |
| `handicapOuAidant` absent ou « non » | `aah` = 0 | évite de calculer l'AAH (moitié du temps de la prime d'activité) |

Chaque hypothèse (≈) est renvoyée avec le résultat, pour la fiche « d'où vient ce chiffre ».

## Questions ajoutées au profil (décision du 2026-10-26)

Loyer hors charges, commune (code INSEE choisi à partir du code postal), année de naissance des enfants, chiffre d'affaires et type d'activité d'un micro-entrepreneur, situation professionnelle du conjoint. Elles sont dans le schéma Zod `Profile` et dans le profil Python ; le complément de calcul provisoire du test a disparu.

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

## Mesures branchées sur le calcul (2026-10-26)

Chaîne complète : mesure publiée (citation exacte) → levier de la liste fermée `ReformLever` (schéma) → paramètres OpenFisca (`mq_calc/levers.py`, conversions d'unité dans le code) → réforme du candidat (`scripts/build_candidates.py` → `candidates.json`) → montants par l'API.

Programme Nouvelle Énergie (260 mesures publiées) :

| Nature | Mesures | Détail |
|---|---|---|
| Calculée par OpenFisca | 1 | déplafonnement du quotient familial (demi-parts d'enfant) |
| Calculable, en file d'exceptions | 1 | minimum vieillesse « à hauteur de 1000 euros par mois » : inférieur au montant en vigueur en 2026 (12 523,14 € par an), le calcul littéral afficherait une baisse |
| Formule de la liste blanche | 1 | âge légal à 65 ans (`retraite_age_depart`) : 12 mois de plus pour une personne de 40 ans (64 ans aujourd'hui) ; barème du régime des salariés (les catégories actives de la fonction publique n'y sont pas) |
| Qualitative (phrase, sans montant) | 41 | effets sans paramètre chiffré exploitable (ex. CSG « de mémoire », gain de 250 à 400 € « selon les interventions ») |
| Sans effet sur le ticket | 216 | mesures d'organisation de l'État, de procédure, etc. |

Une réforme s'applique sur toutes les années du calcul (« une fois tout appliqué ») ; la date d'effet de la mesure sert à la frise. Exemple : un couple avec deux enfants et 7 000 + 6 000 € nets par mois paie 2 185,75 €/mois d'impôt aujourd'hui, 1 912,25 € avec le quotient familial sans plafond ; le couple de référence (revenus moyens) n'est pas concerné.

Erreur corrigée : « sans plafond » représenté par l'infini donnait un impôt NaN (0 × inf dans OpenFisca) ; un plafond inatteignable le remplace (test).

## Comparaison aux simulateurs officiels

Le simulateur de la CAF n'est pas joignable depuis l'environnement de travail : GitHub Actions le remplit (`spikes/simulateurs`, `probe-request.json`) et commite le texte et la capture de chaque page. Les montants relevés sont dans `profiles/reference.json`, avec leur preuve dans `profiles/preuves/`.

| Profil | Prime d'activité calculée | Officielle (CAF) |
|---|---|---|
| Célibataire au SMIC, locataire | 235,18 € | 234 € |
| Couple, deux enfants, propriétaires | 0 € | 0 € (non éligible) |
| Parent isolé, deux enfants, HLM | 183,86 € | 183 € |
| Retraité seul | 0 € | 0 € (non éligible) |
| Indépendant micro-BNC | 83,94 € | 83 € |

Allocations familiales : 152,24 € calculés pour 152,25 € (service-public.fr, F13213) pour les deux profils avec deux enfants ; 0 pour les autres.

Parent isolé : OpenFisca lui attribue l'allocation de soutien familial (403,57 €/mois pour deux enfants), puisque le profil ne demande pas de pension alimentaire (hypothèse « sans pension alimentaire »). La prime d'activité ne la compte pas en entier mais forfaitisée (215,17 €, article R844-4 du code de la sécurité sociale). Trois saisies sur le site de la CAF le montrent :
- allocations familiales seules : 393 € ; OpenFisca sans allocation de soutien familial : 399,03 € (dans la tolérance) ;
- allocations familiales + allocation de soutien familial forfaitisée : 183 € ; OpenFisca : 183,86 € (montant retenu) ;
- allocations familiales + allocation de soutien familial entière : 0 €. Le simulateur ne forfaitise pas ce qu'on lui saisit ; OpenFisca suit le texte.

Le montant affiché à un parent isolé dépend donc de cette hypothèse (≈ 215 €/mois d'écart) : à afficher dans la fiche « d'où vient ce chiffre », ou à remplacer par une question au profil (voir `docs/decisions.md`, à valider).

Aides au logement (simulateur de la CAF, ressources nettes imposables des 12 derniers mois telles que les calcule OpenFisca) :

| Profil | Calculée | Officielle (CAF) |
|---|---|---|
| Célibataire au SMIC, Lyon, loyer 550 € | 0 € | 0 € (non éligible) |
| Parent isolé, Châteauroux, HLM, loyer 450 € | 205,87 € avant RLS, 160,30 € après | 204 € (le simulateur ignore la RLS) |
| Indépendant, Paris, loyer 800 € | 0 € | 0 € (non éligible) |

Le simulateur de la CAF « ne tient pas compte […] de la Réduction de Loyer de Solidarité (RLS) ». Pour un locataire HLM, la comparaison porte donc sur le montant avant RLS (`variableOpenFisca` dans `reference.json`). Le montant affiché reste celui versé après RLS (160,30 €), le loyer étant lui-même réduit de 45,68 €. Les deux propriétaires ne sont pas relevés : le simulateur ne couvre que les locataires (et l'accession en outre-mer).

Impôt sur le revenu (code officiel de la DGFiP, `spikes/impot-dgfip`, workflow `impot-dgfip.yml`) : le simulateur d'impots.gouv.fr ne répond pas depuis GitHub Actions. Le workflow récupère les sources M publiées par la DGFiP (copie de Software Heritage, la forge d'origine ne répondant pas non plus), exporte les profils en déclarations 2042 et les calcule avec Mlang. Les sources publiques exécutables s'arrêtent aux revenus 2023 (les adaptations de Mlang pour 2024 et 2025 visent une version non publiée) : la comparaison porte sur 2023, à déclaration identique, et valide le moteur d'OpenFisca.

| Profil | OpenFisca (€/an) | Code DGFiP (€/an) |
|---|---|---|
| Célibataire au SMIC | 0 | 0 |
| Couple, deux enfants | 829 | 829 |
| Parent isolé (case T), deux enfants | 0 | 0 |
| Retraité, 69 ans (abattement personnes âgées) | 0 | 0 |
| Indépendant micro-BNC | 1 118 | 1 118 |

Erreur corrigée : sans l'année des revenus (`ANREV`), le code DGFiP ne calcule pas les âges et omettait l'abattement du retraité (208 € au lieu de 0) ; l'export la déclare (test).

## Reste à faire pour le feu vert

1. Relever le coût de l'hébergement retenu.

## Commandes

```bash
cd spikes/openfisca
uv sync
uv run pytest -q
uv run python scripts/run_reference.py
uv run python scripts/bench.py
docker build -t mq-calc . && docker run -p 8000:8000 mq-calc
```
