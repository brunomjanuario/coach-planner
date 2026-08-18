# Coach Planner — Feature Roadmap

Four planning rounds. **Round one** (`00`–`11`) built the app: twelve features
derived from ten ideas, plus two foundations. **Round two** (`12`–`24`) is
thirteen features derived from the user's change list. Both rounds are
implemented and merged. **Round three** (`25`–`32`) is eight features derived
from the user's second change list — one feature per item, each independently
shippable. **Round four** (`33`–`38`) is six features derived from a code audit
rather than a change list — the first round whose input is defects the user
never reported because the test suite hid them.

Every feature has a `spec.md` (WHAT, with traceable requirement IDs) and a
`tasks.md` (atomic tasks with dependencies, tests and gates).

## Round one — shipped

```
00-test-harness  ────────────────────────────────┐
      │                                          │ blocks everything
      ▼                                          │
01-persistence-layer ────────────────────────────┤
      │                                          │
      ├──► 02-select-team-color   (needs only 00)│
      ├──► 03-training-team-assignment           │
      ├──► 04-training-form                      │
      ├──► 05-training-number                    │
      ├──► 06-training-edit                      │
      │                                          │
      └──► 07-games-league-table                 │
                 ├──► 08-player-cards            │
                 ├──► 09-player-ratings          │
                 ├──► 10-calendar-navigation     │
                 └──► 11-dashboard  (consumes 07, 08, 09)
```

| # | Feature | Idea it serves | Scope | Tasks | Depends on |
|---|---------|----------------|-------|-------|------------|
| 00 | [test-harness](features/00-test-harness/spec.md) | *(foundation — AD-001)* | Medium | 6 | — |
| 01 | [persistence-layer](features/01-persistence-layer/spec.md) | *(foundation — AD-002)* | Large | 10 | 00 |
| 02 | [select-team-color](features/02-select-team-color/spec.md) | Fix select team color | Small | 4 | 00 |
| 03 | [training-team-assignment](features/03-training-team-assignment/spec.md) | Training creation to the right team | Medium | 5 | 01 |
| 04 | [training-form](features/04-training-form/spec.md) | Make training form | Medium | 6 | 01, 03 |
| 05 | [training-number](features/05-training-number/spec.md) | Train Number logic | Medium | 4 | 01 |
| 06 | [training-edit](features/06-training-edit/spec.md) | Create edit for training | Medium | 5 | 01, 04 |
| 07 | [games-league-table](features/07-games-league-table/spec.md) | Games screen + league table | Large | 10 | 01 |
| 08 | [player-cards](features/08-player-cards/spec.md) | Add cards to players | Medium | 5 | 07 |
| 09 | [player-ratings](features/09-player-ratings/spec.md) | Give points to players | Large | 9 | 07 |
| 10 | [calendar-navigation](features/10-calendar-navigation/spec.md) | Clickable calendar events | Medium | 6 | 07 |
| 11 | [dashboard](features/11-dashboard/spec.md) | Make Dashboard | Large | 8 | 07, 08, 09 |

**78 atomic tasks.** All merged to `main`.

---

## Round two — shipped

```
12-player-list-refresh  ─┐
13-popup-shell  ─────────┤ independent quick fixes
14-ratings-contrast  ────┤ (13 first — 20/21/24 build on it)
15-calendar-event-colours┘

16-training-card ──► 17-trainings-page-layout

18-dashboard-grid        (independent)
19-games-three-column    (independent)

20-competitions ─┐
21-opponents ────┴──► 22-game-form-selects

23-settings-tabs ──► 24-profile-settings
```

