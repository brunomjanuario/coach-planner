# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Coach Planner — a single-page React app for football (soccer) coaches to manage
teams, players, trainings, games and a calendar. The app talks to a real
backend, `coach-planner-api` (a sibling Kotlin/Spring Boot service over
PostgreSQL, run separately — see its own repo), for all data and auth.

Detailed documentation lives in [`docs/`](docs/README.md).

## Commands

```bash
npm install      # install dependencies
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # serve the production build
npm run lint     # ESLint over the repo
```

There is no test runner configured. The root `README.md` is stale — it describes
a Create React App setup (`npm start`, `npm test`, `build/`) that does not match
this project.

## Stack

- React 19 + React Router 7 (`BrowserRouter`)
- Vite 6 build tooling
- Tailwind CSS 4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js`;
  theme tokens are declared with `@theme` in `src/index.css`)
- `@tabler/icons-react` for icons
- ESLint 9 flat config

## Layout

```
src/
  main.jsx              entry: BrowserRouter > AuthProvider > App
  App.jsx               routes + PrivateRoute guard
  index.css             Tailwind import + @theme tokens + global element styles
  lib/apiClient.js       shared fetch wrapper: bearer auth, refresh-and-retry,
                         typed-error mapping (used by every service + AuthContext)
  lib/tokenStore.js      in-memory access token + localStorage refresh token
  context/AuthContext    real auth against coach-planner-api
  services/              8 modules (team/training/game/standings/card/rating/
                         competition/opponent), each a thin apiFetch wrapper
  pages/                one file per route
  components/           cards and modal popups
  assets/images/         logos and placeholder avatar
```

## Conventions

- Components are default-exported function components, one per file, `.jsx`.
- Pages own the data fetching (`useEffect` + service call into `useState`);
  components receive data through props and call services for mutations.
- Modals follow the `*Popup` naming convention and take an `onClose` callback.
  They render a fixed full-screen overlay and are mounted conditionally by the
  parent (`{showX && <XPopup … />}`).
- Cards follow the `*Card` naming convention and render a single entity.
- All UI copy is English; mock data contains Portuguese club/player names.
- Styling is Tailwind utility classes. Two custom colors exist:
  `bg-lightblack` (`#171717`) and `bg-lightgrey` (`rgb(71,71,71)`).
  `Calendar.jsx`, `SignIn.jsx` and `SignUp.jsx` are the exceptions — they use
  inline `style` objects. Prefer Tailwind for new work.

## Data layer

`src/services/*.js` (8 modules: `teamService`, `trainingService`,
`gameService`, `standingsService`, `cardService`, `ratingService`,
`competitionService`, `opponentService`) are the only modules that touch
data. Every method is a thin wrapper around `apiFetch` (`src/lib/
apiClient.js`), which attaches the bearer token, retries once on an expired
access token, and maps API errors to typed errors (`NotFoundError`,
`ValidationError`, `ConflictError`, `AuthError`, `ApiError`, `NetworkError`
— `src/lib/errors.js`). There is no local mock store; every read/write goes
to the real `coach-planner-api` backend.

`trainingService`/`gameService` rehydrate `day`/`date` fields to `Date`
instances on read (`src/lib/dates.js`) so callers keep using them like plain
`Date` objects. Cascading deletes (e.g. deleting a team removes its
players' cards/ratings) happen server-side via FK actions — no service
calls another service's `removeBy*` helper.

Because a mutation's response isn't reflected in React state automatically,
callers must re-read from the service (see `loadTeams()` in
`pages/Teams.jsx`) for the UI to update.

## Auth

`context/AuthContext.jsx` performs real authentication against
`coach-planner-api`: `signIn`/`signUp` `POST /auth/login`/`/auth/register`,
`signOut` `POST`s `/auth/logout` (best-effort) then clears local tokens,
and `updateProfile`/`changePassword` hit `PATCH /users/me` and
`PUT /users/me/password`. The access token lives only in memory
(`src/lib/tokenStore.js`); the refresh token persists in `localStorage`
under `refreshToken`, and a boot-time silent refresh keeps a valid session
alive across a page reload. A successful `changePassword` revokes the
session server-side, so the frontend signs the coach out and requires a
fresh sign-in — this is intentional, not a bug. `PrivateRoute` in `App.jsx`
redirects to `/signin` when there is no user, and also fires globally
whenever any API call's auth fails past its retry.

There is no plaintext credential storage, no demo account, and no
client-side password logic left. See `docs/08-authentication.md` for the
full picture.

## Known rough edges

Don't be surprised by these; fix them only when the task calls for it.

- `index.html` links `/src/styles.css`, which does not exist (`main.jsx` imports
  `src/index.css` instead).
- List items rendered with `.map()` are missing React `key` props in
  `pages/Teams.jsx` and `pages/Trainings.jsx`.
- `TeamCard` and `PlayerCard` reference images as `src/assets/images/*.png`,
  a path that only resolves in dev, not in the production build.
- New ids are generated with `Math.floor(Math.random() * 100)` and can collide.
- `pages/Games.jsx` and `pages/Settings.jsx` are placeholders.
- `pages/Calendar.jsx` renders its own hard-coded `mockEvents`, unconnected to
  the trainings data.
- `TrainingDetailsPopup` renders an Edit button but no caller passes `onEdit`.
