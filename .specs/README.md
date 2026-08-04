# Coach Planner — Feature Roadmap

Two planning rounds. **Round one** (`00`–`11`) built the app: twelve features
derived from ten ideas, plus two foundations. All twelve are implemented and
merged. **Round two** (`12`–`24`) is thirteen features derived from the user's
change list — one feature per change, each independently shippable.

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

## Round two — planned

Nothing here is implemented. This is the plan.

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
architecture pass. **No round-two feature does.** The two with real modelling
decisions — `20` and `21` — settled them in their Assumptions tables and in
AD-010, and neither is Large. If a feature turns out to need design once its
turn comes, run the Design phase then, against the codebase as it actually is.

## Project decisions

Read [`STATE.md`](STATE.md) before starting any feature. Eleven decisions govern
this roadmap. Round two added three:

- **AD-009** — the popup overlay is defined once, in `PopupShell`.
- **AD-010** — competitions and opponents are managed reference lists, not
  foreign keys; games keep their name strings.
- **AD-011** — the auth mock stores plaintext credentials and honours them. It is
  consistent, not secure, and is replaced wholesale when a backend arrives.

## What is deliberately not here

| Idea | Why not planned |
|------|-----------------|
| Real authentication | AD-011 makes the mock consistent, not secure. A real backend, tokens and hashing remain a separate epic. |
| Backend / API | AD-002 chose localStorage. The service layer is already shaped to accept a backend. |
| Per-competition league tables | `20` deliberately stops at a named entity. Scoping standings per competition is a real feature with its own questions. |
| Head-to-head records per opponent | A consumer of `21`'s data, not part of creating it. |
| Focus trapping and Escape-to-close on popups | `13` fixes the height bug and does not regress focus. Full modal accessibility deserves its own ACs. |
| Fixing `TeamCard`/`PlayerCard` image paths | Still broken in production builds (`src/assets/images/*.png` resolves only in dev). Untouched by these thirteen; worth its own small feature. |
