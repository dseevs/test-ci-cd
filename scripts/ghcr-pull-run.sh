#!/usr/bin/env bash
# Pull the lab image from GHCR and run it on http://localhost:8080/acetic/
set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/dseevs/test-ci-cd:latest}"
PORT="${PORT:-8080}"
CONTAINER_NAME="${CONTAINER_NAME:-olabs-acetic-local}"

echo "==> Pulling ${IMAGE}"
if ! docker pull "${IMAGE}"; then
  echo ""
  echo "Pull failed (often: private package or not logged in)."
  echo ""
  echo "Option A — Make the package public:"
  echo "  https://github.com/users/dseevs/packages/container/test-ci-cd/settings"
  echo "  → Change visibility to Public, then run this script again."
  echo ""
  echo "Option B — Log in with a GitHub token (read:packages):"
  echo "  echo YOUR_TOKEN | docker login ghcr.io -u dseevs --password-stdin"
  echo ""
  echo "Option C — Run from source (no registry):"
  echo "  bash scripts/docker-local-test.sh"
  exit 1
fi

docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
docker run -d --name "${CONTAINER_NAME}" -p "${PORT}:80" "${IMAGE}"

echo ""
echo "Lab running. Open: http://localhost:${PORT}/acetic/"
echo "Stop: docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}"
