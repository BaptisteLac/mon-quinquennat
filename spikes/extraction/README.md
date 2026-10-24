# Test de faisabilité n°1 — Extraction

Protocole et critères : [`docs/faisabilite.md`](../../docs/faisabilite.md#test-n1--extraction-spikesextraction).
Question : l'IA sait-elle extraire des mesures fiables et citées d'un vrai programme ?

Un programme est rarement un seul PDF : c'est souvent un ensemble de pages web (axes, pages thématiques, carnets), avec parfois des PDF liés. L'outil travaille donc sur un **corpus** : toutes les pages officielles du programme, archivées avec leurs empreintes et découpées en « pages de citation » numérotées 1…N.
- une page web = une page de citation (ou plusieurs « parties » si elle est très longue) ;
- un PDF = une page de citation par page du fichier.

## Déroulé

Toutes les commandes se lancent depuis `spikes/extraction/`. Les clés et les modèles se règlent dans `.env` à la racine du dépôt (modèle : [`.env.example`](../../.env.example)).

### 1. Collecter le programme (automatique, ~5 min)
L'URL d'entrée (ex. la page « Notre programme ») est copiée depuis le site officiel, jamais écrite de mémoire.

```bash
npm run collect -- --corpus <id> --candidate c-XX --start "<url de la page programme>"
```
- On suit seulement les liens qui commencent par l'URL d'entrée. Les PDF du même site liés depuis ces pages sont aussi collectés. Rien d'autre du web.
- `liens-exclus.txt` liste les autres liens du site. Si des pages du programme y figurent (ex. `/axes/…` hors de `/notre-programme/`), relancer avec `--include <préfixe>` (option répétable, qui remplace le préfixe par défaut : y remettre l'URL d'entrée).
- Si des pages sortent presque vides, leur contenu est chargé en JavaScript : relancer avec `--render` (Chromium sans écran ; `CHROMIUM_PATH` si besoin).
- Le robots.txt du site est respecté, avec une pause d'une seconde entre deux pages.

Résultat dans `data/archives/<id>/` (non commité) : `manifest.json` (documents, URL, empreintes), `raw/` (fichiers reçus), `text/` (texte extrait), `corpus.txt` (texte numéroté, à lire pour la vérité terrain).
Copie publique de chaque URL : https://web.archive.org/save

### 2. Relever la vérité terrain (humain, ~3 h)
Copier `ground-truth.template.json` en `ground-truth.json`, y reporter le chemin du manifeste et son empreinte, puis relever **25 à 30 mesures dans 3 sections** (ex. fiscalité, retraite, logement) :
- une section = une ou plusieurs pages web du corpus, ou une plage de pages d'un PDF ;
- pour chaque mesure : `documentId` et `page` comme indiqués dans `corpus.txt` (`page` vaut 1 pour une page web courte) ;
- `quote` est copiée depuis `corpus.txt`, mot pour mot ;
- `values` liste chaque taux, montant, âge ou date annoncée (vide pour une mesure qualitative). Un taux s'écrit en pourcentage (`9` avec `"unit": "pourcent"`) ;
- relever **toutes** les mesures des sections retenues, sinon le rappel et la précision sont faussés.

```bash
npm run check-gt     # schéma, empreintes, documents et pages existants, chaque citation retrouvée
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
Les mesures extraites absentes de la vérité terrain sont listées « à adjudiquer ». Reporter leur clé dans `adjudications.json` (modèle : `adjudications.template.json`) avec un verdict `correcte`, `resume_incorrect`, `inexistante` ou `doublon`, puis relancer `npm run score`.
Relire aussi un échantillon des mesures appariées : sans adjudication, elles comptent « correctes » à titre provisoire (le rapport en donne le nombre).

### 5. Consigner
Reporter chiffres, coûts, exemples d'erreurs et décision dans [`RESULTATS.md`](RESULTATS.md).

## Choix et limites
- **Texte d'une page web** : extraction déterministe. On retire scripts, menus, en-tête et pied de page du site, formulaires ; on garde tout le reste, y compris le contenu replié (accordéons, onglets). On décode selon l'encodage déclaré. Un peu de bruit reste possible ; le prompt demande de l'ignorer.
- **Changement de version** : le HTML brut varie à chaque visite (jetons, horodatages). C'est l'empreinte du **texte extrait** (`textSha256`) qui signalera une nouvelle version dans la veille.
- **Identifiants de documents** dérivés de l'URL : la même page garde le même identifiant d'une collecte à l'autre.
- **Seconde extraction = autre modèle.** L'API Anthropic n'accepte plus `temperature` ; l'indépendance vient du modèle (Opus 5.5 / Sonnet 5.5 par défaut).
- **Schéma de transport.** Le LLM remplit un schéma simplifié (`src/llm-schema.ts` : conditions sur 2 niveaux, paramètres en liste, `null` plutôt qu'absent) qui passe dans les sorties structurées natives. Il cite par numéro de page du corpus ; le code traduit en (document, page), puis le vrai schéma `Measure` valide. Le LLM ne remplit ni identifiants, ni documents, ni contexte chiffré, ni chiffrages, ni liens de financement.
- **Paramètres OpenFisca.** `reform[].parameter` est une description en clair ; la correspondance avec un chemin OpenFisca relève du test n°2.
- **Hypothèse d'une estimation.** `dataSourceId` vaut `a_definir` : la source est choisie par un humain.
- **Appariement** par citations (même page du corpus ± 1, ≥ 60 % des mots de la plus courte en commun), un pour un.
- **Paramètres justes** : toutes les valeurs attendues retrouvées et aucune en trop ; un taux en fraction (0,09) ou en pourcentage (9) est accepté. Les dates estimées ne comptent pas.
- **Coût extrapolé** proportionnellement au nombre de caractères (`--all` donne le coût réel). Tarifs Anthropic dans `src/cost.ts`, relevés le 2026-10-06 ; les autres via `PRICE_<MODELE>`, le taux de change via `EUR_PER_USD`.
- **Accès réseau** : la collecte doit pouvoir joindre le site du candidat. Dans un environnement cloud Claude Code, ajouter son domaine aux domaines autorisés (`npm run collect` passe alors par le proxy de l'environnement grâce à `NODE_USE_ENV_PROXY=1`) ; dans GitHub Actions (pipeline), l'accès est ouvert.

## Fichiers
```
prompts/extract-v1.md       prompt d'extraction (versionné, empreinte stockée dans chaque exécution)
prompts/crosscheck-v1.md    prompt de relecture croisée
src/                        code testé (vitest) : collecte, texte HTML et PDF, corpus, contrôles,
                            appariement, indicateurs, rapport
scripts/                    commandes : collect, check-gt, extract, score
ground-truth.json           vérité terrain (à créer depuis le modèle)
adjudications.json          verdicts humains sur les mesures hors vérité terrain
runs/                       exécutions (JSON non commités) et rapports (commités)
RESULTATS.md                résultats et décision
```
