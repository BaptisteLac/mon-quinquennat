# Impôt sur le revenu : calcul officiel de la DGFiP

Référence du test n°2 pour l'impôt sur le revenu, à la place du simulateur d'impots.gouv.fr (injoignable depuis GitHub Actions).

`.github/workflows/impot-dgfip.yml`, entièrement automatique :
1. récupère les sources M publiées par la DGFiP (dépôt `ir-calcul` de gitlab.adullact.net, injoignable depuis GitHub Actions, donc via la copie de Software Heritage, `swh_fetch.py`) et choisit la dernière année de revenus publiée ;
2. exporte les profils de référence en déclarations 2042 de cette année-là (`calc/scripts/export_irj.py` → `cas/`) : revenus déclarés tels qu'OpenFisca les déduit du profil, et impôt calculé par OpenFisca ;
3. calcule chaque déclaration avec Mlang (interpréteur du langage M) → `resultats/*.log` ;
4. compare (`calc/scripts/compare_dgfip.py`) → `resultats/comparaison.md`.

Relancer : modifier `request.json` (numéro de run).

Limites :
- la DGFiP publie ses sources avec retard : on valide le moteur d'OpenFisca sur la dernière année publiée, pas sur l'année affichée par le simulateur ;
- Mlang n'apporte aucune garantie légale ; ses auteurs indiquent qu'il passe les tests privés de la DGFiP pour les revenus 2018 à 2021, et le dépôt de Mlang contient des tests aléatoires pour 2018 à 2023.
