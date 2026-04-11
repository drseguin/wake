#!/bin/bash
# Base App - Start Script
# Stops existing containers, rebuilds, and starts the application.

set -e

echo "========================================="
echo "  Base App - Starting..."
echo "========================================="
echo ""

# Stop existing containers if running
echo "[1/3] Stopping existing containers..."
docker compose down 2>/dev/null || true
echo ""

# Build and start
echo "[2/3] Building containers..."
docker compose build
echo ""

echo "[3/3] Starting containers..."
docker compose up -d
echo ""

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 3

echo ""
echo "========================================="
echo "  Base App is running!"
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
echo "  To stop: ./stop.sh"
echo "========================================="
