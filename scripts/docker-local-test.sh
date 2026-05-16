#!/usr/bin/env bash
# Build and run the lab locally (no GHCR) — use when pull is denied.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-8080}"
IMAGE="${IMAGE:-olabs-simulation:local}"
CONTAINER_NAME="${CONTAINER_NAME:-olabs-acetic-local}"

echo "==> Building ${IMAGE} (this matches what CI builds)..."
docker build -t "${IMAGE}" .

docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
docker run -d --name "${CONTAINER_NAME}" -p "${PORT}:80" "${IMAGE}"

echo ""
echo "Lab running. Open: http://localhost:${PORT}/acetic/"
echo "Stop: docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}"
