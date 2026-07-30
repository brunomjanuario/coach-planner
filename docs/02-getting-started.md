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