| # | Feature | Change it serves | Scope | Tasks | Depends on |
|---|---------|------------------|-------|-------|------------|
| 12 | [player-list-refresh](features/12-player-list-refresh/spec.md) | "Refresh on delete player or add" | Small | 3 | 01 |
| 13 | [popup-shell](features/13-popup-shell/spec.md) | 6 — scrollable popups with a max size | Medium | 5 | 00 |
| 14 | [ratings-contrast](features/14-ratings-contrast/spec.md) | 5 — white-on-white in the ratings UI | Small | 2 | 09 |
| 15 | [calendar-event-colours](features/15-calendar-event-colours/spec.md) | 3 — orange games, blue trainings | Small | 3 | 10 |
| 16 | [training-card](features/16-training-card/spec.md) | 1 + 7 — a better-looking training row | Medium | 4 | 05, 06 |
| 17 | [trainings-page-layout](features/17-trainings-page-layout/spec.md) | 2 — show all trainings on start | Medium | 3 | 16 |
| 18 | [dashboard-grid](features/18-dashboard-grid/spec.md) | 4 — symmetric, better-designed dashboard | Medium | 4 | 11 |
| 19 | [games-three-column](features/19-games-three-column/spec.md) | 8 — teams / next game / league table | Medium | 4 | 07 |
| 20 | [competitions](features/20-competitions/spec.md) | 9 — create a competition | Medium | 5 | 01, 07, 13 |
| 21 | [opponents](features/21-opponents/spec.md) | 10 — create an opponent | Medium | 5 | 01, 07, 13 |
| 22 | [game-form-selects](features/22-game-form-selects/spec.md) | 11 — competition and opponent as selects | Medium | 4 | 20, 21 |
| 23 | [settings-tabs](features/23-settings-tabs/spec.md) | 13a — Profile / Advanced tabs | Small | 3 | 01 |
| 24 | [profile-settings](features/24-profile-settings/spec.md) | 13b — edit name, email, password | Medium | 5 | 23 |

**50 atomic tasks.**

### Suggested order

1. **`12`, `13`, `14`, `15`** — small, independent, immediately visible. `13` earns its place first: `20`, `21` and `24` all add popups, and the shell stops them being born broken.
2. **`16` → `17`** — the trainings redesign. `16` changes what a row looks like, `17` changes where rows go. Both touch `pages/Trainings.jsx`, so keep them in order.
3. **`18`, `19`** — the two other layout reworks. Independent of each other and of everything above.
4. **`20`, `21` → `22`** — the data features. `20` and `21` are mirror images; whichever runs second reuses the first's shape, and its migration takes the next schema version.
5. **`23` → `24`** — settings. `23` builds the tab shelf, `24` puts the profile form on it.

### Where the changes were split, and why

The user asked for atomic plans. Three of the thirteen changes were merged or
split rather than mapped one-to-one:

- **Changes 1 and 7** ("improve display trainings", "make it more beauty") are one
  redesign of the same row, so they are one feature (`16`). Splitting them would
  mean rewriting the same JSX twice.
- **Change 2** ("show all trainings on start") is a *layout* problem, not a data
  one — the page already loads every training and then hides most of them behind
  two cramped scroll panes. It is its own feature (`17`) because it changes the
  page, not the row.
- **Change 13** is split into `23` (the tab structure, a self-contained UI
  change) and `24` (profile editing, which changes `AuthContext` and how sign-in
  works). Very different risk profiles; shipping them together would hide the
  second behind the first.

---

## Round three — in progress

`26-app-scroll-shell`, `27-popup-button-system`, `25-dashboard-tile-lists`,
`32-dashboard-filter-ui` and `28-training-exercise-details` are implemented
and verified (PASS), each on its own unmerged branch. The other three are
planned, none implemented.

```
26-app-scroll-shell  ──────► foundation: every page sits on it
      │
27-popup-button-system ────► must precede 28, 29, 30 (they add/edit popups)
      │
      ├──► 25-dashboard-tile-lists ──► 32-dashboard-filter-ui
      │
      ├──► 28-training-exercise-details ──► 29-exercise-designer
      │
      └──► 30-game-reference-manager

31-settings-tabs-polish   (independent — but 30 consumes the Tabs it restyles)
```

| # | Feature | Change it serves | Scope | Tasks | Depends on |
|---|---------|------------------|-------|-------|------------|
| 25 | [dashboard-tile-lists](features/25-dashboard-tile-lists/spec.md) ✅ | 2 — teams as a selectable list, and the rest | Large | 6 | 11, 18 |
| 26 | [app-scroll-shell](features/26-app-scroll-shell/spec.md) ✅ | 3 — scrolling deforms the nav bar | Medium | 3 | — |
| 27 | [popup-button-system](features/27-popup-button-system/spec.md) ✅ | 7 — the game popup's strange buttons | Medium | 5 | 13 |
| 28 | [training-exercise-details](features/28-training-exercise-details/spec.md) ✅ | 5 — open exercise details from a training | Medium | 4 | 06, 13, 27 |
| 29 | [exercise-designer](features/29-exercise-designer/spec.md) | 4 — draw an exercise | **Complex** | 9 | 01, 04, 27, 28 |
| 30 | [game-reference-manager](features/30-game-reference-manager/spec.md) | 6 — opponents and competitions in one popup | Medium | 5 | 20, 21, 22, 23, 27 |
| 31 | [settings-tabs-polish](features/31-settings-tabs-polish/spec.md) | 8 — the settings tab display is ugly | Small | 3 | 23 |
| 32 | [dashboard-filter-ui](features/32-dashboard-filter-ui/spec.md) ✅ | 1 — equal squares, a better filter | Medium | 4 | 18, 25, 31 |

