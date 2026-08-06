# Game Reference Manager Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** 20-competitions, 21-opponents, 22-game-form-selects, 23-settings-tabs, 27-popup-button-system

## Problem Statement

Competitions and opponents are the same kind of thing — a named reference list
a coach maintains so the game form has something to offer (AD-010). They were
built as two features, so they shipped as two of everything: two buttons in the
Games page header (`src/pages/Games.jsx:157-169`), two popups, and two
components that are line-for-line the same apart from the noun.

`OpponentsPopup.jsx` and `CompetitionsPopup.jsx` are 226 and 228 lines with
identical structure: same state, same load/create/rename/delete flow, same
usage-count-before-delete, same markup. Only the service, the placeholder and
the word "opponent"/"competition" differ. Any fix to one has to be made twice —
and `27-popup-button-system` is about to prove it by having to migrate both.

For the coach, the two buttons sit side by side doing the same job on two
lists that are used together, in the same form, for the same fixture.

## Goals

- [ ] One popup manages both lists
- [ ] One component implements the manager; the lists supply their nouns
- [ ] The game form's two "Add new…" paths open that one popup, on the right list
- [ ] No behaviour from `20` or `21` is lost — including the delete-usage counts

## Out of Scope

| Feature | Reason |
|---|---|
| Making an opponent belong to a competition (a real foreign key) | AD-010 chose reference lists over FKs deliberately. "In the same popup" is a UI request; rewriting the relationship is a data-model feature with its own migration, cascade and standings questions. Logged in Assumptions as the alternative reading. |
| Per-competition standings | Explicitly deferred in `.specs/README.md`. |
| Head-to-head records per opponent | Same. |
| Bulk import / merge of duplicate names | Neither `20` nor `21` has it; adding it here would smuggle a feature into a consolidation. |
| Changing how games store their names | AD-010. Games keep their strings. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Reading of "opponents are linked to competitions" | The **UI** is merged: one popup, two tabs. The data model is untouched | The sentence that follows it — "they should be in the same popup" — is about placement. AD-010 already rejected FKs for this pair, and reversing that is not a UI change. Recorded here rather than dropped. | n |
| Tabs, not two stacked sections | One `Tabs` with Opponents and Competitions panels | The tab control already exists from `23`, is already accessible and keyboard-driven, and keeps the popup within `PopupShell`'s 85vh cap. Two stacked lists in one 85vh panel would put both in a cramped scroll. | n |
| Shared implementation | One `ReferenceListManager({ items, onCreate, onRename, onDelete, usageCount, nouns })` rendering the list body; the popup hosts two of them | 450 duplicated lines is how one bug becomes two. Same reasoning as AD-009 for the overlay. | n |
| Default tab | Opponents | Opponent is required on a game; competition is optional. The required one opens first. | n |
| Opening from the game form | The form's "Add new…" opens the merged popup with the matching tab active | `22` established that closing the manager re-reads the list and auto-selects an added name. That behaviour is preserved per-list. | n |
| Which list gets auto-selected on close | Only the list whose tab the user actually added to | If a coach adds an opponent *and* a competition in one visit, both get selected — the existing per-list diff logic runs for both, independently. | n |
| Games page buttons | The two header buttons collapse into one, labelled "Manage lists" | Two buttons for one popup would defeat the point. | n |
| Delete-usage counts | Preserved exactly, per list, including the singular/plural message | These are the one non-trivial behaviours in `20`/`21` and the easiest thing to lose in a consolidation. Called out so they are tested, not assumed. | n |
| Migration | None. No stored data changes shape | Purely a component reorganisation. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: One popup, both lists ⭐ MVP

**User Story**: As a coach, I want to manage opponents and competitions in one
place so that I stop choosing between two buttons that do the same job.

**Why P1**: This is the request.

**Acceptance Criteria**:

1. WHEN the Games page renders THEN it SHALL show one "Manage lists" button and
   SHALL NOT show separate "Competitions" and "Opponents" buttons
2. WHEN that button is activated THEN one popup SHALL open containing a tab for
   Opponents and a tab for Competitions, with Opponents active
3. WHEN the Competitions tab is selected THEN the competitions list SHALL render
   and the opponents list SHALL NOT be in the document
4. WHEN the popup is open THEN it SHALL use `PopupShell` and cap at 85vh with
   only its body scrolling
5. WHEN the popup is closed THEN the Games page SHALL re-read its games, as it
   does today after either manager closes

**Independent Test**: Open the Games page, click "Manage lists", assert two
tabs, an opponents list, and no competitions list in the document.

---

### P2: Nothing from `20` or `21` is lost

**User Story**: As a coach, I want add, rename and delete to work exactly as
they did so that consolidating the UI does not cost me a feature.

**Why P2**: This is the risk the feature carries, stated as requirements.

**Acceptance Criteria**:

1. WHEN a name is added on either tab THEN it SHALL be created via that list's
   service and SHALL appear in the list
2. WHEN a duplicate or empty name is submitted THEN that list's existing error
   message SHALL render and nothing SHALL be created
3. WHEN a rename is submitted THEN it SHALL persist and SHALL cascade to games
   holding the old name, exactly as `20`/`21` specified
4. WHEN a delete is requested THEN the confirmation SHALL state how many games
   use that name, with correct singular/plural wording
5. WHEN a delete is cancelled THEN nothing SHALL be removed
6. WHEN either list is empty THEN its own "No … yet" message SHALL render

**Independent Test**: Run `20`'s and `21`'s existing behavioural assertions
against the merged popup; all must pass with only the mounting changed.

---

### P3: The game form opens the right tab

**User Story**: As a coach filling in a game, I want "Add new…" to take me
straight to the right list so that the merge does not add a click.

**Why P3**: Preserves `22`'s convenience through the change.

**Acceptance Criteria**:

1. WHEN "Add new…" is chosen on the Opponent select THEN the merged popup SHALL
   open with the Opponents tab active
2. WHEN "Add new…" is chosen on the Competition select THEN it SHALL open with
   the Competitions tab active
3. WHEN the popup closes after a name was added THEN that name SHALL become the
   selected value in the matching field, as `22` specified
4. WHEN the popup closes with nothing added THEN every field in the game form
   SHALL be unchanged
5. WHEN both an opponent and a competition were added in one visit THEN both
   fields SHALL be updated

---

## Edge Cases

- WHEN a delete confirmation is open and the user switches tabs THEN the
  confirmation SHALL close rather than apply to the other list
- WHEN a rename is in progress on one tab and the user switches tabs THEN the
  in-progress edit SHALL be discarded, not carried across
- WHEN one list is empty and the other is not THEN each tab SHALL show its own
  correct state
- WHEN a name exists in both lists (a club that is also a cup name) THEN each
  list SHALL manage its own copy independently
- WHEN the popup is opened from the game form THEN the game form behind it SHALL
  remain mounted

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| GREF-01 | P1: One popup, both lists | Tasks | Pending |
| GREF-02 | P2: Behaviour preserved | Tasks | Pending |
| GREF-03 | P3: Game form opens the right tab | Tasks | Pending |

**Coverage:** 3 total, 3 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `OpponentsPopup.jsx` and `CompetitionsPopup.jsx` are gone, replaced by one manager and one popup
- [ ] Every assertion in `20`'s and `21`'s test files still passes
- [ ] The Games header has one reference-list button, not two
