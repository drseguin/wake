# Keycloak SSO Administration Guide

This guide explains how to manage users and authentication for the Translate application using Keycloak Single Sign-On (SSO).

## Table of Contents

- [Overview](#overview)
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
- [Troubleshooting](#troubleshooting)
- [Command Line Administration](#command-line-administration)

---

## Overview

The Translate application uses Keycloak for Single Sign-On (SSO) authentication. Keycloak provides:

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
│  Translate App  │────▶│    Keycloak     │
│  (Frontend)     │◀────│  (Auth Server)  │
└─────────────────┘     └─────────────────┘
     │                         │
     ▼                         ▼
┌─────────────────┐     ┌─────────────────┐
│  Translate API  │     │   PostgreSQL    │
│  (Backend)      │     │  (User Store)   │
└─────────────────┘     └─────────────────┘
```

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
4. Select the **translate** realm from the dropdown in the top-left corner

> **Important:** Always ensure you are in the `translate` realm (not `master`) when managing application users.

---

## User Management

### Creating Users

1. In Keycloak Admin Console, select **translate** realm
2. Navigate to **Users** in the left sidebar
3. Click **Create new user** (or **Add user**)
4. Fill in the required fields:
   - **Username** (required) - Used for login and job isolation
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

> **Warning:** Deleting a user does not delete their translation jobs. Jobs are retained based on the cleanup policy.

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

The Translate application uses two realm roles:

| Role | Description |
|------|-------------|
| `translate-user` | Default role for all users. Allows translation and job submission. |
| `translate-admin` | Administrator role. Grants access to admin settings, user job management, and system controls. |

### Admin Capabilities

Users with `translate-admin` role can:

- Access the **Administration** panel in Settings
- View and manage ALL users' jobs (not just their own)
- Force restart worker pool
- Flush Redis cache
- Delete jobs in bulk by status
- View system metrics and worker status

### Assigning Admin Role

#### Via Keycloak UI

1. Navigate to **Users** → Select user
2. Go to **Role mapping** tab
3. Click **Assign role**
4. **Important:** Change filter from "Filter by clients" to **"Filter by realm roles"**
5. Check the box next to **translate-admin**
6. Click **Assign**

#### Via Command Line

```bash
# Get admin token
TOKEN=$(curl -s -k -X POST "https://localhost:8443/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# Get user ID (replace USERNAME with actual username)
USER_ID=$(curl -s -k "https://localhost:8443/admin/realms/translate/users?username=USERNAME" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])")

# Get role ID
ROLE=$(curl -s -k "https://localhost:8443/admin/realms/translate/roles/translate-admin" \
  -H "Authorization: Bearer $TOKEN")

# Assign role to user
curl -s -k -X POST "https://localhost:8443/admin/realms/translate/users/$USER_ID/role-mappings/realm" \
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
   https://localhost:8443/realms/translate/protocol/openid-connect/auth
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
   https://localhost:8443/realms/translate/protocol/openid-connect/logout
                │
                ▼
5. Keycloak ends SSO session
   Redirects back to app
                │
                ▼
6. User sees login screen
```

### Session Management

- **Session Storage:** Redis (key: `auth_token:{uuid}`)
- **Cookie:** `auth_token` (HTTPOnly, Secure, SameSite=None)
- **Session Duration:** Until browser closes or explicit logout
- **Token Refresh:** Not implemented (re-login required if Keycloak token expires)

---

## Configuration Reference

### Backend Configuration

In `backend/config.json`:

```json
{
  "keycloak": {
    "server_url": "http://keycloak:8080",
    "public_url": "https://localhost:8443",
    "app_url": "https://localhost",
    "realm": "translate",
    "client_id": "translate-app",
    "client_secret": "translate-app-secret",
    "admin_role": "translate-admin"
  }
}
```

| Setting | Description |
|---------|-------------|
| `server_url` | Internal Keycloak URL (Docker network) |
| `public_url` | Public Keycloak URL (browser access) |
| `app_url` | Application URL for OAuth callbacks |
| `realm` | Keycloak realm name |
| `client_id` | OAuth client ID |
| `client_secret` | OAuth client secret |
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

## Troubleshooting

### "Invalid redirect URI" Error

**Cause:** The redirect URI doesn't match Keycloak's allowed URIs.

**Solution:**
1. Go to Keycloak Admin → **Clients** → **translate-app**
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

### Keycloak Not Starting

**Check logs:**
```bash
docker logs translate-keycloak
```

**Common issues:**
- Database connection failed → Check `keycloak-db` is healthy
- Port conflict → Ensure port 8443 is available
- Invalid realm config → Check `keycloak/realm-export.json` syntax

### User Can't See Admin Features

**Cause:** User doesn't have `translate-admin` role.

**Solution:**
1. Assign `translate-admin` role (see [Assigning Admin Role](#assigning-admin-role))
2. User must **log out and log back in** for role changes to take effect

---

## Command Line Administration

### List All Users

```bash
TOKEN=$(curl -s -k -X POST "https://localhost:8443/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

curl -s -k "https://localhost:8443/admin/realms/translate/users" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### List All Roles

```bash
curl -s -k "https://localhost:8443/admin/realms/translate/roles" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Get User's Roles

```bash
# Replace USER_ID with actual user ID
curl -s -k "https://localhost:8443/admin/realms/translate/users/USER_ID/role-mappings/realm" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Create User via CLI

```bash
curl -s -k -X POST "https://localhost:8443/admin/realms/translate/users" \
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

1. **Change default passwords:**
   - Keycloak admin password
   - Database passwords
   - Client secrets

2. **Use proper SSL certificates** (not self-signed)

3. **Restrict network access:**
   - Keycloak admin console should not be publicly accessible
   - Use firewall rules to limit access

4. **Enable audit logging** in Keycloak for compliance

5. **Set password policies:**
   - Go to **Realm Settings** → **Authentication** → **Policies**
   - Configure minimum length, complexity, etc.

6. **Configure session timeouts:**
   - Go to **Realm Settings** → **Sessions**
   - Set appropriate SSO Session Idle and Max times

---

## Quick Reference

| Task | Location |
|------|----------|
| Access Keycloak Admin | https://localhost:8443/admin |
| Create User | Users → Create new user |
| Set Password | Users → [user] → Credentials → Set password |
| Assign Admin Role | Users → [user] → Role mapping → Assign role → translate-admin |
| View Sessions | Sessions (left menu) |
| View Login Events | Events → Login events |
| Client Settings | Clients → translate-app |
| Realm Settings | Realm Settings |

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Main project documentation
- [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) - Development guidelines
- [MULTI_DOCUMENT_ARCHITECTURE.md](./MULTI_DOCUMENT_ARCHITECTURE.md) - Job queue system
