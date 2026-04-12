# Using the Baseline App for a New Application

This guide walks through using **Base App** as the starting point for a new application (e.g. *ACME App*). The goal: a working, renamed copy wired to its own GitHub repository in under 15 minutes, with every change you make landing in the new repo — never back into `base-app`.

The examples below assume you are creating an app called **ACME App** with the slug **acme-app**. Substitute your own values everywhere you see those names.

---

## 1. Prerequisites

- Docker Desktop running
- `git` and `gh` (GitHub CLI) installed and authenticated — `gh auth login` if you have not already
- Read access to `https://github.com/drseguin/base-app`
- Permission to create a new repo under your GitHub account or org

---

## 2. Pick your names

Choose two forms of the application name and stick to them:

| Form | Example | Used in |
|------|---------|---------|
| **Display name** | `ACME App` | UI, logs, Keycloak display, page titles |
| **Slug** (lowercase, hyphenated) | `acme-app` | Docker container names, network, Keycloak realm/client/roles, theme folder, package.json `name` |

Rules for the slug: lowercase letters, digits, and hyphens only. No spaces, no underscores, no capitals.

---

## 3. Create the new GitHub repo (empty)

Do this first so there is a destination to push to.

```bash
# Create an empty private repo on GitHub (change owner if needed).
gh repo create drseguin/acme-app --private --description "ACME App"
```

If you prefer the web UI, create the repo at https://github.com/new with no README, no .gitignore, and no license — it must be empty.

---

## 4. Clone the baseline into a new folder

```bash
cd ~/git
git clone https://github.com/drseguin/base-app.git acme-app
cd acme-app
```

You now have a local copy of the baseline sitting in `~/git/acme-app`. Its `origin` still points at `base-app` — we fix that next.

---

## 5. Re-point `origin` at the new repo

```bash
# Remove the baseline remote.
git remote remove origin

# Add the new repo as origin.
git remote add origin https://github.com/drseguin/acme-app.git

# (Optional) Keep a read-only reference to the baseline so you can pull future
# improvements from it without accidentally pushing to it.
git remote add baseline https://github.com/drseguin/base-app.git
git remote set-url --push baseline DISABLED

# Verify.
git remote -v
```

You should see `origin` pointing at `acme-app` (fetch and push) and `baseline` pointing at `base-app` (fetch only, push disabled).

---

## 6. Rename every reference from "Base App" → "ACME App"

The baseline hard-codes its name in several places: Docker container names, the Keycloak realm and client IDs, role names, the Keycloak login theme folder, the backend config, the frontend metadata, and the docs.

Run the helper script to do it all in one shot:

```bash
./scripts/rename-app.sh "ACME App" "acme-app"
```

The script is idempotent and only touches tracked baseline files. On each run it also generates fresh random values for `FLASK_SECRET_KEY` and the Keycloak `client_secret` via `openssl rand -hex 32`, writes them into `.env` / `backend/keycloak.json` / `keycloak/realm-export.json`, and prints them **once** at the end. Copy those two values somewhere safe — they are not displayed again.

When it finishes, check what changed:

```bash
git status
git diff
```

### What the script changes

| File | What gets renamed |
|------|-------------------|
| `.env`, `.env.example` | `APP_NAME` |
| `start.sh`, `stop.sh` | `APP_NAME` default |
| `docker-compose.yml` | container names, network name, `APP_NAME` env default |
| `backend/config.py` | `APP_NAME` default and docstring |
| `backend/app.py` | docstring, hard-coded role names |
| `backend/keycloak.json` | `realm`, `client_id`, `client_secret` (rotated to random), `admin_role` |
| `.env`, `.env.example` | `APP_NAME`, `FLASK_SECRET_KEY` (rotated to random) |
| `keycloak/realm-export.json` | realm id, display names, login theme, client, roles, default role |
| `keycloak/themes/base-app/` | folder renamed to `keycloak/themes/acme-app/`, theme strings updated |
| `frontend/package.json` | `name` |
| `frontend/index.html` | `<title>`, meta description, Open Graph tags |
| `frontend/src/**/*.{jsx,js,css}` | JSDoc headers, hardcoded strings |
| `frontend/public/*.svg` | SVG text inside favicon / og-image / apple-touch-icon |
| `README.md`, `CLAUDE.md`, `documentation/*.md` | prose references |

