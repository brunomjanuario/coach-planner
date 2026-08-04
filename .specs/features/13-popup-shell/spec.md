# Scrollable Popup Shell Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 00-test-harness

## Problem Statement

Every popup in the app renders the same two hand-copied divs — a fixed
full-screen overlay and a `bg-white p-6 rounded-2xl shadow-md w-full max-w-md`
panel — with **no height constraint**. A tall popup grows past the viewport and
its content becomes unreachable: `TrainingSavePopup` with four exercises pushes
the Create button below the fold, and because the overlay is `fixed inset-0` the
page behind cannot scroll to it either. The popup is a dead end.

The markup is duplicated across nine components
(`ConfirmationPopup`, `GameResultPopup`, `GameSavePopup`, `PlayerPopup`,
`RivalRowPopup`, `SquadRatingPopup`, `TeamPopup`, `TrainingDetailsPopup`,
`TrainingSavePopup`), so the fix has to be applied nine times — or once, behind a
shared shell.

## Goals

- [ ] No popup can render content the user cannot reach
- [ ] A popup taller than the viewport scrolls internally, with its title and action row still visible
- [ ] One `PopupShell` component replaces nine copies of the overlay markup

## Out of Scope

| Feature | Reason |
|---|---|
| Focus trapping / full modal a11y | Real, but a separate concern with its own ACs. This feature must not regress focus behaviour; it does not fix it. |
| Escape-to-close and click-outside-to-close | Same — a behaviour change, not a layout fix. Track separately. |
| Locking background scroll | The overlay already covers the page; body-scroll locking is a distinct fix. |
| Restyling popup interiors | Only the shell changes. Interior markup moves verbatim. |
| Nested popups (confirm inside details) | They already work by stacking; the shell must not break that, but nothing improves. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Max panel height | `max-h-[85vh]` | Leaves visible overlay above and below so the popup still reads as a layer, not a page | n |
| What scrolls | Only the body region; the title row and the action row stay fixed | The action row is what users lose today — pinning it is the point | n |
| How the shell is composed | `PopupShell` takes `title`, `children` (body) and `footer` (action row) | Three named regions is the smallest API that can pin header and footer | n |
| Width | Stays `max-w-md`, overridable per popup via a `width` prop | Existing widths are unchanged by default; `SquadRatingPopup` and `TrainingSavePopup` may want more later | n |
| Short popups | Render at natural height — no forced 85vh box | A 3-line confirmation must not become a tall empty panel | n |
| Nested popups | The shell keeps `z-50`; a popup rendered inside another still stacks above it | Matches today's `TrainingDetailsPopup` → `ConfirmationPopup` behaviour | n |
| Scroll affordance | The scroll region carries a visible top/bottom border when content overflows | Otherwise a cut-off list looks like a complete one | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: A tall popup is fully usable ⭐ MVP

**User Story**: As a coach, I want to reach the Save button on a long form so that adding
six exercises does not trap me.

**Why P1**: This is the reported failure.

**Acceptance Criteria**:

1. WHEN a popup's content exceeds the viewport THEN the panel SHALL cap at 85% of viewport height rather than growing past it
2. WHEN a popup's content exceeds the panel THEN the body region SHALL scroll vertically
3. WHEN the body region scrolls THEN the title SHALL remain visible
4. WHEN the body region scrolls THEN the action row SHALL remain visible
5. WHEN a popup's content fits THEN the panel SHALL render at its natural height with no scrollbar
6. WHEN the body region overflows THEN the system SHALL render a divider above and below it

**Independent Test**: Open a training with eight exercises; the Save button is on screen and the exercise list scrolls under a fixed header.

---

### P1: One shell, nine popups ⭐ MVP

**User Story**: As a maintainer, I want the overlay defined once so that the next popup
cannot be born broken.

**Why P1**: Nine copies is how this bug reached nine components.

**Acceptance Criteria**:

1. WHEN `PopupShell` renders THEN it SHALL provide the fixed overlay, the centred panel, the title row, the scrollable body and the pinned action row
2. WHEN each of the nine existing popups is migrated THEN it SHALL render the same visible content as before the migration
3. WHEN a popup is migrated THEN its existing tests SHALL pass unchanged, save for assertions that named the removed markup
4. WHEN a popup passes a `width` THEN the shell SHALL apply it, defaulting to `max-w-md`
5. WHEN the migration is complete THEN no component outside `PopupShell` SHALL contain the `fixed inset-0 ... z-50` overlay markup

**Independent Test**: `grep -r "fixed inset-0" src/components` returns only `PopupShell.jsx`.

---

## Edge Cases

- WHEN the viewport is very short (e.g. 400px) THEN the panel SHALL still cap at 85vh and scroll, never overflow
- WHEN a popup body contains a horizontally wide element (the standings table) THEN it SHALL scroll horizontally inside the body without widening the panel
- WHEN a confirmation popup opens on top of another popup THEN both SHALL stay layered and the top one SHALL be interactive
- WHEN a popup has no footer actions THEN the shell SHALL omit the action row and its divider rather than reserve empty space
- WHEN a popup's body is empty THEN the panel SHALL render title and actions with no scroll region artefacts

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| POPUP-01 | P1: Panel caps at 85vh | Tasks | Pending |
| POPUP-02 | P1: Body scrolls, header and footer pinned | Tasks | Pending |
| POPUP-03 | P1: Short popups keep natural height | Tasks | Pending |
| POPUP-04 | P1: `PopupShell` component exists with title/body/footer | Tasks | Pending |
| POPUP-05 | P1: All nine popups migrated, no duplicated overlay markup | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Every popup's action row is reachable at a 700px-tall viewport
- [ ] `fixed inset-0` appears exactly once in `src/components`
- [ ] No existing popup test needed a behaviour change to keep passing
