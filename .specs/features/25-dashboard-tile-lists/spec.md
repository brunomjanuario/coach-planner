# Dashboard Tile Lists Specification

**Scope:** Large · **Design:** skipped (settled in Assumptions) · **Depends on:** 11-dashboard, 18-dashboard-grid

## Problem Statement

The dashboard's Overview row is three counts and a date
(`src/pages/Home.jsx:106-135`). "Teams 3" tells a coach a number they already
know and gives them nowhere to go. The same is true of "Training 18" and
"Games 12" — the one number that is actually useful, the *next* event, is
already a link, which is exactly the shape the other three are missing.

Meanwhile the only way to reach a specific team, training or game from the
dashboard is to click through to the page and find it again by eye. The
deep-link machinery to land directly on a record already exists
(`src/lib/useDeepLinkPopup.js`, used by Trainings and Games), so the dashboard
is throwing away a capability the app already has.

## Goals

- [ ] Overview tiles show *which* records exist, not just how many
- [ ] Clicking a row lands on that record's page with that record open
- [ ] Counts are still visible — the list adds information, it does not replace it
- [ ] The Teams page gains the `?team=` deep link the other pages already have

## Out of Scope

| Feature | Reason |
|---|---|
| Changing the Leaders row | `11` defined those tiles and `18` sized them. They already list entities. |
| Making the tile rows filter the dashboard | Decided: rows **navigate**. The team filter stays its own control (see `32-dashboard-filter-ui`). |
| Equalising tile heights across the two sections | That is `32`'s job, once the tiles' final content is known. |
| Inline editing from the dashboard | The dashboard reads; the pages write. |
| New metrics | `11` defined what is shown. |
| Pagination inside a tile | A tile shows the first N and a "+X more" affordance. Anything more is a page, not a tile. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| What a click does | Navigates to the record's page with that record selected/opened | User decision. Keeps the dashboard read-only and reuses the existing deep-link params. | **y** |
| Rows per tile | 3, matching `LeaderTile` | The Leaders row already settled on 3 and the grid is sized for it. A different number in the neighbouring section would look accidental. | n |
| Which 3 | Teams: alphabetical by `club name`. Trainings and Games: the soonest **upcoming** first; if there are none, the most recent **past** instead | A coach's dashboard is about what is next. Falling back to past means an out-of-season tile is still informative rather than empty. | n |
| The fallback is labelled | When showing past records the tile's note reads "most recent" instead of "next up" | Otherwise a past date in a "next" tile reads as a bug. | n |
| Counts survive | The existing count and breakdown line stay in the tile, above the list | The complaint was "not *just* a count number", not "no count". | n |
| Teams deep link | Add `?team=<id>` to `src/pages/Teams.jsx`, synced with `useSearchParams` | Teams has `selectedTeam` state already; this mirrors what `23-settings-tabs` did with `?tab=`. Without it, "click navigates" degrades to "click goes to the Teams page". | n |
| Trainings / Games links | Reuse the existing `?training=` and `?game=` params verbatim | They already open the record's popup and already handle the not-found case. No new machinery. | n |
| Shared component | One new `ListTile`, built on `Tile`, sibling to `LeaderTile` | `LeaderTile` already proves the shape. A third copy of the surface would repeat the drift AD-009 and `18` were written to stop. | n |
| Dangling references | A row whose record no longer resolves is not rendered | The deep link's own not-found path already covers the race; not rendering avoids a link that is known-dead before it is clicked. | n |
| Team filter interaction | The lists respect the active team filter, exactly as the counts already do | Otherwise filtering the dashboard would change the number but not the list under it. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Overview tiles list their records ⭐ MVP

**User Story**: As a coach, I want the dashboard to show me which teams,
trainings and games exist so that I can see my week without opening three pages.

**Why P1**: This is the request.

**Acceptance Criteria**:

