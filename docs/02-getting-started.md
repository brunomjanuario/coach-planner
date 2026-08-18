# 02 — Getting Started

## Requirements

- **Node.js 18 or newer** (Vite 6 requires 18+; 20 LTS recommended)
- **npm** (a `package-lock.json` is committed — prefer npm over yarn/pnpm)

## Install

```bash
npm install
```

## Run the dev server

```bash
npm run dev
```

Vite prints the local URL, by default `http://localhost:5173`. Hot module
replacement is enabled through `@vitejs/plugin-react`.

You will land on `/signin`, because every route outside `/signin` and `/signup`
is behind the `PrivateRoute` guard. Sign in with:

- **Email:** `user@email.com`
- **Password:** `password`

Alternatively, register any other email on `/signup` — sign-up accepts anything
except the demo address.

To clear the session, use the logout icon at the bottom of the sidebar, or run
`localStorage.removeItem("user")` in the browser console.

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Preview the built bundle with:

```bash
npm run preview
```

> **Note:** `dist/` is listed in `.gitignore` but a `dist/` directory currently
> exists in the working tree. It is build output — do not edit it by hand.

## Run in Docker

```bash
docker compose up -d --build
```

Serves the production build at `http://localhost:5174` — a different port
from the dev server (`5173`) and the backend (`8080`), so all three can run
at once. Internally the container runs nginx on port 8080, which:

- serves the built SPA with a `BrowserRouter`-aware fallback (so `/teams` or
  a hard refresh works, not just client-side navigation from `/`)
- reverse-proxies `/api/` to the backend at `API_UPSTREAM`

**The API URL is relative by design, not an oversight.** `VITE_API_BASE_URL`
is baked into the JS bundle at build time — Vite inlines
`import.meta.env.*` calls — so an absolute URL would work in exactly one
environment. Building with the relative `/api/v1` (the image's default) and
letting nginx proxy it keeps one image portable across environments, and
also means the app is same-origin from the browser's point of view, so the
backend's CORS allowlist (hardcoded to `localhost:5173`) never needs to
know about the container's origin at all.

**Pointing at a different backend** — set `API_UPSTREAM` before bringing the
container up:

```bash
# Backend running on the host via `./gradlew bootRun` (the default):
docker compose up -d --build   # API_UPSTREAM defaults to host.docker.internal:8080

# Backend running in its own repo's compose (`--profile full`) instead:
# join that project's network and point at its service name.
```

```yaml
# docker-compose.override.yml
services:
  web:
    environment:
      API_UPSTREAM: api:8080
    networks: [backend]
networks:
  backend:
    external: true
    name: coach-planner-api_default
```

Both wiring modes were verified end to end against a real running backend,
not just described (see `.specs/features/40-frontend-docker/` for the
verification detail).

```bash
./scripts/smoke-docker.sh   # builds, runs, and asserts the image behaves correctly, then cleans up
```

## Lint

```bash
npm run lint
```

**This currently fails** with 2 errors and 1 warning — see
[10 — Known Issues](10-known-issues.md#lint-does-not-pass). Fix those before
relying on lint in CI.

ESLint 9 flat config lives in [`eslint.config.js`](../eslint.config.js). It
enables the recommended JS rules plus `eslint-plugin-react-hooks` and
`eslint-plugin-react-refresh`, ignores `dist`, and allows unused variables whose
names start with a capital letter or underscore (`varsIgnorePattern:
'^[A-Z_]'`).

## Tests

There is no test runner configured. `npm test` does not exist. The root
`README.md` claims Jest is available — that is left over from a Create React App
scaffold and is not accurate for this project.

## npm scripts reference

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite` | Start the dev server with HMR |
| `build` | `vite build` | Produce a production bundle in `dist/` |
| `preview` | `vite preview` | Serve the contents of `dist/` locally |
| `lint` | `eslint .` | Lint the repository |

## Configuration files

| File | Purpose |
| --- | --- |
| [`vite.config.js`](../vite.config.js) | Registers the React and Tailwind Vite plugins. No aliases, no proxy, no custom port. |
| [`eslint.config.js`](../eslint.config.js) | Flat ESLint config, browser globals, ES2020+. |
| [`index.html`](../index.html) | Vite entry HTML. Title "Coach Planner", inline SVG ⚽️ favicon, mounts `#root`, loads `/src/main.jsx`. |
| [`package.json`](../package.json) | `"type": "module"`, private, version `0.0.0`. |

> `index.html` also contains `<link href="/src/styles.css" rel="stylesheet">`.
> That file does not exist; the real stylesheet is imported from JavaScript in
> `src/main.jsx`. The stale link is harmless but should be removed — see
> [10 — Known Issues](10-known-issues.md).

## Dependency notes

`react-router-dom` is listed under `devDependencies` in `package.json` even
though it is imported by application code at runtime. It works today because the
bundler inlines it, but it belongs in `dependencies`.
