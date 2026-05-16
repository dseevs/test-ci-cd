#!/usr/bin/env bash
# Run this ON your Linux server (manual deploy, Path B).
# Usage:
#   export IMAGE=ghcr.io/dseevs/test-ci-cd:latest
#   export GHCR_TOKEN=ghp_xxx   # only if package is private
#   bash vm-manual-deploy.sh
#
# Optional:
#   BIND=127.0.0.1:8080:80   # use with Caddy reverse proxy
#   BIND=80:80               # direct HTTP on port 80 (default)

set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/dseevs/test-ci-cd:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-olabs-acetic}"
BIND="${BIND:-80:80}"
REGISTRY="${REGISTRY:-ghcr.io}"
GITHUB_USER="${GITHUB_USER:-dseevs}"

if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "==> Logging in to ${REGISTRY}"
  echo "$GHCR_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_USER" --password-stdin
fi

echo "==> Pulling ${IMAGE}"
docker pull "${IMAGE}"

echo "==> Restarting container ${CONTAINER_NAME}"
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "$BIND" \
  "$IMAGE"

echo ""
echo "==> Health check"
sleep 2
PORT="${BIND%%:*}"
PORT="${PORT##*:}"
if [ "$PORT" = "80" ]; then
  curl -sI "http://127.0.0.1/acetic/" | head -3 || true
  echo ""
  echo "Open: http://YOUR_SERVER_IP/acetic/"
else
  HOST_PORT="${BIND#*:}"
  HOST_PORT="${HOST_PORT%%:*}"
  curl -sI "http://127.0.0.1:${HOST_PORT}/acetic/" | head -3 || true
  echo ""
  echo "Open: http://127.0.0.1:${HOST_PORT}/acetic/ (or via Caddy HTTPS)"
fi