**39 atomic tasks.** Each feature gets its own branch off `main` and its own PR,
matching the `20 → 21 → 22 → 23` pattern.

### Suggested order

1. **`26`** — the shell. Every page sits inside it, and it is the one change
   that fixes a bug the user can see on every screen.
2. **`27`** — the button system. It must land before `28`, `29` and `30`, all of
   which add or restructure popups; running it later means migrating those
   popups twice.
3. **`25` → `32`** — the dashboard. `25` changes what the tiles *contain*, `32`
   sizes them and replaces the filter. Sizing before the contents are final
   would measure the wrong thing.
4. **`31`** — the tab restyle. Independent, but `30` consumes `Tabs`, so doing
   it first avoids a mid-round visual mismatch. It also closes `23`'s
   carried-forward test-strength gap.
5. **`28` → `29`** — exercises. `28` gives an exercise a detail view and reserves
   a slot; `29` fills the slot with a diagram. `29` is the only Complex feature
   in the round and the only one that adds a runtime dependency.
6. **`30`** — the reference-list merge. Last because it is pure consolidation:
   nothing depends on it, and it benefits from `27` and `31` already being in.

### Where the changes were split, and why

- **Item 1** ("same size squares" + "improve the filter") and **item 2**
  ("teams as a list, and the rest of the screens") both land on the dashboard,
  but in opposite directions: `25` changes tile *content*, `32` changes tile
  *geometry and chrome*. Doing them as one feature would mean sizing tiles
  against content that was about to change.
- **Item 4** ("draw the exercise") is the only Complex feature in the round and
  the only one with a design phase. It adds a dependency, a schema version and a
  data model, and it carries a testing constraint — Konva needs a real canvas,
  which jsdom does not have — that shapes the whole architecture. See its
  [`design.md`](features/29-exercise-designer/design.md).
- **Item 5** ("open exercise details") is separated from item 4 because the
  detail view is worth shipping on its own and gives the diagram somewhere to
  live. `28` reserves the slot; `29` fills it.
- **Item 7** ("strange buttons") was reported against one popup and is fixed
  across all eleven. The specific defect — white text on light grey — appears
  fourteen times, and `28`/`29`/`30` are all about to add more popups.

---

## Round four — shipped (pending final merge)

Six features from an audit of `main` at `9520108`. Unlike rounds one to three,
the input was not a user change list: it was a read of the codebase against a
green suite. **1413 tests passed while three bugs were visible on screen** —
every one of them a CSS-cascade defect that jsdom cannot see and class-string
assertions cannot catch. That gap, not any single bug, is what `33` is really
about.

All six features are implemented, independently verified (author ≠ verifier
sub-agent, spec-anchored AC check + discrimination sensor for every one), and
PR'd — five merged, one ([#40](https://github.com/brunomjanuario/coach-planner/pull/40),
bundling `37`+`38`) open and clean/mergeable at time of writing:

