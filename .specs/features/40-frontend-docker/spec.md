# Frontend Docker Image — Specification

**Scope:** Large (multi-component: image, web server config, compose, docs)
**Created:** 2026-08-18
**Status:** Specified — awaiting execution

## Problem Statement

`coach-planner-api` ships a `Dockerfile` and a `docker-compose.yml`; the
frontend ships neither. Running the app today requires a local Node
toolchain and `npm run dev`, and the only way to exercise the *production*
build is `npm run build && npm run preview` by hand. There is no artifact
that packages the built SPA with a web server, and nothing that serves the
app the way it would actually be deployed.

Two constraints make this more than "add a Dockerfile", and both were
verified in the source rather than assumed:

1. **Vite inlines `VITE_API_BASE_URL` at build time**
   (`src/lib/apiClient.js:22` reads `import.meta.env.VITE_API_BASE_URL`).
   An image built with one API URL cannot be re-pointed at another without
   a rebuild.
2. **The backend's CORS allowlist is hardcoded to `http://localhost:5173`**
   (`coach-planner-api`'s `SecurityConfig.kt:23`). A frontend container
   served on any other origin is blocked by the browser.

Both are solved by the same decision (see AD-024 below): nginx inside the
image reverse-proxies `/api/` to the backend, so the browser only ever
sees one origin.

## Goals

- [ ] `docker build` produces an image that serves the production SPA build
- [ ] The running container serves the app at a documented port, with
      React Router deep links (`/teams`, `/trainings`, …) working on direct
      navigation and hard refresh — not just via client-side navigation
- [ ] The container proxies `/api/` to `coach-planner-api`, so the app is
      fully usable (sign in, load teams, record a result) with **no change
      to the backend's CORS configuration**
- [ ] The backend's address is set at **container run time**, not build
      time — one image works against a host-run backend or a
      compose-network backend
- [ ] The image matches the conventions the backend's `Dockerfile` already
      set: multi-stage, non-root, pinned base tags, no build tooling in the
      runtime layer
- [ ] A committed smoke script verifies the built image end-to-end, so the
      gate is reproducible rather than a manual click-through

## Out of Scope

| Item | Reason |
| --- | --- |
| Any change to `coach-planner-api` | The same-origin proxy (AD-024) removes the need for a CORS change. If a genuine backend gap appears, it is a bug report to that repo. |
| Any change to application source (`src/**`) | The proxy approach needs none — `apiClient` already builds `${BASE_URL}${path}`, and a relative `BASE_URL` of `/api/v1` resolves against the page origin. Verified, not assumed. Ending this feature with a non-empty `src/` diff means something went wrong. |
| A full-stack compose (db + api + web in one `up`) | User decision this round: frontend container only, documented to run alongside the backend repo's existing compose. |
| Container `HEALTHCHECK`, CSP and other security headers | User decision: match the backend's bar, which has none of these. Recorded as a deliberate gap, not an oversight. |
| Publishing the image to a registry, CI, deployment | No registry or CI exists for either repo yet. |
| HTTPS/TLS termination | Local-development artifact; TLS belongs at an ingress in front of this container. |
| Changing the dev workflow | `npm run dev` on port 5173 stays exactly as-is, including its CORS relationship with the backend. |

---

## Decisions (locked this round)

1. **Same-origin proxy (AD-024)**: the image is built with
   `VITE_API_BASE_URL=/api/v1` (relative), and nginx proxies `/api/` to the
   backend. The browser sees one origin, so CORS never engages and the
   backend needs no change; and because the baked value is a relative path,
   the image carries no environment-specific URL.
2. **Frontend container only**: this repo gains a `Dockerfile` and a
   `docker-compose.yml` with a single `web` service. Running the backend
   stays the backend repo's job; the docs explain both wiring options.
3. **Backend address at run time**: the upstream is an environment
   variable (`API_UPSTREAM`) substituted into the nginx config at container
   start, defaulting to `host.docker.internal:8080` (a backend run on the
   host via `./gradlew bootRun`).

## Assumptions & Open Questions

- **Base images** (verified by `docker inspect`/`docker run`, not assumed):
  build stage `node:22-alpine`; runtime stage
  `nginxinc/nginx-unprivileged:alpine`, which already runs as UID 101 and
  listens on 8080 — the two things a non-root nginx otherwise needs manual
  work for (unprivileged ports, writable cache/pid paths).
- **Template substitution** (verified): that image's
  `/docker-entrypoint.d/20-envsubst-on-templates.sh` runs `envsubst` with
  an explicit list of *defined* environment variables, so nginx's own
  `$uri`/`$host` in a `.template` file are left intact. This is only true
  as long as no environment variable is named after an nginx variable —
  `API_UPSTREAM` is safe.
- **Upstream DNS resolution — the riskiest detail, flagged not resolved**:
  a literal `proxy_pass http://host:8080` is resolved once, at nginx
  startup, by libc (which reads `/etc/hosts`, where Docker Desktop injects
  `host.docker.internal`). A variable-based `proxy_pass http://$upstream`
  resolves per request but goes through nginx's `resolver` (DNS only,
  **does not read `/etc/hosts`**), so it would fail for
  `host.docker.internal`. The literal form is therefore specified, with the
  accepted trade-off that nginx exits at boot if the upstream hostname does
  not resolve. T3 must verify this empirically in both wiring modes rather
  than trusting this paragraph.
