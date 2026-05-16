# Deployment guide — olabs simulation (acetic lab)

This document covers GitHub Actions CI/CD, GHCR, and VM deployment. Read it once before your first push to `main`.

## What runs automatically

| Workflow | When | What it does |
|----------|------|----------------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Every PR and push to `main` | `npm ci`, `npm run lint`, production `npm run build` |
| [`.github/workflows/docker-publish.yml`](../.github/workflows/docker-publish.yml) | Push to `main` or manual dispatch | Build Docker image, push to GHCR, SSH deploy to VM |

## Before first push

### 1. Connect this folder to your GitHub repo

```bash
cd /home/user1/NextJS_Olabs/Simulation_changed/Newlayout
git init
git branch -M main
git remote add origin https://github.com/dseevs/test-ci-cd.git
```

This project’s remote: **https://github.com/dseevs/test-ci-cd**

### 2. GitHub Actions variables

**Settings → Secrets and variables → Actions → Variables**

| Name | Example | Notes |
|------|---------|-------|
| `NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS` | `https://portal.example.com` | Comma-separated, no spaces after commas |
| `NEXT_PUBLIC_LAB_EMBED_ONLY` | `true` | Leave empty to allow standalone tab |
| `NEXT_PUBLIC_EMBEDDED_SESSION_GUARD` | (empty) | Use `false` only for dev builds |

These are baked into the JS at **Docker build time**. Changing them requires re-running the deploy workflow.

### 3. GitHub Actions secrets

**Settings → Secrets and variables → Actions → Secrets**

| Secret | Required | Purpose |
|--------|----------|---------|
| `SSH_HOST` | Yes (for deploy) | VM IP or hostname |
| `SSH_USER` | Yes | e.g. `ubuntu` or `deploy` |
| `SSH_PRIVATE_KEY` | Yes | Full PEM private key |
| `SSH_PORT` | No | Default `22` |
| `GHCR_PULL_TOKEN` | If package is private | PAT with `read:packages` for VM `docker pull` |

`GITHUB_TOKEN` is provided automatically for pushing images to GHCR.

### 4. GHCR package visibility

After the first successful workflow:

1. GitHub → **Packages** → your package
2. **Package settings** → set **Public** (simplest) or **Private** (then set `GHCR_PULL_TOKEN` on VM pull)

## One-time VM setup

Run on your Linux server (or use [`scripts/vm-setup.sh`](../scripts/vm-setup.sh)):

```bash
sudo apt update
sudo apt install -y docker.io
sudo usermod -aG docker "$USER"
# log out and back in

# Add deploy SSH public key to ~/.ssh/authorized_keys
```

### Reverse proxy (HTTPS)

The container listens on **127.0.0.1:8080** only. Put Caddy or nginx on the host for TLS.

Example Caddyfile: see [`deploy/Caddyfile.example`](../deploy/Caddyfile.example).

### Verify container on VM

```bash
curl -I http://127.0.0.1:8080/acetic/
# Expect 200 or 302, not 404
```

## Local smoke test (before pushing)

```bash
docker build -t olabs-simulation:test .
docker run --rm -d -p 8080:80 --name olabs-test olabs-simulation:test
curl -I http://127.0.0.1:8080/acetic/
docker stop olabs-test
```

Open http://localhost:8080/acetic/ in a browser — JS/CSS should load (not a white page).

## Push to production

```bash
git add .
git commit -m "Add CI/CD workflows and production Docker/nginx config"
git push -u origin main
```

Watch **Actions** on GitHub. Both workflows should go green.

Image location: `ghcr.io/dseevs/test-ci-cd:latest`

## Rollback

On the VM, use a SHA tag from the Actions run instead of `latest`:

```bash
docker pull ghcr.io/YOUR_USER/YOUR_REPO:sha-abc1234
docker stop olabs-acetic && docker rm olabs-acetic
docker run -d --name olabs-acetic --restart unless-stopped \
  -p 127.0.0.1:8080:80 \
  ghcr.io/YOUR_USER/YOUR_REPO:sha-abc1234
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm ci` missing tgz | Ensure `next-english-node-1.0.5.tgz` is committed |
| White page, 404 on `.js` | Rebuild image with current `nginx.conf` (`/acetic/` alias) |
| SSH deploy fails | Check `SSH_*` secrets and `authorized_keys` on VM |
| `docker pull` 401 on VM | Set `GHCR_PULL_TOKEN` secret or make package public |
| iframe postMessage blocked | Fix `NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS`, re-run workflow |

## Education checkpoints

After each milestone, you should understand:

1. **Git push** — What is tracked (source, lockfile, tgz) vs ignored (`node_modules`, `*.zip`, `build/`)
2. **CI green** — Robot ran `npm ci`, `lint`, `build` on Node 20
3. **Docker local** — Image = nginx + static `build/` folder; no Node at runtime
4. **GHCR** — `latest` moves; `sha-*` tags are for rollback
5. **SSH deploy** — `docker pull`, stop/remove old container, `docker run` on port 8080
6. **Browser** — Lab URL must include `/acetic/` (production `basePath`)
7. **Env vars** — `NEXT_PUBLIC_*` changes need a **rebuild**, not just container restart
