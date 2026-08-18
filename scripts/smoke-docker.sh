#!/usr/bin/env bash
# Smoke test for the frontend Docker image (feature 40-frontend-docker).
# Builds the image, runs it, asserts F1-F3's HTTP-observable acceptance
# criteria, and tears the container down on any exit path.
#
# Usage: ./scripts/smoke-docker.sh
# Exits 0 iff every assertion passes. Exits non-zero, naming the failed
# assertion, on the first failure.

set -euo pipefail

IMAGE="coach-planner-web:smoke"
CONTAINER="cp-web-smoke-$$"
PORT="15174" # a dedicated port, distinct from compose's 5174, so this can run alongside a dev instance
BASE="http://localhost:${PORT}"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

echo "== building image =="
docker build -t "$IMAGE" "$(dirname "$0")/.." >/dev/null

echo "== starting container =="
docker run -d --name "$CONTAINER" -p "${PORT}:8080" "$IMAGE" >/dev/null

echo "== waiting for the server to answer =="
ready=0
for _ in $(seq 1 30); do
  if curl -sf -o /dev/null "$BASE/" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 0.5
done
[ "$ready" -eq 1 ] || fail "container did not start serving within 15s (F1 AC4)"

echo "== F1 AC4: GET / -> 200 =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")
[ "$code" = "200" ] || fail "GET / returned $code, expected 200 (F1 AC4)"

echo "== F1 AC5: a real hashed asset -> 200 =="
asset=$(curl -s "$BASE/index.html" | grep -oE '/assets/index-[A-Za-z0-9]+\.js' | head -1)
[ -n "$asset" ] || fail "could not find a hashed asset reference in index.html (F1 AC5)"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$asset")
[ "$code" = "200" ] || fail "GET $asset returned $code, expected 200 (F1 AC5)"

echo "== F1 AC3: container runs as non-root =="
uid=$(docker exec "$CONTAINER" id -u)
[ "$uid" != "0" ] || fail "container is running as uid 0 (root) (F1 AC3)"

echo "== F1 AC2: no node_modules/source in the runtime image =="
if docker exec "$CONTAINER" sh -c 'ls /usr/share/nginx/html' | grep -qi node_modules; then
  fail "node_modules found in the served tree (F1 AC2)"
fi

echo "== SPA-01: GET /teams (deep link) -> 200 =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/teams")
[ "$code" = "200" ] || fail "GET /teams returned $code, expected 200 (SPA-01)"

echo "== SPA-02: GET /some/unknown/path -> 200 (client-side NotFound) =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/some/unknown/path")
[ "$code" = "200" ] || fail "GET /some/unknown/path returned $code, expected 200 (SPA-02)"

echo "== SPA-03: a genuinely missing asset -> 404, never index.html =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/assets/does-not-exist.js")
[ "$code" = "404" ] || fail "GET /assets/does-not-exist.js returned $code, expected 404 (SPA-03)"

echo "== SPA-04: index.html carries no-cache =="
cache_header=$(curl -sI "$BASE/" | grep -i '^cache-control:' || true)
echo "$cache_header" | grep -qi 'no-cache' || fail "index.html Cache-Control was '$cache_header', expected no-cache (SPA-04)"

echo "== SPA-05: a hashed asset carries a long-lived immutable cache =="
asset_cache=$(curl -sI "$BASE$asset" | grep -i '^cache-control:' || true)
echo "$asset_cache" | grep -qi 'immutable' || fail "$asset Cache-Control was '$asset_cache', expected immutable (SPA-05)"

echo "== PROXY: /api/v1/teams is genuinely proxied, not falling through to the SPA =="
# An unauthenticated GET to a real backend always answers 401 (never 200) or,
# if the backend is unreachable, 502 from nginx. A 200 here would mean the
# request fell through to the SPA fallback instead of the /api/ proxy
# location - the exact regression this check exists to catch.
proxy_body=$(curl -s "$BASE/api/v1/teams")
proxy_code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/v1/teams")
case "$proxy_code" in
  401) : ;; # a real backend answered with a real auth rejection
  502) : ;; # backend unreachable — proxy still correctly wired
  *) fail "GET /api/v1/teams returned $proxy_code (body: ${proxy_body:0:200}), expected 401 (backend reachable) or 502 (backend down) — a 200 would mean the request fell through to the SPA fallback instead of the /api/ proxy (PROXY-01..05)" ;;
esac

echo
echo "ALL CHECKS PASSED"
