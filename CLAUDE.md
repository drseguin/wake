# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this project?

Base App is a skeleton/template application that serves as the starting point for all future applications. It provides a complete UI shell, theming system, authentication flow, and Docker infrastructure. It has no app-specific functionality. See `documentation/USE_BASELINE_APP.md` for the clone-rename-reuse workflow.

## First Time Setup

1. Accept Docker Desktop is running and ports 443/8443 are free.
2. `cp .env.example .env` (for local dev) — or `cp .env.example .env.local` if you plan to use `./start.sh --env local`.
3. `./start.sh` — waits for every service's healthcheck before returning.
4. Accept the self-signed certs at **both** `https://localhost` and `https://localhost:8443` in your browser.
5. Test admin login at https://localhost using the Keycloak default user (see `documentation/KEYCLOAK_SSO.md`).

## Quick Reference

```bash
./start.sh                       # default env; waits for healthchecks
./start.sh --env local           # load .env.local
./start.sh logs                  # start, then tail compose logs
./stop.sh                        # stop + remove volumes (wipes Keycloak DB)
./scripts/rename-app.sh "ACME App" "acme-app"
./scripts/install-hooks.sh       # installs pre-commit unified-logger check

curl -k https://localhost/api/v1/health
curl -k https://localhost/api/v1/config
docker compose ps
docker logs base-app-backend | grep 'DSC:'
```

## Architecture

```
Browser → Nginx (:443 app, :8443 keycloak) → Frontend (React/Vite :80)
                                           → Backend (Flask :5000) → Redis (sessions + prefs)
                                           → Keycloak (:8080)       → PostgreSQL
```

- **Frontend:** React 18 + Vite, plain JavaScript (no TypeScript). Single CSS file (`App.css`) with CSS custom properties. `ThemeContext` for dark/light + accent colors; `AuthContext` for user + role helpers.
- **Backend:** Python Flask with gunicorn. Redis-backed sessions. Auth via Keycloak OAuth2 + PKCE (or `SINGLE_USER_MODE` bypass). Role-gated endpoints use `@require_auth` / `@require_role` from `backend/utils/auth.py`.
- **Nginx:** Reverse proxy with self-signed TLS. Routes `/api/` to backend, `/` to frontend, `:8443` to Keycloak. Config generated from `nginx/nginx.conf.template` on every `./start.sh`.
- **Auth flow:** Frontend calls `/api/v1/auth/login` → backend generates PKCE challenge + state, stores in Redis, returns Keycloak auth URL → browser redirects to Keycloak → callback at `/api/v1/auth/callback` exchanges code for tokens → session stored in Redis → HTTPOnly cookie set. Access-token expiry is handled automatically via `POST /api/v1/auth/refresh` + single-flight retry in `services/api.js`.

### Key Files

- `frontend/src/App.jsx` — Root component: shell layout, ToastContext, DialogContext, auth state, nav fall-through to NotFound
- `frontend/src/main.jsx` — Entry point; wraps App in `ErrorBoundary` + `ThemeProvider`
- `frontend/src/contexts/AuthContext.jsx` — `useAuth()` with `{ user, adminRole, isAdmin, hasRole }`
- `frontend/src/contexts/ThemeContext.jsx` — Theme + accent color state; persists via localStorage
- `frontend/src/components/Protected.jsx` — Role-gated route wrapper (pairs with backend `@require_role`)
- `frontend/src/components/ErrorBoundary.jsx` — Crash catcher with dev-only stack trace
- `frontend/src/components/{Tooltip,FormField,EmptyState}.jsx` — UI primitives
- `frontend/src/pages/NotFound.jsx` — 404 panel
- `frontend/src/services/api.js` — Centralized fetch wrapper with 401→refresh retry + X-Request-ID logging
- `frontend/src/utils/logger.js` — Level-aware logger (syncs to backend `LOG_LEVEL`)
- `backend/app.py` — Flask app factory; endpoints under `/api/v1/*`
- `backend/utils/auth.py` — `@require_auth`, `@require_role` decorators
- `backend/utils/logger.py` — Unified logger with request-id filter
- `backend/keycloak.json` — Keycloak connection config incl. `single_user_mode` and `admin_role`
- `docker-compose.yml` — 6 services with healthchecks (nginx, frontend, backend, keycloak, keycloak-db, redis)

## API Endpoints

All routes live under `/api/v1/`. Frontend uses empty `BASE_URL` (same-origin via nginx proxy).

**Health / config:**
- `GET /api/v1/health` — liveness
- `GET /api/v1/config` — frontend bootstrap: `app_name`, `single_user_mode`, `admin_role`, `log_level`, `version`

