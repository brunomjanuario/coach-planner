# Calendar Navigation — Verification Report

**Overall verdict: PASS**

Commit range covered (`git log main..HEAD --oneline`):

```
a297924 feat(games): open a game from a calendar deep link
bba68d6 feat(trainings): open a training from a calendar deep link
203e1f8 feat(calendar): make events clickable
0251102 refactor(calendar): convert inline styles to Tailwind
cb5220e feat(calendar): render real trainings and games
e44a439 feat(calendar): add unified training and game event feed
```

---

## 1. Spec-anchored coverage

### P1: Real events on the calendar

| AC | Test | Assertion | Spec outcome | Covered |
|---|---|---|---|---|
| CAL AC1 (month shows every training/game) | `src/lib/__tests__/calendarEvents.test.js:80` "returns only events falling within the given month" | `march.map(e=>e.sourceId)).toEqual([1])` | events in month included, others excluded | y |
| CAL AC2 (time + team/type label) | `src/pages/__tests__/Calendar.test.jsx:37` | `screen.getByText(/09:00/)`, `/Amadora Sub-11/`, `/Training/` | time + team + type label rendered | y |
| CAL AC3 (training+game same day, distinguished) | `Calendar.test.jsx:57` | `trainingEvent.className).not.toBe(gameEvent.className)` + `vs Benfica` text | both render, visually distinct | y |
| CAL AC4 (no events → no content) | `Calendar.test.jsx:74` | `dayCell.textContent).toBe(String(today.getDate()))` | day cell renders bare day number only | y |
| CAL AC5 (month change recomputes) | `Calendar.test.jsx:85` | training only visible after clicking `>` | recompute on month nav | y |
| CAL AC6 (mockEvents removed) | `Calendar.test.jsx:130` + `calendarEvents.test.js` no fixture refs | `queryByText(/Match vs Tigers/)).not.toBeInTheDocument()` | no fabricated event | y |
| Edge: >3 events → "+N more" | `Calendar.test.jsx:103` | `getByText("+1 more")` | first 3 + count | y |
| Edge: invalid date omitted | `calendarEvents.test.js:50,57` | `toEvents(...)).toEqual([])`, `not.toThrow()` | omit, no crash | y |
| Edge: month boundary | `calendarEvents.test.js:95` | Feb 28 23:59 stays in Feb, Mar 1 00:00 in Mar | no leakage | y |
| Edge: no team → "Unassigned" | `calendarEvents.test.js:43` | `event.teamName).toBe("Unassigned")` | never `undefined` | y |
| Edge: empty month → `[]` not `undefined` | `calendarEvents.test.js:109` | `result).toEqual([])`, `not.toBeUndefined()` | y | y |

### P1: Clickable events

| AC | Test | Assertion | Covered |
|---|---|---|---|
| Training click → `/trainings?training=<id>` | `Calendar.test.jsx:140` | `location`.toHaveTextContent("/trainings?training=42") | y |
| Game click → `/games?game=<id>` | `Calendar.test.jsx:158` | `.../games?game=7` | y |
| Not-found → message not empty popup | `Trainings.test.jsx:1072`, `Games.test.jsx:585` | `findByText("That training no longer exists.")`, no "Close" button | y |
| Param removed after popup opens | `Trainings.test.jsx:1056`, `Games.test.jsx:568` | `search-params`.toHaveTextContent("") after popup opens | y |
| Keyboard Enter/Space activates identically | `Calendar.test.jsx:181,201` | Enter and Space both produce correct navigation | y |

### P2: Tailwind conversion

| AC | Test | Covered | Note |
|---|---|---|---|
| No `style={{` in file | none (verified by manual `grep` only — no automated source-scan test) | **n** | spec-precision gap, see below |
| Visual equivalence (grid/today-highlight/colours) | none (no snapshot/visual test); relied on manual review | **partial** | acceptable per tasks.md — T3 explicitly scoped as "styling only, T2 suite is regression guard" |
| Distinct hover/focus state | `Calendar.test.jsx:181-224` covers keyboard-focus **activation**, not the CSS hover/focus-visible styling itself | **partial** | same as above |

