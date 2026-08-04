# Calendar Event Colours Specification

**Scope:** Small · **Design:** skipped · **Depends on:** 10-calendar-navigation

## Problem Statement

Calendar events are colour-coded backwards and undocumented.
`src/pages/Calendar.jsx:150-152` renders games as `bg-blue-100` and trainings as
`bg-amber-200` — the opposite of the association a coach expects (match day is
the loud colour), and nothing on the page says which is which. With three events
crammed into a 100px cell, the only way to tell a game from a training is to read
the title.

The mapping is also inline in a ternary, so the next event type has nowhere to go.

## Goals

- [ ] Games and trainings are distinguishable at a glance, without reading
- [ ] Games are orange, trainings are blue
- [ ] A legend states the mapping on the page
- [ ] The mapping lives in one place a new event type can extend

## Out of Scope

| Feature | Reason |
|---|---|
| Per-team colours | A second colour dimension on a 100px cell competes with the type dimension. Different feature. |
| Colour-coding by result (won/lost/drawn) | The calendar shows what is scheduled, not what happened. |
| Converting the rest of `Calendar.jsx` to Tailwind | Already done — the file is Tailwind throughout (AD-005 satisfied by `10`). |
| User-configurable colours | No stated need. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Game colour | Orange (`bg-orange-200` family) | User's stated choice | y — user chose it |
| Training colour | Blue (`bg-blue-200` family) | User's stated choice | y — user chose it |
| Non-chromatic differentiator | Each event also carries a type-coloured left border and an accessible label naming the type | Colour alone excludes colour-blind users; same reasoning as `02`'s selection bar | n |
| Where the mapping lives | An exported map in `src/lib/calendarEvents.js` beside `toEvents` | It is event metadata, and that module already owns the event shape | n |
| Unknown event type | Falls back to a neutral grey style rather than crashing or rendering unstyled | A future type must degrade, not break | n |
| Legend placement | In the calendar header row, beside the month title | Visible without scrolling, out of the grid | n |
| Text colour | Explicit dark text on every swatch | The calendar panel is `bg-white` today, but the swatches must not depend on that (lesson L-005) | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Type-coloured events ⭐ MVP

**User Story**: As a coach, I want games and trainings to look different so that I can
read my month at a glance.

**Why P1**: The feature.

**Acceptance Criteria**:

1. WHEN a game renders in a day cell THEN the system SHALL style it with the orange event style
2. WHEN a training renders in a day cell THEN the system SHALL style it with the blue event style
3. WHEN any event renders THEN the system SHALL also apply a type-coloured left border, so type is carried non-chromatically
4. WHEN an event of an unrecognised type renders THEN the system SHALL apply the neutral fallback style rather than no style
5. WHEN an event renders THEN its accessible name SHALL include its type, its time and its title

**Independent Test**: A month with one game and one training shows two visibly different chips; a screen reader announces "game" and "training".

---

### P1: A legend ⭐ MVP

**User Story**: As a coach, I want the page to tell me what the colours mean so that I do
not have to infer them.

**Why P1**: A colour code nobody can read is decoration.

**Acceptance Criteria**:

1. WHEN the calendar renders THEN the system SHALL display a legend naming each event type with its colour swatch
2. WHEN the legend renders THEN it SHALL be generated from the same mapping the day cells use, not from a hard-coded copy
3. WHEN a new event type is added to the mapping THEN the legend SHALL include it with no further change

**Independent Test**: Add a third entry to the mapping in a test; the legend renders three items.

---

## Edge Cases

- WHEN a day holds more events than the visible cap THEN the "+N more" indicator SHALL stay readable and un-coloured
- WHEN an event falls on today THEN the cell's today highlight SHALL not wash out the event colour
- WHEN an event chip is hovered or focused THEN its type colour SHALL remain identifiable
- WHEN an event's title is long THEN it SHALL truncate as it does today without losing the colour or the border

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| CALCOL-01 | P1: Games orange, trainings blue | Tasks | Pending |
| CALCOL-02 | P1: Non-chromatic type indicator + accessible name | Tasks | Pending |
| CALCOL-03 | P1: Mapping centralised with a neutral fallback | Tasks | Pending |
| CALCOL-04 | P1: Legend derived from the mapping | Tasks | Pending |

**Coverage:** 4 total, 4 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Game and training chips are distinguishable in a screenshot with the text blurred
- [ ] `Calendar.jsx` contains no inline event-type colour ternary
- [ ] Adding an event type requires editing exactly one map