### Things the script does not touch (do these manually)

- **Logger prefix** `DSC:` in `frontend/src/utils/logger.js` and `backend/utils/logger.py` — the author's signature across every app. If you want a different prefix, change it by hand.
- **Branding assets.** `frontend/public/favicon.svg`, `apple-touch-icon.svg`, and `og-image.svg` are neutral placeholders with the generic "App"-shaped wordmark. Replace with your app's real logo when you have it. If you swap PNGs in for the SVGs, update the `<link>` / `<meta>` tags in `frontend/index.html` to match. The Keycloak login theme under `keycloak/themes/<slug>/login/resources/` also has branding worth replacing.

---

## 7. First commit on the new repo

```bash
git add -A
git commit -m "Rename baseline to ACME App"
```

---

## 8. Push to the new GitHub repo

```bash
# Rename local branch to main if it is called master.
git branch -M main

# First push sets upstream.
git push -u origin main
```

Open https://github.com/drseguin/acme-app in a browser and confirm the code is there. From this point on, `git push` goes to `acme-app`, **never** to `base-app`.

---

## 9. Start the app

Keycloak's realm import runs only on the first boot with an empty database, so the renamed realm will be created fresh:

```bash
./stop.sh   # wipes any leftover keycloak volume from a prior run
./start.sh
```

Then verify:

- App: https://localhost — accept the self-signed cert
- Keycloak Admin: https://localhost:8443/admin (accept its cert too) — sign in as `admin` / `admin` and confirm the realm dropdown shows `acme-app`

If login redirects fail, you most likely forgot to accept the Keycloak cert in the browser. Visit `https://localhost:8443` directly once, accept, then retry.

---

## 10. Pulling future improvements from the baseline

When `base-app` gets a useful change you want in `acme-app`, fetch it through the `baseline` remote you added in step 5:

```bash
git fetch baseline
git log --oneline HEAD..baseline/main        # preview what's new
git cherry-pick <commit-sha>                  # pick individual commits
# or for a full merge (expect conflicts on renamed tokens):
git merge baseline/main --allow-unrelated-histories
```

Cherry-picking is usually cleaner than a full merge because the rename in step 6 touched many of the same files the baseline keeps touching.

---

## Quick reference — full sequence

```bash
# 1. Create empty GitHub repo
gh repo create drseguin/acme-app --private --description "ACME App"

# 2. Clone baseline into new folder
cd ~/git
git clone https://github.com/drseguin/base-app.git acme-app
cd acme-app

# 3. Re-point origin
git remote remove origin
git remote add origin https://github.com/drseguin/acme-app.git
git remote add baseline https://github.com/drseguin/base-app.git
git remote set-url --push baseline DISABLED

# 4. Rename tokens
./scripts/rename-app.sh "ACME App" "acme-app"

# 5. Review, commit, push
git status
git diff
git add -A
git commit -m "Rename baseline to ACME App"
git branch -M main
git push -u origin main

# 6. Boot the renamed app
./stop.sh
./start.sh
```

---

## Troubleshooting

**Keycloak still shows the old realm after renaming.** The realm JSON only imports into an empty database. Run `./stop.sh` (which wipes the `keycloak-db` volume) and then `./start.sh`.

**`git push` says `permission denied` on `base-app`.** You skipped step 5 — `origin` is still pointing at the baseline. Re-run the remote commands.

**Container name conflict on startup.** A previous baseline container with the same name is still around. `docker ps -a` to find it, `docker rm -f <name>`, then `./start.sh`.

**`./scripts/rename-app.sh` already ran and I need to undo it.** If you haven't committed yet: `git restore -- . && git clean -fd keycloak/themes/`. If you have committed: `git reset --hard HEAD~1` (only safe before the first push).
