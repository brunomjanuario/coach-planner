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

### AD-012

- **Decision**: The app shell owns the scroll. `App.jsx`'s authenticated wrapper is `h-screen overflow-hidden`; a single `<main>` is the one `overflow-y-auto` container. No page declares its own viewport height, and the shell never gets `transform`, `filter` or `contain`.
- **Reason**: The shell had a width constraint and no height constraint, so the document scrolled and the `h-screen` sidebar scrolled away with it — its background running out partway up the screen. Fixing it per-page would mean six places to get it right and one place to get it wrong.
- **Trade-off**: Route changes no longer reset scroll position, and any future page that wants its own scroll pane has to opt into it deliberately. The transform ban is invisible until someone adds an animation to the shell and every popup silently stops being viewport-anchored — recorded here so it is a rule rather than a surprise.
- **Scope**: `26-app-scroll-shell`, `src/App.jsx`, `src/components/Sidebar.jsx`, every page root.
- **Date**: 2026-08-06
- **Status**: active

### AD-013

- **Decision**: One `Button` component (with `primary`/`secondary`/`danger`/`ghost` variants) and one `PopupActions` row own every popup action button's appearance and ordering. No popup writes its own button classes.
- **Reason**: Fourteen buttons across eleven popups were `bg-gray-300 text-white` — white on light grey, roughly 1.5:1, below the 4.5:1 bar `14-ratings-contrast` already set for this codebase. Thirty-odd hand-copied class strings is the same failure mode AD-009 fixed for the overlay: one bad style becomes fourteen bugs.
- **Trade-off**: Two reds collapse into one `danger`, so "clear a result" and "delete a game" now look equally weighty — accepted, because nothing in the product distinguished them and both sit behind a confirmation anyway. A popup wanting a genuinely different button has to extend the component rather than opt out.
- **Scope**: `27-popup-button-system`, every `*Popup` component. Page-level buttons are explicitly not covered yet.
- **Date**: 2026-08-06
- **Status**: active

### AD-014

- **Decision**: Dashboard tiles list their records and a row **navigates** to that record's page with the record open. The team filter stays a separate control; rows never change dashboard state.
- **Reason**: User selection during specification. Keeps the dashboard read-only and reuses the `?training=`/`?game=` deep links that already exist, rather than inventing cross-tile filter state.
- **Trade-off**: Clicking a team on the dashboard leaves the dashboard, which is not what a coach comparing two teams wants — that job stays with the filter bar. It also forces a `?team=` deep link onto the Teams page, which is the one destination that lacked one.
- **Scope**: `25-dashboard-tile-lists`, `32-dashboard-filter-ui`, `src/pages/Home.jsx`, `src/pages/Teams.jsx`.
- **Date**: 2026-08-06
- **Status**: active

### AD-015

- **Decision**: Exercise diagrams are stored as compact JSON with **normalised 0–1 coordinates** on a new `exercise.diagram` field, rendered read-only as inline SVG. Konva (via `react-konva`) is a lazily-loaded input device for the editor only, and never appears in the read path or the initial bundle.
- **Reason**: `localStorage` has a ~5MB ceiling (AD-002) and a raster image per exercise would both spend it and make a drawing uneditable. A diagram is drawn once and looked at many times, so the common path should not need a canvas — and jsdom has no canvas, so a Konva-based read path could not be tested at all.
- **Trade-off**: Two renderers for one data model — Konva for editing, SVG for viewing — which must be kept visually consistent by hand. Adding `react-konva` also requires bumping React from 19.1.0 to `^19.2.0` (verified peer requirement). The legacy `image` field stays unused rather than being repurposed.
- **Scope**: `29-exercise-designer`, `src/lib/exerciseDiagram.js`, `src/components/DiagramView.jsx`, `src/components/ExerciseDiagramEditor.jsx`, store `SCHEMA_VERSION` 4.
- **Date**: 2026-08-06
- **Status**: active

### AD-016

- **Decision**: Opponents and competitions are merged into **one manager component and one tabbed popup**. AD-010 stands unchanged: they remain independent reference lists of name strings, not a foreign-key relationship.
- **Reason**: The request — "opponents are linked to competitions, they should be in the same popup" — is about placement. `OpponentsPopup` and `CompetitionsPopup` were 226 and 228 lines differing only in the noun, so every fix had to be written twice. Reading the same sentence as a data-model change would reverse AD-010, rewrite every game record and every read path, for a request whose visible output is where a button is.
- **Trade-off**: If a real opponent→competition relationship is wanted later, this consolidation does not deliver it and does not block it — it is a separate feature with its own migration and standings questions. Recorded so the alternative reading is on file rather than lost.
- **Scope**: `30-game-reference-manager`, `src/components/ReferenceListManager.jsx`, `src/components/ReferenceListsPopup.jsx`.
- **Date**: 2026-08-06
- **Status**: active

## Handoff

