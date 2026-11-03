# Test n°1 : bilan automatique — corpus `horizons-2026-10`

Généré par `npm run evaluate -- bilan --corpus horizons-2026-10`. Échantillons tirés avec la graine 2027 (`echantillon.json`).

## Contrôles automatiques (116 mesures publiées)
- Citations exactes : 116 / 116 (100.0 %).
- Chiffres de la fiche présents dans la citation : 116 / 116 (100.0 %).
- Auto-validation : 116 / 116 (100.0 %) ; statuts : auto_validee 116.

## Rappel (lecture indépendante de 4 pages tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-03), lecture des quatre pages pour relever chaque engagement, y compris secondaire ; même modèle que l'extraction. Consigne : Relever, page par page, chaque engagement de politique publique (ce que le candidat ferait ou ferait faire une fois élu), avec sa citation exacte. Exclus : constats, chiffres de diagnostic, rappels historiques, chiffrages de financement, slogans de thème sans action identifiable. Un engagement qui regroupe plusieurs actions séparables est découpé.

- Engagements relevés : 137 ; appariés automatiquement à une mesure publiée (citations proches) : 137 ; couverts par une mesure à la citation différente (`couverture.json`) : 0.
- Rappel automatique seul : 100.0 % (IC 95 % : 97.3 % – 100.0 %, n = 137).
- **Rappel : 100.0 % (IC 95 % : 97.3 % – 100.0 %, n = 137).**

Couverts par une autre citation :
- aucun

Engagements non couverts :
- aucun

## Précision et paramètres (relecture de 40 mesures tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-03), relecture de chaque fiche tirée contre ses citations et la page source ; même modèle que l'extraction. Consigne : Sens : la fiche (titre, résumés, phrases d'effet) dit ce que dit la citation, sans ajout, omission qui change le sens, ni engagement plus fort ou plus faible. Paramètres : taux, montants, durées, seuils et date d'effet conformes au programme ; « sans_parametre » si la fiche n'en porte aucun.

- **Précision : 100.0 % (IC 95 % : 91.2 % – 100.0 %, n = 40).**
- **Paramètres justes : 100.0 % (IC 95 % : 74.1 % – 100.0 %, n = 11).**

Écarts relevés :
- aucun

## Coût d'une extraction par l'API (estimation ≈)
Volumes réels : corpus 19 824 caractères (4 pages), sorties d'extraction 114 165 caractères, 116 mesures. Hypothèses : ≈ 3 caractères par jeton ; deux extractions indépendantes (A et B), chaque page envoyée avec le prompt `extract-v1` ; relecture croisée de chaque mesure (`crosscheck-v1`, ≈ 200 jetons de sortie) ; tarifs de `src/cost.ts` (USD par million de jetons), sans cache.

| Modèle | Coût par programme | Avec l'API Batch (−50 %) |
|---|---|---|
| claude-sonnet-5-5 | 1.25 $ | 0.62 $ |
| claude-opus-5-5 | 2.49 $ | 1.25 $ |
