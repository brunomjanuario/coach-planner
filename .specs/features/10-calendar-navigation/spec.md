# Calendar Navigation Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 07-games-league-table

## Problem Statement

`pages/Calendar.jsx` renders a month grid populated from a `mockEvents` array
hard-coded inside the file — four events dated July 2025, completely
disconnected from the real `trainings` data. A coach looking at the calendar is
looking at fiction.

Nothing on the grid is clickable either, so even once the events are real there
is no way to get from "there's something on the 14th" to the record itself.

The file is also one of the three that bypass Tailwind entirely in favour of
inline `style` objects (AD-005), and clickable, themed, focusable cells are
exactly the kind of state that inline styles handle badly.

## Goals

- [ ] The calendar shows real trainings and games
- [ ] Clicking an event opens that record
- [ ] `Calendar.jsx` uses Tailwind like the rest of the app

## Out of Scope

| Feature | Reason |
|---|---|
| Creating an event by clicking an empty day | A reasonable idea, but it is a create flow with its own validation. The ideas list asked for navigation. |
| Drag-to-reschedule | Needs a drag library and a conflict model. |
| Week and day views | The month grid is what exists. Alternative views are their own feature. |
| iCal / Google Calendar export | External integration with its own spec. |
| Event colour customisation | Type-based colours are enough to distinguish trainings from games. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Event sources | Trainings and games only | The only dated entities that exist | n |
| Navigation target | The owning page with a query param, which auto-opens the detail popup | Reuses the popups that already exist rather than building a calendar-specific detail view | n |
| Query param shape | `/trainings?training=<id>` and `/games?game=<id>` | Explicit and bookmarkable; a single `?event=` would need a type discriminator anyway | n |
| Cleaning up the param | Removed from the URL once the popup opens | Leaving it means a refresh re-opens a popup the user already closed | n |
| A day with many events | Show the first three, then "+N more" | A calendar cell has fixed height; unbounded lists break the grid | n |
| Colour coding | Trainings and games keep the existing two-colour scheme | Already established in the placeholder; carrying it forward costs nothing | n |
| Filtering by team | Out of scope for this feature; the calendar shows all teams | Adding a filter here duplicates a control that exists on two other pages | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Real events on the calendar ⭐ MVP

**User Story**: As a coach, I want the calendar to show my actual trainings and games so
that it reflects my week.

**Why P1**: A calendar of invented events is worse than no calendar.

**Acceptance Criteria**:

1. WHEN the calendar renders a month THEN the system SHALL show every training and game falling within that month
2. WHEN an event is rendered THEN the system SHALL show its time and a label identifying the team and type
3. WHEN a training and a game fall on the same day THEN the system SHALL show both, visually distinguished by type
4. WHEN a day has no events THEN the system SHALL render the day cell with no event content
5. WHEN the month is changed THEN the system SHALL recompute the events for the new month
6. WHEN the hard-coded `mockEvents` array is removed THEN no fabricated event SHALL appear anywhere

**Independent Test**: Create a training for the 14th; it appears on the 14th of the calendar.

---

### P1: Clickable events ⭐ MVP

**User Story**: As a coach, I want to click an event and land on it so that the calendar
is a way in, not just a picture.

**Why P1**: The idea as stated.

**Acceptance Criteria**:

1. WHEN a training event is clicked THEN the system SHALL navigate to the trainings page and open that training's details
2. WHEN a game event is clicked THEN the system SHALL navigate to the games page and open that game
3. WHEN the target record no longer exists THEN the system SHALL land on the page and show a not-found message rather than an empty popup
4. WHEN the popup is opened from a deep link THEN the system SHALL remove the query parameter so a refresh does not reopen it
5. WHEN an event is focused by keyboard and activated THEN the system SHALL navigate identically to a click

**Independent Test**: Click a training on the calendar; the trainings page opens with that training's popup showing.

---

### P2: Tailwind conversion

**User Story**: As a developer, I want the calendar styled like the rest of the app so
that interactive states are maintainable.

**Why P2**: Not user-visible, but clickable and focusable cells need hover and
focus states that inline styles express poorly.

**Acceptance Criteria**:

1. WHEN `Calendar.jsx` is rendered THEN the system SHALL use Tailwind utility classes rather than inline `style` objects
2. WHEN the calendar is rendered THEN the today-highlight, event colours and grid layout SHALL be visually equivalent to the current implementation
3. WHEN an event is hovered or focused THEN the system SHALL show a distinct state

**Independent Test**: No `style={{` remains in `Calendar.jsx`.

---

## Edge Cases

- WHEN a day holds more than three events THEN the cell SHALL show the first three and a "+N more" indicator rather than overflow
- WHEN an event's date is invalid THEN the system SHALL omit it from the grid rather than crash the month
- WHEN a month boundary splits a week THEN events SHALL only appear in their own month's cells
- WHEN a training has no team THEN its label SHALL read "Unassigned" rather than render `undefined`
- WHEN navigating to an event whose owning page is filtered to a different team THEN the system SHALL clear the filter so the record is visible
- WHEN the calendar renders a month with no events at all THEN the grid SHALL render normally

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| CAL-01 | P1: Unified event feed | Tasks | Pending |
| CAL-02 | P1: Real events replace mockEvents | Tasks | Pending |
| CAL-03 | P2: Tailwind conversion | Tasks | Pending |
| CAL-04 | P1: Clickable events and navigation | Tasks | Pending |
| CAL-05 | P1: Deep link handling on the trainings page | Tasks | Pending |
| CAL-06 | P1: Deep link handling on the games page | Tasks | Pending |

**Coverage:** 6 total, 6 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] No hard-coded event data remains in `Calendar.jsx`
- [ ] Every event on the grid can be clicked through to its record
- [ ] A refresh after opening a deep-linked popup does not reopen it
- [ ] `Calendar.jsx` contains no inline `style` objects
