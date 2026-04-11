# Version & Build Guide

## Overview

Base App uses an automatic date-based versioning system. A new version string is generated every time `./start.sh` is executed. The version is displayed in the user menu dropdown beneath "Logout".

## Version Format

```
v{YYYY}.{MM}.{DD}.{HHMM}
```

**Example:** Running `./start.sh` on April 11, 2026 at 14:30 produces `v2026.04.11.1430`.

There is no manual semantic versioning or build counter. The version acts as both a version identifier and build timestamp in a single string.

## How It Works

### 1. Generation (`start.sh`)

When `./start.sh` is run, it generates the version and writes it to `backend/version.json` **before** the Docker build step:

```bash
BUILD_VERSION=$(date '+v%Y.%m.%d.%H%M')
BUILD_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
cat > backend/version.json << EOF
{
  "version": "${BUILD_VERSION}",
  "build_timestamp": "${BUILD_TIMESTAMP}"
}
EOF
```

This means the version is baked into the container image at build time.

### 2. Backend (`backend/utils/version_manager.py`)

The `version_manager` module reads `backend/version.json` on first access and caches it in memory:

- `get_version_info()` — returns `{"version": "v2026.04.11.1430", "build_timestamp": "2026-04-11 14:30:00"}`
- `reload()` — forces a re-read from disk
- Falls back to `{"version": "dev", "build_timestamp": null}` if the file is missing or invalid

### 3. API (`/api/v1/config`)

The existing `/api/v1/config` endpoint includes `version` and `build_timestamp` in its response. No separate endpoint is needed since the frontend already fetches config on initialization.

```json
{
  "single_user_mode": true,
  "version": "v2026.04.11.1430",
  "build_timestamp": "2026-04-11 14:30:00"
}
```

### 4. Frontend Display

The version is stored in App state from the config response and passed through `Header` to `UserMenu`. It appears at the bottom of the user menu dropdown, below "Logout", separated by a divider.

## File Reference

| File | Role |
|------|------|
| `backend/version.json` | Source of truth (auto-generated, never edit manually) |
| `backend/utils/version_manager.py` | Reads and caches version from JSON file |
| `backend/app.py` | Serves version via `/api/v1/config` |
| `start.sh` | Generates version on each start |
| `frontend/src/App.jsx` | Stores version in state from config |
| `frontend/src/components/Header.jsx` | Passes version prop to UserMenu |
| `frontend/src/components/UserMenu.jsx` | Renders version in dropdown |
| `frontend/src/App.css` | `.user-menu-version` styling |

## Important Notes

- **`version.json` is auto-managed.** Never edit it manually — it gets overwritten on every `./start.sh` run.
- **`./stop.sh` does not update the version.** Only `./start.sh` generates a new version.
- **"dev" fallback.** If `version.json` is missing or unreadable, the backend returns `"dev"` as the version. This is normal during local development without running `start.sh`.
- **No restart needed for version changes.** Since `start.sh` writes the file before building containers, the new version is always current when the app starts.
