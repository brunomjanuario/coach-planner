# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Coach Planner — a single-page React app for football (soccer) coaches to manage
teams, players, trainings, games and a calendar. The app currently runs entirely
in the browser against in-memory mock data; there is no backend.

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
  context/AuthContext   mock auth backed by localStorage
  model/mock.js         seed data (teams, players, trainings, exercises)
  services/             teamService, trainingService — the data access layer
  pages/                one file per route
  components/           cards and modal popups
  assets/images/        logos and placeholder avatar
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

`services/teamService.js` and `services/trainingService.js` are the only modules
that touch data. They are `async` so a real API can be dropped in later, but most
methods currently mutate the arrays exported from `src/model/mock.js` in place.
A few methods (`teamService.getById`, `trainingService.getById/update/delete`)
still `fetch` a `/api/teams` endpoint that does not exist and will throw if
called.

Because mutations happen in place and are not reflected in React state, callers
must re-read from the service (see `loadTeams()` in `pages/Teams.jsx`) for the UI
to update.

## Auth

`context/AuthContext.jsx` is a mock. `signIn` only accepts the hard-coded
`user@email.com` / `password` pair; `signUp` accepts anything else. The user
object is persisted to `localStorage` under the key `user`. `PrivateRoute` in
`App.jsx` redirects to `/signin` when there is no user.

Do not treat this as real authentication — there is no token, no server check
and no password hashing.

## Known rough edges

Don't be surprised by these; fix them only when the task calls for it.

- `index.html` links `/src/styles.css`, which does not exist (`main.jsx` imports
  `src/index.css` instead).
- `src/App.css` is empty but still imported by `App.jsx` and `pages/Calendar.jsx`.
- List items rendered with `.map()` are missing React `key` props in
  `pages/Teams.jsx` and `pages/Trainings.jsx`.
- `TeamCard` and `PlayerCard` reference images as `src/assets/images/*.png`,
  a path that only resolves in dev, not in the production build.
- New ids are generated with `Math.floor(Math.random() * 100)` and can collide.
- `pages/Games.jsx` and `pages/Settings.jsx` are placeholders.
- `pages/Calendar.jsx` renders its own hard-coded `mockEvents`, unconnected to
  the trainings data.
- `TrainingDetailsPopup` renders an Edit button but no caller passes `onEdit`.
