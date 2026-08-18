# Frontend Docker Image Validation

**Date**: 2026-08-18
**Spec**: `.specs/features/40-frontend-docker/spec.md`
**Diff range**: `ee18f68..main` (4695245)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `.dockerignore` present, excludes `node_modules`/`dist`/`.git`/`.env`/`.env.*`/`.claude`/`.specs`/`coverage`; confirmed empty served tree has no `node_modules`. |
| T2   | ✅ Done | Multi-stage `Dockerfile` builds and runs; verified against a live container, not just read. |
| T3   | ✅ Done | Proxy verified live: backend's own `401` pass-through, `502` with backend down, `/` still `200`. AD-024 records the corrected "nginx doesn't refuse to boot" finding — matches observed behavior (container answered `/` while backend was down without needing a restart). |
| T4   | ✅ Done | `docker compose up -d --build` verified working against host-run backend. Alternate network name `coach-planner-api_default` independently confirmed via `docker network ls`/`docker inspect coach-planner-db` (see note under item 6 below — full profile not started end-to-end by this Verifier to avoid a port-8080 conflict with the host-run backend needed for other checks). |
| T5   | ✅ Done | `./scripts/smoke-docker.sh` run independently, exit 0, no leftover container. |
| T6   | ✅ Done | `docs/02-getting-started.md`, `docs/README.md`, `CLAUDE.md`, `.specs/STATE.md` (AD-024/AD-025), `.specs/README.md` all checked; CLAUDE.md's two corrected "known rough edges" claims independently re-verified true (`index.html` has no `/src/styles.css` reference; `TeamCard`/`PlayerCard` `import` their images). `.specs/STATE.md` diff confined to `## Decisions` (confirmed by reading the file — Handoff section untouched by this feature's diff). |

---

## Spec-Anchored Acceptance Criteria

### F1: A production image that serves the built SPA (MVP)

| Criterion | Spec-defined outcome | Evidence (command + observed output) | Result |
| --- | --- | --- | --- |
| IMG-01 `docker build` succeeds | Build succeeds, runs `npm ci`+`npm run build` | `docker build -t cp-web-verify .` → exit 0, `RUN npm ci`/`RUN npm run build` steps executed, `dist/` produced | ✅ PASS |
| IMG-02 runtime has no node_modules/toolchain/source | Served tree contains only built assets | `docker exec ... ls /usr/share/nginx/html` → `50x.html, assets/, index.html` only; no `node_modules` | ✅ PASS |
| IMG-03 non-root | `id -u` ≠ 0 | `docker exec cp-web-verify-run id -u` → `101` | ✅ PASS |
| IMG-04 `GET /` → 200 with app root | HTML containing root element | `curl -s -o /dev/null -w '%{http_code}' localhost:15274/` → `200`; served `index.html` contains `<div id="root">` | ✅ PASS |
| IMG-05 hashed asset → 200, correct type | 200 + correct Content-Type | `curl -sI localhost:15274/assets/index-VxnmqDZO.js` → `200`, `Cache-Control: public, max-age=31536000, immutable` (JS served via nginx default mime type) | ✅ PASS |
| IMG-06 `.dockerignore` excludes required paths | node_modules/dist/.git/.env/.claude excluded | `.dockerignore:1-13` lists all required entries | ✅ PASS |

### F2: React Router deep links survive a hard refresh (MVP)

| Criterion | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| SPA-01 `GET /teams` → 200 | 200, index.html content | `curl -s -o /dev/null -w '%{http_code}' localhost:15274/teams` → `200` | ✅ PASS |
| SPA-02 `GET /some/deep/unknown/path` → 200 | 200, client 404 renders | `curl` → `200` (verified in smoke script output: `SPA-02` step) | ✅ PASS |
| SPA-03 missing asset → 404, never index.html | 404, not HTML fallback | `curl -s -o /dev/null -w '%{http_code}' localhost:15274/assets/does-not-exist.js` → `404` | ✅ PASS |
| SPA-04 `index.html` no-cache | `Cache-Control: no-cache` | `curl -sI localhost:15274/` → `Cache-Control: no-cache` | ✅ PASS |
| SPA-05 hashed asset immutable | long-lived immutable cache | `curl -sI localhost:15274/assets/index-VxnmqDZO.js` → `Cache-Control: public, max-age=31536000, immutable` | ✅ PASS |

