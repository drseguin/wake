#!/bin/sh
# WAKE App backend entrypoint.
# Runs Alembic migrations to head (idempotent — no-op when already current),
# then execs the gunicorn server. Migrations run in a single process before
# gunicorn forks its workers, which avoids race conditions on cold start.

set -e

echo "DSC: running database migrations..."
alembic upgrade head
echo "DSC: migrations applied"

exec gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
