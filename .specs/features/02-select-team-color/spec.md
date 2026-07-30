# Selected-Team Colour Specification

**Scope:** Small · **Design:** skipped · **Depends on:** 00-test-harness

## Problem Statement

On both `/teams` and `/trainings` the selected list row is styled
`bg-lightblack` — the exact same colour as the row's own `hover:bg-lightblack`
state, and very close to the surrounding surface. Hovering any row makes it look
selected, and moving the pointer away makes the real selection ambiguous. The
coach cannot tell which team they are looking at.

The same list markup is duplicated in three places (`Teams.jsx` teams, `Teams.jsx`
players, `Trainings.jsx` teams), all of them missing React `key` props.

## Goals

- [ ] Selected and hovered rows are visually distinct at a glance
- [ ] One list-row component replaces three copies of the markup
- [ ] The missing `key` props are gone

## Out of Scope

| Feature | Reason |
|---|---|
| Full design-system pass | This fixes one broken affordance, not the app's visual language. |
| Converting `Calendar`/`SignIn`/`SignUp` from inline styles | AD-005 — opportunistic, and `10-calendar-navigation` owns the Calendar conversion. |
| Multi-select | No requirement; selection is single throughout. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Selection indicator | Accent background **plus** a left border bar | Colour alone fails for colour-blind users; the bar carries the state non-chromatically | n |
| Accent colour | A blue token consistent with the existing `bg-blue-500`/`bg-blue-600` buttons | Introducing a new hue for one state would be arbitrary | n |
| Hover treatment | Lighter than the surface, clearly weaker than selected | Hover and selected must never be confusable — the actual bug | n |
| Keyboard support | Rows become focusable and respond to Enter/Space | They are already click targets; making them `<li><button>` costs little and fixes the a11y hole | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Distinguishable selection ⭐ MVP

**User Story**: As a coach, I want to see which team is selected so that I know whose
players and trainings I am looking at.

**Why P1**: This is the whole feature.

**Acceptance Criteria**:

1. WHEN a row is selected THEN the system SHALL render it with the accent background and a left border bar
2. WHEN a row is hovered but not selected THEN the system SHALL render a hover state visually distinct from the selected state
3. WHEN a row is both selected and hovered THEN the system SHALL keep the selected styling dominant
4. WHEN no row is selected THEN the system SHALL render every row in the default state
5. WHEN a row is selected THEN the system SHALL set `aria-current="true"` on it

**Independent Test**: Select a team, hover a different one, confirm the two look different.

---

### P2: Single list-row component

**User Story**: As a developer, I want one selectable-row component so that a styling
change lands in one place.

**Why P2**: Not user-visible, but it is what stops the three copies drifting again.

**Acceptance Criteria**:

1. WHEN the component is rendered with `selected` THEN it SHALL apply the selected styling
2. WHEN it is clicked THEN it SHALL invoke `onSelect` exactly once
3. WHEN it receives keyboard Enter or Space THEN it SHALL invoke `onSelect`
4. WHEN a list renders it via `.map()` THEN each instance SHALL carry a stable `key`

**Independent Test**: All three lists render through the component and behave identically.

---

## Edge Cases

- WHEN a list is empty THEN the system SHALL render an empty-state message, not a bare `<ul>`
- WHEN the selected record is deleted THEN the system SHALL clear the selection rather than highlight nothing
- WHEN a team name is long enough to wrap THEN the left border bar SHALL span the full row height

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| SELECT-01 | P1: Distinguishable selection | Tasks | Pending |
| SELECT-02 | P1: Selection accessibility (`aria-current`, keyboard) | Tasks | Pending |
| SELECT-03 | P2: Single list-row component | Tasks | Pending |
| SELECT-04 | P2: Stable keys | Tasks | Pending |

**Coverage:** 4 total, 4 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Selected and hovered rows are distinguishable in a side-by-side screenshot
- [ ] Zero React key warnings in the console on `/teams` and `/trainings`
- [ ] The row markup exists in exactly one file