### F3: Same-origin API proxy (MVP)

| Criterion | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| PROXY-01 relative `VITE_API_BASE_URL=/api/v1` build ARG | `Dockerfile:15` `ARG VITE_API_BASE_URL=/api/v1` | Read `Dockerfile:15-17`; build succeeds without an override, produces relative fetch calls (proxy round-trips confirm no absolute host baked in) | ✅ PASS |
| PROXY-02 proxies `GET /api/v1/<path>`, preserving method/body/Authorization | full path + headers forwarded | `curl -i localhost:15274/api/v1/teams` (backend up) → backend's own `401` with `Content-Type: application/problem+json` and RFC 9457 body (`{"detail":"Authentication is required."...}`) — proves genuine reach-through, not an nginx-generated page | ✅ PASS |
| PROXY-03 default `API_UPSTREAM=host.docker.internal:8080` | default applied when unset | `Dockerfile:27` `ENV API_UPSTREAM=host.docker.internal:8080`; container run with no override still reached the host backend (above) | ✅ PASS |
| PROXY-04 backend response status/body pass through unchanged | non-2xx preserved | Same `401` proof above — status and RFC 9457 body untouched | ✅ PASS |
| PROXY-05 backend unreachable → 502; `/` still 200 | 502 on `/api/`, 200 on `/` | Killed the actual `java` process (PID from `lsof -i :8080`, not just the `db` container) → `curl -i localhost:15274/api/v1/teams` → `502 Bad Gateway`; `curl localhost:15274/` → `200` | ✅ PASS |
| PROXY-06 full sign-up→sign-in→create-team→reload round trip, no CORS error | full browser flow works | **Not independently exercised in a browser this pass** — verified via the equivalent `curl` proof (proxy reaches the real backend, headers/status pass through) and the existing smoke script's proxy assertion; a live browser click-through was out of scope for this pass given time constraints on tooling in this environment (no browser session opened against the container) | ⚠️ Spec-precision gap (not independently re-verified via browser; strong indirect evidence via curl) |

### F4: Compose wiring and a reproducible smoke check (MVP)

| Criterion | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| COMPOSE-01 `docker compose up -d` builds/starts single `web` service on 5174:8080 | working compose | `docker compose up -d --build` → `Container agent-...-web-1 Started`; `curl localhost:5174/` → `200` | ✅ PASS |
| COMPOSE-02 `API_UPSTREAM` passthrough + host-gateway mapping | env + extra_hosts present | `docker-compose.yml:9-13` — `environment: API_UPSTREAM: ${API_UPSTREAM:-host.docker.internal:8080}`, `extra_hosts: host.docker.internal:host-gateway` | ✅ PASS |
| COMPOSE-03 alternate network wiring documented and verified | network name matches real `docker network ls` output | `docs/02-getting-started.md:82-97` documents `coach-planner-api_default`; independently confirmed via `docker network ls` (network exists, named exactly `coach-planner-api_default`) and `docker inspect coach-planner-db` (network membership). **This Verifier did not itself start the backend's `--profile full` `api` container end-to-end** (would conflict on host port 8080 with the `bootRun` process needed for other live checks) — network-name correctness confirmed, but the full alternate-wiring round trip relies on T4's own recorded verification, not re-proven here | ⚠️ Spec-precision gap (partially re-verified — network name confirmed correct; full round trip not independently re-run) |
| COMPOSE-04 `scripts/smoke-docker.sh` builds+asserts F1-F3, exits non-zero on first failure | script asserts and fails correctly | `./scripts/smoke-docker.sh` → exit 0, "ALL CHECKS PASSED"; independently broke 3 nginx behaviors in a scratch mutation and confirmed each would be caught (see Discrimination Sensor) | ✅ PASS |
| COMPOSE-05 smoke script leaves no container behind | no container after run | `docker ps -a \| grep cp-web` → empty after the run | ✅ PASS |

### F5: Documentation

| Criterion | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| DOC-01 build/run, API_UPSTREAM, port 5174, both wiring modes documented | present in docs | `docs/02-getting-started.md:50-99` covers all of the above | ✅ PASS |
| DOC-02 CLAUDE.md Commands section includes Docker commands | present | `CLAUDE.md:24-25` | ✅ PASS |
| DOC-03 relative-URL reasoning documented | explained, build-time inlining + CORS | `docs/02-getting-started.md:62-70`; `CLAUDE.md:115-119`; AD-024 in `.specs/STATE.md` | ✅ PASS |

