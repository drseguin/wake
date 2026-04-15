# Keycloak SSO Administration Guide

This guide explains how to set up and manage Keycloak Single Sign-On (SSO) for applications built from the WAKE App template.

## Table of Contents

- [Overview](#overview)
- [Initial Setup](#initial-setup)
- [Accessing Keycloak Admin Console](#accessing-keycloak-admin-console)
- [User Management](#user-management)
  - [Creating Users](#creating-users)
  - [Deleting Users](#deleting-users)
  - [Resetting Passwords](#resetting-passwords)
  - [Enabling/Disabling Users](#enablingdisabling-users)
- [Role Management](#role-management)
  - [Available Roles](#available-roles)
  - [Assigning Admin Role](#assigning-admin-role)
  - [Removing Roles](#removing-roles)
- [Authentication Flow](#authentication-flow)
- [Configuration Reference](#configuration-reference)
- [Customizing for Your App](#customizing-for-your-app)
- [Troubleshooting](#troubleshooting)
- [Command Line Administration](#command-line-administration)

---

## Overview

Applications built from the WAKE App template use Keycloak for Single Sign-On (SSO) authentication. Keycloak provides:

- **Centralized User Management** - Create, manage, and delete users in one place
- **Role-Based Access Control** - Assign roles to control access to admin features
- **SSO Sessions** - Users stay logged in across browser sessions
- **Secure Authentication** - OAuth 2.0 with PKCE, HTTPOnly cookies

### Architecture

```
User Browser
     │
     ▼
┌─────────────────┐     ┌─────────────────┐
│    Your App     │────▶│    Keycloak     │
│   (Frontend)    │◀────│  (Auth Server)  │
└─────────────────┘     └─────────────────┘
     │                         │
     ▼                         ▼
┌─────────────────┐     ┌─────────────────┐
│    Your API     │     │   PostgreSQL    │
│   (Backend)     │     │  (User Store)   │
└─────────────────┘     └─────────────────┘
```

---

## Initial Setup

### Prerequisites

- Docker and Docker Compose installed
- The application started via `./start.sh`

### First-Time Setup Steps

1. **Start the application:**
   ```bash
   ./start.sh
   ```
   This automatically:
   - Starts the Keycloak server with PostgreSQL
   - Imports the pre-configured realm from `keycloak/realm-export.json`
   - Creates the `wake-app` realm with client, roles, and a test user

2. **Accept the self-signed certificate:**
   - Open `https://localhost:8443` in your browser
   - Accept the certificate warning (required for auth flow)
   - Also accept the certificate on `https://localhost`

3. **Access Keycloak Admin Console:**
   - Navigate to `https://localhost:8443/admin`
   - Log in with username: `admin`, password: `admin`
   - Select the **wake-app** realm from the dropdown in the top-left corner

4. **Verify SSO is enabled:**
   - SSO is enabled by default. Check `backend/keycloak.json` has `"single_user_mode": false`
   - If you changed it to `true` for development, set it back to `false` and restart: `./start.sh`

### Pre-Configured Defaults

The realm import automatically creates:

| Item | Value |
|------|-------|
| Realm | `wake-app` |
| Client ID | `wake-app-client` |
| Client Secret | `wake-app-secret` |
| User Role | `wake-app-user` (assigned to all new users by default) |
| Admin Role | `wake-app-admin` |
| Test User | Username: `admin`, Password: `admin` (has admin role) |

### Changing Default Passwords (Production)

**Change these immediately for production deployments:**

1. **Keycloak Admin Password:**
   - Update `KC_BOOTSTRAP_ADMIN_PASSWORD` in `docker-compose.yml`
   - Or change it via Keycloak Admin Console → Users → admin → Credentials

2. **Client Secret:**
   - Keycloak Admin → Clients → `wake-app-client` → Credentials → Regenerate secret
   - Update the new secret in `backend/keycloak.json` (`client_secret` field)

3. **Database Passwords:**
   - Update `POSTGRES_PASSWORD` in `docker-compose.yml` (keycloak-db service)
   - Update `KC_DB_PASSWORD` in `docker-compose.yml` (keycloak service) to match

4. **Test User Password:**
   - Keycloak Admin → Users → admin → Credentials → Reset password
   - Or delete the test user and create new users with secure passwords

---

## Accessing Keycloak Admin Console

### URL

```
https://localhost:8443/admin
```

### Default Credentials

| Username | Password |
|----------|----------|
| admin    | admin    |

### First Login

1. Navigate to `https://localhost:8443/admin`
2. Accept the self-signed certificate warning
3. Enter username: `admin`, password: `admin`
4. Select the **wake-app** realm from the dropdown in the top-left corner

> **Important:** Always ensure you are in the `wake-app` realm (not `master`) when managing application users.

---

## User Management

### Creating Users

1. In Keycloak Admin Console, select **wake-app** realm
2. Navigate to **Users** in the left sidebar
3. Click **Create new user** (or **Add user**)
4. Fill in the required fields:
   - **Username** (required) - Used for login
   - **Email** (optional) - For password recovery
   - **First name** (optional) - Display name
   - **Last name** (optional) - Display name
   - **Email verified** - Toggle ON to skip email verification
5. Click **Create**

#### Setting Initial Password

After creating the user:

1. Go to the **Credentials** tab
2. Click **Set password**
3. Enter the password twice
4. Toggle **Temporary** OFF (so user doesn't have to change it on first login)
5. Click **Save**

### Deleting Users

1. Navigate to **Users**
2. Find the user (use search if needed)
3. Click on the user to open their details
4. Click **Delete** in the top-right (or use the action menu)
5. Confirm deletion

### Resetting Passwords

1. Navigate to **Users** → Select user
2. Go to **Credentials** tab
3. Click **Reset password**
4. Enter new password
5. Toggle **Temporary** based on preference:
   - ON = User must change password on next login
   - OFF = Password is permanent
6. Click **Save**

### Enabling/Disabling Users

1. Navigate to **Users** → Select user
2. In the **Details** tab, find the **Enabled** toggle
3. Toggle OFF to disable (user cannot log in)
4. Toggle ON to re-enable
5. Click **Save**

---

## Role Management

### Available Roles

The WAKE App uses two realm roles:

| Role | Description |
|------|-------------|
| `wake-app-user` | Default role for all users. Grants standard application access. |
| `wake-app-admin` | Administrator role. Grants access to admin features and user management. |

### Admin Capabilities

Users with `wake-app-admin` role can:

- Access the **Administration** panel in Settings
- View and manage all users' data (not just their own)
- Access system administration features
- View system metrics and status

### Assigning Admin Role

#### Via Keycloak UI

1. Navigate to **Users** → Select user
2. Go to **Role mapping** tab
3. Click **Assign role**
4. **Important:** Change filter from "Filter by clients" to **"Filter by realm roles"**
5. Check the box next to **wake-app-admin**
6. Click **Assign**

#### Via Command Line

```bash
# Get admin token
TOKEN=$(curl -s -k -X POST "https://localhost:8443/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# Get user ID (replace USERNAME with actual username)
USER_ID=$(curl -s -k "https://localhost:8443/admin/realms/wake-app/users?username=USERNAME" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])")

# Get role ID
ROLE=$(curl -s -k "https://localhost:8443/admin/realms/wake-app/roles/wake-app-admin" \
  -H "Authorization: Bearer $TOKEN")

# Assign role to user
curl -s -k -X POST "https://localhost:8443/admin/realms/wake-app/users/$USER_ID/role-mappings/realm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "[$ROLE]"

echo "Admin role assigned successfully"
```

### Removing Roles

1. Navigate to **Users** → Select user
2. Go to **Role mapping** tab
3. Find the role under "Assigned roles"
4. Click the **X** or **Unassign** button next to the role

---

## Authentication Flow

### Login Flow

```
1. User clicks "Sign in with SSO"
                │
                ▼
2. Frontend requests login URL from backend
   GET /api/v1/auth/login
                │
                ▼
3. Backend generates Keycloak auth URL with PKCE
   Returns URL to frontend
                │
                ▼
4. Browser redirects to Keycloak login page
   https://localhost:8443/realms/wake-app/protocol/openid-connect/auth
                │
                ▼
5. User enters credentials in Keycloak
                │
                ▼
6. Keycloak validates and redirects to callback
   https://localhost/api/v1/auth/callback?code=...&state=...
                │
                ▼
7. Backend exchanges code for tokens
   Validates state and PKCE
   Creates session in Redis
   Sets auth_token cookie
                │
                ▼
8. Browser redirected to app homepage
   User is now authenticated
```

### Logout Flow

```
1. User clicks "Logout"
                │
                ▼
2. Frontend calls backend logout
   POST /api/v1/auth/logout
                │
                ▼
3. Backend invalidates session in Redis
   Returns Keycloak logout URL
                │
                ▼
4. Browser redirects to Keycloak logout
   https://localhost:8443/realms/wake-app/protocol/openid-connect/logout
                │
                ▼
5. Keycloak ends SSO session
   Redirects back to app
                │
                ▼
6. User sees login screen
```

### Session Management

- **Session Storage:** Redis (key: `session:{uuid}`)
- **Cookie:** `auth_token` (HTTPOnly, Secure, SameSite=None)
- **Session Duration:** 8 hours
- **Token Refresh:** Not implemented (re-login required if session expires)

---

## Configuration Reference

### Backend Configuration

All Keycloak and authentication settings are centralized in `backend/keycloak.json`:

```json
{
  "single_user_mode": false,
  "server_url": "http://keycloak:8080",
  "public_url": "https://localhost:8443",
  "app_url": "https://localhost",
  "realm": "wake-app",
  "client_id": "wake-app-client",
  "client_secret": "wake-app-secret",
  "admin_role": "wake-app-admin"
}
```

| Setting | Description |
|---------|-------------|
| `single_user_mode` | `false` = Keycloak SSO enabled, `true` = bypass auth (dev mode) |
| `server_url` | Internal Keycloak URL (Docker network, used for server-to-server calls) |
| `public_url` | Public Keycloak URL (browser access, used in authorization URLs) |
| `app_url` | Application URL for OAuth callbacks |
| `realm` | Keycloak realm name |
| `client_id` | OAuth client ID |
| `client_secret` | OAuth client secret (change in production) |
| `admin_role` | Role name that grants admin access |

### Docker Compose

Keycloak environment variables in `docker-compose.yml`:

```yaml
keycloak:
  environment:
    - KC_BOOTSTRAP_ADMIN_USERNAME=admin
    - KC_BOOTSTRAP_ADMIN_PASSWORD=admin
    - KC_DB=postgres
    - KC_DB_URL=jdbc:postgresql://keycloak-db:5432/keycloak
    - KC_DB_USERNAME=keycloak
    - KC_DB_PASSWORD=keycloak
    - KC_HOSTNAME=https://localhost:8443
    - KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true
    - KC_HTTP_ENABLED=true
    - KC_PROXY_HEADERS=xforwarded
```

---

## Customizing for Your App

When building a new app from the WAKE App template, update these Keycloak-related files:

### 1. Realm Export (`keycloak/realm-export.json`)

- Change `"realm": "wake-app"` to your app name (e.g., `"my-app"`)
- Change `"clientId": "wake-app-client"` to match (e.g., `"my-app-client"`)
- Change `"secret"` to a new secure value
- Update role names (`wake-app-user` → `my-app-user`, `wake-app-admin` → `my-app-admin`)
- Update redirect URIs if your app URL changes
- Change or remove the test user

### 2. Backend Config (`backend/keycloak.json`)

- Update `realm`, `client_id`, `client_secret`, and `admin_role` to match the realm export
- Update `public_url` and `app_url` for your deployment

### 3. Frontend Role Check

- In `UserMenu.jsx`, update `'wake-app-admin'` to your admin role name
- Search the codebase for `wake-app-admin` and update all references

### 4. Run `./stop.sh` then `./start.sh`

The realm is only imported on first boot. You must wipe volumes to re-import.

---

## Troubleshooting

### "Invalid redirect URI" Error

**Cause:** The redirect URI doesn't match Keycloak's allowed URIs.

**Solution:**
1. Go to Keycloak Admin → **Clients** → **wake-app-client**
2. Check **Valid redirect URIs** includes:
   - `https://localhost/api/v1/auth/callback`
   - `https://localhost/*`
3. Check **Valid post logout redirect URIs** includes:
   - `https://localhost/*`
4. Check **Web origins** includes:
   - `https://localhost`

### Login Loop (Redirects Back to Login)

**Cause:** Cookie not being set or session invalid.

**Solutions:**
1. Clear browser cookies for `localhost`
2. Check that you're accessing via `https://localhost` (not `http://` or `localhost:3000`)
3. Restart the backend: `docker compose restart backend`
4. Check Redis is running: `docker compose ps redis`

### "Authentication required" (401 Errors)

**Cause:** Session expired or cookie not sent.

**Solutions:**
1. Log out and log back in
2. Check browser console for cookie issues
3. Ensure accessing via nginx (`https://localhost`), not directly to backend

### Certificate Not Accepted

**Cause:** Self-signed certificate not trusted by browser.

**Solutions:**
1. Navigate to `https://localhost` and accept the certificate
2. Navigate to `https://localhost:8443` and accept the certificate
3. Both certificates must be accepted for the auth flow to work

### Keycloak Not Starting

**Check logs:**
```bash
docker logs wake-app-keycloak
```

**Common issues:**
- Database connection failed → Check `keycloak-db` is healthy: `docker compose ps`
- Port conflict → Ensure port 8443 is available
- Invalid realm config → Check `keycloak/realm-export.json` syntax

### User Can't See Admin Features

**Cause:** User doesn't have `wake-app-admin` role.

**Solution:**
1. Assign `wake-app-admin` role (see [Assigning Admin Role](#assigning-admin-role))
2. User must **log out and log back in** for role changes to take effect

### Realm Not Imported

**Cause:** Keycloak only imports the realm on first boot with an empty database.

**Solution:**
```bash
./stop.sh    # Removes volumes (wipes Keycloak DB)
./start.sh   # Rebuilds and re-imports realm
```

---

## Command Line Administration

### List All Users

```bash
TOKEN=$(curl -s -k -X POST "https://localhost:8443/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

curl -s -k "https://localhost:8443/admin/realms/wake-app/users" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Create User via CLI

```bash
curl -s -k -X POST "https://localhost:8443/admin/realms/wake-app/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "firstName": "New",
    "lastName": "User",
    "enabled": true,
    "credentials": [{
      "type": "password",
      "value": "password123",
      "temporary": false
    }]
  }'
```

### Check Keycloak Health

```bash
curl -s -k "https://localhost:8443/health" | python3 -m json.tool
```

---

## Security Recommendations

### For Production

1. **Change all default passwords** — Keycloak admin, database, client secret, test user
2. **Use proper SSL certificates** — Replace self-signed certs with real certificates
3. **Restrict network access** — Keycloak admin console should not be publicly accessible
4. **Enable audit logging** in Keycloak for compliance
5. **Set password policies** — Realm Settings → Authentication → Policies
6. **Configure session timeouts** — Realm Settings → Sessions
7. **Rotate the client secret** periodically and update `backend/keycloak.json`

---

## Quick Reference

| Task | Location |
|------|----------|
| Access Keycloak Admin | https://localhost:8443/admin |
| Create User | Users → Create new user |
| Set Password | Users → [user] → Credentials → Set password |
| Assign Admin Role | Users → [user] → Role mapping → Assign role → wake-app-admin |
| View Sessions | Sessions (left menu) |
| View Login Events | Events → Login events |
| Client Settings | Clients → wake-app-client |
| Realm Settings | Realm Settings |
| App Keycloak Config | `backend/keycloak.json` |
| Realm Import File | `keycloak/realm-export.json` |

---

## Related Documentation

- [README.md](../README.md) - Project overview and quick start
- [CLAUDE.md](../CLAUDE.md) - Project context for AI-assisted development
- [STYLE_GUIDE.md](./STYLE_GUIDE.md) - Complete design specification
- [APP_DEVELOPMENT_RULES.md](./APP_DEVELOPMENT_RULES.md) - Coding standards