**Auth (public):**
- `GET /api/v1/auth/login` — returns Keycloak auth URL
- `GET /api/v1/auth/callback` — OAuth code → token exchange, sets session cookie
- `POST /api/v1/auth/logout` — invalidates session, returns Keycloak logout URL
- `POST /api/v1/auth/refresh` — uses stored refresh_token to mint new access_token
- `GET /api/v1/auth/user` — current user info (401 if unauthenticated)

**User preferences (auth required):**
- `GET /api/v1/user/preferences` — returns stored prefs object
- `PUT /api/v1/user/preferences` — merges body into stored prefs (partial update OK)

## Conventions

- **Logger prefix:** `DSC:` — all logging uses the unified logger (`frontend/src/utils/logger.js`, `backend/utils/logger.py`). Never use raw `console.log` or `print`. Pre-commit hook enforces this after `./scripts/install-hooks.sh`.
- **Logger levels:** NONE/ERROR/WARN/INFO/DEBUG. Backend reads `LOG_LEVEL` env; `/api/v1/config` propagates it to the frontend so both sides log at the same level.
- **Request IDs:** Every backend log line includes `[<req-id>]`; the frontend logs the same id for each API call. Great for grepping across both logs in parallel.
- **Role checks:** Frontend reads admin role via `useAuth().isAdmin`; backend uses `@require_role()` which defaults to `KEYCLOAK['admin_role']`. Do not hardcode role strings.
- **Icons:** Google Material Symbols Outlined SVGs only, stored in `frontend/src/assets/icons/`. Imported as React components via `?react` suffix. No CDN icon libraries. SVGs must have `fill="currentColor"` for theming.
- **CSS:** Single `App.css` with CSS custom properties. Light/dark via `[data-theme='dark']` attribute selector. Base-8 spacing scale.
- **JSDoc:** Every source file needs a file header (`@fileoverview`, `@author David Seguin`, `@version`, `@since`, `@license`). All exported functions need JSDoc. Pre-commit hook flags new files missing `@fileoverview`.
- **No TypeScript:** Plain JavaScript with JSDoc type annotations.
- **API routes:** All under `/api/v1/`. Frontend uses empty `BASE_URL` (same-origin via nginx proxy).

## Common Issues & Quick Fixes

**Keycloak admin UI won't log in / realm missing.** Realm import runs only on first boot with an empty DB. Run `./stop.sh` (wipes volumes) then `./start.sh`.

**Backend logs show repeated 401s after login.** The frontend interceptor will attempt a single refresh per request; if that also fails, the session is gone — re-login. Check that `backend/keycloak.json` `public_url` matches the Keycloak host the browser was redirected to.

**Self-signed cert warnings loop.** Accept at both `https://localhost` AND `https://localhost:8443` — Keycloak redirects use the :8443 cert.

**Container name conflict on startup.** A container from a previous baseline clone is still around. `docker ps -a`, `docker rm -f <name>`, then `./start.sh`.

**`console.log` / `print` got committed.** Install the pre-commit hook: `./scripts/install-hooks.sh`.

**rename-app.sh output lost the new secrets.** The banner at the end prints `FLASK_SECRET_KEY` and the Keycloak client secret exactly once. If you missed them, open `.env` and `backend/keycloak.json` — the values are there.

## Key Gotchas

- **`nginx/nginx.conf` is generated.** Do not edit it — `./start.sh` overwrites it from `nginx/nginx.conf.template` every run. Edit the template instead.
- **SINGLE_USER_MODE synthetic user.** When `backend/keycloak.json` has `"single_user_mode": true`, every request sees a fake admin user with the configured `admin_role`. Useful for local dev without Keycloak; never enable in prod.
- **Internal vs public Keycloak URLs.** Backend uses `http://keycloak:8080` (internal, server-to-server) for token exchange; browser redirects use `https://localhost:8443`. Both are in `backend/keycloak.json`; change both if you change the public host.
- **Containerized-only dev.** There is no local `npm run dev` / Flask dev-server workflow — everything runs in Docker. Hot reload is not configured.
- **`backend/version.json` is auto-managed.** `./start.sh` rewrites it every launch. Do not commit manual edits.
- **Redis = sessions + prefs.** Wiping Redis logs everyone out and resets all saved preferences. `./stop.sh` also removes the `keycloak-db` volume, so realm config resets too.

## Documentation

- `documentation/USE_BASELINE_APP.md` — How to clone this baseline into a new app (rename script usage, git remote setup, secret rotation)
- `documentation/STYLE_GUIDE.md` — Complete design spec (colors, typography, components, CSS variables)
- `documentation/APP_DEVELOPMENT_RULES.md` — Coding standards, JSDoc templates, UI/UX standards, quality gates
- `documentation/KEYCLOAK_SSO.md` — Keycloak setup and user/role administration
- `documentation/VERSION_GUIDE.md` — Versioning + release process
- `CHANGELOG.md` — Keep a Changelog format, per-release notes
