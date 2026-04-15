# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this project?

WAKE — a marine/boating web app built on a reusable skeleton shell. The shell provides React frontend, Flask backend, Keycloak SSO, Redis sessions, and PostGIS persistence via SQLAlchemy + Alembic. Marine features: a Leaflet map with OSM/OpenSeaMap/NOAA chart + depth layers, user profiles (boat info), crews with invitations/members/chat, waypoints (owned + crew-shared), and live location sharing. A tile-cache service worker keeps previously-viewed map areas working offline.

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
./stop.sh                        # stop containers (preserves Keycloak users + sessions)
./stop.sh --reset                # stop + wipe volumes (Keycloak DB + Redis)
./scripts/install-hooks.sh       # installs pre-commit unified-logger check

curl -k https://localhost/api/v1/health
curl -k https://localhost/api/v1/config
docker compose ps
docker logs wake-app-backend | grep 'DSC:'
```

## Architecture

```
Browser → Nginx (:443 app, :8443 keycloak) → Frontend (React/Vite :80)
                                           → Backend (Flask :5000) → Redis        (sessions + prefs)
                                           │                       → wake-db      (PostGIS: app data)
                                           → Keycloak (:8080)      → keycloak-db  (PostgreSQL: auth data)
```

Seven Docker services: `nginx`, `frontend`, `backend`, `keycloak`, `keycloak-db`, `redis`, `wake-db` (PostGIS). All share the `wake-app-net` bridge network.

- **Frontend:** React 18 + Vite, plain JavaScript (no TypeScript). Single CSS file (`App.css`) with CSS custom properties. React Router v6 for page routing. Leaflet + react-leaflet for the map. `ThemeContext` for dark/light + accent colors; `AuthContext` for user + role helpers. `App.jsx` exports `ToastContext` + `DialogContext` via `useToast()` / `useDialog()`.
- **Backend:** Python Flask with gunicorn (2 workers). Feature routes live in `backend/blueprints/` and are registered by `backend/blueprints/__init__.py`. Redis-backed sessions. Auth via Keycloak OAuth2 + PKCE (or `SINGLE_USER_MODE` bypass). Role-gated endpoints use `@require_auth` / `@require_role` from `backend/utils/auth.py`.
- **Database:** PostGIS (`wake-db`) for app data; SQLAlchemy 2.x (`backend/db.py`) with a request-scoped session. Alembic migrations live in `backend/migrations/versions/`; `backend/entrypoint.sh` runs `alembic upgrade head` before gunicorn starts on every backend boot.
- **Nginx:** Reverse proxy with self-signed TLS. Routes `/api/` to backend, `/` to frontend, `:8443` to Keycloak. Config generated from `nginx/nginx.conf.template` on every `./start.sh`.
- **Auth flow:** Frontend calls `/api/v1/auth/login` → backend generates PKCE challenge + state, stores in Redis, returns Keycloak auth URL → browser redirects to Keycloak → callback at `/api/v1/auth/callback` exchanges code for tokens → session stored in Redis → HTTPOnly cookie set. Access-token expiry is handled automatically via `POST /api/v1/auth/refresh` + single-flight retry in `services/api.js`.
- **Map tiles:** Four layers wired in `MapView.jsx` — OSM base, OpenSeaMap seamarks overlay, NOAA raster charts (US waters), OpenSeaMap depth overlay (sparse). `frontend/public/sw-tiles.js` is a service worker that caches tile responses (stale-while-revalidate) for known tile hosts so previously-viewed areas keep working offline.

### Key Files

Frontend shell:
- `frontend/src/App.jsx` — Root: shell layout, routes, ToastContext + DialogContext, auth bootstrap
- `frontend/src/main.jsx` — Entry point; wraps App in `ErrorBoundary` + `ThemeProvider` + `BrowserRouter`
- `frontend/src/contexts/AuthContext.jsx` — `useAuth()` with `{ user, adminRole, isAdmin, hasRole }`
- `frontend/src/contexts/ThemeContext.jsx` — Theme + accent color state; persists via localStorage
- `frontend/src/components/Protected.jsx` — Role-gated route wrapper (pairs with backend `@require_role`)
- `frontend/src/components/ErrorBoundary.jsx` — Crash catcher with dev-only stack trace
- `frontend/src/components/{Tooltip,FormField,EmptyState,Dialog,Toast}.jsx` — UI primitives
- `frontend/src/services/api.js` — Centralized fetch wrapper with 401→refresh retry + X-Request-ID logging
- `frontend/src/utils/logger.js` — Level-aware logger (syncs to backend `LOG_LEVEL`)

Frontend marine features:
- `frontend/src/pages/Map.jsx` + `components/MapView.jsx` — Leaflet map, tile layers, waypoint markers, crew positions, right-click to drop waypoint
- `frontend/src/pages/Profile.jsx` — Boat + user profile form
- `frontend/src/pages/Crews.jsx` + `CrewDetail.jsx` + `components/CrewChat.jsx` — Crew list, detail view with members/invites, chat thread
- `frontend/src/pages/Waypoints.jsx` + `components/WaypointDialog.jsx` — Waypoint list + create/edit dialog
- `frontend/src/pages/Marinas.jsx` — Marinas directory
- `frontend/src/services/locationService.js` — Browser geolocation watcher + backend push for live sharing
- `frontend/src/components/PreferencesSync.jsx` — Two-way sync of prefs between Redis and frontend contexts
- `frontend/public/sw-tiles.js` — Service worker that caches map tile responses for offline use

Backend:
- `backend/app.py` — Flask app factory; auth + config + preferences endpoints
- `backend/blueprints/` — Feature routes: `profile.py`, `marinas.py`, `users.py`, `crews.py`, `waypoints.py`, `location.py` (registered in `blueprints/__init__.py`)
- `backend/models/` — SQLAlchemy models: `Marina`, `Profile`, `Crew` + `CrewMember` + `CrewInvitation` + `CrewMessage`, `Waypoint` + `WaypointShare`, `LocationShare`. All inherit the `Base` exported from `models/__init__.py`.
- `backend/db.py` — SQLAlchemy engine, scoped session, per-request teardown
- `backend/migrations/` — Alembic env + `versions/` (the one baseline migration is `0001_initial.py`)
- `backend/entrypoint.sh` — Runs `alembic upgrade head` then `gunicorn`
- `backend/utils/auth.py` — `@require_auth`, `@require_role` decorators; populates `g.user`
- `backend/utils/geo.py` — Geospatial helpers (PostGIS-aware distance / bounding box)
- `backend/utils/logger.py` — Unified logger with request-id filter
- `backend/keycloak.json` — Keycloak connection config incl. `single_user_mode` and `admin_role`

Infra:
- `docker-compose.yml` — 7 services with healthchecks
- `start.sh` — Stops/builds/starts everything and waits for each service's healthcheck
- `nginx/nginx.conf.template` — Source of truth for nginx config (see gotcha below)

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

**Marine features (all auth required, all under `/api/v1/`):**
- `profile.py` — GET/PUT current user's boat+profile; GET profile by username
- `users.py` — user lookup / search (for invites)
- `marinas.py` — marina directory + geospatial lookup
- `crews.py` — crews CRUD, invitations (send/accept/decline), member management (leave/remove), chat messages
- `waypoints.py` — waypoints CRUD + shares to specific crews
- `location.py` — live location broadcast + fetching crew member positions

Inspect the blueprint files directly for the exact route shapes — they are the source of truth.

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
- **DB access:** Use `from db import SessionLocal` inside request handlers — `SessionLocal()` gets a session bound to the request scope (teardown closes it). Do not open raw connections. Use SQLAlchemy 2.x style (`select(...)`, `session.execute(...)`) — examples in `blueprints/crews.py`.
- **Schema changes:** Edit/add a model in `backend/models/`, then create an Alembic revision (`alembic revision --autogenerate -m "..."`) inside the backend container. Migrations run automatically on the next backend start via `entrypoint.sh`.
- **Identity key:** Most app tables key on `username` (the Keycloak `preferred_username`), not a numeric user id. `g.user['username']` is the canonical reference inside handlers.
- **Map tiles:** The four tile URLs + attributions are constants at the top of `MapView.jsx`. If you add a new tile host, also add it to the `TILE_HOSTS` allow-list in `frontend/public/sw-tiles.js` or the SW will skip caching it.

## Common Issues & Quick Fixes

**Keycloak admin UI won't log in / realm missing.** Realm import runs only on first boot with an empty DB. Run `./stop.sh --reset` (wipes volumes) then `./start.sh`.

**Backend logs show repeated 401s after login.** The frontend interceptor will attempt a single refresh per request; if that also fails, the session is gone — re-login. Check that `backend/keycloak.json` `public_url` matches the Keycloak host the browser was redirected to.

**Self-signed cert warnings loop.** Accept at both `https://localhost` AND `https://localhost:8443` — Keycloak redirects use the :8443 cert.

