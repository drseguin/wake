#!/bin/bash
# Stop Script
# Stops containers. Preserves volumes (Keycloak users, Redis sessions, WAKE DB) by default.
# Pass --reset (or -r) to also remove volumes — wipes the Keycloak DB, Redis, and WAKE DB.

set -e

RESET=0
for arg in "$@"; do
  case "$arg" in
    --reset|-r) RESET=1 ;;
  esac
done

# Load app name from .env or fall back to default
APP_NAME="${APP_NAME:-WAKE App}"
if [ -f .env ]; then
  _name=$(grep -E '^APP_NAME=' .env | cut -d'=' -f2-)
  [ -n "$_name" ] && APP_NAME="$_name"
fi

echo "========================================="
echo "  ${APP_NAME} - Stopping..."
echo "========================================="
echo ""

if [ "$RESET" -eq 1 ]; then
  echo "Reset mode: removing volumes (Keycloak users, Redis sessions, and WAKE DB will be wiped)."
  docker compose down -v 2>/dev/null || true
else
  docker compose down 2>/dev/null || true
fi

echo ""
if [ "$RESET" -eq 1 ]; then
  echo "All containers stopped and volumes removed."
else
  echo "All containers stopped. Volumes preserved (users and sessions intact)."
  echo "Pass --reset to wipe volumes."
fi
echo ""
