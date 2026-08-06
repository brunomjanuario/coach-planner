# Settings Tabs Validation

**Date**: 2026-08-06
**Spec**: `.specs/features/23-settings-tabs/spec.md`
**Diff range**: `main...HEAD` (branch cut from `main` at `de5512b`), commits `5edc336`, `9ca04b7`, `5865b77`, `9dab786`
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `src/components/Tabs.jsx` + `Tabs.test.jsx` present, 13 tests |
| T2   | ✅ Done | `src/pages/Settings.jsx` split into `ProfilePanel`/`AdvancedPanel` |
| T3   | ✅ Done | `useSearchParams` wiring for `?tab=` present |

---

## Spec-Anchored Acceptance Criteria

### P1: Two tabs

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SETT-01.1 Profile + Advanced tabs render | tablist with 2 tabs | `src/components/__tests__/Tabs.test.jsx:16-21` — `expect(screen.getAllByRole("tab")).toHaveLength(2)` | ✅ PASS |
| SETT-01.2 No tab specified → Profile shown | Profile tab selected, reset button absent | `src/pages/__tests__/Settings.test.jsx:40-50` — `aria-selected` "true" on Profile tab; `queryByRole("button",{name:"Reset demo data"})` not in doc | ✅ PASS |
| SETT-01.3 Selecting a tab shows/hides panels | Advanced panel shown, Profile panel content gone | `src/pages/__tests__/Settings.test.jsx:62-72` and `:74-85` | ✅ PASS |
| SETT-01.4 Only selected tab marked selected | `aria-selected="true"`/`"false"` exact pair | `src/components/__tests__/Tabs.test.jsx:23-34`; page-level `src/pages/__tests__/Settings.test.jsx:87-101` | ✅ PASS |
| SETT-01.5 Exactly one tabpanel in document | `getAllByRole("tabpanel")` length 1 | `src/components/__tests__/Tabs.test.jsx:49-53` | ✅ PASS |

### P1: Reset action moves to Advanced

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SETT-02.1 Advanced shows reset action | reset button present under Advanced | `src/pages/__tests__/Settings.test.jsx:62-72` | ✅ PASS |
| SETT-02.2 Reset asks for confirmation | confirmation popup shown, data untouched (3 teams) | `src/pages/__tests__/Settings.test.jsx:114-130` | ✅ PASS |
| SETT-02.3 Confirmed reset clears/re-seeds | team names reset to `["Sub-11","Sub-19"]` | `src/pages/__tests__/Settings.test.jsx:132-148` | ✅ PASS |
| SETT-02.4 Cancelled reset changes nothing | teams unchanged, `["Sub-11","Sub-19","Extra"]` | `src/pages/__tests__/Settings.test.jsx:164-181` | ✅ PASS |
| SETT-02.5 Advanced explains reset before click | explanatory text present | `src/pages/__tests__/Settings.test.jsx:103-112` | ✅ PASS |
| SETT-03 Profile shows read-only name/email | text nodes present, no `textbox` role | `src/pages/__tests__/Settings.test.jsx:52-60` | ✅ PASS |

### P2: Tabs are linkable and keyboard-operable

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SETT-04.1 `?tab=advanced` opens Advanced | Advanced tab selected + reset button shown | `src/pages/__tests__/Settings.test.jsx:214-224` | ✅ PASS |
| SETT-04.2 Selecting a tab updates URL, no reload | `location` testid shows `/settings?tab=advanced` | `src/pages/__tests__/Settings.test.jsx:226-235` | ✅ PASS |
| SETT-04.3 Unrecognised `?tab=` falls back to Profile | Profile selected with junk value `bogus` | `src/pages/__tests__/Settings.test.jsx:237-247` | ⚠️ See Discrimination Sensor — assertion passes but does not discriminate Settings.jsx's own guard (masked by Tabs.jsx's independent fallback) |
| SETT-05.4 Arrow keys move focus, wrap at ends | focus moves to adjacent tab; wraps both directions | `src/components/__tests__/Tabs.test.jsx:93-121` (three tests: next, wrap-right, wrap-left) | ✅ PASS |
| SETT-05.5 Visible focus indicator | `focus:outline` class present | `src/components/__tests__/Tabs.test.jsx:123-129` | ✅ PASS |

**Status**: ✅ All ACs have test evidence. One AC (SETT-04.3) has a passing assertion whose asserted value matches spec, but the discrimination sensor shows it doesn't actually exercise the code path it claims to — flagged below, not a functional defect (defense-in-depth keeps behavior correct).

---

## Discrimination Sensor

Sensor run in the real tree via targeted edits + `git checkout --` revert (no stash needed; each mutation reverted before the next). Tree confirmed clean (`git status --short` empty) before and after.

| # | File:line | Description | Killed? |
| - | --- | --- | --- |
| 1 | `src/components/Tabs.jsx:36` | Flipped `aria-selected={selected ? "true" : "false"}` → `{selected ? "false" : "true"}` | ✅ Killed — 11 tests failed across `Tabs.test.jsx` and `Settings.test.jsx` |
| 2 | `src/components/Tabs.jsx:15` | Broke arrow-key wrap: `(currentIndex + delta + tabs.length) % tabs.length` → `currentIndex + delta` (no modulo) | ✅ Killed — 2 tests failed (`ArrowLeft wraps...`, `ArrowRight wraps...`), plus a thrown error (`nextTab` undefined) |
| 3 | `src/pages/Settings.jsx:65` | Broke fallback logic: `TAB_IDS.includes(tabParam) ? tabParam : "profile"` → `tabParam ?? "profile"` (no allow-list check) | ❌ **Survived** — `src/pages/__tests__/Settings.test.jsx` still passes 17/17. Root cause: `Tabs.jsx:8` (`tabs.find((tab) => tab.id === active) ?? tabs[0]`) independently falls back to the first tab whenever `active` doesn't match any known tab id, so the "bogus" value flows through to Tabs and is silently corrected there — masking the removal of `Settings.jsx`'s own allow-list guard. |

