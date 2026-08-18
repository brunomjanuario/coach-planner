# Frontend Docker Image — Tasks

**Preconditions**: Docker running. For T3's proxy verification,
`coach-planner-api` reachable at `localhost:8080`
(`cd ../coach-planner-api && docker compose up -d db && SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun`).

```
Phase 0  Build context    T1        ← trivial, but blocks a correct build   ✅ done
Phase 1  Image + serving  T2–T3     ← T3 needs T2's template to extend      ✅ done
Phase 2  Wiring + gate    T4–T5                                             ✅ done
Phase 3  Docs + memory    T6                                                ✅ done
```

6 tasks — fits a single batch, executed inline. No sub-agent delegation
offer was warranted (the threshold is >~8 tasks).

**Status**: All 6 tasks committed to `main` (`d942823`…`32c94bf`). T3's
execution corrected a design-doc assumption (nginx does not refuse to start
on an unreachable upstream) — recorded in AD-024. Both compose wiring modes
in T4 were verified against real running backends (host `bootRun` and the
backend's own `--profile full` compose), not merely documented. T5's smoke
script was itself proven capable of failing (deliberately broke the SPA
fallback, confirmed the script caught it, reverted). Full Vitest suite
unaffected throughout (1349/1349), and no file under `src/` or in
`../coach-planner-api` was touched. Next: dispatch the fresh Verifier (see
below) before considering this feature done.

**Standing constraint for every task**: no file under `src/` may be
modified. The same-origin proxy is chosen precisely so application code
needs no change; a `src/` edit means something went wrong — stop and
re-read `design.md` rather than patching around it.

---

### T1 — `.dockerignore`

**Files**: `.dockerignore` (new)
**Do**: Exclude `node_modules`, `dist`, `.git`, `.env`, `.claude`,
`.specs`, `coverage`, and editor/OS cruft from the build context. `.env` in
particular must never enter the context — it is gitignored precisely
because it holds local config, and `COPY . .` would otherwise bake it into
a layer.
**Gate**: `docker build --no-cache -t cp-web-ctx-probe . 2>&1 | head -1`
shows a build context materially smaller than the repo with
`node_modules` (or, before a Dockerfile exists, verify with
`docker build -f /dev/null .` failing only on the missing Dockerfile).
Simplest deterministic check: after T2 lands, `docker build` succeeds and
`docker run --rm <img> ls /usr/share/nginx/html` shows no `node_modules`.
**Depends on**: —

### T2 — Dockerfile + nginx serving the SPA

**Files**: `Dockerfile` (new), `docker/nginx.conf.template` (new)
**Do**: Multi-stage build per `design.md` — `node:22-alpine` running
`npm ci` + `npm run build`, then `nginxinc/nginx-unprivileged:alpine`
serving `/app/dist`. Template covers everything except the `/api/` proxy
(that is T3): SPA fallback, the `/assets/` `=404` rule, `index.html`
no-cache, hashed-asset `immutable`, gzip, `client_max_body_size`.
`ARG VITE_API_BASE_URL=/api/v1`.
**Covers**: F1 (IMG-01…06), F2 (SPA-01…05)
**Gate** — build, run, then every assertion must hold:
```bash
docker build -t cp-web:test .
docker run -d --name cp-web-t2 -p 5174:8080 cp-web:test
curl -sf -o /dev/null -w '%{http_code}' localhost:5174/          # 200
curl -sf -o /dev/null -w '%{http_code}' localhost:5174/teams     # 200
curl -s  -o /dev/null -w '%{http_code}' localhost:5174/assets/nope.js  # 404
curl -sI localhost:5174/ | grep -i 'cache-control: no-cache'
docker exec cp-web-t2 id -u        # non-zero (non-root)
docker exec cp-web-t2 sh -c 'ls /usr/share/nginx/html | grep -qv node_modules'
docker rm -f cp-web-t2
```
Also confirm a real hashed asset (read one out of the built `index.html`)
returns `immutable`.
**Depends on**: T1

### T3 — Same-origin `/api/` proxy

**Files**: `docker/nginx.conf.template`
**Do**: Add the `location /api/` block per `design.md` — literal
`proxy_pass http://${API_UPSTREAM};`, `ENV API_UPSTREAM=host.docker.internal:8080`
in the Dockerfile, forwarded proxy headers, no URI part so the full
`/api/v1/...` path passes through.
**Covers**: F3 (PROXY-01…06)
**Verify empirically and record what actually happens** (design.md flags
this as the riskiest detail — do not trust the reasoning, run it):
1. Backend up → `curl -i localhost:5174/api/v1/teams` returns the
   backend's own `401` (proving pass-through of a non-2xx status, not an
   nginx error page)
2. Backend down → `/api/v1/teams` → `502` **and** `/` still → `200`
3. Backend down **at container start** → does nginx boot at all? Record
   the real behavior in the task's commit message and in T6's docs. If it
   refuses to start, that is acceptable per spec but must be documented.
**Gate**: assertions 1 and 2 above pass; behavior in 3 is recorded.
**Depends on**: T2

