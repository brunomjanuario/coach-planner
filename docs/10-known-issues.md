# 10 — Known Issues & Roadmap

A catalogue of what is broken, missing or fragile as of the current `main`
(`f250440 update depndencies`). Nothing here is a blocker for local development —
it is context so you are not surprised, and a menu of things worth fixing.

## Bugs

### Production build breaks the images

`TeamCard` and `PlayerCard` use a raw relative path:

```jsx
<img src="src/assets/images/logo.png" />
```

Vite does not rewrite string literals in `src`, so these resolve only against the
dev server root. Confirmed: after `npm run build`, `dist/` contains only
`index.html` and `assets/index-*.{js,css}` — no images at all — while the two
paths above appear verbatim in the JS bundle. They 404 in production.

**Fix:** `import logo from "../assets/images/logo.png"` and use `src={logo}`.

### Missing React `key` props

`pages/Teams.jsx` (both the teams and players lists) and `pages/Trainings.jsx`
(teams, future trainings, past trainings) render `.map()` output without `key`.
React will warn in the console and can mis-reconcile rows when the list changes.

### Random ids collide

New ids come from `Math.floor(Math.random() * 100)` for teams and players. The
seed data already occupies ids 1–8, and 100 possible values across a growing
squad makes duplicates likely. Because the services look records up with
`find(x => x.id === …)`, a collision silently edits or deletes the wrong record.

**Fix:** `crypto.randomUUID()`, or a monotonic counter, or let the server assign
ids once one exists.

### `index.html` links a stylesheet that does not exist

```html
<link href="/src/styles.css" rel="stylesheet">
```

There is no `src/styles.css`. The real stylesheet is `src/index.css`, imported
from `main.jsx`. The tag is dead weight and produces a 404 in dev. `npm run
build` warns about it explicitly:

```
/src/styles.css doesn't exist at build time, it will remain unchanged to be resolved at runtime
```

### `TrainingSavePopup` shadows its own `onSubmit` prop

The component declares a local `function onSubmit(training)` that calls
`trainingService.create`. It never destructures the `onSubmit` prop, so the one
`pages/Trainings.jsx` passes is silently ignored. It happens to work — the local
function does the save — but the prop is misleading and the parent gets no
opportunity to react to a successful create.

### Lists do not refresh after some mutations

Adding a player (`PlayerPopup` → `teamService.addPlayer`) and creating a training
(`TrainingSavePopup` → `trainingService.create`) mutate the underlying arrays in
place and then only call `onClose()`. React does not re-render, so the new record
does not appear until something else triggers one.

`pages/Teams.jsx` shows the intended pattern — `closeTeam()` calls `loadTeams()`
to re-read from the service.

### Add-player is enabled with no team selected

On `/teams` the `IconUsersPlus` button opens `PlayerPopup` unconditionally. With
no team selected, `teamId` is `undefined` and submitting throws inside
`teamService.addPlayer` (`team` is `undefined`, so `team.players` fails).

**Fix:** disable the button, or guard in the service.

### Broken service methods

`teamService.getById`, `trainingService.getById`, `trainingService.update` and
`trainingService.delete` still `fetch` `/api/teams`, which does not exist. They
throw if called. Nothing calls them today. Also note `trainingService` reuses the
teams URL rather than `/api/trainings`.

### `TrainingDetailsPopup` Edit button is inert

The component renders an Edit button wired to an `onEdit` prop, but no caller
passes one, so clicking it does nothing. There is no training-edit flow at all —
`TrainingSavePopup` only creates.

### Sign-up creates unusable accounts

`signUp` accepts any email and starts a session, but never stores the password.
`signIn` only ever matches the hard-coded `user@email.com` / `password` pair, so
after logging out of a registered account you cannot get back in.

### Sign-up success message never renders

`SignUp.handleSubmit` calls `setSuccess(true)` and `navigate("/")` in the same
handler, so the success banner is unmounted before it paints.

### Lint does not pass

`npm run lint` currently reports 2 errors and 1 warning:

| File | Issue |
| --- | --- |
| `src/context/AuthContext.jsx:29` | `'password' is defined but never used` — `signUp` accepts a password and ignores it (see below) |
| `src/context/AuthContext.jsx:52` | `react-refresh/only-export-components` — the file exports both `AuthProvider` and the `useAuth` hook, which breaks fast refresh |
| `src/pages/Calendar.jsx:82` | `'monthName' is assigned a value but never used` |

Note that ESLint does **not** catch the missing `key` props — the config
includes `react-hooks` and `react-refresh` but not `eslint-plugin-react`, so
those only surface as runtime console warnings.

## Gaps

- **No persistence.** All data is in-memory and resets on reload.
- **No backend.** The service layer is scaffolding for one that does not exist.
- **No real auth.** See [08 — Authentication](08-authentication.md).
- **No tests.** No runner, no test files.
- **Placeholder pages.** `Home`, `Games` and `Settings` are stubs.
- **Calendar is disconnected.** `pages/Calendar.jsx` renders its own hard-coded
  `mockEvents` dated July 2025 instead of real trainings.
- **No 404 route.** Unknown private paths render the sidebar and a blank area.
- **Player stats are read-only.** `goals`, `assists` and `concededGoals` exist in
  the model but no form writes them, and `assists` is never displayed.
- **`position` is unvalidated free text.** The `Positions` map in `mock.js` is
  not exported and not used by the form.
- **Exercises lose most of their fields.** The seed shape has
  `numberOfPlayers`, `duration`, `repetitions` and `image`; the create form
  collects only `description`.

## Cleanup

- **Stale root `README.md`** — describes a Create React App project
  (`npm start`, `npm test`, `build/`). This project is Vite. Replace it, or point
  it at `docs/`.
- **Empty `src/App.css`** — still imported by `App.jsx` and `pages/Calendar.jsx`.
- **`react-router-dom` is in `devDependencies`** — it is a runtime dependency.
- **`postcss` / `autoprefixer` are unused** — leftovers from Tailwind 3; there is
  no PostCSS config.
- **Inline styles in three files** — `Calendar`, `SignIn`, `SignUp` bypass
  Tailwind entirely. See [09 — Styling](09-styling.md).
- **Unused `monthName` variable** in `pages/Calendar.jsx`, computed from `today`
  rather than the displayed month.
- **Typo:** `filterTranings` in `pages/Trainings.jsx`.
- **`<Sidebar></Sidebar>`** in `App.jsx` could be self-closing.
- **Logout is a `<Link>` with `preventDefault`** — should be a `<button>`.
- **Modal a11y** — no `Escape` handling, no backdrop click-to-close, no focus
  trap, no `role="dialog"`.

## Suggested order of work

**1. Quick correctness wins**

Add the missing `key` props, fix the image imports, drop the dead `styles.css`
link, replace random ids with `crypto.randomUUID()`, disable add-player when no
team is selected.

**2. Make the data layer honest**

Pick one model — either commit to the in-memory store (and have every mutation
return fresh objects so React re-renders reliably) or stand up a real API. Either
way, delete the half-migrated `fetch` methods and make every mutation call site
refresh.

**3. Persist something**

Even `localStorage`-backed teams and trainings would make the app usable for a
real coach and would force the serialization questions (notably `day` as a
`Date`) to be answered before a server exists.

**4. Finish the core screens**

Wire `Home` to real counts, connect `Calendar` to the actual trainings, and give
trainings an edit flow (the `onEdit` hook is already in place).

**5. Then the rest**

Games, Settings, real authentication, tests.
