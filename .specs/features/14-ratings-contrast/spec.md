# Ratings Contrast Specification

**Scope:** Small · **Design:** skipped · **Depends on:** 09-player-ratings

## Problem Statement

On `/teams`, the ratings UI renders light-grey backgrounds inside a dark page
that inherits `color: rgba(255, 255, 255, 0.87)` from `:root`
(`src/index.css:17`). White text on `bg-gray-100` is illegible:

- `SquadRanking.jsx:91` — every squad-ranking row (`bg-gray-100`), the player
  name and the rating figure
- `SquadRanking.jsx:56,66,76` — the unselected Combined/Training/Game filter
  buttons (`bg-gray-200`); the selected one is fine because it sets `text-white`
  on `bg-blue-600`
- `PlayerRatingHistory.jsx:87` — every rating-history row, rendered inside
  `PlayerCard`'s `bg-lightblack` surface

The same `bg-gray-100` rows in `TrainingDetailsPopup`, `SquadRatingPopup`,
`GameCardsSection` and `TrainingSavePopup` are **not** affected — they sit inside
a popup panel that sets `text-black`. Only the two components rendered directly
on the dark Teams page are broken.

## Goals

- [ ] Every rating row and filter button on `/teams` is readable
- [ ] Contrast holds in both the dark and light `prefers-color-scheme` variants

## Out of Scope

| Feature | Reason |
|---|---|
| A theme/token pass over the whole app | This fixes an illegible control, not the colour system. |
| Restyling the popup-hosted `bg-gray-100` rows | They are legible today; changing them is churn. |
| Dark-surface variants of the ratings UI (grey-on-dark instead of light rows) | A design decision beyond "make it readable". Recorded here so it is a choice, not an oversight. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Fix direction | Add an explicit dark text colour to the light surfaces | The user asked for black text on the ratings part; it also matches how popups already solve this | y — user chose it |
| Text colour | `text-gray-900` | Contrast ≥ 4.5:1 on `gray-100`/`gray-200` and it matches the popups' near-black | n |
| Where the colour is set | On the container that owns the light background, so children inherit | Setting it per-span is how one gets missed | n |
| Light-scheme check | Both variants verified, because `:root` swaps `color` under `prefers-color-scheme: light` | Candidate lesson L-005 — a contrast claim checked in one scheme only is half-checked | n |
| Selected filter button | Unchanged (`bg-blue-600 text-white`) | Already passes | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Readable squad ranking ⭐ MVP

**User Story**: As a coach, I want to read the squad ranking so that the ratings feature
is usable at all.

**Why P1**: The reported bug.

**Acceptance Criteria**:

1. WHEN a squad-ranking row renders THEN its player name and rating figure SHALL use a dark text colour on the light row background
2. WHEN an unselected filter button renders THEN it SHALL use a dark text colour on its light background
3. WHEN the selected filter button renders THEN it SHALL keep white text on blue
4. WHEN the ranking's empty state renders THEN "No rated players yet." SHALL remain readable on the page background
5. WHEN the page renders under `prefers-color-scheme: light` THEN every rule above SHALL still hold

**Independent Test**: Select a team with rated players; read every row and every filter button without selecting the text.

---

### P1: Readable rating history ⭐ MVP

**User Story**: As a coach, I want to read a player's rating history inside their card.

**Why P1**: Same defect, second component; fixing one and not the other leaves the page half broken.

**Acceptance Criteria**:

1. WHEN a rating-history row renders inside `PlayerCard` THEN its text SHALL use a dark colour on the light row background
2. WHEN a history row's controls render THEN they SHALL be distinguishable from the row text
3. WHEN the history is empty THEN its message SHALL remain readable on `bg-lightblack`

**Independent Test**: Open a rated player's card; every history line is legible.

---

## Edge Cases

- WHEN a rating figure is the placeholder "—" THEN it SHALL be readable, not near-invisible
- WHEN a player name is long enough to wrap THEN every wrapped line SHALL carry the same colour
- WHEN a row is hovered or focused THEN the text SHALL stay readable in that state too

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| CONTR-01 | P1: Squad-ranking rows readable | Tasks | Pending |
| CONTR-02 | P1: Filter buttons readable | Tasks | Pending |
| CONTR-03 | P1: Rating-history rows readable | Tasks | Pending |
| CONTR-04 | P1: Both colour schemes verified | Tasks | Pending |

**Coverage:** 4 total, 4 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] No light-background element on `/teams` inherits the white page text colour
- [ ] Every changed pair measures ≥ 4.5:1 contrast, in both colour schemes
