# Test de faisabilité n°1 — Extraction

Protocole et critères : [`docs/faisabilite.md`](../../docs/faisabilite.md#test-n1--extraction-spikesextraction).
Question : l'IA sait-elle extraire des mesures fiables et citées d'un vrai programme ?

## Déroulé

Toutes les commandes se lancent depuis `spikes/extraction/`. Les clés et les modèles se règlent dans `.env` à la racine du dépôt (modèle : [`.env.example`](../../.env.example)).

### 1. Choisir et archiver le programme (humain)
Le programme le plus récent réellement publié par un candidat ou sa campagne. L'URL est copiée depuis le site officiel, jamais écrite de mémoire.

```bash
npm run archive -- "<url officielle du PDF>" doc-XX-v1   # → data/archives/doc-XX-v1.pdf + sha256
npm run pages -- data/archives/doc-XX-v1.pdf            # → data/archives/doc-XX-v1.pages.txt
```
Faire ensuite la copie publique sur https://web.archive.org/save et noter son URL.

### 2. Relever la vérité terrain (humain, ~3 h)
Copier `ground-truth.template.json` en `ground-truth.json`, puis relever **25 à 30 mesures dans 3 sections** (ex. fiscalité, retraite, logement) :
- `page` = numéro de page **du fichier PDF** (1 = première page), pas le numéro imprimé ;
- `quote` = copiée depuis `doc-XX-v1.pages.txt`, mot pour mot ;
- `values` = chaque taux, montant, âge ou date annoncée (vide pour une mesure qualitative). Un taux s'écrit en pourcentage (`9` avec `"unit": "pourcent"`) ;
- relever **toutes** les mesures des sections retenues, sinon le rappel et la précision sont faussés.

```bash
npm run check-gt     # schéma, empreinte du PDF, chaque citation retrouvée à sa page
```

### 3. Extraire (automatique)
```bash
npm run extract                 # pages des 3 sections annotées
npm run extract -- --all        # programme complet, pour mesurer le coût réel
```
Chaque lot de pages (6 par défaut) passe par :

| Étape | Ce qui est fait | Effet |
|---|---|---|
| Extraction A | `EXTRACT_MODEL_A`, prompt `prompts/extract-v1.md` | sortie validée par Zod |
| Format | conversion en `Measure` (sans `review`) et validation par `packages/schema` | échec → rejetée |
| Citation exacte | chaque citation trouvée mot pour mot à sa page (espaces, apostrophes, tirets, césures normalisés) | échec → rejetée, jamais publiée |
| Double extraction | `EXTRACT_MODEL_B`, même prompt ; même mesure et mêmes valeurs | requise pour une ligne chiffrée |
| Relecture croisée | `CROSSCHECK_MODEL` d'un autre fournisseur, prompt `prompts/crosscheck-v1.md` | requise pour toutes |

Résultat : auto-validée si tous les contrôles requis passent, en attente sinon. Sortie : `runs/<runId>.json`.
Vraisemblance et neutralité (contrôles 5 et 6 du pipeline) demandent le moteur de calcul : hors de ce test.

### 4. Scorer et adjudiquer (humain pour les cas hors vérité terrain)
```bash
npm run score                   # dernière exécution → runs/<runId>.report.md
```
Le rapport donne les six indicateurs, le feu vert, le coût et les exemples d'erreurs.
Les mesures extraites absentes de la vérité terrain sont listées « à adjudiquer » : reporter leur clé dans `adjudications.json` (modèle : `adjudications.template.json`) avec un verdict `correcte`, `resume_incorrect`, `inexistante` ou `doublon`, puis relancer `npm run score`.
Relire aussi un échantillon des mesures appariées : sans adjudication, elles comptent « correctes » à titre provisoire (le rapport en donne le nombre).

### 5. Consigner
Reporter chiffres, coûts, exemples d'erreurs et décision dans [`RESULTATS.md`](RESULTATS.md).

## Choix et limites
- **Seconde extraction = autre modèle.** L'API Anthropic n'accepte plus `temperature` ; l'indépendance vient du modèle (Opus 5.5 / Sonnet 5.5 par défaut).
- **Schéma de transport.** Le LLM remplit un schéma simplifié (`src/llm-schema.ts` : conditions sur 2 niveaux, paramètres en liste, `null` plutôt qu'absent) qui passe dans les sorties structurées natives ; le code le convertit, puis le vrai schéma `Measure` le valide. Le LLM ne remplit ni identifiants, ni documents, ni contexte chiffré, ni chiffrages, ni liens de financement.
- **Paramètres OpenFisca.** `reform[].parameter` est une description en clair ; la correspondance avec un chemin OpenFisca relève du test n°2.
- **Hypothèse d'une estimation.** `dataSourceId` vaut `a_definir` : la source est choisie par un humain.
- **Appariement** par citations (même page ± 1, ≥ 60 % des mots de la plus courte en commun), un pour un.
- **Paramètres justes** : toutes les valeurs attendues retrouvées et aucune en trop ; un taux en fraction (0,09) ou en pourcentage (9) est accepté. Les dates estimées ne comptent pas.
- **Coût extrapolé** proportionnellement au nombre de pages (`--all` donne le coût réel). Tarifs Anthropic dans `src/cost.ts`, relevés le 2026-10-06 ; les autres via `PRICE_<MODELE>`, le taux de change via `EUR_PER_USD`.

## Fichiers
```
prompts/extract-v1.md       prompt d'extraction (versionné, empreinte stockée dans chaque exécution)
prompts/crosscheck-v1.md    prompt de relecture croisée
src/                        code testé (vitest) : normalisation, contrôles, appariement, indicateurs, rapport
scripts/                    commandes : archive, pages, check-gt, extract, score
ground-truth.json           vérité terrain (à créer depuis le modèle)
adjudications.json          verdicts humains sur les mesures hors vérité terrain
runs/                       exécutions (JSON non commités) et rapports (commités)
RESULTATS.md                résultats et décision
```
