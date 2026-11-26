# Test n°1 : bilan automatique — corpus `france-insoumise-2026-11`

Généré par `npm run evaluate -- bilan --corpus france-insoumise-2026-11`. Échantillons tirés avec la graine 2027 (`echantillon.json`).

## Contrôles automatiques (121 mesures publiées)
- Citations exactes : 121 / 121 (100.0 %).
- Chiffres de la fiche présents dans la citation : 121 / 121 (100.0 %).
- Auto-validation : 121 / 121 (100.0 %) ; statuts : auto_validee 121.

## Rappel (lecture indépendante de 3 pages tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-26), lecture des trois pages tirées pour relever chaque engagement, y compris secondaire ; même modèle que l'extraction. Consigne : Relever, page par page, chaque engagement de politique publique (ce que le candidat ferait ou ferait faire une fois élu), avec sa citation exacte. Exclus : constats, chiffres de diagnostic, rappels historiques, chiffrages de financement, slogans de thème sans action identifiable. Un engagement qui regroupe plusieurs actions séparables est découpé. Les deux pages d'ouverture de partie (« Une économie au service des besoins », « Le goût du futur ») ne contiennent qu'un constat et l'annonce des thèmes de la partie : aucun engagement relevé.

- Engagements relevés : 60 ; appariés automatiquement à une mesure publiée (citations proches) : 60 ; couverts par une mesure à la citation différente (`couverture.json`) : 0.
- Rappel automatique seul : 100.0 % (IC 95 % : 94.0 % – 100.0 %, n = 60).
- **Rappel : 100.0 % (IC 95 % : 94.0 % – 100.0 %, n = 60).**

Couverts par une autre citation :
- aucun

Engagements non couverts :
- aucun

## Précision et paramètres (relecture de 40 mesures tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-26), relecture de chaque fiche tirée contre ses citations et la page source ; même modèle que l'extraction. Consigne : Sens : la fiche (titre, résumés, phrases d'effet) dit ce que dit la citation, sans ajout, omission qui change le sens, ni engagement plus fort ou plus faible. Paramètres : taux, montants, durées, seuils et date d'effet conformes au programme ; « sans_parametre » si la fiche n'en porte aucun.

- **Précision : 97.5 % (IC 95 % : 87.1 % – 99.6 %, n = 40).**
- **Paramètres justes : 100.0 % (IC 95 % : 81.6 % – 100.0 %, n = 17).**

Écarts relevés :
- m-f4fe244d5d4e : sens incorrect, paramètres justes — Le résumé ajoute « plan d'urgence contre la grande pauvreté », tiré du paragraphe d'introduction et non d'une citation de la fiche.

## Coût d'une extraction par l'API (estimation ≈)
Volumes réels : corpus 281 185 caractères (36 pages), sorties d'extraction 555 128 caractères, 121 mesures. Hypothèses : ≈ 3 caractères par jeton ; deux extractions indépendantes (A et B), chaque page envoyée avec le prompt `extract-v1` ; relecture croisée de chaque mesure (`crosscheck-v1`, ≈ 200 jetons de sortie) ; tarifs de `src/cost.ts` (USD par million de jetons), sans cache.

| Modèle | Coût par programme | Avec l'API Batch (−50 %) |
|---|---|---|
| claude-sonnet-5-5 | 5.03 $ | 2.52 $ |
| claude-opus-5-5 | 10.07 $ | 5.03 $ |
