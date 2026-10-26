# Impôt sur le revenu : calcul officiel de la DGFiP

Référence du test n°2 pour l'impôt sur le revenu, à la place du simulateur d'impots.gouv.fr (injoignable depuis GitHub Actions).

- `cas/` : les profils de référence exportés en déclarations 2042, revenus 2025, au format IRJ de Mlang (`spikes/openfisca/scripts/export_irj.py`). Les revenus déclarés sont ceux qu'OpenFisca déduit du profil, pour comparer le calcul de l'impôt à déclaration identique. `declarations.json` garde les cases saisies et l'impôt calculé par OpenFisca.
- `.github/workflows/impot-dgfip.yml` : compile Mlang, récupère les sources M publiées par la DGFiP et calcule chaque déclaration. Les résultats arrivent dans `resultats/` (un journal par déclaration, versions utilisées, définition des cases dans les sources).
- Relancer : modifier `request.json` (numéro de run) ou régénérer `cas/`.

Limite : Mlang n'apporte aucune garantie légale. Ses auteurs indiquent qu'il passe les tests privés de la DGFiP pour les revenus 2018 à 2021 ; le dépôt ne contient pas de tests pour les revenus 2025.
