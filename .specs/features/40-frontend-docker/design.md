# Frontend Docker Image — Design

## Architecture

```
                    ┌─────────────────────────────────────┐
  browser  ───────► │  coach-planner-web  (one origin)    │
  :5174             │                                     │
                    │  nginx :8080  (UID 101, non-root)   │
                    │    /            → /usr/share/nginx/ │
                    │                   html (built SPA)  │
                    │    /api/        → proxy_pass ──────────┐
                    └─────────────────────────────────────┘  │
                                                             ▼
                                          ${API_UPSTREAM}, default
                                          host.docker.internal:8080
                                          (coach-planner-api)
```

The browser only ever talks to `:5174`. Because `/api/` is same-origin,
no preflight is issued and the backend's `localhost:5173` allowlist is
never consulted — which is what lets this feature ship without touching
`coach-planner-api`.

**Why no `src/` change is needed.** `apiClient.js:22` reads
`import.meta.env.VITE_API_BASE_URL` and every call does
`fetch(\`${BASE_URL}${path}\`)`. Building with `VITE_API_BASE_URL=/api/v1`
makes that `fetch("/api/v1/teams")`, a relative URL the browser resolves
against the page origin. The dev server is unaffected: it keeps using
`.env`/the absolute default and its existing CORS relationship.

## Files added

```
Dockerfile                     multi-stage: node build → nginx runtime
.dockerignore                  keeps node_modules/dist/.git/.env/.claude out of context
docker/nginx.conf.template     envsubst'd to /etc/nginx/conf.d/default.conf at start
docker-compose.yml             single `web` service
scripts/smoke-docker.sh        reproducible build+run+assert gate
```

No file under `src/` is touched. That is a success criterion, not a
coincidence — a non-empty `src/` diff means the proxy approach was
abandoned somewhere.

## Base images (verified, not assumed)

| Stage | Image | Why |
| --- | --- | --- |
| build | `node:22-alpine` | Node 22 LTS; Vite 6 needs ≥18. Alpine keeps the discarded stage small. |
| runtime | `nginxinc/nginx-unprivileged:alpine` | `docker inspect` confirms `User=101`, `ExposedPorts=8080/tcp`. Purpose-built for non-root: unprivileged port, writable cache/pid paths already sorted. Doing this on stock `nginx:alpine` means hand-patching all three. |

`docker run --rm --entrypoint sh … -c 'ls /docker-entrypoint.d/'` confirms
`20-envsubst-on-templates.sh` is present, so the `templates/` mechanism
works. Its `envsubst "$defined_envs"` form substitutes **only defined
environment variables**, so `$uri`/`$host` survive the pass untouched —
verified by reading the script, because the naive `envsubst < in > out`
form would blank every nginx variable and is the classic failure here.

## Dockerfile

```dockerfile
# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Lockfile layer first, so unchanged deps reuse this layer's cache.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Relative by design (AD-024): Vite inlines this at build time, so an
# absolute URL here would bake one environment into the image. A relative
# path resolves against whatever origin serves the app, and nginx proxies
# it onward.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Runtime stage ----
FROM nginxinc/nginx-unprivileged:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

ENV API_UPSTREAM=host.docker.internal:8080
EXPOSE 8080
```

No `USER` line: the base image already defaults to UID 101, and re-stating
it invites drift if the base changes. F1 AC3 is verified by asserting
against the running container, not by reading the Dockerfile.

`npm ci` (not `npm install`) — the lockfile is committed, and `ci` fails
loudly on a lockfile/manifest mismatch instead of silently resolving new
versions into a production image.

