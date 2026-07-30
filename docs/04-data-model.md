# 04 — Data Model

All shapes are plain JavaScript objects defined in
[`src/model/mock.js`](../src/model/mock.js). There are no TypeScript types, no
schema validation and no runtime type checks — the structures below are the
contract by convention.

## Entity relationships

```
Team 1 ──── * Player          Player.teamId → Team.id, and Team.players[] holds them
Team 1 ──── * Training        Training.teamId → Team.id (not nested on Team)
Training 1 ─ * Exercise       Exercise.trainingId → Training.id, nested in Training.exercises[]
```

Note the asymmetry: **players are nested inside their team**, while **trainings
are a separate top-level array** linked back by `teamId`.

## Team

```js
{
  id: 1,               // number — unique
  name: "Sub-11",      // string — age group / squad name
  club: "Amadora",     // string — club name
  season: "23/24",     // string — free text
  players: [ /* Player */ ],
}
```

Displayed throughout the UI as `` `${club} ${name}` `` — e.g. "Amadora Sub-11".

## Player

```js
{
  id: 1,               // number — unique across all teams
  teamId: 1,           // number — owning Team.id
  name: "João",        // string
  age: 15,             // number
  shirtNumber: 1,      // number
  goals: 3,            // number — season total
  assists: 1,          // number — season total
  concededGoals: 0,    // number — season total, meaningful for goalkeepers
  position: "CAM",     // string — see Positions below
}
```

`goals`, `assists` and `concededGoals` are seeded and rendered
(`PlayerCard` shows goals and conceded goals) but there is no UI to edit them.
`PlayerPopup` only writes `name`, `age`, `shirtNumber` and `position`.

`assists` is stored but never displayed.

### Positions

`mock.js` defines a `Positions` map of standard football position codes. It is
**not exported** — it is used only to build the seed data. `PlayerPopup` accepts
position as free text, so nothing constrains a saved player to these values.

```
GK
RB   CB   LB   RWB  LWB
CDM  RM   CM   LM   CAM
RW   LW   ST   CF   RF   LF
```

## Training

```js
{
  id: 1,
  teamId: 1,                              // number — owning Team.id
  day: new Date("2024-10-24T15:00:00Z"),  // Date object, not a string
  duration: 90,                           // number — minutes
  exercises: [ /* Exercise */ ],
}
```

`day` is a real `Date` instance in the seed data, and `TrainingSavePopup`
converts the `datetime-local` input value with `new Date(...)` before saving, so
the invariant holds for created records too. Code that reads `day` should not
assume it is a string.

`TrainingDetailsPopup` defensively handles both forms:

```jsx
training.day instanceof Date
  ? training.day.toLocaleString()
  : new Date(training.day).toLocaleString()
```

## Exercise

Seed shape:

```js
{
  id: 1,
  trainingId: 1,        // number — owning Training.id
  numberOfPlayers: 21,  // number
  duration: 10,         // number — minutes
  repetitions: 1,       // number
  description: "Corrida",
  image: "",            // string — always empty; no upload UI exists
}
```

**Exercises created through the UI have a smaller shape.**
`TrainingSavePopup` only collects a description:

```js
{ id: Date.now(), description: "…" }
```

No `trainingId`, `numberOfPlayers`, `duration`, `repetitions` or `image`. Any
code that reads those fields must tolerate `undefined`. `TrainingDetailsPopup`
happens to render only `description`, so the gap is invisible today.

## Calendar Event

Not part of `mock.js`. [`pages/Calendar.jsx`](../src/pages/Calendar.jsx) defines
its own local `mockEvents` array:

```js
{
  id: 1,
  type: "Game",              // "Game" | "Training" — drives the event color
  title: "Match vs Tigers",
  date: "2025-07-10",        // string, "YYYY-MM-DD"
  time: "18:00",             // string, "HH:MM"
}
```

This data is completely disconnected from `trainings` in `mock.js`. The calendar
does not show real training sessions.

## Id generation

Ids are generated client-side at creation time:

| Entity | Source | Range |
| --- | --- | --- |
| Team | `Math.floor(Math.random() * 100)` in `TeamPopup` | 0–99 |
| Player | `Math.floor(Math.random() * 100)` in `PlayerPopup` | 0–99 |
| Training | `Math.floor(Math.random() * 10000)` in `TrainingSavePopup` | 0–9999 |
| Exercise | `Date.now()` in `TrainingSavePopup` | timestamp |

The random ids can collide with each other and with the seed ids (1–8), which
would break the `find`-by-id lookups in the services. See
[10 — Known Issues](10-known-issues.md).

## Persistence

None. The arrays are module-level `var` exports; every page reload restores the
original seed data. The only thing written to `localStorage` is the auth user
object — see [08 — Authentication](08-authentication.md).
