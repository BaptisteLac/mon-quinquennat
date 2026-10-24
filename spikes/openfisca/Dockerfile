# syntax=docker/dockerfile:1
# Service de calcul OpenFisca (test de faisabilité n°2).
FROM python:3.13-slim
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_NO_DEV=1
COPY pyproject.toml uv.lock ./
# Secret facultatif `ca` : certificat d'un proxy d'entreprise, pour construire derrière un proxy TLS.
RUN --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export SSL_CERT_FILE=/run/secrets/ca PIP_CERT=/run/secrets/ca; fi; \
    pip install --no-cache-dir uv==0.11.32 && uv sync --frozen --no-install-project
COPY mq_calc ./mq_calc
COPY candidates.json ./
EXPOSE 8000
# --preload : les systèmes fiscaux sont chargés une fois puis partagés entre workers (copie à l'écriture).
CMD ["uv", "run", "--no-sync", "gunicorn", "--preload", "-w", "1", "--timeout", "60", "-b", "0.0.0.0:8000", "mq_calc.api:app"]
