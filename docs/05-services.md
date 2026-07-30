# 05 — Services

The service layer is the boundary between the UI and the data. Two modules exist,
both exporting a single object of `async` methods.

Every method is `async` even when it does no I/O, so the call sites already
`await` and a real HTTP backend can be substituted without touching the UI.

> **Mixed implementation.** Some methods operate on the in-memory arrays from
> `src/model/mock.js`; others still call `fetch` against `/api/teams`, an
> endpoint that does not exist. Calling those will throw. They are flagged
> below.

## `teamService`

[`src/services/teamService.js`](../src/services/teamService.js)

```js
import { teamService } from "../services/teamService";
```

Holds `let teamsData = teams` — a reference to the exported seed array.

### Teams

| Method | Signature | Behaviour |
| --- | --- | --- |
| `getAll` | `() => Promise<Team[]>` | Returns the live `teamsData` array (not a copy). |
| `getById` | `(id) => Promise<Team>` | ⚠️ **Broken.** `fetch("/api/teams/{id}")` — throws `Failed to fetch team`. Not called anywhere. |
| `create` | `(teamData) => Promise<void>` | Pushes the object onto `teamsData`. No validation, no duplicate-id check. |
| `update` | `(teamData) => Promise<void>` | Finds by `teamData.id` and copies `name`, `club`, `season`. Does **not** update `players`. Throws if the id is not found. |
| `delete` | `(id) => Promise<void>` | Reassigns `teamsData` to a filtered array. ⚠️ Callers that already hold the old array (see below) will not see the removal. |

### Players

| Method | Signature | Behaviour |
| --- | --- | --- |
| `addPlayer` | `(teamId, playerData) => Promise<void>` | Finds the team and pushes onto `team.players`. Throws if `teamId` does not match a team. |
| `updatePlayer` | `(playerData) => Promise<void>` | Locates the team via `playerData.teamId`, then the player via `playerData.id`, and copies `age`, `name`, `shirtNumber`, `position`. Stats (`goals`, `assists`, `concededGoals`) are untouched. |
| `deletePlayer` | `(playerData) => Promise<void>` | Removes the player from `team.players` by id and reassigns the array. |

### The `delete` reference problem

`delete` does this:

```js
teamsData = teamsData.filter((team) => team.id !== id);
```

It rebinds the module-local `teamsData`, but the array previously handed to a
component by `getAll()` — and the original `teams` export in `mock.js` — still
point at the old array, which still contains the deleted team.

`pages/Teams.jsx` works around it: `closeTeam()` calls `loadTeams()`, which calls
`getAll()` again and picks up the new array. Any caller that skips that step will
show stale data.

`deletePlayer` does not have this problem in the same way — it reassigns
`team.players`, and the team object itself is shared, so readers of that team see
the change.

## `trainingService`

[`src/services/trainingService.js`](../src/services/trainingService.js)

```js
import { trainingService } from "../services/trainingService";
```

Holds `let trainingsData = trainings`.

| Method | Signature | Behaviour |
| --- | --- | --- |
| `getAll` | `() => Promise<Training[]>` | Returns the live `trainingsData` array. |
| `getById` | `(id) => Promise<Training>` | ⚠️ **Broken.** `fetch("/api/teams/{id}")` — note it hits the *teams* URL. Not called anywhere. |
| `create` | `(trainingData) => Promise<void>` | Pushes onto `trainingsData`. |
| `update` | `(id, teamData) => Promise<Training>` | ⚠️ **Broken.** `PUT /api/teams/{id}`. Not called anywhere. |
| `delete` | `(id) => Promise<boolean>` | ⚠️ **Broken.** `DELETE /api/teams/{id}`. Not called anywhere. |

Both modules declare `const API_URL = "/api/teams"` at the top —
`trainingService` reuses the teams URL rather than defining `/api/trainings`.
Fix that when the real API arrives.

## Who calls what

| Caller | Calls |
| --- | --- |
| `pages/Teams.jsx` | `teamService.getAll` |
| `pages/Trainings.jsx` | `teamService.getAll`, `trainingService.getAll` |
| `components/TeamPopup.jsx` | `teamService.create`, `teamService.update` |
| `components/TeamCard.jsx` | `teamService.delete` |
| `components/PlayerPopup.jsx` | `teamService.addPlayer`, `teamService.updatePlayer` |
| `components/PlayerCard.jsx` | `teamService.deletePlayer` |
| `components/TrainingSavePopup.jsx` | `trainingService.create` |

Note that mutations are invoked from **components**, not pages — popups and
cards call services directly, then fire `onClose()` so the parent can refresh.

## Error handling

Services do not catch anything.

- The in-memory methods throw `TypeError` when a `find()` returns `undefined`
  (e.g. `update` with an unknown id).
- The `fetch` methods throw the explicit `Error("Failed to fetch team")`.

Call sites vary: `pages/Teams.jsx` and `pages/Trainings.jsx` wrap loads in
`try/catch` and `console.error`. The mutation call sites in the popups and cards
do not — an exception there surfaces as an unhandled rejection.

## Replacing the mock store with a real API

The intended migration path:

1. Give `trainingService` its own `API_URL` (`/api/trainings`).
2. Rewrite each method as a `fetch` against the real endpoint, returning parsed
   JSON.
3. Have mutating methods return the created/updated entity.
4. Update pages to re-fetch after every mutation (or lift the lists into a
   context), since in-place mutation will no longer make changes appear.
5. Remove the `src/model/mock.js` imports.
6. Convert `day` back into a `Date` after parsing JSON — JSON has no date type,
   so a serialized training returns `day` as an ISO string. See
   [04 — Data Model](04-data-model.md).
