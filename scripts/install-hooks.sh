#!/usr/bin/env bash
# install-hooks.sh — install git hooks enforcing the project conventions.
# Run once per clone: ./scripts/install-hooks.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_DIR="${ROOT}/.git/hooks"

if [[ ! -d "$HOOK_DIR" ]]; then
  echo "Error: ${HOOK_DIR} not found — is this a git repo?"
  exit 1
fi

cat > "${HOOK_DIR}/pre-commit" << 'HOOK'
#!/usr/bin/env bash
# pre-commit — enforce unified-logger usage and required file headers.
#
# Blocks:
#   1. Raw console.log( / print( in JS/JSX/Python sources (unified logger only)
#   2. New .jsx / .py files without an @fileoverview JSDoc/docstring header
#
# Bypass with `git commit --no-verify` only if you know what you are doing.

set -e

STAGED=$(git diff --cached --name-only --diff-filter=ACM)
[[ -z "$STAGED" ]] && exit 0

FAIL=0

# Rule 1: raw logging calls
RAW_PATTERN='\b(console\.log|console\.debug|console\.info|console\.warn|console\.error)\(|\bprint\('
while IFS= read -r file; do
  [[ -f "$file" ]] || continue
  case "$file" in
    frontend/src/utils/logger.js|backend/utils/logger.py) continue ;;
    REF_APPS/*|*/node_modules/*|*/dist/*) continue ;;
    *.jsx|*.js|*.py)
      if git diff --cached "$file" | grep -nE "^\+" | grep -vE "^\+\+\+" | grep -qE "$RAW_PATTERN"; then
        echo "  ✗ $file: use the unified logger instead of console.*/print"
        FAIL=1
      fi
      ;;
  esac
done <<< "$STAGED"

# Rule 2: @fileoverview on new source files
while IFS= read -r file; do
  case "$file" in
    *.jsx|*.js|*.py) ;;
    *) continue ;;
  esac
  # Only check files being added (not modified).
  status=$(git diff --cached --name-status -- "$file" | awk '{print $1}')
  [[ "$status" == "A" ]] || continue
  [[ -f "$file" ]] || continue
  if ! head -n 40 "$file" | grep -q "@fileoverview"; then
    echo "  ✗ $file: new file missing @fileoverview header (see documentation/APP_DEVELOPMENT_RULES.md)"
    FAIL=1
  fi
done <<< "$STAGED"

if [[ "$FAIL" -ne 0 ]]; then
  echo
  echo "pre-commit: commit blocked by the checks above."
  echo "Fix the issues or bypass with: git commit --no-verify"
  exit 1
fi

exit 0
HOOK

chmod +x "${HOOK_DIR}/pre-commit"
echo "Installed: ${HOOK_DIR}/pre-commit"
echo "Hooks enforce unified-logger usage and @fileoverview on new source files."