- **Feature**: `26-app-scroll-shell` — **done and verified (PASS, no fix iteration needed).** First round-three feature executed.
- **Phase / Task**: All 3 tasks complete — T1 (`src/App.jsx`: moved the shell inside the `/*` route so `/signin`/`/signup` keep normal document scrolling; authenticated shell is now `h-screen overflow-hidden`; `<main className="flex-1 min-w-0 overflow-y-auto">` wraps the inner `Routes` — AC SHELL-01.1/01.3, `src/__tests__/App.test.jsx` new, 8 tests, `30a5f43`) → T2 (`src/components/Sidebar.jsx`: root `h-screen` → `h-full flex-shrink-0`, so it's sized by the bounded shell instead of the viewport — AC SHELL-01.2, 2 new tests in `Sidebar.test.jsx`, `4471a6c`) → T3 (audit found none of the six pages ever declared `h-screen`/`min-h-screen`, so no page `.jsx` changed — regression assertions added to all six page test files instead, plus a page-context check that a popup opened from Trainings still renders `fixed inset-0` and caps at `max-h-[85vh]` — AC SHELL-03, SHELL-04, `8f8d206`).
- **Verifier**: Single pass, PASS — 4/4 requirement IDs (SHELL-01–04) covered with `file:line` evidence matching spec-defined outcomes exactly (class names, element counts, structural containment), gate (`lint && build && test`) green at 1147/1147 tests (+21 vs. the round-two baseline of 1126), discrimination sensor 3/3 mutations killed (dropping `overflow-hidden`, reverting the sidebar to `h-screen`, and wrapping `/signin` in the shell each turned the suite red). One non-blocking gap: the "route changes don't remount the shell" edge case holds by construction (one non-remounting `<Routes>` tree) but has no direct DOM-identity assertion — logged, not fixed. See `.specs/features/26-app-scroll-shell/validation.md`.
- **Completed**: T1–T3, each committed individually on `feature/26-app-scroll-shell`, plus one docs commit for the Verifier report (`24bf051`).
- **In-progress** (file:line): none — feature closed out.
- **Next step**: per the recommended order, `27-popup-button-system` is next — it must land before `28`/`29`/`30` add or edit popups, or those popups get migrated twice. `feature/26-app-scroll-shell` is not yet merged to `main`; open its PR (or merge) before branching `27`.
- **Blockers**: none. `feature/26-app-scroll-shell` branches from `main` at `edfd832` (round-three planning commit), which already had `23`/`24` merged.
- **Uncommitted files**: none — everything for `26` is committed.
- **Branch**: `feature/26-app-scroll-shell`, branched from `main` at `edfd832`, not yet merged.
- **Remaining round-three features**: `25`, `27`–`32` (7 of 8, 36 of 39 atomic tasks). Recommended order unchanged: `27` → `25` → `32` → `28` → `29` → `30` → `31` (see `.specs/README.md`'s round-three section for the dependency reasoning).
- **Open items carried forward**: (1) the `11-dashboard` question about a batch aggregation method on `ratingService` — still unanswered, still not forced; (2) `23`'s SETT-04.3 test-strength gap — assigned to `31-settings-tabs-polish` T3, not yet executed; (3) the `24` sign-out/refresh quirk (one `localStorage` key doubles as stored account and session flag) — still accepted, untouched; (4) `TeamCard`/`PlayerCard` image paths still resolve only in dev, not in production builds — still unplanned; (5) `26`'s Verifier gap above — route-identity-across-navigation is unproven by a direct test, low severity, not assigned to any feature.

---

## Superseded handoff (24-profile-settings)

- **Feature**: `24-profile-settings` — done and verified (PASS, no fix iteration needed). This was the last remaining round-two feature.
- **Phase / Task**: All 5 tasks complete across 2 phases — Phase 1 (mock consistency): T1 (`src/context/AuthContext.jsx` — `signIn` now checks the stored `user` record instead of only the hard-coded pair, falling back to the demo password when a stored user has none; `signUp` stops discarding its password param; `signOut` clears only the in-memory session, deliberately leaving `localStorage` intact so a later `signIn` still works — AC PROF-01.6; email comparison case-insensitive/trimmed, password exact; corrupt `localStorage` JSON treated as signed out; legacy `username`→`name` migrated on read, `62e78c5`) → T2 (`updateProfile({name,email})` and `changePassword({current,next,confirm})` added, same `{success,message}` shape as `signIn`/`signUp`; both reject invalid input without writing, `b832bf2`). Phase 2 (the profile form, in `src/pages/Settings.jsx`'s Profile tab): T3 (`ProfileForm` — editable name/email pre-filled from `user`, inline `role="alert"`/`role="status"` feedback; had to switch the email `<input>` from `type="email"` to `type="text"` because jsdom's native constraint validation was silently blocking submission before the custom validator ran, `4531765`) → T4 (`PasswordForm` — three password fields in its own `<form>` so it can't cross-submit with the profile form; wrong-current/mismatch/empty-new each render a distinct message, `1fa9aa8`) → T5 (a `RoundTripHarness` test component proves change-email+password → sign-out → old pair rejected → new pair signs in end-to-end; a reset-preserves-profile test; `CLAUDE.md` and `docs/08-authentication.md` rewritten to document the new credential model and the explicit "this is not authentication" scoping, `4291db1`).
- **Verifier**: Single pass, PASS — 30/30 ACs and edge cases covered with `file:line` evidence matching spec-defined outcomes, gate (`lint && build && test`) green at 1126/1126 tests (+44 vs. the `23` baseline), discrimination sensor 3/3 mutations killed (re-adding `signOut`'s `localStorage.removeItem`, dropping `changePassword`'s current-password guard, dropping `updateProfile`'s email-regex guard were all caught). Zero gaps. See `.specs/features/24-profile-settings/validation.md`.
- **Completed**: T1–T5, each committed individually on `feature/24-profile-settings`, plus two docs commits (task/spec status, Verifier report).
- **In-progress** (file:line): none — feature closed out. **All specified features (00–24) are now implemented.**
- **Next step**: none specified. `feature/24-profile-settings` is stacked on `feature/23-settings-tabs` (not on `main` — see Branch below) and neither is merged yet. Both PRs need to land, in order (`23` before `24`, since `24`'s branch point is `23`'s tip), before anything further. No new round-two features are queued; the next work is either a fresh `Specify` pass on a new feature, or picking up the two open items below.
- **Blockers**: `feature/24-profile-settings`'s PR cannot merge cleanly until `feature/23-settings-tabs`'s PR (#26) merges first — `24` is branched from `23`'s tip, not from `main`.
- **Uncommitted files**: none — everything for `24` is committed.
- **Branch**: `feature/24-profile-settings`, branched from `feature/23-settings-tabs` (not `main` — `23`'s PR wasn't merged yet when `24` was started, and `24` depends on the Profile tab `23` built, so it was stacked directly on `23`'s branch tip `c1fdce1` rather than waiting). This is a deviation from the `20→21→22→23` pattern of each branching from an already-merged `main`; whoever merges these should merge `23`→`main` first, then either re-target `24`'s PR base to `main` or merge `24`→`23`→`main` in sequence. Branches for this project are merged outside the session via GitHub PRs — don't assume `main` is current without checking.
- **Remaining round-two features**: none. `24-profile-settings` was the last one specified.
- **Open items carried forward**: (1) the `11-dashboard` handoff asked whether `ratingService` should gain a batch aggregation method now that a second consumer exists — still unanswered, no feature since has forced the question; (2) the `23` Verifier's SETT-04.3 test-strength gap (unrecognised-`?tab=` fallback path isn't independently discriminated from `Tabs.jsx`'s own fallback) — still open, not touched by `24`; (3) `docs/08-authentication.md` now documents a known quirk introduced by `24`: refreshing the page immediately after sign-out re-authenticates the user, because the single `localStorage` key doubles as both the stored account and the active-session flag — flagged as accepted, not a bug, but worth knowing if a future feature touches sign-out.

---

## Superseded handoff (23-settings-tabs)

- **Feature**: `23-settings-tabs` — done and verified (PASS, no fix iteration needed).
- **Phase / Task**: All 3 tasks complete — T1 (`Tabs({ tabs, active, onChange })` in `src/components/Tabs.jsx`: `role="tablist"`/`tab`/`tabpanel`, only the active tab panel mounts, arrow-key movement with wrap, visible focus ring, purely controlled — parent owns state, `5edc336`) → T2 (`src/pages/Settings.jsx` split into a Profile panel — read-only `username`/`email` from `useAuth`, no null-user guard since `PrivateRoute` already guarantees a resolved user — and an Advanced panel hosting the reset button + confirmation flow moved verbatim with an added explanatory sentence, `9ca04b7`) → T3 (active tab synced to `?tab=` via `useSearchParams`; unrecognised/missing values fall back to Profile, `5865b77`).
- **Verifier**: Single pass, PASS — 18/18 ACs covered with `file:line` evidence matching spec-defined outcomes, gate (`lint && build && test`) green at 1082/1082 tests, discrimination sensor 2/3 mutations killed. One non-blocking Minor gap noted (not fixed, no FAIL triggered): the SETT-04.3 unrecognised-tab-value test doesn't discriminate `Settings.jsx`'s own allow-list guard (`TAB_IDS.includes(tabParam) ? tabParam : "profile"`) because `Tabs.jsx`'s independent `tabs.find(...) ?? tabs[0]` fallback masks the removal — end-user behavior is still correct today, so this is a test-strength gap, not a functional defect. See `.specs/features/23-settings-tabs/validation.md`.
- **Branch**: `feature/23-settings-tabs`, branched from `main` (`main` already had `20-competitions`, `21-opponents`, `22-game-form-selects` merged). `24-profile-settings` has since been branched from this branch's tip (not from `main`) since this PR wasn't merged yet.

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
