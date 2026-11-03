# Test n°1 : bilan automatique — corpus `place-publique-2026-11`

Généré par `npm run evaluate -- bilan --corpus place-publique-2026-11`. Échantillons tirés avec la graine 2027 (`echantillon.json`).

## Contrôles automatiques (22 mesures publiées)
- Citations exactes : 22 / 22 (100.0 %).
- Chiffres de la fiche présents dans la citation : 22 / 22 (100.0 %).
- Auto-validation : 22 / 22 (100.0 %) ; statuts : auto_validee 22.

## Rappel (lecture indépendante de 1 pages tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-03), lecture de la page programme pour relever chaque engagement, y compris secondaire ; même modèle que l'extraction. Consigne : Relever, page par page, chaque engagement de politique publique (ce que le candidat ferait ou ferait faire une fois élu), avec sa citation exacte. Exclus : constats, chiffres de diagnostic, rappels historiques, chiffrages de financement, slogans de thème sans action identifiable. Un engagement qui regroupe plusieurs actions séparables est découpé. Les quatre orientations de l'axe « Rassembler la gauche » portent sur la conduite de la campagne, pas sur l'action une fois élu : elles ne sont pas relevées.

- Engagements relevés : 22 ; appariés automatiquement à une mesure publiée (citations proches) : 22 ; couverts par une mesure à la citation différente (`couverture.json`) : 0.
- Rappel automatique seul : 100.0 % (IC 95 % : 85.1 % – 100.0 %, n = 22).
- **Rappel : 100.0 % (IC 95 % : 85.1 % – 100.0 %, n = 22).**

Couverts par une autre citation :
- aucun

Engagements non couverts :
- aucun

## Précision et paramètres (relecture de 22 mesures tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-03), relecture de chaque fiche tirée contre ses citations et la page source ; même modèle que l'extraction. Consigne : Sens : la fiche (titre, résumés, phrases d'effet) dit ce que dit la citation, sans ajout, omission qui change le sens, ni engagement plus fort ou plus faible. Paramètres : taux, montants, durées, seuils et date d'effet conformes au programme ; « sans_parametre » si la fiche n'en porte aucun.

- **Précision : 100.0 % (IC 95 % : 85.1 % – 100.0 %, n = 22).**
- **Paramètres justes : aucune mesure chiffrée dans l'échantillon.**

Écarts relevés :
- aucun

## Coût d'une extraction par l'API (estimation ≈)
Volumes réels : corpus 4 778 caractères (1 pages), sorties d'extraction 20 321 caractères, 22 mesures. Hypothèses : ≈ 3 caractères par jeton ; deux extractions indépendantes (A et B), chaque page envoyée avec le prompt `extract-v1` ; relecture croisée de chaque mesure (`crosscheck-v1`, ≈ 200 jetons de sortie) ; tarifs de `src/cost.ts` (USD par million de jetons), sans cache.

| Modèle | Coût par programme | Avec l'API Batch (−50 %) |
|---|---|---|
| claude-sonnet-5-5 | 0.23 $ | 0.11 $ |
| claude-opus-5-5 | 0.46 $ | 0.23 $ |