## nginx template

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;

    # Exercise diagrams are JSON in the request body; nginx's 1MB default
    # is close enough to matter (spec Edge Cases).
    client_max_body_size 10m;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Content-hashed filenames: safe to cache forever. Must 404 rather than
    # fall through to index.html — an HTML body served as a missing .js
    # masks a broken build (SPA-03).
    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    # The shell itself is never cached, so a redeployed container is picked
    # up instead of served stale (SPA-04).
    location = /index.html {
        add_header Cache-Control "no-cache" always;
    }

    # Same-origin proxy. No URI part on proxy_pass, so the full original
    # path (/api/v1/...) is forwarded unchanged. nginx forwards client
    # headers by default — Authorization included — and the response status
    # passes through untouched, which apiClient depends on to map
    # 401/404/409 to distinct typed errors (PROXY-04).
    location /api/ {
        proxy_pass http://${API_UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback last: any non-asset, non-API path renders the app, so
    # BrowserRouter deep links survive a hard refresh (SPA-01/02).
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### The one genuinely risky detail

`proxy_pass http://${API_UPSTREAM};` uses a **literal** host after
envsubst, which nginx resolves **once at startup**, via libc — and libc
reads `/etc/hosts`, where Docker Desktop injects `host.docker.internal`.

The tempting alternative (`set $up "…"; proxy_pass http://$up;`) resolves
per request but routes through nginx's `resolver`, which is **DNS-only and
does not read `/etc/hosts`** — so it would break the default
`host.docker.internal` wiring. That is why the literal form is specified.

Accepted trade-off: if the upstream name does not resolve at startup, nginx
exits rather than serving the app with a dead API. T3 must confirm the
actual behavior in both wiring modes and document what happens; do not
assume this paragraph is right without running it.

## docker-compose.yml

```yaml
services:
  web:
    build:
      context: .
      args:
        VITE_API_BASE_URL: /api/v1
    ports:
      - "5174:8080"
    environment:
      API_UPSTREAM: ${API_UPSTREAM:-host.docker.internal:8080}
    extra_hosts:
      # Docker Desktop provides this name automatically; Linux does not.
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
```

Host port **5174** deliberately avoids 5173 (Vite dev) and 8080 (backend),
so all three can run simultaneously.

**Backend in the backend repo's compose instead.** Documented and verified
rather than guessed: join that project's network and re-point the upstream:

```yaml
    environment:
      API_UPSTREAM: api:8080
    networks: [backend]
networks:
  backend:
    external: true
    name: coach-planner-api_default
```

The network name comes from the backend repo's directory name; T4 must
confirm it with `docker network ls` rather than trusting this snippet.

## Smoke script

`scripts/smoke-docker.sh` — the gate for F1–F3, so verification is
reproducible and the Verifier has something deterministic to run.

- `set -euo pipefail`; a `trap` on EXIT removes the container so a failed
  assertion never leaves one running (COMPOSE-05)
- builds the image, runs it on a test port, polls `/` until it answers
- asserts, each with a distinct failure message naming the AC:
  `/` → 200 · `/teams` → 200 + HTML · `/assets/nope.js` → 404 ·
  `index.html` → `no-cache` · a real hashed asset → `immutable` ·
  `/api/v1/teams` → 502 with no backend, or the backend's own status when
  one is reachable
- exits non-zero on the first failure

This is a smoke test, not a unit test — the repo's Vitest suite cannot
exercise a container, and pretending otherwise would be worse than being
explicit. `npm test` stays untouched and must remain green.

## Risks

| Risk | Mitigation |
| --- | --- |
| Upstream DNS resolution differs from the reasoning above | Called out explicitly; T3 verifies empirically in both modes and documents the real behavior |
| `add_header` is not inherited into a `location` that defines its own | Each `location` sets its own headers; `always` used so they survive error responses |
| Backend network name guessed wrong | T4 confirms via `docker network ls` |
| Image silently ships `node_modules` or source | F1 AC2 asserts against the running container, not the Dockerfile text |
| An absolute API URL creeps back in later | Documented in F5 AC3 with the reasoning, and the compose file passes the relative value explicitly |
| Container build pulls a moving `alpine` tag | Accepted: tags are pinned to major (`node:22-alpine`), matching the backend's own `eclipse-temurin:21-jre` convention. Digest pinning is not this round's bar. |