### Deep-link handling (CAL-05 / CAL-06)

All five Done-when items in T5/T6 have a corresponding, correctly-asserted test in `Trainings.test.jsx` (lines 1040–1125) and the symmetric set in `Games.test.jsx` (lines 551–636), including the team-filter-clearing edge case and the "arrives with no param, behaves as before" regression guard. Verified by inspection — assertions check the actual UI state (`Close` button present/absent, `aria-current` cleared, `search-params` emptied), not just presence of some assertion.

### Test-count discrepancy (non-functional)

- T1's Done-when says "Test count: 14 tests pass" for `calendarEvents.test.js`; actual is **13** (`npx vitest run` confirms 13 passing, all ACs still individually covered). This is a documentation/tasks.md drift, not a coverage gap — every AC and edge case listed in T1 has a matching test.

---

## 2. Discrimination sensor

All mutations applied as uncommitted edits, one at a time, then reverted (`git checkout --`); working tree confirmed clean after each and at the end (`git status --short` empty, `git diff --stat` empty).

| # | Mutation | File | Command | Result |
|---|---|---|---|---|
| 1 | `eventsForMonth` month filter: `&&` → `\|\|` in year/month comparison | `src/lib/calendarEvents.js` | `npx vitest run src/lib/__tests__/calendarEvents.test.js` | **Killed** (2 failures: month-boundary test) |
| 2 | `MAX_VISIBLE_EVENTS_PER_DAY` slice boundary: `3` → `4` | `src/pages/Calendar.jsx` | `npx vitest run src/pages/__tests__/Calendar.test.jsx` | **Killed** (1 failure: "+1 more" test) |
| 3 | Training nav path: `/trainings?training=` → `/trainings?id=` | `src/pages/Calendar.jsx` | `npx vitest run src/pages/__tests__/Calendar.test.jsx` | **Killed** (2 failures: click + keyboard-Enter tests) |
| 4 | Team-mismatch check inverted: `!==` → `===` in Trainings' `useDeepLinkPopup` `onFound` | `src/pages/Trainings.jsx` | `npx vitest run src/pages/__tests__/Trainings.test.jsx` | **Killed** (1 failure: filter-clearing edge case) |

4/4 mutants killed. No survivors.

---

## 3. Gate results

```
npm run lint    → pass, 0 errors/warnings
npm run build   → pass, vite build succeeded (dist/ generated, 5980 modules)
npm test        → pass, 38 test files, 607 tests, 0 failures
```

Targeted files: `calendarEvents.test.js` (13 tests), `Calendar.test.jsx` (13 tests), `Trainings.test.jsx` (54 tests), `Games.test.jsx` (30 tests) — all pass within the full 607.

---

## Gaps found (for routing to fix tasks, most severe first)

1. **Spec-precision gap (low severity):** AC CAL-03.1 ("no `style={{` remains") and CAL-03.3 (distinct hover/focus states) have no automated regression test — only verified by manual `grep` during this verification pass and by the T2 behavioural suite being reused unchanged. A future refactor could silently reintroduce inline styles or drop hover/focus classes without any test failing. Recommend a simple source-scan test (`fs.readFileSync` + regex) and/or a class-presence assertion.
2. **Documentation drift (cosmetic):** `tasks.md` T1 states "Test count: 14 tests pass" for `calendarEvents.test.js`; actual is 13. No functional impact — all listed ACs/edge cases are covered by the 13 tests.
3. **Mobile-width rendering** (T3 Done-when: "renders correctly at mobile width rather than overflowing") has no automated test (e.g. viewport-based). Grid uses `grid-cols-7` unconditionally with no responsive overrides, which is very likely fine visually but is unverified by any test.

None of these are functional defects; the feature meets all P1 acceptance criteria and edge cases with correctly-asserted tests, and the discrimination sensor found no weak spots in the covered logic.
