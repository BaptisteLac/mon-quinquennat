# Tests de faisabilité

Deux tests courts avant d'écrire l'interface. Ils répondent aux deux questions qui peuvent faire échouer le projet :
1. L'IA sait-elle extraire des mesures fiables et citées d'un vrai programme ?
2. Sait-on calculer des montants justes pour un profil donné ?

Budget : environ 2 semaines (8–10 h). Si l'un échoue, on ajuste le périmètre avant d'aller plus loin.

---

## Test n°1 — Extraction (`spikes/extraction/`)

### Matériau
- Un programme réellement publié (le plus récent disponible), téléchargé et archivé, avec son sha256.
- Une **vérité terrain** faite à la main : 25 à 30 mesures relevées dans 3 sections (ex. fiscalité, retraite, logement), avec leur citation exacte et leur page.

### Ce qu'on construit
1. Découpage du PDF en texte par page (en gardant les numéros de page).
2. Prompt d'extraction versionné (`extract-v1`) → sortie validée par le schéma `Measure` (champs extraction uniquement, sans `review`).
3. Contrôle « citation exacte » : la citation, normalisée (espaces, apostrophes, césures), doit se trouver dans le texte de la page indiquée.
4. Seconde extraction indépendante (autre température ou autre modèle) et comparaison.
5. Relecture croisée par un modèle d'un autre fournisseur : « cette mesure dit-elle bien ce que dit la citation ? ».
6. Script de score qui compare à la vérité terrain.

### Mesures
| Indicateur | Définition |
|---|---|
| Rappel | part des mesures de la vérité terrain retrouvées |
| Précision | part des mesures extraites qui sont réelles et correctement résumées |
| Citations exactes | part des citations trouvées mot pour mot |
| Paramètres justes | pour les mesures chiffrées, part des valeurs correctes (taux, montants, dates) |
| Auto-validation | part des mesures qui passent les contrôles sans intervention |
| Coût | € par programme complet (extrapolé) |

### Feu vert
- Citations exactes : **100 %** des mesures publiées (une citation fausse est bloquée, jamais publiée).
- Précision des mesures auto-validées ≥ **95 %**.
- Rappel ≥ **80 %**.
- Paramètres justes ≥ **95 %** sur les mesures auto-validées.
- Auto-validation ≥ **60 %** (sinon la file d'exceptions sera trop lourde).
- Coût < **5 €** par programme.

Si le rappel est bas mais la précision haute : acceptable pour le MVP (on montre moins de mesures, mais justes), en l'indiquant sur la page Méthode.

---

## Test n°2 — Calcul (`spikes/openfisca/`, devenu `calc/`)

### Matériau
- 5 profils de référence variés : célibataire salarié au SMIC locataire ; couple 2 enfants, revenus moyens, propriétaires avec crédit ; parent isolé ; retraité ; indépendant.
- Pour chacun, les montants actuels relevés sur les simulateurs officiels (impôt sur le revenu, prime d'activité, aides au logement, allocations familiales).

### Ce qu'on construit
1. Service Python minimal : profil (schéma `Profile`) → situation OpenFisca → montants.
2. Correspondance `Profile` → variables OpenFisca, documentée.
3. Une réforme paramétrique : modifier un taux de barème de l'impôt et calculer l'écart.
4. Une formule de la liste blanche (ex. âge de départ à la retraite) en TypeScript, avec tests.
5. Mesure du temps de calcul pour 8 candidats × 1 profil (l'API calcule tout à chaque appel).

### Feu vert
- Écart avec les simulateurs officiels ≤ **2 %** (ou ≤ 10 €/mois) sur les 5 profils, pour chaque montant calculé.
- Réforme paramétrique fonctionnelle et testée.
- Temps de réponse < **2 s** pour tous les candidats d'un profil (sinon : cache par profil type ou précalcul).
- Hébergement du service identifié, avec son coût.

---

## Après les tests
- Les deux feux verts → on crée `apps/web` et le pipeline.
- Un seul → on réduit le périmètre (ex. moins de lignes chiffrées, plus de phrases qualitatives) et on documente le choix dans `docs/cadrage.md`.
- Aucun → on revoit le concept avant d'investir dans l'interface.

Les résultats (chiffres, coûts, exemples d'erreurs) sont consignés dans `spikes/extraction/RESULTATS.md` et `calc/FAISABILITE.md`.
