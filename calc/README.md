# Service de calcul

Service HTTP sans état : un profil → les montants (impôt sur le revenu, prime d'activité, aides au logement,
allocations familiales, minimum vieillesse) avec les règles actuelles et pour chaque candidat, calculés par
OpenFisca-France. Issu du test de faisabilité n°2 (résultats : `FAISABILITE.md`).

- `mq_calc/` : profil → situation OpenFisca (`situation.py`), montants (`compute.py`), leviers de réforme
  (`levers.py`, liste fermée `ReformLever` du schéma), API (`api.py` : `POST /calcul`, `GET /sante`).
- Au démarrage, le service lit les mesures publiées (`data/measures/*.json`, ou `MQ_MEASURES_DIR`) : chaque
  effet « barème » d'une mesure publiée apporte ses leviers. `/calcul` renvoie la version de chaque programme
  (`corpus`) : le site refuse de mélanger deux versions.
- Tous les candidats sont calculés à chaque appel ; le profil n'est ni journalisé ni conservé.
- `profiles/reference.json` : profils de référence vérifiés sur les simulateurs officiels (`scripts/run_reference.py`),
  impôt comparé au code de la DGFiP (`.github/workflows/impot-dgfip.yml`).

```bash
uv sync
uv run pytest -q
uv run python scripts/run_reference.py
uv run gunicorn --preload -w 1 -b 127.0.0.1:8000 mq_calc.api:app   # puis CALC_URL=http://127.0.0.1:8000 pour le site
uv run python scripts/record_web_fixtures.py                          # réponses réelles pour les tests du site
```

## Image et déploiement
L'image se construit depuis la racine du dépôt (`docker build -f calc/Dockerfile .`) et embarque les mesures
publiées. Le workflow `calc-image.yml` la construit et la vérifie à chaque PR qui touche le calcul ou les
mesures ; sur `main`, il la publie et la déploie sur Scaleway Serverless Containers si le projet est configuré.

Configuration Scaleway, une seule fois (offre gratuite : 200 000 vCPU-s et 400 000 Go-s par mois) :
1. Créer un espace de noms du Container Registry (région `fr-par`), par exemple `mon-quinquennat`.
2. Créer un espace de noms Serverless Containers puis un conteneur : port 8080, 1 vCPU, 1 024 Mo,
   instances min 0 (éteint au repos), max 5, accès public, image de départ quelconque (elle sera remplacée).
3. Créer une clé d'API (IAM) autorisée sur le registre et les conteneurs.
4. Dans GitHub, Settings → Secrets and variables → Actions :
   - secret `SCW_SECRET_KEY` : la clé secrète ;
   - variable `SCW_REGISTRY` : `rg.fr-par.scw.cloud/<espace de noms du registre>` ;
   - variable `SCW_CONTAINER_ID` : l'identifiant du conteneur ;
   - variable `SCW_REGION` si autre que `fr-par`.
5. Relancer le workflow « Service de calcul (image) » sur `main`, puis donner l'adresse du conteneur au site
   (variable d'environnement `CALC_URL` de l'hébergement du site).
