#!/bin/bash
# Base App - Stop Script
# Stops and removes all containers and volumes.

set -e

echo "========================================="
echo "  Base App - Stopping..."
echo "========================================="
echo ""

docker compose down -v 2>/dev/null || true

echo ""
echo "All containers stopped and removed."
echo ""