| # | Feature | PR | Status |
|---|---|---|---|
| 33 | css-foundation-reset | [#36](https://github.com/brunomjanuario/coach-planner/pull/36) | ✅ Merged |
| 34 | asset-pipeline-fix | [#37](https://github.com/brunomjanuario/coach-planner/pull/37) | ✅ Merged |
| 35 | team-crud-hardening | [#38](https://github.com/brunomjanuario/coach-planner/pull/38) | ✅ Merged |
| 36 | auth-mock-hardening | [#39](https://github.com/brunomjanuario/coach-planner/pull/39) | ✅ Merged |
| 37 | trainings-unassigned-refresh | [#40](https://github.com/brunomjanuario/coach-planner/pull/40) | ⬜ Open |
| 38 | housekeeping | [#40](https://github.com/brunomjanuario/coach-planner/pull/40) | ⬜ Open |

`37` and `38` share one branch/PR (both Small, both independent of everything
else) rather than one each — a deliberate deviation from the
one-feature-one-PR pattern every other round-four feature followed, made
because splitting two features this small into separate PRs would have cost
more review overhead than either feature's diff.

**23 atomic tasks actually landed** (the planning table below predicted 24;
`33` shipped in 6 tasks, not the originally estimated 7 — see its own
`tasks.md` for why the plan tightened by one during Design). Two Verifier
passes found real gaps and both were closed before merge, not deferred:
`33`'s guard treated `@media` as fully cascade-safe alongside `@layer`/
`@theme`, which was a genuine correctness hole (fixed by making the parser
recurse into any at-rule that isn't `@layer`/`@theme`); `36`'s `signUp`
success path had no test isolating its own session-flag write from the
sibling `signIn`/`signOut` calls that happened to also exercise it (fixed
with a dedicated remount test). Both are recorded in their features'
`validation.md` under "Follow-up (implementer)".

```
33-css-foundation-reset ──► resets the visual baseline the rest are verified against
      │
      ├──► 34-asset-pipeline-fix      (also touches TeamCard/PlayerCard)
      │
      ├──► 35-team-crud-hardening
      ├──► 36-auth-mock-hardening
      ├──► 37-trainings-unassigned-refresh
      └──► 38-housekeeping

34, 35, 36, 37, 38 are independent of each other — only 33 must go first.
```

| # | Feature | Bugs it fixes | Scope | Tasks planned | Tasks shipped | Depends on |
|---|---------|---------------|-------|-------|-------|------------|
| 33 | css-foundation-reset | 1, 2, 3 — `h1` override, light-mode contrast collapse, leaked button background | **Large** | 7 | 6 | — |
| 34 | asset-pipeline-fix | 4 — images 404 in production builds | Small | 3 | 3 | 33 |
| 35 | team-crud-hardening | 5, 6, 9 — silent write failures, missing delete cascade, unassociated labels | Medium | 5 | 5 | 33 |
| 36 | auth-mock-hardening | 8, 10 — `signUp` skips validation, `signOut` doesn't survive a refresh | Medium | 4 | 4 | — |
| 37 | trainings-unassigned-refresh | 7 — editing a training leaves a stale Unassigned list | Small | 2 | 2 | — |
| 38 | housekeeping | 12, 13, 11(partial) — no 404 route, dead `App.css`, truthy-vs-`!= null` | Small | 3 | 3 | — |

**24 tasks planned, 23 shipped.** Every feature fit a single ~7-task batch, so
all six executed inline — no sub-agent delegation was offered or needed. Each
feature (or, for `37`/`38`, feature pair) got its own branch and PR, matching
the round-three pattern; see the shipped-status table above for the actual
count (five features/PRs merged, `37`+`38` sharing one open PR).

### Suggested order

1. **`33`** — first, and not negotiable. It changes what every screen looks
   like, so any feature verified before it is verified against a baseline that
   is about to move. It is also the only round-four feature with a design phase.
2. **`34`** and **`37`** — small, independent, and immediately visible. `34`
   comes after `33` only because both edit `TeamCard`/`PlayerCard`.
3. **`35`** and **`36`** — the robustness pair. Neither is user-visible on a
   happy path; both remove a way for the app to lose data quietly.
4. **`38`** — last. Pure hygiene, nothing depends on it.

### Why these groupings

- **Bugs 1, 2 and 3 are one feature, not three.** They look unrelated on screen
  — a giant heading, unreadable cards in light mode, a dark tab that should be
  transparent — but all three come from the same ~40 lines of unremoved Vite
  scaffold CSS in `src/index.css` fighting Tailwind's cascade layers. Splitting
  them would mean three features editing the same file, and the second and third
  would keep re-deciding the colour-scheme question the first one settled.
- **Removing the scaffold is not a delete.** `SelectableListItem` has *no*
  background utility: its dark row comes entirely from the leaked
  `@layer base { button { background-color: #1a1a1a } }`. Several components
  are unknowingly built on the very CSS being removed, so `33` has to give them
  explicit styles in the same change. That blast radius is why it is Large.
- **Bug 3 is a self-inflicted regression.** Feature `31` shipped a segmented
  control whose inactive tab renders as a dark box, directly contradicting its
  own AC TABUI-01.3, and its test passed because it asserted a class string
  (`not.toMatch(/bg-white/)`) rather than a rendered colour. `33` carries the
  fix *and* a guard so the next restyle cannot lie the same way.
- **Bug 11 is deliberately only half-fixed.** Normalising the mixed numeric/UUID
  ids means a schema-v5 migration rewriting every id and every cross-reference,
  for a defect that has never fired — call sites already defend with
  `String(x) === y`. `38` fixes the one real inconsistency
  (`trainingService.getAllNumbered`'s truthy `teamId` check) and documents the
  convention. The migration is listed under "not here".
- **Bug 10 was already known and accepted.** `docs/08-authentication.md`
  documents that a refresh after sign-out re-authenticates. `36` reopens it
  because "sign out doesn't sign you out" is the kind of accepted quirk that
  stops being acceptable once it is written down next to twelve other defects.

---

## Round five — in progress

One feature, unlike every prior round: `39-backend-integration` swaps the
`localStorage` mock (AD-002) for the real `coach-planner-api` sibling repo —
a Kotlin/Spring Boot service over PostgreSQL that was purpose-built to match
this app's existing wire shapes. Complex scope (new domain, cross-repo
contract, auth/token lifecycle), so it got a full `design.md`, unlike any
round-two/round-three feature.

```
39-backend-integration
  Phase 0-1  foundation + auth        (blocks everything else)
  Phase 2-6  the 8 services           (independent of each other once 0-1 land)
  Phase 7    cleanup + docs
  Phase 8    remediation — 15 downstream test files broke against the real
             apiFetch seam and needed a shared stateful fake, not a
             per-file stub (see tasks.md's "Revision note")
```

| # | Feature | Scope | Depends on |
|---|---------|-------|------------|
| 39 | [backend-integration](features/39-backend-integration/spec.md) | **Complex** | — |

Two spec/implementation disagreements were found and resolved by explicit
decision rather than silently papered over (Phase 8a, `T17`/`T18`): the
league table now comes from the backend's own computed `GET
/standings?teamId=` instead of a duplicated client-side calculation
(AD-022), and exercise writes stay array-round-tripped through
`PATCH /trainings/{id}` rather than moving to granular sub-resource
endpoints (AD-023) — both recorded in `STATE.md` rather than left as
undocumented drift.

## How to execute one

Each `tasks.md` opens with the execution protocol. In short:

1. Activate the `tlc-spec-driven` skill by name.
2. It counts the tasks and packs phases into ~7-task batches. Every round-two
   feature fits a single batch, so all thirteen execute inline — no sub-agent
   delegation offer.
3. Each task: implement → tests pass → one atomic commit. Never batch commits.
4. After the last task a fresh Verifier runs automatically and writes
   `validation.md`.

## Design phase

Round one flagged four features (`01`, `07`, `09`, `11`) as needing an
architecture pass. No round-two feature did. **Round three has exactly one:
`29-exercise-designer`** — a new runtime dependency, a schema version, a new
data model, and a testing constraint (Konva needs a real canvas; jsdom has
none) that decides the whole architecture. Every other round-three feature
settles its modelling questions in its Assumptions table. If one turns out to
need design once its turn comes, run the Design phase then, against the
codebase as it actually is.

**Round four has exactly one: `33-css-foundation-reset`** — it settles a
product decision (dark-only; the `prefers-color-scheme: light` path was Vite
scaffold, never a designed theme), it has a blast radius across components that
are unknowingly built on the CSS being removed, and it has to answer a testing
question the other five do not: how a suite that runs in jsdom can catch a
cascade-layer defect at all. Every other round-four feature settles its
questions in its Assumptions table.

## Project decisions

Read [`STATE.md`](STATE.md) before starting any feature. Sixteen decisions govern
this roadmap. Round two added three:

- **AD-009** — the popup overlay is defined once, in `PopupShell`.
- **AD-010** — competitions and opponents are managed reference lists, not
  foreign keys; games keep their name strings.
- **AD-011** — the auth mock stores plaintext credentials and honours them. It is
  consistent, not secure, and is replaced wholesale when a backend arrives.

Round three added five:

- **AD-012** — the app shell owns the scroll; one `<main>` is the only scroll
  container, and the shell never gets a `transform` (it would break every
  `fixed` popup).
- **AD-013** — one `Button` and one `PopupActions` own every popup action
  button. No popup writes its own button classes.
- **AD-014** — dashboard tile rows **navigate** to a record; the team filter
  stays a separate control.
- **AD-015** — exercise diagrams are normalised JSON rendered as SVG; Konva is a
  lazily-loaded editor-only input device, never in the read path or the initial
  bundle.
- **AD-016** — opponents and competitions share one manager and one popup.
  AD-010 stands: still reference lists, still not foreign keys.

Round four added two, both `active` in `.specs/STATE.md`:

- **AD-017** (`33`) — Coach Planner is a **dark-only** app. No
  `prefers-color-scheme` branch, no `color-scheme: light dark`. `src/index.css`
  carries no unlayered element selectors, because unlayered CSS outranks every
  Tailwind utility and silently wins.
- **AD-018** (`36`) — the auth mock separates the *stored account*
  from the *active session*. AD-011 stands on everything else: still plaintext,
  still consistent-not-secure, still replaced wholesale by a real backend.

Round five added five, all `active` in `.specs/STATE.md`:

- **AD-019** (`39`) — the access token lives only in memory; the refresh
  token persists in `localStorage`. A boot-time silent refresh keeps a
  reload from bouncing a valid session to `/signin`.
- **AD-020** (`39`) — auth and all 8 services cut over to the real API in
  one big-bang feature, no partial-migration state.
- **AD-021** (`39`) — the `localStorage` mock (`store.js`, `model/mock.js`)
  is deleted outright with the cutover, no fallback.
- **AD-022** (`39`) — the league table's "our row" is server-computed
  (`GET /standings?teamId=`) instead of duplicated client-side; `lib/
  standings.js` is deleted.
- **AD-023** (`39`) — exercise writes stay array-round-tripped through
  `PATCH /trainings/{id}` rather than moving to granular sub-resource
  endpoints; `spec.md`'s F5 AC8 was amended to match rather than left to
  silently disagree with the shipped code.

## What is deliberately not here

| Idea | Why not planned |
|------|-----------------|
| Real authentication | AD-011 makes the mock consistent, not secure. A real backend, tokens and hashing remain a separate epic. |
| Backend / API | AD-002 chose localStorage. The service layer is already shaped to accept a backend. |
| Per-competition league tables | `20` deliberately stops at a named entity. Scoping standings per competition is a real feature with its own questions. |
| Head-to-head records per opponent | A consumer of `21`'s data, not part of creating it. |
| Focus trapping and Escape-to-close on popups | `13` fixes the height bug and does not regress focus. Full modal accessibility deserves its own ACs. |
| ~~Fixing `TeamCard`/`PlayerCard` image paths~~ | **Fixed by `34-asset-pipeline-fix`** ([#37](https://github.com/brunomjanuario/coach-planner/pull/37), merged) — both now use a standard ES module import; `dist/assets/` emits fingerprinted files for both, confirmed via a real `npm run build`. |
| Normalising the mixed numeric/UUID id types | The seed uses `id: 1, 2`; `newId()` returns UUIDs. No failure has ever been observed — call sites defend with `String(x) === y`. A real fix is a schema-v5 migration rewriting every id and every cross-reference (`teamId`, `playerId`, `gameId`) across six collections: a Large, high-regression change for a latent defect. `38` fixes the one live inconsistency and documents the convention instead. |
| Full modal accessibility (focus trap, Escape-to-close) | Still deferred from round two. `35` associates the labels inside two popups; it does not take on focus management, which remains its own feature. |
| Automated visual-regression testing | `33` adds a source-level guard against *this* class of defect (unlayered element selectors, dark backgrounds with no explicit text colour). Screenshot diffing is a tooling decision with its own infrastructure cost, and would not have caught these three bugs any faster than reading the CSS did. |
| An opponent belonging to a competition (a real foreign key) | AD-016 reads "opponents are linked to competitions" as a UI request and merges the popups. The relational version reverses AD-010, rewrites every game record and reopens standings — a feature, not a restyle. |
| Animating, exporting or sharing an exercise diagram | `29` gets to a static, editable, storable diagram. Each of those three is a separate product question. |
| Adopting `Button` for page-level buttons | `27` stops at the popup boundary, where the contrast bug lives. Page headers have different sizing; a follow-up can adopt the same component. |
| Persisting the dashboard's team filter across reloads | No dashboard state persists today. `32` changes how the filter looks, not how long it lives. |
