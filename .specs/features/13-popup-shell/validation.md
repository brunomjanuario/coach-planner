# Validation: Scrollable Popup Shell

**Commit range covered**: `31a5593..e76cc00` (5 commits, `main..feature/13-popup-shell`)
**Verdict: PASS.**

**Post-verification fix**: the moderate gap noted below (6 of 9 popups lacking per-popup footer/body DOM-containment tests) was closed with one added test per popup — `ConfirmationPopup.test.jsx`, `TeamPopup.test.jsx`, `PlayerPopup.test.jsx`, `GameSavePopup.test.jsx`, `GameResultPopup.test.jsx`, `RivalRowPopup.test.jsx` each gained a test asserting `shellBody` (`.overflow-y-auto.min-h-0`) contains the form/message but not the footer's action buttons. Verified load-bearing: re-applying the Verifier's exact `GameSavePopup.jsx` mutation (submit button moved inside `<form>`, `form={formId}` link dropped) now fails the new test with `expect(element).not.toContainElement(element)`; the mutation was then reverted (working tree confirmed clean). Full suite re-run after the fix: 735 tests passing (was 729; +6 new tests). The minor "wide element scrolls horizontally" gap is left as-is — no popup in the codebase currently renders wide content, so a test for it would be speculative.

## Per-AC Evidence Table

| AC | Requirement | Evidence (file:line) | Verdict |
|---|---|---|---|
| POPUP-01 | Panel caps at 85vh, `flex flex-col` | `src/components/PopupShell.jsx:17`; asserted `src/components/__tests__/PopupShell.test.jsx:61-67` | Pass |
| POPUP-02.1/.2 | Body scrolls via `overflow-y-auto`/`min-h-0` | `PopupShell.jsx:22`; asserted `PopupShell.test.jsx:69-75` | Pass |
| POPUP-02.3/.4 | Title/footer are siblings of scroll region, not inside it | `PopupShell.test.jsx:77-88` (generic, DOM containment via `toContainElement`); per-popup DOM-containment now asserted for all nine migrated popups: `TrainingSavePopup.test.jsx`, `TrainingDetailsPopup.test.jsx`, `SquadRatingPopup.test.jsx` (original), plus `ConfirmationPopup.test.jsx`, `TeamPopup.test.jsx`, `PlayerPopup.test.jsx`, `GameSavePopup.test.jsx`, `GameResultPopup.test.jsx`, `RivalRowPopup.test.jsx` (added post-verification) | Pass (fixed) |
| POPUP-03 | Short popup renders at natural height, no forced box | `PopupShell.test.jsx:133-140`; also `PlayerPopup.test.jsx:31-36` | Pass |
| POPUP-04.1 | `title`/`children`/`footer` render in order overlay→panel→title→body→footer | `PopupShell.test.jsx:48-59` | Pass |
| POPUP-04.4 | `width` overrides default `max-w-md` | `PopupShell.test.jsx:103-116` | Pass |
| POPUP-04 (dialog a11y) | `role="dialog"`, `aria-modal`, `aria-labelledby` wired to title | `PopupShell.jsx:14-16`; asserted `PopupShell.test.jsx:124-131` | Pass |
| POPUP-05.2/.3 | All nine popups migrated verbatim, existing behaviour/tests preserved | Confirmed by reading each of the nine popup source files; each imports and renders through `PopupShell`; full suite green (729/729) | Pass |
| POPUP-05.5 | No overlay markup outside `PopupShell.jsx` | `src/components/__tests__/PopupShell.test.jsx:29-46` (scans `src/components/*.jsx`, explicitly names all nine files) | Pass |
| Edge: no-footer omits action row/divider | `PopupShell.jsx:23-27`; asserted `PopupShell.test.jsx:90-94` | Pass |
| Edge: `z-50` retained for stacking | `PopupShell.jsx:12`; asserted `PopupShell.test.jsx:118-122` | Pass |
| Edge: nested popups still stack | `TrainingDetailsPopup.jsx:110-124` opens `ConfirmationPopup`/`SquadRatingPopup`; `GameResultPopup.jsx:164-178` does the same — both unchanged structurally from pre-migration, each nested popup is its own independent `PopupShell` instance (own overlay/z-50) | Pass (structural inspection; no dedicated "both interactive" test, but architecture is unchanged from pre-feature behavior which was explicitly out of scope to improve) |
| Wide element scrolls horizontally without widening panel | Not separately tested; no popup in this migration currently renders a wide table inside a popup body (spec's "standings table" example is a page, not a popup) — edge case is structurally supported (`overflow-y-auto` on body does not clip horizontal overflow) but unverified by a test | Gap (minor, spec anticipated a case that doesn't concretely exist in the codebase) |

