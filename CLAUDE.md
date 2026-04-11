# CLAUDE.md - Base App Project Context

## What is this project?

Base App is a skeleton/template application that serves as the starting point for all future applications. It provides a complete UI shell, theming system, authentication flow, and Docker infrastructure. It has no app-specific functionality.

## Architecture

- **Frontend:** React 18 + Vite, single CSS file (App.css), ThemeContext for dark/light + accent colors
- **Backend:** Python Flask API with gunicorn
- **Auth:** Keycloak SSO (OAuth2 + PKCE), SINGLE_USER_MODE for dev
- **Infrastructure:** Docker Compose with nginx (HTTPS), Redis (sessions), PostgreSQL (Keycloak)

## Key Files

- `frontend/src/App.css` — All CSS variables and component styles (single file, matches Style Guide)
- `frontend/src/contexts/ThemeContext.jsx` — Theme + accent color state management
- `frontend/src/App.jsx` — Root component, toast/dialog context providers
- `backend/app.py` — Flask app with auth endpoints
- `backend/keycloak.json` — All Keycloak config (change for production)
- `docker-compose.yml` — 6 services: nginx, frontend, backend, keycloak, keycloak-db, redis

## Conventions

- **Logger prefix:** `BA:` — all logging uses the unified logger, never raw console.log or print
- **Icons:** Google Material Symbols Outlined SVGs stored in `frontend/src/assets/icons/`, imported as React components via `?react` suffix
- **CSS:** Single App.css with CSS custom properties. Light/dark via `[data-theme='dark']` attribute selector
- **JSDoc:** Every source file needs a file header. All exported functions need JSDoc.
- **No TypeScript:** Plain JavaScript with JSDoc type annotations

## Build & Run

```bash
./start.sh   # Stops, builds, starts all containers
./stop.sh    # Stops and removes all containers + volumes
```

- App: https://localhost
- Keycloak Admin: https://localhost:8443/admin (admin/admin)

## Documentation

- `documentation/STYLE_GUIDE.md` — Complete design spec (colors, typography, components, CSS)
- `documentation/APP_DEVELOPMENT_RULES.md` — Coding standards and quality gates
- `documentation/KEYCLOAK_SSO.md` — Keycloak setup and administration

## Important

- Keycloak realm-export.json only imports on first boot (empty DB). `./stop.sh` wipes volumes.
- Backend uses internal URL (http://keycloak:8080) for token exchange, public URL (https://localhost:8443) for browser redirects
- SVGs must have `fill="currentColor"` for theming
- Accept self-signed certs on both https://localhost AND https://localhost:8443
