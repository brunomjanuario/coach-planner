# Popup Button System Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 13-popup-shell

## Problem Statement

Every popup hand-writes its own action buttons as raw Tailwind strings. There is
no `Button` component, so the same five-word class list is copy-pasted 30+ times
across eleven files — and it has drifted the same way the overlay drifted before
`13-popup-shell` (AD-009).

Two concrete defects fall out of that:

**Unreadable secondary buttons.** Fourteen buttons across eleven popups are
`bg-gray-300 text-white` — white text on `#d1d5db`, roughly 1.5:1 contrast,
well under the 4.5:1 WCAG AA floor `14-ratings-contrast` already established for
this codebase. Every "Cancel" and "Close" in the app is one of them.

**An incoherent action row.** `GameResultPopup`'s footer
(`src/components/GameResultPopup.jsx:74-118`) stacks five buttons in five
colours across two rows: "Clear Result" (red-600, pushed left with `mr-auto`),
"Cancel" (grey-on-white), "Save" (blue), "Rate squad" (green), then "Delete
Game" (red-800) alone on a second row. Two different reds mean two different
destructive weights that nothing explains; a green sits where a secondary
action should; and the two destructive actions are at opposite ends of the
dialog. `TrainingDetailsPopup` has the same problem in miniature —
Close / Edit / Delete / Rate squad, four colours, no hierarchy.

None of these buttons has a focus ring, a disabled style, or a shared size.

## Goals

- [ ] One `Button` component owns every popup action button's appearance
- [ ] Every button meets 4.5:1 text contrast in its normal state
- [ ] Action rows have one predictable order and one destructive weight
- [ ] A new popup cannot be born with the old grey-on-white button

## Out of Scope

| Feature | Reason |
|---|---|
| Non-popup buttons (page headers, forms, the `IconPlus` add buttons) | Real, but a different surface with different sizing. This feature ends at the popup boundary; a follow-up can adopt the same component. |
| Changing what any button *does* | Purely presentational. Every handler stays wired to the same action. |
| Icon-only buttons inside list rows (rename/delete in the managers) | They already have `aria-label`s and a hover style, and they are not action-row buttons. |
| A full design system / theme tokens | One component with four variants, not a token layer. |
| Dark mode | No dark mode exists today. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Variants | `primary` (blue), `secondary` (bordered, dark text on white), `danger` (red), `ghost` (borderless) | Four covers every current use. `secondary` becomes bordered rather than filled-grey, which is what fixes the contrast rather than merely darkening it. |  n |
| Two reds collapse to one | Both `bg-red-600` and `bg-red-800` become `danger` | Nothing in the product distinguishes "clear a result" from "delete a game" by *weight* — both are already behind a `ConfirmationPopup`. Two shades implied a hierarchy that does not exist. | n |
| "Rate squad" | Becomes `secondary`, not green | It is a navigation-to-another-popup action, not a confirmation. Green read as a second primary. | n |
| Action-row order | Destructive left (with `mr-auto`), then secondary, then primary rightmost | Matches the existing `GameResultPopup` intent (`mr-auto` on the destructive one) and keeps the primary under the thumb. Made explicit so it stops being per-popup taste. | n |
| One row, not two | `GameResultPopup`'s "Delete Game" moves up into the single action row next to "Clear Result" | Two destructive buttons on two rows was the specific complaint. Both are destructive; both belong on the destructive side. | n |
| Focus ring | `focus-visible:outline-2 focus-visible:outline-blue-500` on all variants | Matches `Tile` and `Tabs`, the two components that already got this right. | n |
| Contrast is asserted, not measured | Tests assert the **class** each variant renders; the 4.5:1 claim is verified once, by hand, at implementation and recorded in the component's doc comment | jsdom computes no colours. Stating this up front stops a test being named after a ratio it cannot check. | n |
| `PopupActions` wrapper | A second tiny component owning the row's flex/gap/order | Otherwise the ordering rule lives as a comment in eleven files and drifts exactly as the overlay did. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Readable buttons everywhere ⭐ MVP

