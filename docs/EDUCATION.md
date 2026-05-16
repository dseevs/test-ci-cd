# CI/CD learning checkpoints

Use this after each milestone. If you can answer these, you understand the pipeline.

## After git push

- **What is tracked?** Source (`src/`), config, `package-lock.json`, `next-english-node-1.0.5.tgz`, workflows.
- **What is ignored?** `node_modules/`, `build/`, `.next/`, `*.zip` backups.

## After CI is green

- **What did the robot run?** `npm ci` → `npm run lint` → `NODE_ENV=production npm run build`.
- **Where to look?** GitHub → Actions → latest `CI` workflow run.

## After Docker local test

- **What is in the image?** nginx + static files from `build/` (no Node at runtime).
- **Why `/acetic/`?** Production `basePath` in `next.config.mjs`.
- **Test URL:** http://localhost:8080/acetic/

## After GHCR push

- **Where is the image?** `ghcr.io/dseevs/test-ci-cd:latest` and `ghcr.io/dseevs/test-ci-cd:sha-<commit>`.
- **Rollback?** Pull a `sha-*` tag instead of `latest` on the VM.
- **`docker pull` denied?** The package is private or you are not logged in. Make it public or run `docker login ghcr.io` (see `docs/DEPLOY.md`).

## After SSH deploy

- **What ran on the VM?** `docker pull` → stop/remove `olabs-acetic` → `docker run` on `127.0.0.1:8080:80`.
- **Why localhost only?** Host Caddy/nginx handles HTTPS; container stays internal.

## Browser / iframe

- **Why not open `/` only?** Lab assets live under `/acetic/` in production.
- **Why rebuild for parent origins?** `NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS` is compiled into JS at build time.
