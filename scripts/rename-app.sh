#!/usr/bin/env bash
# rename-app.sh — rename all baseline tokens across the project.
#
# Replaces "Base App" (display name) and "base-app" (slug) with your chosen
# values across the files that reference them: docker-compose, keycloak
# realm/theme, backend config, frontend metadata, and documentation.
#
# Usage:
#   ./scripts/rename-app.sh "ACME App" "acme-app"
#
# Safe to re-run. Review changes with `git status && git diff` before committing.

set -euo pipefail

NEW_DISPLAY="${1:-}"
NEW_SLUG="${2:-}"

if [[ -z "$NEW_DISPLAY" || -z "$NEW_SLUG" ]]; then
  echo "Usage: $0 \"New Display Name\" \"new-slug\""
  echo "Example: $0 \"ACME App\" \"acme-app\""
  exit 1
fi

if ! [[ "$NEW_SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "Error: slug must be lowercase letters, digits, and hyphens only."
  exit 1
fi

OLD_DISPLAY="Base App"
OLD_SLUG="base-app"

if [[ "$NEW_DISPLAY" == "$OLD_DISPLAY" && "$NEW_SLUG" == "$OLD_SLUG" ]]; then
  echo "Nothing to do — new names match the current baseline names."
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Detect sed flavor (macOS vs GNU).
if sed --version >/dev/null 2>&1; then
  SED_INPLACE=(sed -i)
else
  SED_INPLACE=(sed -i '')
fi

echo "Renaming in $ROOT"
echo "  display: '$OLD_DISPLAY' → '$NEW_DISPLAY'"
echo "  slug:    '$OLD_SLUG' → '$NEW_SLUG'"
echo

FILES=(
  .env
  .env.example
  start.sh
  stop.sh
  docker-compose.yml
  backend/app.py
  backend/config.py
  backend/keycloak.json
  keycloak/realm-export.json
  frontend/package.json
  frontend/index.html
  README.md
  CLAUDE.md
  documentation/STYLE_GUIDE.md
  documentation/KEYCLOAK_SSO.md
  documentation/VERSION_GUIDE.md
  documentation/APP_DEVELOPMENT_RULES.md
)

replace_in_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  "${SED_INPLACE[@]}" -e "s/${OLD_SLUG}/${NEW_SLUG}/g" "$f"
  "${SED_INPLACE[@]}" -e "s/${OLD_DISPLAY}/${NEW_DISPLAY}/g" "$f"
  echo "  updated $f"
}

for f in "${FILES[@]}"; do
  replace_in_file "$f"
done

# Frontend source + public assets — any slug or display string baked in.
# Excludes node_modules and dist by scoping to src and public.
for dir in frontend/src frontend/public; do
  [[ -d "$dir" ]] || continue
  while IFS= read -r -d '' f; do
    replace_in_file "$f"
  done < <(find "$dir" -type f \( -name '*.jsx' -o -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' \) -print0)
done

# Keycloak theme files — replace tokens, then rename the directory.
THEME_DIR_OLD="keycloak/themes/${OLD_SLUG}"
THEME_DIR_NEW="keycloak/themes/${NEW_SLUG}"

if [[ -d "$THEME_DIR_OLD" ]]; then
  while IFS= read -r -d '' f; do
    replace_in_file "$f"
  done < <(find "$THEME_DIR_OLD" -type f \( -name '*.properties' -o -name '*.css' -o -name '*.ftl' -o -name '*.html' \) -print0)

  if [[ -d "$THEME_DIR_NEW" && "$THEME_DIR_OLD" != "$THEME_DIR_NEW" ]]; then
    echo "  skip theme rename — $THEME_DIR_NEW already exists"
  elif [[ "$THEME_DIR_OLD" != "$THEME_DIR_NEW" ]]; then
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      git mv "$THEME_DIR_OLD" "$THEME_DIR_NEW"
    else
      mv "$THEME_DIR_OLD" "$THEME_DIR_NEW"
    fi
    echo "  renamed theme directory → $THEME_DIR_NEW"
  fi
fi

# ------------------------------------------------------------------ #
# Secret rotation
# ------------------------------------------------------------------ #
# Runs AFTER slug replacement so we don't care what the baseline value was.
# Generates fresh random values and writes them into .env, backend/keycloak.json,
# and keycloak/realm-export.json. Prints both once so the user can stash them.

if ! command -v openssl >/dev/null 2>&1; then
  echo
  echo "WARNING: openssl not found on PATH — skipping secret rotation."
  echo "         Rotate FLASK_SECRET_KEY and Keycloak client_secret manually"
  echo "         before deploying to any shared environment."
else
  NEW_FLASK_SECRET="$(openssl rand -hex 32)"
  NEW_CLIENT_SECRET="$(openssl rand -hex 32)"

  rotate() {
    local file="$1" pattern="$2" replacement="$3"
    [[ -f "$file" ]] || return 0
    "${SED_INPLACE[@]}" -E -e "s|${pattern}|${replacement}|" "$file"
    echo "  rotated secret in $file"
  }

  # .env / .env.example — FLASK_SECRET_KEY=...
  rotate .env         '^(FLASK_SECRET_KEY=).*'       "\\1${NEW_FLASK_SECRET}"
  rotate .env.example '^(FLASK_SECRET_KEY=).*'       "\\1${NEW_FLASK_SECRET}"

  # backend/keycloak.json — "client_secret": "..."
  rotate backend/keycloak.json \
    '("client_secret"[[:space:]]*:[[:space:]]*")[^"]*(")' \
    "\\1${NEW_CLIENT_SECRET}\\2"

  # keycloak/realm-export.json — "secret": "..." (clients block)
  rotate keycloak/realm-export.json \
    '("secret"[[:space:]]*:[[:space:]]*")[^"]*(")' \
    "\\1${NEW_CLIENT_SECRET}\\2"

  echo
  echo "================================================================"
  echo "  SECRETS ROTATED — save these now, they are not shown again:"
  echo "  FLASK_SECRET_KEY    = ${NEW_FLASK_SECRET}"
  echo "  Keycloak secret     = ${NEW_CLIENT_SECRET}"
  echo "================================================================"
fi

echo
echo "Done. Review with: git status && git diff"
echo "Then rebuild with: ./stop.sh && ./start.sh"
