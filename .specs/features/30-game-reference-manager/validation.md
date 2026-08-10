# Game Reference Manager Validation

**Date**: 2026-08-10
**Spec**: `.specs/features/30-game-reference-manager/spec.md`
**Diff range**: `a2e3e95..HEAD` (5 commits: a599d80, 52b6abd, 9eb774d, a4cb9aa, c7ff321)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `ReferenceListManager.jsx` extracted; 32 tests (16 cases × 2 noun sets) |
| T2   | ✅ Done | `ReferenceListsPopup.jsx` hosts both tabs via `Tabs`; 17 tests |
| T3   | ✅ Done | `Games.jsx` header collapsed to one "Manage lists" button |
| T4   | ✅ Done | `GameSavePopup.jsx` opens the merged popup on the right tab, one close handler diffs both lists |
| T5   | ✅ Done | `OpponentsPopup.jsx`/`CompetitionsPopup.jsx` and their test files deleted; no remaining imports (`grep -rl "OpponentsPopup\|CompetitionsPopup" src` → empty) |

---

## Spec-Anchored Acceptance Criteria

### P1: One popup, both lists

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GREF-01.1: Games page shows one "Manage lists" button, not two separate ones | One button present; "Competitions" and "Opponents" buttons absent | `src/pages/__tests__/Games.test.jsx:1013-1026` — `expect(screen.getByRole("button",{name:"Manage lists"})).toBeInTheDocument()` + two `queryByRole(...).not.toBeInTheDocument()` | ✅ PASS |
| GREF-01.2: Activating it opens one popup with Opponents/Competitions tabs, Opponents active | `aria-selected="true"` on Opponents tab, `"false"` on Competitions | `src/components/__tests__/ReferenceListsPopup.test.jsx:33-46` and `src/pages/__tests__/Games.test.jsx:1028-1040` | ✅ PASS |
| GREF-01.3: Selecting Competitions renders competitions list, opponents list not in document | `queryByText("Benfica")` absent after switching tabs | `src/components/__tests__/ReferenceListsPopup.test.jsx:48-61` — `expect(screen.queryByText("Benfica")).not.toBeInTheDocument()` | ✅ PASS |
| GREF-01.4: Uses `PopupShell`, caps at 85vh, only body scrolls | `dialog.className` matches `max-h-\[85vh\]`; `.overflow-y-auto.min-h-0` present | `src/components/__tests__/ReferenceListsPopup.test.jsx:23-31` | ✅ PASS |
| GREF-01.5: Closing re-reads games | Games list re-fetched, headings reflect updated counts | `src/pages/__tests__/Games.test.jsx:1190-1213` | ✅ PASS |

**Status**: ✅ All ACs covered

### P2: Nothing from `20`/`21` is lost

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GREF-02.1: Add creates via that list's service, appears in list | `onCreate` called; new row rendered | `src/components/__tests__/ReferenceListManager.test.jsx:77-87` (both noun sets); wired to real service in `src/components/__tests__/ReferenceListsPopup.test.jsx:177-197` | ✅ PASS |
| GREF-02.2: Duplicate/empty name renders that list's error, creates nothing | Thrown error message rendered; no new row | `src/components/__tests__/ReferenceListManager.test.jsx:89-103` — `expect(screen.queryByText(other)).not.toBeInTheDocument()`; real-service empty-name message in `src/components/__tests__/ReferenceListsPopup.test.jsx:252-263` | ✅ PASS |
| GREF-02.3: Rename persists, cascades to games with old name | `onRename` called with `{id,name}`; rejected rename keeps edit mode + shows error | `src/components/__tests__/ReferenceListManager.test.jsx:105-153` | ✅ PASS |
| GREF-02.4: Delete confirmation states usage count, correct singular/plural | "1 game" at count 1, "2 games" at count 2, per-field counting per tab | `src/components/__tests__/ReferenceListManager.test.jsx:155-191`; per-tab field isolation in `src/components/__tests__/ReferenceListsPopup.test.jsx:74-111` | ✅ PASS |
| GREF-02.5: Cancel removes nothing | `onDelete` not called, row still present | `src/components/__tests__/ReferenceListManager.test.jsx:193-211` | ✅ PASS |
| GREF-02.6: Empty list renders its own "No … yet" message | `No {nouns.plural} yet. Add your first one below.` | `src/components/__tests__/ReferenceListManager.test.jsx:69-75` | ✅ PASS |

**Status**: ✅ All ACs covered

### P3: The game form opens the right tab

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| GREF-03.1: "Add new…" on Opponent opens Opponents tab active | Second dialog's Opponents tab `aria-selected="true"` | `src/components/__tests__/GameSavePopup.test.jsx:427-441` | ✅ PASS |
| GREF-03.2: "Add new…" on Competition opens Competitions tab active | Second dialog's Competitions tab `aria-selected="true"` | `src/components/__tests__/GameSavePopup.test.jsx:443-457` | ✅ PASS |
| GREF-03.3: Name added becomes selected value on close | `opponentSelect()`/`competitionSelect()` value equals added name | `src/components/__tests__/GameSavePopup.test.jsx:495-541` | ✅ PASS |
| GREF-03.4: Closing with nothing added leaves every field unchanged | Team, opponent, competition, date, isHome all unchanged | `src/components/__tests__/GameSavePopup.test.jsx:473-493` | ✅ PASS |
| GREF-03.5: Adding one of each in one visit updates both fields | Both `opponentSelect()` and `competitionSelect()` updated | `src/components/__tests__/GameSavePopup.test.jsx:543-581` | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `src/components/ReferenceListManager.jsx:179` | Flipped singular/plural boundary: `deleteCount === 1 ? "" : "s"` → `deleteCount === 1 ? "s" : ""` | ✅ Killed (8 tests failed in `ReferenceListManager.test.jsx`) |
| 2 | `src/components/ReferenceListsPopup.jsx:65` | Swapped the field counted for the Opponents tab: `countUsage("opponent", item)` → `countUsage("competition", item)` | ✅ Killed (2 tests failed across `ReferenceListsPopup.test.jsx` and `Games.test.jsx`) |
| 3 | `src/components/ReferenceListsPopup.jsx:31` | Flipped the default tab: `initialTab = "opponents"` → `initialTab = "competitions"` | ✅ Killed (16 tests failed across `ReferenceListsPopup.test.jsx` and `Games.test.jsx`) |