**Sensor depth**: lightweight (3 targeted mutations)
**Result**: 2/3 killed — ⚠️ one surviving mutant

**Assessment**: this is not a behavioral bug (the UI still shows Profile for `?tab=bogus` because of the layered defense in `Tabs.jsx`), but it means `Settings.jsx:65`'s specific allow-list is currently untested — if it were later changed to pass through an unrecognised value differently (e.g. rendering a page-level error, or if `Tabs.jsx`'s own fallback were ever removed/changed), no test in this suite would catch the regression at the `Settings.jsx` layer specifically. Recommend a fix task: assert something only observable if `Settings.jsx`'s own guard is what supplies the fallback — e.g. spy/stub `Tabs` in isolation, or assert on `TAB_IDS` behavior directly, or accept this as intentional layered redundancy and note it explicitly in a comment. Given the observable end-to-end behavior is correct and the risk is low (test-strength gap, not a defect), this is a **Minor** severity gap, not a blocker.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — `Tabs.jsx` is 61 lines, single-purpose; `Settings.jsx` change is additive and scoped |
| Surgical changes | ✅ — only the two intended files + their test files modified (plus spec/tasks docs) |
| No scope creep | ✅ — no profile editing added (correctly deferred to `24-profile-settings` per Out of Scope) |
| Matches patterns | ✅ — `*Popup` convention untouched, `ConfirmationPopup` reused verbatim, Tailwind utility classes used throughout, no new inline `style` |
| Spec-anchored outcome check | ✅ for 17/18 criteria; ⚠️ 1 (SETT-04.3) flagged above |
| Per-layer coverage (component 1:1, page happy+edge+error) | ✅ — component tests cover selection/ARIA/keyboard/focus; page tests cover routing, reset happy/cancel paths, and edge cases |
| Every test maps to a spec AC/edge case | ✅ — spot-checked; no unclaimed tests observed |
| Documented guidelines followed | `docs/` conventions in CLAUDE.md — Tailwind-only styling, `*Popup`/`*Card` naming N/A here, services-layer boundary respected (`reset()` from `services/store` untouched) |

---

## Edge Cases

- [x] Refresh on Advanced tab reopens on Advanced — `Settings.test.jsx:258-265` (`reopening the page with the same URL restores the same tab`)
- [x] Reset completes, page stays on Advanced — `Settings.test.jsx:183-198`
- [x] No-null-user assumption for Profile — `Settings.test.jsx` renders via `AuthContext.Provider` with a fixed `SIGNED_IN_USER`; `ProfilePanel` (`Settings.jsx:10-28`) does not guard against `user` being null/undefined, consistent with `PrivateRoute` guaranteeing a signed-in user
- [x] Narrow viewport keeps tab strip reachable — `Tabs.test.jsx:131-135` asserts `overflow-x-auto` class on the tablist

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (no output/errors), build succeeded (`vite build`, 1.49s), tests: **57 test files passed, 1082 tests passed, 0 failed**
- **Feature-relevant files**: `Tabs.test.jsx` 13 tests passed; `Settings.test.jsx` 17 tests passed
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1: SETT-04.3 test doesn't discriminate `Settings.jsx`'s own fallback guard

- **Root cause**: `Tabs.jsx`'s `activeTab = tabs.find(...) ?? tabs[0]` independently defends against an unknown `active` id, so `Settings.jsx:65`'s `TAB_IDS.includes(tabParam) ? tabParam : "profile"` can be broken without any test noticing.
- **Fix task**: Either (a) add a unit-level assertion that specifically targets `Settings.jsx`'s guard (e.g. verify the URL/query-param value that gets passed to `Tabs` as `active` is exactly `"profile"` for a bogus param, not just the rendered UI outcome), or (b) accept the redundancy as an intentional, documented defense-in-depth pattern and leave as-is.
- **Priority**: Minor (test-strength gap; end-to-end behavior is correct today)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| SETT-01 | Done | ✅ Verified |
| SETT-02 | Done | ✅ Verified |
| SETT-03 | Done | ✅ Verified |
| SETT-04 | Done | ✅ Verified (with Minor test-strength note on SETT-04.3) |
| SETT-05 | Done | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (with one Minor, non-blocking follow-up recommended)

**Spec-anchored check**: 18/18 ACs have `file:line` evidence matching the spec-defined outcome (1 flagged with a sensor caveat, not a spec-precision gap)
**Sensor**: 2/3 mutations killed, 1 survived (Minor severity, behavior still correct due to layered fallback)
**Gate**: 1082/1082 tests passed, lint clean, build clean

**What works**: Tab structure, ARIA wiring, keyboard arrow navigation with wrap, focus indicator, reset action moved verbatim behind Advanced with confirmation/cancel/reset-and-reseed all intact, URL-linkable tabs (`?tab=`), unknown-value fallback to Profile (functionally correct, test-strength gap only), reopening on same tab after refresh, staying on Advanced after reset.

**Issues found**: SETT-04.3's own-guard coverage is masked by an independent fallback in `Tabs.jsx` — see Fix 1. Non-blocking.

**Next steps**: Optional follow-up fix task for SETT-04.3 test strength; otherwise feature is ready to merge.