## `form={formId}` functional verification

Confirmed the footer-submit-button-outside-`<form>` pattern (using `useId()` + HTML `form` attribute) actually works, not just structurally plausible: every migrated form popup's test suite drives submission via `user.click(screen.getByRole("button", {name: ...}))` on the real footer button (e.g. `GameSavePopup.test.jsx:62`, `TrainingSavePopup.test.jsx:136`, `PlayerPopup.test.jsx:48`, `TeamPopup.test.jsx:38`, `RivalRowPopup.test.jsx:60`, `GameResultPopup.test.jsx:85`, `SquadRatingPopup` via its Save button), and downstream assertions confirm `onSubmit`/service calls fired with the right payload. Since jsdom + `@testing-library/user-event` implement native form-association semantics for the `form` attribute, these clicks would fail to submit if the wiring were broken. This is genuine functional coverage, not incidental.

## Discrimination Sensor

Three mutations applied one at a time to the actual implementation, tests run, then reverted (`git status` clean throughout, confirmed at end):

1. **Removed `min-h-0` from `PopupShell.jsx`'s body div** (the exact bug the spec is guarding against).
   Command: `npx vitest run src/components/__tests__/PopupShell.test.jsx`
   Result: **Caught.** `the body region scrolls independently via overflow-y-auto and min-h-0 (AC POPUP-02.2)` fails: `expected 'overflow-y-auto' to match /min-h-0/`.

2. **`GameSavePopup.jsx`: moved the submit button back inside the `<form>`, removed `form={formId}`, removed it from `footer`.**
   Command: `npx vitest run src/components/__tests__/GameSavePopup.test.jsx src/components/__tests__/PopupShell.test.jsx`
   Result: **Not caught** — 25/25 tests still pass. No test in `GameSavePopup.test.jsx` (or any other of the four game/rating popups' suites) asserts that the submit control lives in the shell's footer/outside the scroll body via DOM containment — that check exists only for `TrainingSavePopup`, `TrainingDetailsPopup`, and `SquadRatingPopup`. This is a genuine coverage gap: a future edit that silently re-nests `GameSavePopup`'s (or `GameResultPopup`'s / `RivalRowPopup`'s / `TeamPopup`'s / `PlayerPopup`'s) submit button inside the scrollable body — reintroducing the exact "Save button scrolls out of view" bug this feature exists to fix — would pass CI undetected for those five popups.

3. **`TrainingSavePopup.jsx`: moved the footer div into `children` (inside the scroll region) instead of the `footer` prop.**
   Command: `npx vitest run src/components/__tests__/TrainingSavePopup.test.jsx`
   Result: **Caught.** `renders through PopupShell with the exercise list inside the scroll region and Create outside it (AC POPUP-02.4)` fails with `expect(element).not.toContainElement(element)` showing the submit button now inside `.overflow-y-auto.min-h-0`. (A second, unrelated test also failed as a side effect of the crude two-button-with-same-label edit; not a signal.)

All mutations reverted; `git status` clean and `git diff` empty at end of sensor run.

## Full Gate

```
npm run lint && npm run build && npm test
```
- `npm run lint`: clean, no errors/warnings.
- `npm run build`: succeeds (`vite build`, 5984 modules, no errors).
- `npm test`: **735/735 passed**, 46 test files (729 at initial verification + 6 post-fix containment tests).

## Verdict

**PASS.** The shell correctly implements the 85vh cap, isolated body scroll with `min-h-0`, pinned title/footer as true DOM siblings (verified by containment, not class presence), dialog a11y attributes, width override, and default no-footer/no-divider behavior. All nine popups are migrated with no duplicated overlay markup, locked by an invariant test that names each file explicitly. The `form={formId}` cross-sibling submit link is exercised functionally by real button clicks in every consumer's test suite, not merely present in markup.

The footer/body DOM-separation invariant is now test-enforced for all 9 migrated popups, not just 3. Re-running the exact mutation that originally slipped past `GameSavePopup.test.jsx` (submit button moved inside `<form>`, `form={formId}` dropped) now fails with `expect(element).not.toContainElement(element)`, confirming the fix closes the regression risk the gap described.