- **Port**: the container listens on 8080 internally; the compose service
  publishes it on host port **5174**, chosen to avoid colliding with the
  Vite dev server (5173) or the backend (8080), so all three can run at
  once.
- **`docker compose` v2 syntax** (`docker compose`, no `version:` key),
  matching the backend repo's existing file.

### Implicit-requirement dimensions sweep

| Dimension | Applies? | Handling |
| --- | --- | --- |
| Persistence/state | No | The container is stateless; all state lives in the backend's Postgres |
| External calls | Yes | Every `/api/` request is proxied to `coach-planner-api`; an unreachable backend must degrade to a 502 from nginx, not a broken page load |
| Auth | Indirect | Bearer tokens pass through the proxy unchanged; nginx must not strip or rewrite `Authorization` |
| Payments | No | — |
| Concurrency | No | Static file serving and stateless proxying |
| State transitions | No | — |

---

## User Stories

### F1: A production image that serves the built SPA ⭐ MVP

**User Story**: As a developer, I want `docker build` to produce an image
that serves the production build, so the app can run without a local Node
toolchain.

**Acceptance Criteria**:

1. WHEN `docker build -t coach-planner-web .` runs from a clean checkout THEN it SHALL succeed, running `npm ci` and `npm run build` in a build stage
2. WHEN the image is inspected THEN the runtime layer SHALL contain the built static assets and SHALL NOT contain `node_modules`, the Node toolchain, or application source
3. WHEN the container runs THEN its process SHALL run as a non-root user
4. WHEN the container runs THEN it SHALL serve `GET /` with `200` and an HTML body containing the app's root element
5. WHEN `GET /assets/<hashed-file>` is requested for an asset referenced by `index.html` THEN it SHALL return `200` with a correct `Content-Type`
6. WHEN the build runs THEN `.dockerignore` SHALL exclude `node_modules`, `dist`, `.git`, `.env` and `.claude` from the build context

**Independent Test**: Build, run, `curl -f http://localhost:5174/`; `docker exec` the container and confirm `whoami`/`id` is not root and no `node_modules` exists.

---

### F2: React Router deep links survive a hard refresh ⭐ MVP

**User Story**: As a coach, I want to open `/teams` directly or refresh the
page and still land on the app, so the container behaves like a real SPA
host rather than a plain file server.

**Why this matters**: `App.jsx` uses `BrowserRouter`. Without a fallback,
nginx looks for a `/teams` file, finds none, and returns `404` — the app
works only if you always enter through `/`.

**Acceptance Criteria**:

1. WHEN `GET /teams` is requested directly THEN the server SHALL return `200` with `index.html`'s content, not `404`
2. WHEN `GET /some/deep/unknown/path` is requested THEN it SHALL likewise return `200` with `index.html` (the app's own `NotFound` route renders the 404, client-side)
3. WHEN a request for a genuinely missing static asset under the assets directory is made THEN it SHALL return `404`, NOT `index.html` — an HTML body served in place of a missing `.js`/`.css` masks build errors
4. WHEN `index.html` is served THEN it SHALL carry a no-cache directive, so a redeployed container is picked up rather than served stale from the browser cache
5. WHEN a content-hashed asset under `/assets/` is served THEN it SHALL carry a long-lived `Cache-Control` (immutable), since its filename changes whenever its content does

**Independent Test**: `curl -i` each of `/`, `/teams`, `/a/b/c`, `/assets/does-not-exist.js` and assert status + `Cache-Control` per the above.

---

### F3: Same-origin API proxy ⭐ MVP

**User Story**: As a developer, I want the container to proxy `/api/` to
the backend, so the app is fully usable with no CORS configuration and no
environment-specific image build.

**Acceptance Criteria**:

1. WHEN the image is built THEN `VITE_API_BASE_URL` SHALL be `/api/v1` — a relative path — supplied as a build `ARG` with that default, so no absolute URL is baked in
2. WHEN the container receives `GET /api/v1/<path>` THEN it SHALL proxy the request to the backend named by the `API_UPSTREAM` environment variable, preserving the method, request body, and the `Authorization` header
3. WHEN `API_UPSTREAM` is not set THEN it SHALL default to `host.docker.internal:8080`
4. WHEN the backend responds THEN the proxy SHALL pass the response status and body through unchanged — including non-2xx statuses, since `apiClient` maps `401`/`404`/`409` to distinct typed errors and a rewritten status would silently break that mapping
5. WHEN the backend is unreachable THEN `/api/` requests SHALL return a `502`, while `GET /` SHALL still return the app shell with `200`
6. WHEN the app runs in the container against a running backend THEN a full sign-up → sign-in → create team → reload round trip SHALL succeed with no CORS error in the browser console, and with the backend's CORS allowlist left untouched

**Independent Test**: With the backend running, `curl -i http://localhost:5174/api/v1/teams` returns the backend's own `401` (not a CORS failure and not nginx's own error page); stop the backend and confirm `/api/v1/teams` → `502` while `/` → `200`.

---

### F4: Compose wiring and a reproducible smoke check ⭐ MVP

**User Story**: As a developer, I want `docker compose up` to start the
frontend, and a committed script that proves the image actually works, so
verification is repeatable instead of a manual click-through.

**Acceptance Criteria**:

1. WHEN `docker compose up -d` runs in this repo THEN it SHALL build and start a single `web` service publishing container port 8080 on host port 5174
2. WHEN the compose service starts THEN it SHALL pass `API_UPSTREAM` through from the environment with the `host.docker.internal:8080` default, and SHALL declare whatever host-gateway mapping is needed for that name to resolve on non-Docker-Desktop hosts
3. WHEN the backend is instead running in the backend repo's own compose THEN the docs SHALL state the exact override (joining that project's network and setting `API_UPSTREAM=api:8080`) — and that path SHALL be verified to work, not merely documented
4. WHEN `scripts/smoke-docker.sh` runs THEN it SHALL build the image, start a container, assert every F1–F3 HTTP expectation above, tear the container down, and exit non-zero on the first failed assertion
5. WHEN the smoke script finishes, successfully or not THEN it SHALL leave no container from its own run still running

**Independent Test**: `./scripts/smoke-docker.sh` exits `0` on a correct tree; temporarily breaking the SPA fallback makes it exit non-zero naming that assertion.

---

### F5: Documentation

**User Story**: As a developer returning to this repo, I want the Docker
path documented where I already look, so the container is discoverable.

**Acceptance Criteria**:

1. WHEN `README.md`/`docs/` are read THEN they SHALL document building and running the image, the `API_UPSTREAM` variable, host port 5174, and both backend-wiring modes
2. WHEN `CLAUDE.md` is read THEN its Commands section SHALL include the Docker commands, consistent with how the backend repo documents its own
3. WHEN the docs describe the API URL THEN they SHALL explain that it is relative by design and why (the build-time inlining + CORS reasoning), so a future change does not silently reintroduce an absolute URL

---

## Edge Cases

- WHEN the backend is unreachable at container start THEN nginx's behavior SHALL be established empirically and documented (per the flagged DNS-resolution assumption) — if the container refuses to start, that is acceptable but MUST be documented, not discovered later
- WHEN a request carries a large body (e.g. an exercise diagram JSON) THEN the proxy SHALL not truncate it — nginx's default `client_max_body_size` is 1MB, which is small enough to be worth an explicit value
- WHEN the app is served from the container THEN `/api/v1/auth/refresh` SHALL proxy identically to every other call; the boot-time silent refresh must work, or every reload signs the coach out

## Requirement Traceability

| Req ID prefix | Story |
| --- | --- |
| IMG- | F1 |
| SPA- | F2 |
| PROXY- | F3 |
| COMPOSE- | F4 |
| DOC- | F5 |

## Success Criteria

- `./scripts/smoke-docker.sh` exits `0`
- A browser against `http://localhost:5174` completes sign-in → create a
  team → hard-refresh on `/teams` → still signed in, still shows the team
- `git diff` for this feature touches **no file under `src/`**
- `coach-planner-api` has no changes of any kind
