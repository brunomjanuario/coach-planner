# Trainings Page Layout Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 16-training-card

## Problem Statement

The Trainings page loads every training on mount, then hides most of them. The
page is `h-screen` and splits the remaining height between two nested scroll
boxes (`src/pages/Trainings.jsx:239` and `:258`), so "Next Trainings" and "Past
Trainings" each get roughly a third of the viewport — about two cards each. A
coach with twelve sessions sees four and has to scroll two separate inner panes
to find the rest, neither of which shows a scrollbar until hovered.

The column widths make it worse: the content column carries both `flex-3` and
`flex-1` (`:237`), so which one wins depends on Tailwind's generated rule order
rather than on intent, and the team filter column takes an equal share of the
page for a list of two items.

The data is all there. The layout is what hides it.

## Goals

- [ ] Every loaded training is reachable by scrolling the page once
- [ ] The team filter takes the width it needs, not half the page
- [ ] Section headings say how many trainings are in each group

## Out of Scope

| Feature | Reason |
|---|---|
| What a training row looks like | `16-training-card` owns it. |
| Pagination or virtualised lists | At this app's scale the whole list fits; virtualisation is a performance fix for a problem we do not have. |
| Search / text filtering | A different capability. The team filter already exists. |
| Sorting controls | Trainings are chronological by definition (AD-006). |
| Applying the same treatment to the Games page | `19-games-three-column` owns the Games layout. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| What "show all on start" means | Every loaded training is rendered and reachable; the page scrolls as one document instead of two inner panes | User confirmed the complaint is the cramped panels, not missing data | y — user chose it |
| Sections | "Upcoming" and "Past" stay as separate sections, both fully rendered | The split is useful; the fixed heights were the problem | n |
| Page scrolling | The page scrolls; `h-screen` and the nested `overflow-y-auto` boxes go | One scrollbar instead of three | n |
| Past ordering | Most recent first | A coach looks back at the last session far more often than the first | n |
| Team filter column | Fixed width, sticky beside the content, full-width above it on narrow viewports | It is a filter, not a peer of the content | n |
| Counts | Each heading carries the number of trainings in that section | Makes "am I seeing everything?" answerable at a glance — the actual complaint | n |
| Empty sections | Keep their existing empty-state messages | Regression guard on candidate lesson L-004's finding | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Every training is reachable ⭐ MVP

**User Story**: As a coach, I want to see all my sessions on the trainings page so that I
am not hunting inside two small boxes.

**Why P1**: The reported complaint.

**Acceptance Criteria**:

1. WHEN the page loads THEN the system SHALL render every loaded training in its section, with no per-section height cap
2. WHEN the total content exceeds the viewport THEN the page SHALL scroll as a single document
3. WHEN the page renders THEN it SHALL contain no nested vertical scroll container for the training lists
4. WHEN a section has trainings THEN its heading SHALL show how many
5. WHEN a section has no trainings THEN it SHALL render its existing empty-state message and a count of zero

**Independent Test**: Seed twelve trainings; all twelve are in the DOM and reachable by scrolling the page, with no inner scrollbar.

---

### P1: A proportionate team filter ⭐ MVP

**User Story**: As a coach, I want the team list to stop taking half the page.

**Why P1**: It is half the reason the lists are cramped.

**Acceptance Criteria**:

1. WHEN the page renders at desktop width THEN the team filter SHALL occupy a fixed narrow column and the trainings SHALL take the remaining width
2. WHEN the page renders at narrow width THEN the team filter SHALL stack above the trainings rather than squeeze beside them
3. WHEN a team is selected THEN the sections SHALL show that team's trainings and the counts SHALL reflect the filtered set
4. WHEN the selected team is clicked again THEN the system SHALL clear the filter and restore all trainings, as it does today
5. WHEN the page renders THEN no element SHALL carry both `flex-1` and `flex-3`

**Independent Test**: At 1280px the team column is a fixed sidebar; at 480px it is stacked above.

---

### P2: Past trainings newest first

**User Story**: As a coach, I want my most recent session at the top of the past list.

**Why P2**: Ordering is a refinement; visibility is the P1.

**Acceptance Criteria**:

1. WHEN the past section renders THEN trainings SHALL be ordered most recent first
2. WHEN the upcoming section renders THEN trainings SHALL be ordered soonest first
3. WHEN a training has an invalid date THEN it SHALL still appear in the past section without breaking the ordering of the rest

**Independent Test**: Three past sessions dated Jan, Feb, Mar render Mar, Feb, Jan.

---

## Edge Cases

- WHEN there are no teams at all THEN the page SHALL keep its "No teams yet." state and the disabled add button
- WHEN unassigned trainings exist THEN that section SHALL remain above the others and SHALL NOT be capped either
- WHEN a filter message or deep-link error is showing THEN it SHALL stay visible without pushing content under a fixed viewport edge
- WHEN a training is created, edited or deleted THEN the counts SHALL update without a page reload
- WHEN every training belongs to one team and that team is filtered out THEN both sections SHALL show their empty states with zero counts

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TLAY-01 | P1: No per-section height cap; page scrolls once | Verified | ✅ Verified |
| TLAY-02 | P1: Section counts | Verified | ✅ Verified |
| TLAY-03 | P1: Fixed-width, responsive team filter column | Verified | ✅ Verified |
| TLAY-04 | P1: Conflicting flex utilities removed | Verified | ✅ Verified |
| TLAY-05 | P2: Section ordering | Verified | ✅ Verified |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Twelve trainings are all reachable with one page scroll
- [ ] The trainings page has exactly one vertical scrollbar
- [ ] Section headings answer "how many?" without counting rows