All mutations were applied to the working tree one at a time, confirmed via `npx vitest run`, then reverted; `git diff --stat` confirmed a clean tree after each revert and at the end of the sensor pass.

**Sensor depth**: lightweight (3 targeted mutations, per default tiering)
**Result**: 3/3 killed — PASS ✅

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — `ReferenceListManager` is a mechanical extraction of `OpponentsPopup.jsx:104-223`; no new features beyond the merge |
| Surgical changes | ✅ — only the 4 files in scope plus the 2 deletions |
| No scope creep | ✅ — no FK/standings/head-to-head/bulk-import work, matching the spec's Out of Scope table |
| Matches patterns | ✅ — `*Popup` naming, `PopupShell`/`PopupActions`/`Button`/`Tabs` reuse, Tailwind utility classes, services-only data access |
| Spec-anchored outcome check (asserted values match spec) | ✅ — see AC table above |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — component tests map 1:1 to GREF-02 ACs parameterised over both noun sets; page/integration test covers happy path, re-read on close, and the ported delete/cancel behavioural assertions |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — spot-checked; every test in the 4 files in scope cites an AC, edge case, or is a direct port of a `20`/`21` assertion (e.g. `AC COMP-05.4 ported`) |
| Documented guidelines followed | ✅ — `CLAUDE.md` conventions (Modals `*Popup` + `onClose`, services-only data layer, Tailwind styling) |

---

## Edge Cases

- [x] Delete confirmation open + tab switch closes the confirmation — `ReferenceListsPopup.test.jsx:135-152`
- [x] Rename in progress + tab switch discards the edit — `ReferenceListsPopup.test.jsx:154-175`
- [x] One list empty, other not — `ReferenceListsPopup.test.jsx:228-235`
- [x] Name present in both lists managed independently — `ReferenceListsPopup.test.jsx:113-133`
- [x] Game form stays mounted behind the popup — `GameSavePopup.test.jsx:583-593`

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors/warnings), build succeeded (`vite build`, 6078 modules), 1400 passed, 0 failed, 0 skipped (67 test files)
- **Test count before feature**: 1382 — re-derived independently via `git worktree add <scratch> a2e3e95` + `npm install` + `npm test` (not taken from the implementer's report), then the worktree was removed
- **Test count after feature**: 1400
- **Delta**: +18 new tests
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None — no gaps found requiring a fix task.

---

## Deviation Review

One documented deviation was reviewed: `OpponentsPopup.test.jsx`'s "renders through PopupShell with the create form in the footer, outside the scrollable body" and "a 20-item list scrolls inside the shell with the create form still reachable" tests (and their `CompetitionsPopup.test.jsx` twins) have no literal equivalent in the new suite.

**Root cause**: In the old popups, the add-form lived in `PopupShell`'s `footer` (pinned, non-scrolling). T1's Done-when explicitly specifies `ReferenceListManager` renders "the list, the add form and the per-row rename/delete controls" as one unit — confirmed by reading `ReferenceListManager.jsx:89-186`, the add form (`<form onSubmit={handleSubmit}>`) sits inside the same returned tree as the list, which `ReferenceListsPopup.jsx` then passes as `PopupShell`'s `children` (the scrollable region), not its `footer`. So with a long list, the add form now scrolls out of view rather than staying pinned — a real, observable UX behaviour change from `20`/`21`, not just a missing test.

**Judgment**: Acceptable as spec-scoped. AC GREF-01.4 only requires `PopupShell` capped at 85vh with the body scrolling, which still holds (`ReferenceListsPopup.test.jsx:23-31`). The spec's Goals list calls out "including the delete-usage counts" as the specific behaviour that must not be lost, and the Assumptions table records the tabs-vs-stacked-sections tradeoff but is silent on footer-pinning the add form. The combined list+form unit is what T1 explicitly asked for, so this reads as an intentional design simplification made at Design/Tasks time, not an implementation slip. Recorded here rather than silently dropped, per the implementer's own note.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| GREF-01 | Tasks/Pending | ✅ Verified |
| GREF-02 | Tasks/Pending | ✅ Verified |
| GREF-03 | Tasks/Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 15/15 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 1400 passed, 0 failed, 0 skipped

**What works**: One "Manage lists" button replaces the two header buttons; the merged popup's tabs render/hide their panels correctly with independent per-list state (delete confirmation, in-progress rename); usage counts are computed from the correct game field per tab with correct singular/plural wording; the game form's two "Add new…" paths open the right tab and correctly diff-and-select on close, including the both-added-in-one-visit case; `OpponentsPopup`/`CompetitionsPopup` are fully retired with no dangling imports and no test-count regression (+18 net).

**Issues found**: None blocking. One reviewed and accepted deviation (see Deviation Review) — the add-form is no longer pinned outside the scroll region as it was in the old popups; this is a byproduct of T1's explicit "list + form as one unit" instruction and does not violate any AC, but is worth a coach's eye if a list ever grows very long.

**Next steps**: None required. Optional/non-blocking: if a future task wants to restore the old pinned-form ergonomics for long lists, it should be scoped explicitly rather than assumed, since AC GREF-01.4 does not require it.
