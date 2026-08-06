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

### AD-009

- **Decision**: The popup overlay, its 85vh height cap and its scroll region are defined once in `src/components/PopupShell.jsx`. No component outside it renders the `fixed inset-0 … z-50` markup.
- **Reason**: The overlay was hand-copied into nine components with no height constraint, so every popup could grow past the viewport and strand its own action row. Nine copies is how one missing constraint became nine bugs.
- **Trade-off**: Popups give up per-popup layout freedom and take a three-region API (title / body / footer). A popup wanting a genuinely different shape has to extend the shell rather than opt out.
- **Scope**: `13-popup-shell` migrates the nine existing popups; every popup added after it starts from the shell.
- **Date**: 2026-08-04
- **Status**: active

### AD-010

- **Decision**: Competitions and opponents are **managed reference lists**, not foreign keys. Games keep their existing `competition` and `opponent` **strings**; the new collections exist to populate dropdowns and to be renamed as a set.
- **Reason**: The job is to stop the same name being retyped three different ways. A full FK model would mean rewriting every game record, every read path and every test for a feature whose visible output is a `<select>`.
- **Trade-off**: No referential integrity. A deleted competition leaves its name on historical games (deliberate — the fixture happened), and a rename has to cascade explicitly or the games drift. Both are specified and tested rather than left implicit. Revisit if per-competition standings are ever built.
- **Scope**: `20-competitions`, `21-opponents`, `22-game-form-selects`.
- **Date**: 2026-08-04
- **Status**: active

### AD-011

- **Decision**: The auth mock stores a plaintext password in `localStorage` and `signIn` checks it, so a password set in the app is the password that signs you in. The hard-coded demo pair remains the fallback when no user is stored.
- **Reason**: `signUp` discarded the password it was given, so a user who signed up could never sign back in. A profile page that offers a password field the system ignores is worse than no field.
- **Trade-off**: This makes the mock **consistent**, not **secure** — plaintext, no hashing, no server, no session. The whole module is replaced when a real backend arrives; nothing in it should be carried forward. Recorded here so it is a known limitation rather than a later discovery.
- **Scope**: `24-profile-settings`, `src/context/AuthContext.jsx`.
- **Date**: 2026-08-04
- **Status**: active

## Handoff

