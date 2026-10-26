# syntax=docker/dockerfile:1
# Service de calcul OpenFisca. À construire depuis la racine du dépôt (il embarque data/measures) :
#   docker build -f calc/Dockerfile -t mq-calc .
FROM python:3.13-slim
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_NO_DEV=1 MQ_MEASURES_DIR=/app/data/measures PORT=8080
COPY calc/pyproject.toml calc/uv.lock ./
# Secret facultatif `ca` : certificat d'un proxy d'entreprise, pour construire derrière un proxy TLS.
RUN --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export SSL_CERT_FILE=/run/secrets/ca PIP_CERT=/run/secrets/ca; fi; \
    pip install --no-cache-dir uv==0.11.32 && uv sync --frozen --no-install-project
COPY calc/mq_calc ./mq_calc
# Les mesures publiées du même commit que le site : le service et le site calculent sur la même version.
COPY data/measures ./data/measures
EXPOSE 8080
# --preload : les systèmes fiscaux sont chargés une fois puis partagés entre workers (copie à l'écriture).
# Pas de journal d'accès : le service ne garde aucune trace des requêtes.
CMD ["sh", "-c", "exec uv run --no-sync gunicorn --preload -w 1 --timeout 60 -b 0.0.0.0:${PORT} mq_calc.api:app"]