**User Story**: As a coach, I want to be able to read what a button says so that
I know which one cancels and which one saves.

**Why P1**: "Cancel" is currently white on light grey in every popup in the app.

**Acceptance Criteria**:

1. WHEN a `Button` renders with `variant="secondary"` THEN it SHALL render dark
   text on a light background with a visible border, and SHALL NOT render
   `bg-gray-300 text-white`
2. WHEN a `Button` renders with any variant THEN it SHALL carry a
   `focus-visible` outline class
3. WHEN a `Button` renders with `disabled` THEN it SHALL carry a reduced-opacity
   class and a `not-allowed` cursor class, and its `onClick` SHALL NOT fire
4. WHEN a `Button` is given `type` THEN it SHALL forward it, defaulting to
   `"button"` — never to the browser's implicit `"submit"`
5. WHEN `Button` is given a `form` prop THEN it SHALL forward it, so the
   existing detached-submit pattern (`<button form={formId}>`) keeps working
6. WHEN the codebase is searched after migration THEN `bg-gray-300 text-white`
   SHALL appear zero times

**Independent Test**: Render each variant, assert its class set and the absence
of the grey-on-white pair; grep the source tree for the offending class.

---

### P2: One coherent action row

**User Story**: As a coach, I want every popup's buttons in the same place so
that I stop hunting for "Save".

**Why P2**: Readability (P1) is the bug; ordering is the "strange buttons"
complaint.

**Acceptance Criteria**:

1. WHEN `PopupActions` renders THEN destructive children SHALL be laid out on
   the left and the remaining children right-aligned, in a single row
2. WHEN `GameResultPopup` renders with a saved result and an `onDelete` handler
   THEN "Clear Result" and "Delete Game" SHALL both render in the same action
   row, both as `danger`, and the footer SHALL contain exactly one row element
3. WHEN `GameResultPopup` renders THEN "Rate squad" SHALL render as `secondary`
   and SHALL NOT carry a green background class
4. WHEN `TrainingDetailsPopup` renders THEN "Delete" SHALL be `danger`, "Edit"
   SHALL be `primary`, and "Close" and "Rate squad" SHALL be `secondary`
5. WHEN a popup's action row is rendered at a narrow width THEN it SHALL wrap
   rather than overflow its panel

**Independent Test**: Render `GameResultPopup` for a played game with a result
and assert one row, two `danger` buttons, no green class.

---

### P3: Every popup migrated

**User Story**: As a developer, I want one place to change a button so that the
next restyle is one diff, not eleven.

**Why P3**: The durability of P1/P2, not a user-visible change on its own.

**Acceptance Criteria**:

1. WHEN any of the eleven popups renders THEN every action button in its footer
   SHALL be a `Button`
2. WHEN each popup's existing tests run THEN they SHALL pass unchanged in
   behaviour — same labels, same handlers, same disabled conditions

---

## Edge Cases

- WHEN a popup has only one action ("Close") THEN the row SHALL still render it
  right-aligned, not stretched
- WHEN a destructive action is conditional (`hasResult`, `onDelete`) and absent
  THEN the row SHALL NOT leave a gap on the left
- WHEN a button's label is long THEN it SHALL NOT be truncated — the row wraps
  instead
- WHEN `Button` receives an unknown variant THEN it SHALL fall back to
  `secondary` rather than render an unstyled button

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| BTN-01 | P1: Readable buttons | Tasks | Pending |
| BTN-02 | P2: Coherent action row | Tasks | Pending |
| BTN-03 | P2: Games popups restyled | Tasks | Pending |
| BTN-04 | P3: Every popup migrated | Tasks | Pending |

**Coverage:** 4 total, 4 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `grep -rn 'bg-gray-300 text-white' src` returns nothing
- [ ] `GameResultPopup`'s footer is one row, not two
- [ ] Every popup's existing test file passes with no behavioural edits
