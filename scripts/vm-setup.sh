#!/usr/bin/env bash
# One-time Linux VM preparation for olabs-acetic Docker deploy.
# Run on the server: bash scripts/vm-setup.sh
set -euo pipefail

echo "==> Installing Docker (Ubuntu/Debian)..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y docker.io
  sudo usermod -aG docker "${USER}"
  echo "Log out and back in so Docker works without sudo."
else
  echo "Install Docker manually for your distro, then re-run deploy."
  exit 1
fi

echo "==> Ensuring deploy user can run containers..."
sudo systemctl enable docker
sudo systemctl start docker

echo ""
echo "Next steps (manual):"
echo "  1. Add your GitHub Actions SSH public key to ~/.ssh/authorized_keys"
echo "  2. If GHCR package is private: store a PAT as GHCR_PULL_TOKEN in GitHub Secrets"
echo "  3. Configure host reverse proxy — see deploy/Caddyfile.example"
echo "  4. After first CI deploy: curl -I http://127.0.0.1:8080/acetic/"
