# Base App

A skeleton/template application that serves as the foundation for all future applications. Base App provides a complete, polished UI shell with theming, authentication, and infrastructure so that every app built from it shares the same visual language and behavior patterns.

**Base App has no app-specific functionality.** It is purely a starting point. Clone it, rename it, and build your application on top of it.

---

## What's Included

- **App Shell** — Fixed header, sliding side panel (resizable), scrollable main content area
- **Theming** — Dark/light mode with 10 accent color presets, all persisted in localStorage
- **Keycloak SSO** — Full OAuth2 + PKCE authentication flow with role-based access
- **SINGLE_USER_MODE** — Run locally without Keycloak for development
- **Toast Notifications** — Success, error, warning, and info feedback
- **Confirmation Dialogs** — For destructive or important actions
- **Settings Modal** — Tabbed interface with accent color picker and theme toggle
- **System Metrics Dropdown** — Placeholder metrics panel ready for real data
- **Responsive Design** — Mobile, tablet, and desktop breakpoints
- **Accessibility** — WCAG AA compliant, keyboard navigation, ARIA labels, reduced motion support
- **Docker Containers** — Complete docker-compose setup with nginx, Flask, Keycloak, PostgreSQL, Redis

---

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- A modern web browser

---

## Quick Start

```bash
# Clone the repository
git clone <repository-url> my-new-app
cd my-new-app

# Start the application
./start.sh
```

The script will build and start all containers. Once complete, open:

- **Application:** https://localhost
- **Keycloak Admin:** https://localhost:8443/admin (admin / admin)

> **Note:** Accept the self-signed certificate warning in your browser.

To stop the application:

```bash
./stop.sh
```

---

## Architecture

```
                         ┌─────────────┐
                         │   Browser   │
                         └──────┬──────┘
                                │ HTTPS
                    ┌───────────┴───────────┐
                    │     Nginx (SSL)       │
                    │   :443    :8443       │
                    └──┬─────┬────────┬────┘
                       │     │        │
              ┌────────┘     │        └────────┐
              ▼              ▼                 ▼
     ┌──────────────┐ ┌───────────┐   ┌──────────────┐
     │   Frontend   │ │  Backend  │   │   Keycloak   │
     │  (React/Vite)│ │  (Flask)  │   │  (Auth SSO)  │
     │    :80       │ │   :5000   │   │    :8080     │
     └──────────────┘ └─────┬─────┘   └──────┬───────┘
                            │                 │
                       ┌────┘            ┌────┘
                       ▼                 ▼
                 ┌──────────┐    ┌──────────────┐
                 │  Redis   │    │  PostgreSQL  │
                 │ Sessions │    │  (Keycloak)  │
                 └──────────┘    └──────────────┘
```

### Containers

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| nginx | nginx:alpine | 443, 8443 | Reverse proxy, HTTPS termination |
| frontend | node → nginx | 80 (internal) | React app (Vite build) |
| backend | python:3.12-slim | 5000 (internal) | Flask REST API |
| keycloak | keycloak:26.0 | 8080 (internal) | SSO authentication |
| keycloak-db | postgres:16-alpine | 5432 (internal) | Keycloak data store |
| redis | redis:7-alpine | 6379 (internal) | Session storage |

---

## Single User Mode vs Keycloak SSO

Authentication mode is controlled by the `single_user_mode` field in `backend/keycloak.json`:

```json
{
  "single_user_mode": false,
  ...
}
```

- **`false` (default)** — Keycloak SSO is enabled. Users must log in via Keycloak.
- **`true`** — Bypasses Keycloak and provides a synthetic admin user. Useful for local development when you don't need authentication.

After changing the value, rebuild the backend:

```bash
./start.sh
```

When Keycloak is enabled, you must accept the self-signed certificate on **both** `https://localhost` and `https://localhost:8443` before the login flow will work.

---

## Keycloak SSO Setup

See [documentation/KEYCLOAK_SSO.md](documentation/KEYCLOAK_SSO.md) for complete Keycloak administration instructions including:

- Creating and managing users
- Assigning roles (base-app-user, base-app-admin)
- Authentication flow details
- Troubleshooting

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Keycloak Admin Console | admin | admin |
| Test Application User | admin | admin |

---

## Configuration

### Keycloak Configuration

All Keycloak and authentication settings are in `backend/keycloak.json`. Update this file for production deployments:

```json
{
  "single_user_mode": false,
  "server_url": "http://keycloak:8080",
  "public_url": "https://localhost:8443",
  "app_url": "https://localhost",
  "realm": "base-app",
  "client_id": "base-app-client",
  "client_secret": "base-app-secret",
  "admin_role": "base-app-admin"
}
```

| Field | Description |
|-------|-------------|
| `single_user_mode` | `false` = Keycloak SSO enabled, `true` = bypass auth for dev |
| `server_url` | Internal Keycloak URL (Docker network, server-to-server) |
| `public_url` | Public Keycloak URL (browser access) |
| `app_url` | Application URL for OAuth callbacks |
| `realm` | Keycloak realm name |
| `client_id` | OAuth client ID |
| `client_secret` | OAuth client secret (change in production) |
| `admin_role` | Role name that grants admin access |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_SECRET_KEY` | `dev-secret-key...` | Flask session signing key |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |

---

## Building Your App

1. Clone this repository as your new project
2. Update the logo text in `Header.jsx` (change "Base" and "App")
3. Update the realm name in `keycloak/realm-export.json` and `backend/keycloak.json`
4. Replace the `Dashboard.jsx` component with your app content
5. Add nav items to `LeftPanel.jsx` for your app's pages
6. Follow the [Style Guide](documentation/STYLE_GUIDE.md) for consistent UI
7. Follow the [Development Rules](documentation/APP_DEVELOPMENT_RULES.md) for code standards

---

## Project Structure

```
base-app/
├── docker-compose.yml          # Container orchestration
├── start.sh / stop.sh          # Build and run scripts
├── .env.example                # Environment variable template
├── frontend/
│   ├── Dockerfile              # Multi-stage: node build → nginx serve
│   ├── package.json            # React 18 + Vite
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx            # Entry point
│       ├── App.jsx             # Root component (shell layout)
│       ├── App.css             # All CSS variables + component styles
│       ├── contexts/
│       │   └── ThemeContext.jsx # Theme + accent color management
│       ├── components/
│       │   ├── Header.jsx      # Fixed header bar
│       │   ├── LeftPanel.jsx   # Sliding navigation panel
│       │   ├── UserMenu.jsx    # User avatar dropdown
│       │   ├── ThemeToggle.jsx # Light/dark toggle button
│       │   ├── MetricsDropdown.jsx  # System metrics panel
│       │   ├── Settings.jsx    # Settings modal
│       │   ├── Toast.jsx       # Toast notifications
│       │   ├── Dialog.jsx      # Confirmation dialogs
│       │   └── Dashboard.jsx   # Sample dashboard page
│       ├── services/
│       │   └── api.js          # HTTP client
│       ├── utils/
│       │   └── logger.js       # Unified logger (BA: prefix)
│       └── assets/icons/       # Google Material Symbols SVGs
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app.py                  # Flask app (auth, health, config)
│   ├── config.py               # Configuration manager
│   ├── keycloak.json           # Keycloak connection config
│   └── utils/
│       └── logger.py           # Unified logger (BA: prefix)
├── nginx/
│   ├── Dockerfile              # nginx + self-signed cert generation
│   └── nginx.conf              # Reverse proxy configuration
├── keycloak/
│   └── realm-export.json       # Pre-configured realm import
└── documentation/
    ├── STYLE_GUIDE.md          # Complete design specification
    ├── APP_DEVELOPMENT_RULES.md # Coding standards
    └── KEYCLOAK_SSO.md         # Keycloak administration guide
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Style Guide](documentation/STYLE_GUIDE.md) | Complete design specification — colors, typography, components |
| [Development Rules](documentation/APP_DEVELOPMENT_RULES.md) | Coding standards, documentation requirements, quality gates |
| [Keycloak SSO](documentation/KEYCLOAK_SSO.md) | Keycloak setup, user management, troubleshooting |

---

## Important Notes

- **Keycloak realm import** only runs on first boot. To re-import after changes, run `./stop.sh` (which removes volumes) then `./start.sh`.
- **Self-signed certificates** will trigger browser warnings. Accept them on both `https://localhost` and `https://localhost:8443`.
- **Logging:** All code uses the unified logger with `BA:` prefix. Never use raw `console.log` or `print()`.
- **Icons:** Only Google Material Symbols (Outlined) SVGs stored locally. No CDN icon libraries.
