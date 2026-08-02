# STATE

## Decisions

### AD-001

- **Decision**: Vitest + React Testing Library is the test stack; every new task ships co-located tests and a passing gate.
- **Reason**: The repo has no test runner at all. Vitest reuses the existing Vite config and plugin chain, so the harness costs one setup task rather than a parallel build pipeline. RTL matches the component-heavy shape of the codebase.
- **Trade-off**: Adds ~5 devDependencies and a setup phase before any feature work. Jest was rejected — it would need its own transform config for JSX + ESM.
- **Scope**: All features. `00-test-harness` must land before any other feature.
- **Date**: 2026-07-30
- **Status**: active

### AD-002

- **Decision**: All persistent state moves behind a localStorage-backed store (`src/services/store.js`) before feature work begins. The `async` service API is preserved so a real backend can replace it later.
- **Reason**: Ratings, cards, games and standings are meaningless if they reset on reload. The current `src/model/mock.js` arrays are module-level and rebuilt on every page load.
- **Trade-off**: Single-device only, no sync, ~5MB ceiling. Forces the `Date` serialization question to be answered now rather than at backend time — which is the point.
- **Scope**: All data-touching features. `01-persistence-layer` blocks features 03–11.
- **Date**: 2026-07-30
- **Status**: active

### AD-003

- **Decision**: Entity ids are generated with `crypto.randomUUID()` via `src/lib/id.js`, never `Math.random()`.
- **Reason**: Current id generation is `Math.floor(Math.random() * 100)` — a 100-value space that already contains seed ids 1–8. Because services look records up with `find(x => x.id === id)`, a collision silently edits or deletes the wrong record.
- **Trade-off**: Ids become opaque strings, so they can never be shown to the user. This is why `05-training-number` exists — the UI needs a human-readable identifier of its own.
- **Scope**: All entity creation.
- **Date**: 2026-07-30
- **Status**: active

### AD-004

- **Decision**: Services return copies, never live references into the store; every caller re-reads after a mutation.
- **Reason**: Services currently mutate the same arrays React state already holds, so React sees an unchanged reference and skips the re-render. Some screens appear to work by accident; adding a player or a training already fails to refresh.
- **Trade-off**: More allocation per read, and callers must remember to re-read. Accepted because it is the same discipline a real API requires.
- **Scope**: `src/services/**`, and every page that renders service data.
- **Date**: 2026-07-30
- **Status**: active

### AD-005

- **Decision**: Tailwind utility classes for all new and touched UI. The three inline-styled files (`Calendar.jsx`, `SignIn.jsx`, `SignUp.jsx`) are converted when a feature touches them, not in a separate sweep.
- **Reason**: Matches the documented convention in `CLAUDE.md`. Opportunistic conversion avoids a large no-op diff while stopping the inline-style island from growing.
- **Trade-off**: The codebase holds two styling idioms until the last file is converted. `10-calendar-navigation` converts `Calendar.jsx` as part of its work.
- **Scope**: All UI work.
- **Date**: 2026-07-30
- **Status**: active

### AD-006

- **Decision**: A training's display number is its **chronological position within its team**, computed on read — not stored on the record.
- **Reason**: `Team.season` is free text (`"23/24"`) and trainings carry no season field, so a per-season counter has no reliable boundary to key on. Computing on read means inserting or deleting a session renumbers the rest automatically; a stored counter would drift.
- **Trade-off**: A training's number is not stable — inserting a session earlier in the calendar shifts every later number. Accepted: the number is a display affordance, not an identifier.
- **Scope**: `05-training-number`, and every surface that lists trainings.
- **Date**: 2026-07-30
- **Status**: active

### AD-007

- **Decision**: "Points" for players means a **0–10 coach rating recorded per event** (one game or one training), aggregated into a season average and a last-5 form figure. It is not an accumulating gamification score.
- **Reason**: User selection during specification. Matches how coaching tools model post-match assessment and keeps one scoring system rather than two.
- **Trade-off**: No leaderboard-style point accumulation. If that is wanted later it becomes a separate feature deriving from the same rating records.
- **Scope**: `09-player-ratings`, and the dashboard tiles that consume ratings.
- **Date**: 2026-07-30
- **Status**: active

### AD-008

- **Decision**: The league table computes **our own row** from recorded games; rival rows are entered manually.
- **Reason**: A coach can only observe their own results. Deriving a full table would require every other fixture in the division, which no data source here provides.
- **Trade-off**: Rival rows go stale unless the user maintains them. The alternative — showing only our own record with no table — was judged less useful than a maintainable manual table.
- **Scope**: `07-games-league-table`.
- **Date**: 2026-07-30
- **Status**: active

## Handoff

- **Feature**: `09-player-ratings` — done and verified (PASS after one fix→re-verify iteration).
- **Phase / Task**: All 9 tasks complete (T1 rating service + cascades → T2 average/form/rankSquad → T3 RatingInput → T4 SquadRatingPopup → T5 rate-from-training → T6 rate-from-game → T7 PlayerCard figures → T8 rating history → T9 squad ranking → Verifier). Two sub-agent batches (T1–T6, T7–T9), per the user's choice to delegate. Verifier found one real gap — `rankSquad`'s unrated-vs-zero distinction (AC RATE-09.3) had no test with a genuinely 0-average player, so a null-vs-0 sorting regression would go undetected — fixed with one added test (commit `9bdf952`) and re-verified PASS (3/3 sensor mutations killed, 25/25 ACs spec-matched, 571 tests green). See `.specs/features/09-player-ratings/validation.md` and `design.md` (design phase settled the 5 open questions: `(eventType, eventId)` pair key, service-free pure aggregation taking pre-fetched arrays, no batch method added to `ratingService` this feature, hand-wired cascades like `08`, native number input for ratings).
- **Completed**: T1–T9 plus one post-Verifier fix commit, all committed individually on `feature/09-player-ratings`.
- **In-progress** (file:line): none — feature closed out.
- **Next step**: `feature/09-player-ratings` is not yet merged to `main` — a PR is being opened. Once merged, `11-dashboard` (per AD-007's stated scope) is the next feature that consumes rating aggregates; its design notes should decide whether to add a batch aggregation method to `ratingService` now that a second consumer exists.
- **Blockers**: none
- **Uncommitted files**: `.specs/features/09-player-ratings/design.md` and `validation.md` still need to be added/committed (docs, not yet staged).
- **Branch**: `feature/09-player-ratings` (not yet merged to `main`) — branches for this project have consistently been merged outside the session (via GitHub PRs); don't assume `main` is current without checking.