- **Feature**: `23-settings-tabs` — done and verified (PASS, no fix iteration needed).
- **Phase / Task**: All 3 tasks complete — T1 (`Tabs({ tabs, active, onChange })` in `src/components/Tabs.jsx`: `role="tablist"`/`tab`/`tabpanel`, only the active tab panel mounts, arrow-key movement with wrap, visible focus ring, purely controlled — parent owns state, `5edc336`) → T2 (`src/pages/Settings.jsx` split into a Profile panel — read-only `username`/`email` from `useAuth`, no null-user guard since `PrivateRoute` already guarantees a resolved user — and an Advanced panel hosting the reset button + confirmation flow moved verbatim with an added explanatory sentence, `9ca04b7`) → T3 (active tab synced to `?tab=` via `useSearchParams`; unrecognised/missing values fall back to Profile, `5865b77`).
- **Verifier**: Single pass, PASS — 18/18 ACs covered with `file:line` evidence matching spec-defined outcomes, gate (`lint && build && test`) green at 1082/1082 tests, discrimination sensor 2/3 mutations killed. One non-blocking Minor gap noted (not fixed, no FAIL triggered): the SETT-04.3 unrecognised-tab-value test doesn't discriminate `Settings.jsx`'s own allow-list guard (`TAB_IDS.includes(tabParam) ? tabParam : "profile"`) because `Tabs.jsx`'s independent `tabs.find(...) ?? tabs[0]` fallback masks the removal — end-user behavior is still correct today, so this is a test-strength gap, not a functional defect. See `.specs/features/23-settings-tabs/validation.md`.
- **Completed**: T1–T3, each committed individually on `feature/23-settings-tabs`, plus two docs commits (task/spec status, Verifier report).
- **In-progress** (file:line): none — feature closed out.
- **Next step**: `feature/23-settings-tabs` is not yet merged to `main`. `24-profile-settings` is the one remaining specified-but-unstarted feature; it is independent of `23` (builds on the Profile tab shelf this feature created, per spec.md's Out of Scope note) but should still be branched from `main` after `23` merges, since it edits the same `Settings.jsx`/`ProfilePanel` region.
- **Blockers**: none — this branch was cut from `main` after `22-game-form-selects` merged, so it is not stacked on anything unmerged.
- **Uncommitted files**: none — everything for `23` is committed.
- **Branch**: `feature/23-settings-tabs`, branched from `main` (`main` already had `20-competitions`, `21-opponents`, `22-game-form-selects` merged — all squash-merged, so this branch's history is just its own 6 commits on top of `main`). Branches for this project are merged outside the session via GitHub PRs — don't assume `main` is current without checking.
- **Remaining round-two features**: `24-profile-settings` is specified (`spec.md` + `tasks.md`) but not started.
- **Open items carried forward**: (1) the `11-dashboard` handoff asked whether `ratingService` should gain a batch aggregation method now that a second consumer exists — still unanswered, no feature since has forced the question; (2) the Verifier's SETT-04.3 test-strength gap above, for whoever next touches `Settings.jsx`'s tab-fallback logic.

---

## Superseded handoff (22-game-form-selects)

- **Feature**: `22-game-form-selects` — done and verified (PASS after one fix→re-verify iteration).
- **Phase / Task**: All 4 tasks complete — T1 (`toOptions(items, currentValue)` helper in `src/lib/selectOptions.js`: alphabetical case-insensitive ordering, appends a not-in-list-flagged legacy value, `676c54e`) → T2 (opponent field becomes a `<select>` populated from `opponentService`; also gave the team select's label a proper `htmlFor`/`id` pairing it never had, needed once a second `<select>` existed for tests to target unambiguously, `3223a8e`) → T3 (competition field becomes a `<select>` with an explicit "None" option, `3a94fa4`) → T4 (each select gets an "Add new…" option that opens the matching manager — `OpponentsPopup`/`CompetitionsPopup` — stacked over the form; closing it re-reads the list and auto-selects a newly added name; closing without adding leaves every field untouched, `69c8b91`). A stored value differing from a list entry only by case renders as that list entry (not a blank or a duplicate) via a separate `opponentSelectValue`/`competitionSelectValue` computed just for the `<select>`'s displayed value, while the submitted `formData` value stays exactly what was stored until the coach actually changes the selection.
- **Verifier**: First pass (commit `69c8b91`) returned FAIL with 4 gaps — (1) spec.md's AC GSEL-01.4 still said the empty-list select should be "disabled", contradicting T4's deliberate (correct) decision to keep it enabled so "Add new…" stays reachable; (2)+(3) the case-only-match edge case asserted option *count* but never the select's *value*, and had zero coverage on the competition side; (4) the untouched-close test skipped the competition field. Fixed in `d211ad9`: reworded spec.md's AC GSEL-01.4/02.6 and the Assumptions table to match the shipped behavior, strengthened both case-match tests to assert `.toHaveValue(...)`, added the missing competition-side case-match test, and added the competition assertion to the untouched-close test. Re-verified PASS: 4/4 gaps closed, 1057 tests green, cumulative 3/3 discrimination-sensor mutations killed across both passes. A trailing cosmetic doc-drift the Verifier flagged (tasks.md's T2 bullet still saying "disables") was also fixed. See `.specs/features/22-game-form-selects/validation.md`.
- **Completed**: T1–T4, all committed individually on `feature/22-game-form-selects`, plus the fix commit, two docs commits (task/spec status, Verifier report).
- **Branch**: `feature/22-game-form-selects`, branched from `main` (`main` already had `20-competitions` (#23) and `21-opponents` (#24) merged). This branch has since been merged into `main` (per the branch feature/23-settings-tabs is now based on it).

---

## Superseded handoff (09-player-ratings)

- **Feature**: `09-player-ratings` — done and verified (PASS after one fix→re-verify iteration).
- **Phase / Task**: All 9 tasks complete (T1 rating service + cascades → T2 average/form/rankSquad → T3 RatingInput → T4 SquadRatingPopup → T5 rate-from-training → T6 rate-from-game → T7 PlayerCard figures → T8 rating history → T9 squad ranking → Verifier). Two sub-agent batches (T1–T6, T7–T9), per the user's choice to delegate. Verifier found one real gap — `rankSquad`'s unrated-vs-zero distinction (AC RATE-09.3) had no test with a genuinely 0-average player, so a null-vs-0 sorting regression would go undetected — fixed with one added test (commit `9bdf952`) and re-verified PASS (3/3 sensor mutations killed, 25/25 ACs spec-matched, 571 tests green). See `.specs/features/09-player-ratings/validation.md` and `design.md` (design phase settled the 5 open questions: `(eventType, eventId)` pair key, service-free pure aggregation taking pre-fetched arrays, no batch method added to `ratingService` this feature, hand-wired cascades like `08`, native number input for ratings).
- **Completed**: T1–T9 plus one post-Verifier fix commit, all committed individually on `feature/09-player-ratings`.
- **In-progress** (file:line): none — feature closed out.
- **Next step**: `feature/09-player-ratings` is not yet merged to `main` — a PR is being opened. Once merged, `11-dashboard` (per AD-007's stated scope) is the next feature that consumes rating aggregates; its design notes should decide whether to add a batch aggregation method to `ratingService` now that a second consumer exists.
- **Blockers**: none
- **Uncommitted files**: `.specs/features/09-player-ratings/design.md` and `validation.md` still need to be added/committed (docs, not yet staged).
- **Branch**: `feature/09-player-ratings` (not yet merged to `main`) — branches for this project have consistently been merged outside the session (via GitHub PRs); don't assume `main` is current without checking.