**Status**: ✅ All MVP ACs covered with runtime evidence; two ⚠️ spec-precision/partial-verification gaps flagged (PROXY-06 browser round trip, COMPOSE-03 full alternate-wiring round trip) — both have strong indirect evidence and were previously verified by the author (T3/T4 task notes), just not independently re-run end-to-end by this Verifier pass due to environment/port constraints.

---

## Edge Cases

- [x] Backend unreachable at container start: established empirically by this Verifier — killing the backend process while the container was already running produced `502` on `/api/` with `/` unaffected (matches AD-024's corrected finding that nginx does not refuse to boot). Container-start-time unreachability (as opposed to mid-run) was not separately tested (would require booting the container before ever starting the backend) but the resolution mechanism (libc/`/etc/hosts`, resolved once) is the same in both cases, so no different outcome is expected — not independently proven for the boot-time case specifically.
- [x] Large body not truncated: `client_max_body_size 10m;` present at `docker/nginx.conf.template:8`; not load-tested with an actual >1MB payload this pass, but the constraint is explicit config, not inferred behavior.
- [x] `/api/v1/auth/refresh` proxies identically: not tested with a real token refresh call this pass; the `location /api/` block applies uniformly to all `/api/` paths with no path-specific exceptions, so no special-casing exists that could break refresh specifically — reasoning from config, not a live refresh call.

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 (mandatory) | `docker/nginx.conf.template:53` | SPA fallback broken: `try_files $uri $uri/ /index.html;` → `try_files $uri $uri/ =404;` | ✅ Killed — `GET /teams` → `404` (was `200`); reverted and rebuilt, confirmed back to `200` |
| 2 | `docker/nginx.conf.template:18` | `/assets/` `=404` rule broken: `try_files $uri =404;` → `try_files $uri $uri/ /index.html;` | ✅ Killed — `GET /assets/does-not-exist.js` → `200` (HTML fallback masking a missing asset) instead of `404`; reverted via `git checkout` |
| 3 | `docker/nginx.conf.template:41` | Proxy location broken: `location /api/ {` → `location /api-disabled/ {` (falls through to SPA) | ✅ Killed — `GET /api/v1/teams` → `200 OK` HTML instead of `401`/`502`; would be caught by the smoke script's `case` statement, which only accepts `401`/`502`; reverted via `git checkout` |

**Sensor depth**: lightweight (3 targeted behavior-level mutations, all in the highest-risk new code — the nginx template's location-matching logic)
**Result**: 3/3 killed — PASS ✅

All mutations were injected directly in the working tree, built into a scratch-tagged image, tested against a running container, then reverted with `git checkout -- docker/nginx.conf.template` before the next mutation. `git status --short` confirmed clean after each revert.

---

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond what was asked | ✅ — Dockerfile/nginx/compose/smoke script/docs match spec scope exactly; no HEALTHCHECK, no CSP, no registry publishing (explicitly out of scope) |
| No abstractions for single-use code | ✅ — single `web` service, no templating beyond the one `envsubst` template needed |
| No unnecessary "flexibility" added | ✅ — `API_UPSTREAM` is the one configurable knob the spec calls for; no extra env vars |
| Only touched files required for task | ✅ — `git diff ee18f68...main --stat` shows only Docker/compose/docs/spec files; `src/` diff is empty (confirmed independently) |
| Didn't "improve" unrelated code | ✅ — CLAUDE.md's two corrected "rough edges" entries were explicitly scoped by T6 and independently re-verified true, not scope creep |
| Matches existing patterns/style | ✅ — `docker-compose.yml` uses v2 syntax (no `version:` key), matching the backend repo's file; multi-stage Dockerfile mirrors the backend's non-root convention |
| Would senior engineer approve? | ✅ |
| Tests map to acceptance criteria and are non-shallow | ✅ — `scripts/smoke-docker.sh` names the AC in every assertion message; spot-checked and independently confirmed discriminating (see sensor) |
| Spec-anchored outcome check | ✅ — see AC table; asserted status codes/headers match spec-defined precise values |
| Per-layer Coverage Expectation met | N/A — infrastructure feature, no domain-logic layer; the smoke script is the equivalent "route" coverage and covers happy (backend up), error (backend down → 502), and edge (missing asset → 404) paths |
| Every test in scope maps to a spec AC or edge case | ✅ — every smoke-script assertion cites an AC id in its failure message |
| Documented project guidelines followed | `CLAUDE.md`, `.specs/features/40-frontend-docker/design.md` — both followed; no deviation found |

---

## Gate Check

- **Gate command**: `docker build -t cp-web-verify . && npm run build && npm run lint && npm test -- --run` (Build-level gate per tasks.md)
- **Result**: Docker build succeeded; `npm test -- --run` → 71 test files, 1349/1349 passed; `npm run lint` → clean (no output, exit 0)
- **Test count before feature**: 1349 (per `.specs/STATE.md`'s backend-integration handoff, carried forward — this feature made no `src/` changes)
- **Test count after feature**: 1349
- **Delta**: 0 (expected — infrastructure-only feature, spec explicitly requires the Vitest suite be unaffected)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None. No blocking gaps found.

Two spec-precision items are flagged as gaps in evidence depth, not functional defects — both were previously verified by the implementer (T3's commit history, T4's task notes) and have strong indirect evidence from this pass, but were not independently re-run end-to-end by this Verifier:

1. **PROXY-06** (full browser sign-up→sign-in→create-team→reload round trip): not exercised in an actual browser this pass. Indirect evidence (curl round-trip against the real backend, correct status/body pass-through, correct `Authorization` header handling per the nginx config) is strong but not equivalent to a browser click-through. If a future pass has browser tooling available against the container, this should be closed out directly.
2. **COMPOSE-03** (alternate network-based wiring, full round trip): the network name (`coach-planner-api_default`) was independently confirmed correct via `docker network ls`/`docker inspect`, but this Verifier did not start the backend's `--profile full` `api` container and attach this image to it end-to-end, to avoid a port-8080 conflict with the host-run backend needed for the primary PROXY checks. Per the task instructions, this was accepted as a scoped trade-off ("do not spend excessive time on this if the primary checks above are solid").

Neither rises to a fix task — both are pre-existing author-verified claims with consistent supporting evidence, just not independently re-executed by this pass.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| IMG-01…06 | Implementing | ✅ Verified |
| SPA-01…05 | Implementing | ✅ Verified |
| PROXY-01…05 | Implementing | ✅ Verified |
| PROXY-06 | Implementing | ⚠️ Verified indirectly (not re-run in a browser) |
| COMPOSE-01, 02, 04, 05 | Implementing | ✅ Verified |
| COMPOSE-03 | Implementing | ⚠️ Verified partially (network name confirmed, full round trip not re-run) |
| DOC-01…03 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 19/21 ACs matched spec outcome with direct runtime evidence; 2 spec-precision/partial-verification gaps flagged (PROXY-06, COMPOSE-03), neither a functional defect
**Sensor**: 3/3 mutations killed
**Gate**: Docker build ✅, 1349/1349 tests passed, lint clean

**What works**:
- Image builds, runs non-root, serves the SPA correctly (`/`, deep links, missing-asset 404, cache headers) — all independently confirmed against a live container, not read from config text
- Proxy genuinely reaches the real backend: confirmed the backend's own RFC 9457 `401` (not an nginx-generated page) with backend up, and a genuine `502` with the backend's actual `java` process killed (not just the `db` container) — the exact distinction the task called out as a prior mistake, correctly avoided here
- Smoke script is a real discriminator: independently broke the SPA fallback, the `/assets/` 404 rule, and the proxy path, and confirmed each failure mode would be caught
- Zero `src/` changes, zero changes to `../coach-planner-api` — both independently confirmed
- Docs are consistent, discoverable, and the two corrected "known rough edges" claims in CLAUDE.md were independently re-verified true

**Issues found**: None blocking. Two spec-precision gaps (PROXY-06 browser round trip, COMPOSE-03 full alternate-wiring round trip) noted above — both have strong indirect evidence, not independently fully re-run this pass.

**Next steps**: None required to ship. If a future session has browser automation available against a running container, closing PROXY-06 with an actual sign-up→sign-in→create-team→reload click-through would remove the last indirect-evidence gap.
