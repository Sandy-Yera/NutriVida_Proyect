#!/usr/bin/env bash
# S-40: levanta NutriVida con un solo comando (Linux, macOS o Git Bash en Windows).
# Crea .env desde .env.example si no existe (con un JWT_SECRET aleatorio), compila y levanta
# los 5 contenedores y espera a que MySQL y los 3 microservicios queden "healthy".
#   ./scripts/levantar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Falta Docker. Instala Docker Desktop (Windows/macOS) o Docker Engine (Linux)." >&2
  exit 1
fi

if [ ! -f .env ]; then
  secreto=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
  sed "s/^JWT_SECRET=.*/JWT_SECRET=$secreto/" .env.example > .env
  echo ".env creado desde .env.example con un JWT_SECRET aleatorio."
fi

docker compose up -d --build

echo "Esperando a MySQL y a los 3 microservicios (la primera vez tarda varios minutos)..."
for _ in $(seq 1 72); do
  sanos=$(docker compose ps --format '{{.Service}} {{.Health}}' | grep -c ' healthy$' || true)
  [ "$sanos" -ge 4 ] && break
  sleep 5
done
docker compose ps

if [ "$sanos" -lt 4 ]; then
  echo "Algún servicio no quedó healthy. Revisa: docker compose logs <servicio>" >&2
  exit 1
fi

web=$(grep -E '^WEB_PORT=' .env | cut -d= -f2 | tr -d '\r')
web=${web:-8080}
cat <<URLS

NutriVida está arriba:
  App (React + Nginx)   http://localhost:$web
  Swagger ms-usuarios   http://localhost:8081/swagger-ui.html
  Swagger ms-citas      http://localhost:8082/swagger-ui.html
  Swagger ms-clinica    http://localhost:8083/swagger-ui.html
Cuentas demo: admin@nutrivida.cl / Admin2026!  ·  javiera.soto@correo.cl / Paciente2026!
URLS
