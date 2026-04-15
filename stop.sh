#!/bin/bash
# Stop Script
# Stops and removes all containers and volumes.

set -e

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

docker compose down -v 2>/dev/null || true

echo ""
echo "All containers stopped and removed."
echo ""