### T4 — `docker-compose.yml`

**Files**: `docker-compose.yml` (new)
**Do**: Single `web` service per `design.md` — build args, `5174:8080`,
`API_UPSTREAM` with default, `extra_hosts` host-gateway mapping,
`restart: unless-stopped`. No `version:` key (compose v2), matching the
backend repo's file.
**Covers**: F4 (COMPOSE-01…03)
**Do also**: Confirm the backend project's actual network name with
`docker network ls` — do not trust `coach-planner-api_default` from the
design doc — then verify the alternate wiring works end to end: start the
backend via its own compose (`--profile full`), attach this container to
that network with `API_UPSTREAM=api:8080`, and confirm
`curl localhost:5174/api/v1/teams` reaches it. Capture the confirmed
network name for T6's docs.
**Gate**: `docker compose up -d --build` → `curl -sf localhost:5174/` →
200; alternate wiring verified; `docker compose down` leaves nothing.
**Depends on**: T3

### T5 — `scripts/smoke-docker.sh`

**Files**: `scripts/smoke-docker.sh` (new, executable)
**Do**: Codify T2/T3's assertions into one reproducible script per
`design.md` — `set -euo pipefail`, EXIT trap that force-removes the
container, poll `/` until ready (bounded, with a timeout that fails loudly
rather than hanging), then each assertion with a distinct message naming
the AC it covers.
**Covers**: F4 (COMPOSE-04, COMPOSE-05)
**Test the test**: temporarily break the SPA fallback (point `try_files`
at a nonexistent file), confirm the script exits non-zero naming the
deep-link assertion, then revert. A smoke script that cannot fail is
worthless — this step is the discrimination check and is not optional.
**Gate**: `./scripts/smoke-docker.sh` exits `0` on a clean tree, exits
non-zero on the deliberate break, and leaves no container behind in either
case (`docker ps -a | grep <name>` empty).
**Depends on**: T4

### T6 — Docs + decision record

**Files**: `README.md`, `docs/` (check `docs/README.md` for the live index
and place it consistently), `CLAUDE.md`, `.specs/STATE.md`,
`.specs/README.md`
**Do**:
1. Document build/run, `API_UPSTREAM`, host port 5174, and **both**
   backend-wiring modes using the network name confirmed in T4 — plus the
   real container-start behavior recorded in T3.
2. Explain that the API URL is relative *by design*, with the build-time
   inlining + CORS reasoning, so it is not "fixed" into an absolute URL
   later (DOC-03).
3. Add the Docker commands to `CLAUDE.md`'s Commands section. While there,
   correct that file's stale "Known rough edges" entries — this feature
   verified that `index.html` no longer references a missing
   `/src/styles.css` and that `TeamCard`/`PlayerCard` now `import` their
   images (so they resolve in production builds). Both are listed as
   current problems and are not.
4. Record **AD-024** (same-origin proxy: relative `VITE_API_BASE_URL` +
   nginx `/api/` proxy, chosen so the image carries no environment and the
   backend's CORS needs no change) and **AD-025** (frontend-only container;
   full-stack compose deliberately not built this round) in
   `.specs/STATE.md`, continuing from AD-023. **Section-scoped write**:
   insert into `## Decisions` only — never touch `## Handoff`, which holds
   unrelated state. Verify with `git diff .specs/STATE.md`.
5. Add feature `40-frontend-docker` to `.specs/README.md`'s roadmap in the
   existing style.
**Gate**: `git diff .specs/STATE.md` shows additions confined to the
Decisions section; docs read back correctly; `npm test -- --run` still
green (nothing in this feature should have touched it).
**Depends on**: T5

---

## Gate Check Commands

| Level | Command |
| --- | --- |
| Quick | `./scripts/smoke-docker.sh` (once T5 exists; before that, the explicit `curl` blocks in T2/T3) |
| Full | `./scripts/smoke-docker.sh && npm test -- --run` |
| Build | `docker build -t cp-web:test . && npm run build && npm run lint && npm test -- --run` |

`npm test` cannot exercise a container; the smoke script is the gate for
everything Docker-side. Both must be green — the Vitest suite proves this
feature did not touch application behavior, which is itself an AC.

---

## Verifier

After T6, dispatch the standard fresh-eyes Verifier (author ≠ verifier).
Spec-anchored check across F1–F5, plus a discrimination sensor weighted at
the two places this feature can look right while being wrong:

1. **The smoke script's own discrimination.** Re-run T5's "test the test"
   independently: break the SPA fallback, the `/assets/` `=404` rule, and
   the proxy's status pass-through, each in a scratch state, and confirm
   the script fails each time with the right message. A smoke script that
   passes unconditionally would make every other gate in this feature
   meaningless.
2. **The claims that are easy to assert and hard to verify** — that the
   runtime image really has no `node_modules`/source, really runs
   non-root, and really returns the backend's own status codes rather than
   nginx-generated ones. Check these against a running container, never by
   reading the Dockerfile.

Also confirm the two standing constraints hold: `git diff` for this
feature touches no `src/` file, and `../coach-planner-api` has no changes.
