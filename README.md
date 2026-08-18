# Coach Planner

A single-page React app for football (soccer) coaches to manage teams,
players, trainings, games and a calendar. It talks to a real backend,
[`coach-planner-api`](../coach-planner-api) (a sibling Kotlin/Spring Boot
service over PostgreSQL, run separately), for all data and authentication —
there is no offline/demo mode.

Detailed documentation lives in [`docs/`](docs/README.md); day-to-day
conventions for working in this codebase are in [`CLAUDE.md`](CLAUDE.md).

## Stack

- React 19 + React Router 7 (`BrowserRouter`)
- Vite 6 build tooling
- Tailwind CSS 4 (`@tailwindcss/vite` plugin, no `tailwind.config.js` — theme
  tokens live in `src/index.css`)
- Vitest + React Testing Library
- `@tabler/icons-react`, `konva`/`react-konva` (exercise diagram editor)

## Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **`coach-planner-api` running** — either on the host via
  `./gradlew bootRun`, or in Docker. See that repo's own README. Without it,
  the app has nothing to sign in against.
- **Docker**, only if you want to run the frontend itself as a container
  rather than through the dev server.

## Running it

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. You'll land on `/signin` — register a new
account on `/signup` (there is no demo account; every user is a real one,
stored in the backend's Postgres).

By default the app talks to the backend at `http://localhost:8080/api/v1`
(`VITE_API_BASE_URL` in `.env` — see `.env.example`).

## Running in Docker

```bash
docker compose up -d --build
```

Serves the production build at `http://localhost:5174` (a different port
from the dev server and the backend, so all three can run together). The
container's nginx reverse-proxies `/api/` to the backend — see
[`docs/02-getting-started.md`](docs/02-getting-started.md#run-in-docker) for
both backend-wiring modes, and why the API URL is relative rather than baked
into the image.

```bash
./scripts/smoke-docker.sh   # build + run + assert the image works, then clean up
```

## Testing, linting, building

```bash
npm test -- --run   # Vitest, once (drop `-- --run` to watch)
npm run lint         # ESLint over the repo
npm run build         # production build into dist/
npm run preview       # serve the production build locally
```

## Project layout

```
src/
  main.jsx              entry: BrowserRouter > AuthProvider > App
  App.jsx               routes + PrivateRoute guard
  lib/apiClient.js       shared fetch wrapper: bearer auth, refresh-and-retry, typed errors
  context/AuthContext    real auth against coach-planner-api
  services/              8 modules (team/training/game/standings/card/rating/competition/opponent)
  pages/                 one file per route
  components/            cards and modal popups
```

See [`CLAUDE.md`](CLAUDE.md) for the full layout, conventions, and known
rough edges, and [`docs/`](docs/README.md) for a per-topic breakdown
(architecture, data model, services, auth, styling).
