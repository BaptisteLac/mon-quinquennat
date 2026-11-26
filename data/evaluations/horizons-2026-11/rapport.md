# Test n°1 : bilan automatique — corpus `horizons-2026-11`

Généré par `npm run evaluate -- bilan --corpus horizons-2026-11`. Échantillons tirés avec la graine 2027 (`echantillon.json`).

## Contrôles automatiques (155 mesures publiées)
- Citations exactes : 155 / 155 (100.0 %).
- Chiffres de la fiche présents dans la citation : 155 / 155 (100.0 %).
- Auto-validation : 155 / 155 (100.0 %) ; statuts : auto_validee 155.

## Rappel (lecture indépendante de 4 pages tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-26), lecture des quatre pages tirées au sort pour relever chaque engagement, y compris secondaire ; même modèle que l'extraction. Consigne : Relever, page par page, chaque engagement de politique publique (ce que le candidat ferait ou ferait faire une fois élu), avec sa citation exacte. Exclus : constats, chiffres de diagnostic, rappels historiques, chiffrages de financement, slogans de thème sans action identifiable. Un engagement qui regroupe plusieurs actions séparables est découpé.

- Engagements relevés : 63 ; appariés automatiquement à une mesure publiée (citations proches) : 55 ; couverts par une mesure à la citation différente (`couverture.json`) : 4.
- Rappel automatique seul : 87.3 % (IC 95 % : 76.9 % – 93.4 %, n = 63).
- **Rappel : 93.7 % (IC 95 % : 84.8 % – 97.5 %, n = 63).**

Couverts par une autre citation :
- « aligner l’exécution des peines des grands trafiquants sur celle des terroristes » → m-02279cf8dfdc (Même engagement, cité depuis la page Sécurité.)
- « des tests de décodage seront organisés pour repérer très tôt les élèves en difficulté » → m-356333951522 (La fiche sur la lecture dès la maternelle reprend les tests de décodage.)
- « Faire de la lutte contre le narcotrafic une priorité aux Antilles notamment avec une présence en mer renforcée. » → m-c29533cee5e8 (Même engagement (navires doublés aux Antilles contre le narcotrafic), cité depuis la page Défense.)
- « relancer une conférence régionale sur les sargasses dans les Antilles, lancer un plan de protection des mangroves et des coraux » → m-a98d6ba6cbcc (La fiche de la loi de programmation économique pour les outre-mer reprend sargasses, mangroves et coraux dans son résumé.)

Engagements non couverts :
- horizons-2026-11-programme-ecole p. 1 : « le renforcement de l’écoute, à l’image du 3018, le numéro national contre le harcèlement, dont les moyens doivent être consolidés » — Le renforcement de l’écoute, à l’image du 3018, le numéro national contre le harcèlement, dont les moyens doivent être consolidés
- horizons-2026-11-programme-outre-mer p. 1 : « la question de la surrémunération ne sera pas abordée lors du prochain quinquennat » — La question de la surrémunération ne sera pas abordée lors du prochain quinquennat
- horizons-2026-11-programme-outre-mer p. 1 : « À La Réunion, il veut accélérer la création de retenues collinaires pour stocker l’eau qui tombe. » — À La Réunion, il veut accélérer la création de retenues collinaires pour stocker l’eau qui tombe
- horizons-2026-11-programme-outre-mer p. 1 : « mobilisera tous les leviers, de l’aide au développement aux visas, en passant par les accords de coopération et les transferts de fonds, contre tout État qui voudrait faire de Mayotte un moyen de pression sur la France » — Mobilisera tous les leviers, de l’aide au développement aux visas, en passant par les accords de coopération et les transferts de fonds, contre tout État qui voudrait faire de Mayotte un moyen de pres

## Précision et paramètres (relecture de 40 mesures tirées au sort)
Lecteur : Claude (session Claude Code, 2026-11-26), relecture de chaque fiche tirée contre ses citations et la page source ; même modèle que l'extraction. Consigne : Sens : la fiche (titre, résumés, phrases d'effet) dit ce que dit la citation, sans ajout, omission qui change le sens, ni engagement plus fort ou plus faible. Paramètres : taux, montants, durées, seuils et date d'effet conformes au programme ; « sans_parametre » si la fiche n'en porte aucun.

- **Précision : 100.0 % (IC 95 % : 91.2 % – 100.0 %, n = 40).**
- **Paramètres justes : 100.0 % (IC 95 % : 77.2 % – 100.0 %, n = 13).**

Écarts relevés :
- aucun

## Coût d'une extraction par l'API (estimation ≈)
Volumes réels : corpus 131 053 caractères (18 pages), sorties d'extraction 157 200 caractères, 155 mesures. Hypothèses : ≈ 3 caractères par jeton ; deux extractions indépendantes (A et B), chaque page envoyée avec le prompt `extract-v1` ; relecture croisée de chaque mesure (`crosscheck-v1`, ≈ 200 jetons de sortie) ; tarifs de `src/cost.ts` (USD par million de jetons), sans cache.

| Modèle | Coût par programme | Avec l'API Batch (−50 %) |
|---|---|---|
| claude-sonnet-5-5 | 1.91 $ | 0.96 $ |
| claude-opus-5-5 | 3.83 $ | 1.91 $ |
