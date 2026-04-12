#!/bin/bash
# Start Script
# Usage:
#   ./start.sh                  # default environment (.env)
#   ./start.sh --env local      # load .env.local
#   ./start.sh --env prod       # load .env.prod
#   ./start.sh logs             # start default env, then tail logs
#
# The chosen env file supplies APP_NAME, APP_HOST, FLASK_SECRET_KEY, LOG_LEVEL,
# etc. nginx/nginx.conf is regenerated from nginx.conf.template on every run
# (do not edit nginx.conf directly — edit the template instead).

set -e

ENV_NAME=""
TAIL_LOGS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_NAME="$2"; shift 2 ;;
    logs)
      TAIL_LOGS=true; shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)
      echo "Unknown argument: $1"; exit 1 ;;
  esac
done

ENV_FILE=".env"
if [[ -n "$ENV_NAME" ]]; then
  ENV_FILE=".env.${ENV_NAME}"
  [[ -f "$ENV_FILE" ]] || { echo "Error: $ENV_FILE not found"; exit 1; }
fi

# Export every KEY=VALUE line so docker compose sees them.
# Parse manually instead of `source` so unquoted values containing spaces
# (e.g. `APP_NAME=Base App`) work without surprising bash.
if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    # skip blank lines and comments
    [[ -z "${line// }" ]] && continue
    [[ "${line#"${line%%[![:space:]]*}"}" == \#* ]] && continue
    # only export lines that look like KEY=...
    [[ "$line" != *=* ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    # trim whitespace from key; strip CR (if file was CRLF)
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    val="${val%$'\r'}"
    # strip matching surrounding quotes if present
    if [[ "$val" == \"*\" ]] || [[ "$val" == \'*\' ]]; then
      val="${val:1:${#val}-2}"
    fi
    # skip keys that aren't valid shell identifiers
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    export "$key=$val"
  done < "$ENV_FILE"
fi

APP_NAME="${APP_NAME:-Base App}"
APP_HOST="${APP_HOST:-localhost}"
export APP_NAME APP_HOST

echo "========================================="
echo "  ${APP_NAME} - Starting..."
echo "  Env file: ${ENV_FILE}"
echo "  APP_HOST: ${APP_HOST}"
echo "========================================="
echo ""

# Stop existing containers if running
echo "[1/6] Stopping existing containers..."
docker compose down 2>/dev/null || true
echo ""

# Regenerate nginx.conf from the template so APP_HOST always matches .env
echo "[2/6] Rendering nginx.conf from template..."
if [[ -f nginx/nginx.conf.template ]]; then
  sed "s/{{APP_HOST}}/${APP_HOST}/g" nginx/nginx.conf.template > nginx/nginx.conf
  echo "  nginx.conf rendered with APP_HOST=${APP_HOST}"
else
  echo "  nginx/nginx.conf.template not found; using existing nginx.conf"
fi
echo ""

# Write build version and timestamp to version.json
echo "[3/6] Writing build version and timestamp..."
BUILD_VERSION=$(date '+v%Y.%m.%d.%H%M')
BUILD_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
cat > backend/version.json << EOF
{
  "version": "${BUILD_VERSION}",
  "build_timestamp": "${BUILD_TIMESTAMP}"
}
EOF
echo "  Version: ${BUILD_VERSION}"
echo "  Build timestamp: ${BUILD_TIMESTAMP}"
echo ""

echo "[4/6] Building containers..."
docker compose build
echo ""

echo "[5/6] Starting containers..."
docker compose up -d
echo ""

echo "[6/6] Waiting for services to become healthy..."
HEALTH_TIMEOUT=180
HEALTH_SERVICES=(redis keycloak-db backend frontend)

wait_for_health() {
  local svc="$1" elapsed=0
  while (( elapsed < HEALTH_TIMEOUT )); do
    local state
    state=$(docker inspect -f '{{.State.Health.Status}}' "base-app-${svc}" 2>/dev/null || echo "missing")
    case "$state" in
      healthy)   echo "   ✓ ${svc}"; return 0 ;;
      unhealthy) echo "   ✗ ${svc} unhealthy — check: docker logs base-app-${svc}"; return 1 ;;
      missing)   echo "   ✗ ${svc} container not found"; return 1 ;;
    esac
    sleep 2; elapsed=$((elapsed + 2))
  done
  echo "   ✗ ${svc} did not become healthy within ${HEALTH_TIMEOUT}s"
  return 1
}

wait_for_keycloak() {
  local elapsed=0
  while (( elapsed < HEALTH_TIMEOUT )); do
    if curl -sk -o /dev/null -w '%{http_code}' "https://${APP_HOST}:8443/" | grep -qE '^(2|3)'; then
      echo "   ✓ keycloak"
      return 0
    fi
    sleep 2; elapsed=$((elapsed + 2))
  done
  echo "   ✗ keycloak did not respond on https://${APP_HOST}:8443 within ${HEALTH_TIMEOUT}s"
  return 1
}

for svc in "${HEALTH_SERVICES[@]}"; do
  wait_for_health "$svc" || { echo ""; echo "Startup failed."; exit 1; }
done
wait_for_keycloak || { echo ""; echo "Startup failed."; exit 1; }

echo ""
echo "========================================="
echo "  ${APP_NAME} is running!"
echo "========================================="
echo ""
echo "  Application:    https://${APP_HOST}"
echo "  Keycloak Admin: https://${APP_HOST}:8443/admin"
echo "    Username: admin"
echo "    Password: admin"
echo ""
echo "  Note: Accept the self-signed certificate"
echo "  warning in your browser."
echo ""
echo "  To stop:      ./stop.sh"
echo "  To view logs: ./start.sh logs"
echo "========================================="

if [[ "$TAIL_LOGS" == "true" ]]; then
  echo ""
  echo "Following logs (Ctrl+C to stop)..."
  echo ""
  docker compose logs -f
fi
