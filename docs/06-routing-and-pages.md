# 06 — Routing & Pages

## Route table

Defined in [`src/App.jsx`](../src/App.jsx).

| Path | Component | Guard | Sidebar icon |
| --- | --- | --- | --- |
| `/signin` | `SignIn` | public | — |
| `/signup` | `SignUp` | public | — |
| `/` | `Home` | private | `IconHome` |
| `/teams` | `Teams` | private | `IconUsersGroup` |
| `/trainings` | `Trainings` | private | `IconPlayFootball` |
| `/games` | `Games` | private | `IconSoccerField` |
| `/calendar` | `Calendar` | private | `IconCalendarWeek` |
| `/settings` | `Settings` | private | `IconSettings` |

There is no catch-all 404 route. An unknown path under `/*` passes the guard,
renders the `Sidebar`, and leaves the content area blank.

## Nested routing

The private routes live in a second `<Routes>` element nested inside the `/*`
route's element, alongside the persistent `<Sidebar />`:

```jsx
<Route
  path="/*"
  element={
    <PrivateRoute>
      <Sidebar></Sidebar>
      <Routes>
        <Route path="/" element={<Home />} />
        …
      </Routes>
    </PrivateRoute>
  }
/>
```

This is why the sidebar persists across navigation without re-mounting. A more
idiomatic React Router 7 approach would be a layout route with `<Outlet />`, but
the nested-`<Routes>` form works.

## Pages

### `Home` — `/`

[`src/pages/Home.jsx`](../src/pages/Home.jsx)

A 3×2 grid of static tiles: Teams, Training, Games, Most Goals, Most Games,
Most Cards. Each tile is a bordered `div` containing only its label — no data is
loaded. This is the placeholder for a future dashboard.

### `Teams` — `/teams`

[`src/pages/Teams.jsx`](../src/pages/Teams.jsx)

The most complete screen. Three equal-width columns:

| Column | Contents |
| --- | --- |
| **Teams** | List of all teams (`club` + `name`) with an `IconShieldPlus` button to add one. Clicking a team selects it and clears the player selection. |
| **Players** | Players of the selected team (`shirtNumber` + `name`) with an `IconUsersPlus` button to add one. |
| **Edit** | Shows `TeamCard` when a team is selected and no player is; shows `PlayerCard` as soon as a player is selected. |

State:

```js
teams, selectedTeam, selectedPlayer, showPopup, showPlayerPopup
```

Data loading: `loadTeams()` calls `teamService.getAll()` on mount, and again from
`closeTeam()` whenever the team card closes — that second call is what makes an
edit or delete visible.

Behaviours worth knowing:

- Selecting a team resets `selectedPlayer` to `null`, so the Edit column falls
  back to the team card.
- The "add player" button is always enabled. If no team is selected,
  `PlayerPopup` receives `teamId={undefined}` and submitting throws inside
  `teamService.addPlayer`.
- After adding a player the list does not refresh — `PlayerPopup` only calls
  `onClose()`.
- List items are missing React `key` props.

### `Trainings` — `/trainings`

[`src/pages/Trainings.jsx`](../src/pages/Trainings.jsx)

Header with a title and an `IconPlus` button that opens `TrainingSavePopup`.
Below it, two columns:

| Column | Contents |
| --- | --- |
| **Teams** (left, narrow) | Team list used as a filter. |
| **Trainings** (right, wide) | Two scrollable panels: "Next Trainings" (`day >= now`) and "Past Trainings" (`day < now`). |

Each training row renders `id`, `day.toString()` and `duration`. Clicking a row
opens `TrainingDetailsPopup`.

State:

```js
selectedTeam, teams, futureTrainings, pastTrainings,
showAddTrainingPopup, showTrainingDetailsPopup, selectedTraining
```

Filtering — `selectTeam(team)` toggles:

- clicking a **new** team sets it as selected and calls `filterTranings(team.id)`
  (note the typo in the function name), which keeps only that team's sessions;
- clicking the **already selected** team clears the selection and reloads all
  trainings unfiltered.

Two separate `useEffect`s run on mount — one loads teams, one loads trainings.

Because both seeded trainings are dated in the past, "Next Trainings" starts
empty. Create a training with a future date to populate it.

List items are missing React `key` props here too, and the `TrainingSavePopup`
`onSubmit` prop passed by this page only closes the modal — the actual save
happens inside the popup itself.

### `Games` — `/games`

[`src/pages/Games.jsx`](../src/pages/Games.jsx)

Placeholder. Renders an `<h1>Games</h1>` and nothing else.

### `Calendar` — `/calendar`

[`src/pages/Calendar.jsx`](../src/pages/Calendar.jsx)

A self-contained month view:

- `‹` / `›` buttons step through months, rolling the year over at the
  December/January boundary.
- The grid is built by padding with `null` cells up to `getFirstDayOfWeek`, then
  one cell per day. Week starts on Sunday.
- Today's cell is highlighted (`#eaf6ff` background, bold) when the displayed
  month and year match the current date.
- Events are matched by building a `YYYY-MM-DD` string per day and filtering the
  local `mockEvents` array. `Game` events render blue, `Training` events orange.

Two caveats:

- The events are **hard-coded inside the file** and dated July 2025. Real
  trainings from `mock.js` are not shown.
- An unused `monthName` variable is computed from `today` rather than the
  displayed month; `displayMonth` is the one actually rendered.

This page is styled entirely with inline `style` objects rather than Tailwind.

### `Settings` — `/settings`

[`src/pages/Settings.jsx`](../src/pages/Settings.jsx)

Placeholder. Renders an `<h1>Settings</h1>`.

### `SignIn` — `/signin`

[`src/pages/SignIn.jsx`](../src/pages/SignIn.jsx)

Email + password form. On submit it calls `signIn` from `AuthContext` and either
navigates to `/` or renders the returned error message in red. A `useEffect`
redirects to `/` if a user is already present, so a signed-in visitor cannot
linger on the page. Links to `/signup`.

### `SignUp` — `/signup`

[`src/pages/SignUp.jsx`](../src/pages/SignUp.jsx)

Username + email + password form, same structure as `SignIn`. On success it sets
a `success` flag *and* navigates to `/` immediately — so the success message is
effectively never seen. Links to `/signin`.

Both auth pages use inline styles rather than Tailwind.
