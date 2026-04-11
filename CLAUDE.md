# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this project?

Base App is a skeleton/template application that serves as the starting point for all future applications. It provides a complete UI shell, theming system, authentication flow, and Docker infrastructure. It has no app-specific functionality.

## Build & Run

```bash
./start.sh   # Stops, builds, starts all containers (docker compose down + build + up -d)
./stop.sh    # Stops and removes all containers + volumes (wipes Keycloak DB)
```

- App: https://localhost
- Keycloak Admin: https://localhost:8443/admin (admin/admin)

There is no lint, test, or CI pipeline configured. No npm/pip commands need to be run locally — everything runs in Docker.

## Architecture

```
Browser → Nginx (:443 app, :8443 keycloak) → Frontend (React/Vite :80) | Backend (Flask :5000) | Keycloak (:8080)
                                              Backend → Redis (sessions) | Keycloak → PostgreSQL
```

- **Frontend:** React 18 + Vite, plain JavaScript (no TypeScript). Single CSS file (`App.css`) with CSS custom properties. ThemeContext for dark/light + accent colors.
- **Backend:** Python Flask with gunicorn. Redis-backed sessions. Auth via Keycloak OAuth2 + PKCE (or `SINGLE_USER_MODE` bypass).
- **Nginx:** Reverse proxy with self-signed TLS. Routes `/api/` to backend, `/` to frontend, `:8443` to Keycloak.
- **Auth flow:** Frontend calls `/api/v1/auth/login` → backend generates PKCE challenge + state, stores in Redis, returns Keycloak auth URL → browser redirects to Keycloak → callback at `/api/v1/auth/callback` exchanges code for tokens → session stored in Redis → HTTPOnly cookie set.

### Key Files

- `frontend/src/App.jsx` — Root component: app shell layout, ToastContext, DialogContext, auth state
- `frontend/src/App.css` — All CSS variables and component styles (single file, matches Style Guide)
- `frontend/src/contexts/ThemeContext.jsx` — Theme + accent color state management
- `frontend/src/services/api.js` — Centralized fetch wrapper (`credentials: 'include'` for cookie auth)
- `backend/app.py` — Flask app factory with all auth endpoints (`/api/v1/auth/*`, `/api/v1/health`, `/api/v1/config`)
- `backend/keycloak.json` — Keycloak config including `single_user_mode` toggle
- `docker-compose.yml` — 6 services: nginx, frontend, backend, keycloak, keycloak-db, redis

## Conventions

- **Logger prefix:** `BA:` — all logging uses the unified logger (`frontend/src/utils/logger.js`, `backend/utils/logger.py`). Never use raw `console.log` or `print`.
- **Icons:** Google Material Symbols Outlined SVGs only, stored in `frontend/src/assets/icons/`. Imported as React components via `?react` suffix. No CDN icon libraries. SVGs must have `fill="currentColor"` for theming.
- **CSS:** Single `App.css` with CSS custom properties. Light/dark via `[data-theme='dark']` attribute selector. Base-8 spacing scale.
- **JSDoc:** Every source file needs a file header. All exported functions need JSDoc. Use `@fileoverview`, `@author David Seguin`, `@version`, `@since`, `@license Professional - All Rights Reserved`.
- **No TypeScript:** Plain JavaScript with JSDoc type annotations.
- **API routes:** All under `/api/v1/`. Frontend uses empty `BASE_URL` (same-origin via nginx proxy).
- **File headers:** Include Key Features, Dependencies, Security Considerations, Performance Notes sections.

## Important Gotchas

- Keycloak `realm-export.json` only imports on first boot (empty DB). After realm config changes, must run `./stop.sh` (wipes volumes) then `./start.sh`.
- Backend uses internal URL (`http://keycloak:8080`) for server-to-server token exchange, public URL (`https://localhost:8443`) for browser redirects. Both are in `backend/keycloak.json`.
- Must accept self-signed certs on both `https://localhost` AND `https://localhost:8443` in browser before login flow works.
- Frontend build is a multi-stage Docker build (node → nginx). There is no local `node_modules` dev workflow — the app runs entirely in containers.

## Documentation

- `documentation/STYLE_GUIDE.md` — Complete design spec (colors, typography, components, CSS variables)
- `documentation/APP_DEVELOPMENT_RULES.md` — Coding standards, JSDoc templates, UI/UX standards, quality gates
- `documentation/KEYCLOAK_SSO.md` — Keycloak setup and user/role administration