**Container name conflict on startup.** A container from a previous baseline clone is still around. `docker ps -a`, `docker rm -f <name>`, then `./start.sh`.

**`console.log` / `print` got committed.** Install the pre-commit hook: `./scripts/install-hooks.sh`.

**Backend crashes on boot / migration error.** `docker logs wake-app-backend` — the Alembic upgrade runs before gunicorn, so a failed migration stops startup. Fix the migration (or drop the offending revision in `backend/migrations/versions/`) and restart. To wipe app data entirely: `./stop.sh --reset` (also removes the `wake-db-data` volume) then `./start.sh`.

## Key Gotchas

- **`nginx/nginx.conf` is generated.** Do not edit it — `./start.sh` overwrites it from `nginx/nginx.conf.template` every run. Edit the template instead.
- **SINGLE_USER_MODE synthetic user.** When `backend/keycloak.json` has `"single_user_mode": true`, every request sees a fake admin user with the configured `admin_role`. Useful for local dev without Keycloak; never enable in prod.
- **Internal vs public Keycloak URLs.** Backend uses `http://keycloak:8080` (internal, server-to-server) for token exchange; browser redirects use `https://localhost:8443`. Both are in `backend/keycloak.json`; change both if you change the public host.
- **Containerized-only dev.** There is no local `npm run dev` / Flask dev-server workflow — everything runs in Docker. Hot reload is not configured.
- **`backend/version.json` is auto-managed.** `./start.sh` rewrites it every launch. Do not commit manual edits.
- **Redis = sessions + prefs.** Wiping Redis logs everyone out and resets all saved preferences. `./stop.sh --reset` also removes the `keycloak-db` and `wake-db-data` volumes, so Keycloak users, realm config, **and all marine app data** reset too.
- **Migrations run at backend start.** `entrypoint.sh` runs `alembic upgrade head` before gunicorn. A broken migration prevents the backend from coming up; `./start.sh` will time out waiting for its healthcheck.
- **`username` is the user PK across tables.** Changing a Keycloak username orphans that user's profile, crew memberships, waypoints, etc. There is no migration path for rename today.
- **Geolocation requires HTTPS.** `locationService.js` needs `navigator.geolocation`, which browsers only expose on secure origins — this is why the dev setup uses self-signed TLS even locally.

## Documentation

- `documentation/STYLE_GUIDE.md` — Complete design spec (colors, typography, components, CSS variables)
- `documentation/APP_DEVELOPMENT_RULES.md` — Coding standards, JSDoc templates, UI/UX standards, quality gates
- `documentation/KEYCLOAK_SSO.md` — Keycloak setup and user/role administration
- `documentation/VERSION_GUIDE.md` — Versioning + release process
- `CHANGELOG.md` — Keep a Changelog format, per-release notes
