#!/bin/bash
# Start Script
# Stops existing containers, rebuilds, and starts the application.

set -e

# Load app name from .env or fall back to default
APP_NAME="${APP_NAME:-Base App}"
if [ -f .env ]; then
  _name=$(grep -E '^APP_NAME=' .env | cut -d'=' -f2-)
  [ -n "$_name" ] && APP_NAME="$_name"
fi

echo "========================================="
echo "  ${APP_NAME} - Starting..."
echo "========================================="
echo ""

# Stop existing containers if running
echo "[1/4] Stopping existing containers..."
docker compose down 2>/dev/null || true
echo ""

# Write build version and timestamp to version.json
echo "[2/4] Writing build version and timestamp..."
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

# Build and start
echo "[3/4] Building containers..."
docker compose build
echo ""

echo "[4/4] Starting containers..."
docker compose up -d
echo ""

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 3

echo ""
echo "========================================="
echo "  ${APP_NAME} is running!"
echo "========================================="
echo ""
echo "  Application:    https://localhost"
echo "  Keycloak Admin: https://localhost:8443/admin"
echo "    Username: admin"
echo "    Password: admin"
echo ""
echo "  Note: Accept the self-signed certificate"
echo "  warning in your browser."
echo ""
echo "  To stop:      ./stop.sh"
echo "  To view logs: ./start.sh logs"
echo "========================================="

# Follow logs if requested
if [ "$1" = "logs" ]; then
  echo ""
  echo "Following logs (Ctrl+C to stop)..."
  echo ""
  docker compose logs -f
fi
