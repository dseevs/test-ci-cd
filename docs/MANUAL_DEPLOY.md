# Manual deploy (Path B) — run on your Linux server

No GitHub SSH deploy. You SSH to the server and run Docker yourself.

**No server yet?** Use AWS CloudFormation: [`deploy/aws/README.md`](../deploy/aws/README.md) — creates EC2 + Elastic IP + Docker automatically.

**Image:** `ghcr.io/dseevs/test-ci-cd:latest`  
**Lab URL on server:** `http://SERVER_IP/acetic/` (or HTTPS after Caddy step)

---

## Before you start

1. **Actions built the image** — https://github.com/dseevs/test-ci-cd/actions (Docker workflow green)
2. **GHCR access** — either:
   - Package **public**: https://github.com/users/dseevs/packages/container/test-ci-cd/settings  
   - Or a GitHub token with `read:packages` for `docker login`

---

## Step 1 — Install Docker on the server (once)

SSH in:

```bash
ssh YOUR_USER@YOUR_SERVER_IP
```

Then:

```bash
sudo apt update
sudo apt install -y docker.io
sudo usermod -aG docker "$USER"
```

Log out and SSH back in. Test:

```bash
docker ps
```

---

## Step 2 — Log in to GHCR (only if package is private)

On the server:

```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u dseevs --password-stdin
```

Skip this step if the package is **public**.

---

## Step 3 — Pull and run the lab

**Option A — use the deploy script** (copy repo to server or paste script):

```bash
export IMAGE=ghcr.io/dseevs/test-ci-cd:latest
bash vm-manual-deploy.sh
```

**Option B — run commands yourself:**

```bash
docker pull ghcr.io/dseevs/test-ci-cd:latest

docker stop olabs-acetic 2>/dev/null || true
docker rm olabs-acetic 2>/dev/null || true

docker run -d \
  --name olabs-acetic \
  --restart unless-stopped \
  -p 80:80 \
  ghcr.io/dseevs/test-ci-cd:latest
```

Check:

```bash
curl -I http://127.0.0.1/acetic/
```

Open in browser: **http://YOUR_SERVER_IP/acetic/**

(Firewall: allow TCP **80** — `sudo ufw allow 80` if using UFW.)

---

## Step 4 — HTTPS with a domain (recommended)

Bind container to localhost only and put Caddy in front:

```bash
docker stop olabs-acetic && docker rm olabs-acetic

docker run -d \
  --name olabs-acetic \
  --restart unless-stopped \
  -p 127.0.0.1:8080:80 \
  ghcr.io/dseevs/test-ci-cd:latest
```

Install Caddy, edit `/etc/caddy/Caddyfile` (see `deploy/Caddyfile.example`):

```
labs.yourdomain.com {
  handle_path /acetic/* {
    reverse_proxy 127.0.0.1:8080
  }
}
```

```bash
sudo systemctl reload caddy
```

Public URL: **https://labs.yourdomain.com/acetic/**

---

## Step 5 — Update after you change code

On your laptop:

```bash
git push origin main
```

Wait for GitHub Actions → Docker job **green**.

On the server (same pull/run as Step 3):

```bash
docker pull ghcr.io/dseevs/test-ci-cd:latest
docker stop olabs-acetic && docker rm olabs-acetic
# then docker run ... (or run vm-manual-deploy.sh again)
```

---

## Rollback to an older version

From Actions log, find a tag like `sha-abc1234`:

```bash
docker pull ghcr.io/dseevs/test-ci-cd:sha-abc1234
docker stop olabs-acetic && docker rm olabs-acetic
docker run -d --name olabs-acetic --restart unless-stopped -p 80:80 \
  ghcr.io/dseevs/test-ci-cd:sha-abc1234
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `denied` on pull | Public package or `docker login ghcr.io` |
| White page | Use `/acetic/` in URL |
| Can't reach from browser | Open port 80/443 on firewall + cloud security group |
| iframe blocked | Rebuild image with `NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS` in GitHub Variables, push, pull again |


this is chnage