1. WHEN the Teams tile renders with teams present THEN it SHALL render the
   count **and** up to 3 team names, ordered alphabetically by `club name`
2. WHEN the Trainings tile renders with upcoming trainings THEN it SHALL render
   up to 3 of them, soonest first, each showing its training number and date
3. WHEN the Games tile renders with upcoming games THEN it SHALL render up to 3
   of them, soonest first, each showing the opponent and date
4. WHEN a tile's collection has more than 3 records THEN it SHALL render a
   "+N more" indicator whose N equals the count minus the rows shown
5. WHEN a tile's collection is empty THEN it SHALL render the existing empty
   state and its "Add one" link, unchanged from `11-dashboard`
6. WHEN a team filter is active THEN each tile's rows SHALL be drawn from the
   filtered collection, matching the count shown beside them

**Independent Test**: Seed 5 teams, 4 upcoming trainings and 1 game; assert 3
team rows + "+2 more", 3 training rows + "+1 more", 1 game row and no indicator.

---

### P2: A row is a link to its record

**User Story**: As a coach, I want to click a training on the dashboard and land
on it so that I stop searching for it on the Trainings page.

**Why P2**: The list without the link is a nicer number.

**Acceptance Criteria**:

1. WHEN a team row is clicked THEN the app SHALL navigate to
   `/teams?team=<id>` and that team SHALL be the selected team on arrival
2. WHEN a training row is clicked THEN the app SHALL navigate to
   `/trainings?training=<id>` and that training's details popup SHALL open
3. WHEN a game row is clicked THEN the app SHALL navigate to
   `/games?game=<id>` and that game's popup SHALL open
4. WHEN a row is focused via the keyboard THEN it SHALL show a visible focus
   indicator and SHALL activate on Enter
5. WHEN a row's record has been deleted since load THEN the destination page
   SHALL show its existing "no longer exists" message rather than an error

**Independent Test**: Click a training row; assert the URL is
`/trainings?training=<id>` and the details popup is in the document.

---

### P3: The Teams page honours `?team=`

**User Story**: As a coach, I want a team link to open that team so that the
dashboard row does something more than "go to Teams".

**Why P3**: It is the one destination that does not already support this. It is
listed separately because it changes a page the dashboard does not own.

**Acceptance Criteria**:

1. WHEN `/teams?team=<id>` is opened THEN that team SHALL be the selected team
   and its players SHALL be listed
2. WHEN a team is selected on the Teams page THEN the URL SHALL update to
   `?team=<id>` without a reload
3. WHEN `?team=` holds an id that matches no team THEN the page SHALL open with
   no team selected and SHALL NOT throw
4. WHEN `?team=` is absent THEN the page SHALL behave exactly as it does today

---

## Edge Cases

- WHEN there are no upcoming trainings but past ones exist THEN the tile SHALL
  show the 3 most recent past trainings and its note SHALL read "most recent"
- WHEN there are neither upcoming nor past records THEN the empty state SHALL
  render, not an empty list with a "+0 more"
- WHEN exactly 3 records exist THEN no "+N more" indicator SHALL render
- WHEN a training has no number (unassigned team) THEN its row SHALL fall back
  to its date alone rather than rendering "Training #undefined"
- WHEN a game's opponent string is long THEN the row SHALL wrap, not truncate
- WHEN the dashboard is still loading THEN each tile SHALL render its existing
  skeleton, unchanged, so the grid does not jump

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| DTILE-01 | P1: Tiles list records | Tasks | Pending |
| DTILE-02 | P1: Counts and overflow preserved | Tasks | Pending |
| DTILE-03 | P2: Rows navigate | Tasks | Pending |
| DTILE-04 | P3: Teams `?team=` deep link | Tasks | Pending |

**Coverage:** 4 total, 4 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] A coach can reach any of their next 3 trainings in one click from the dashboard
- [ ] Every Overview tile shows both a count and its records
- [ ] `11-dashboard`'s empty states and loading skeletons still behave identically
