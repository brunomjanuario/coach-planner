# Settings Tabs Polish Specification

**Scope:** Small · **Design:** skipped · **Depends on:** 23-settings-tabs

## Problem Statement

`23-settings-tabs` shipped a correct tab control and an unfinished-looking one.
`src/components/Tabs.jsx` renders each tab as `px-4 py-2 rounded-t-md
border-b-2`, active being `border-blue-500 font-semibold`, over a strip that is
itself `border-b border-gray-200`. Three problems follow from that:

- The active indicator is a 2px line sitting directly on top of a 1px strip
  border, so the "selected" signal is a barely-visible hairline offset by one
  pixel from the line beside it.
- `rounded-t-md` rounds corners that have no background to round — nothing is
  filled, so the radius is invisible and the class is dead weight.
- The only other difference between states is `font-semibold`, which changes the
  label's width as you switch tabs and nudges the neighbouring tab sideways.

There is also a stray blank line inside the `tablist` element
(`src/components/Tabs.jsx:27`) left over from the original edit.

Separately, `23`'s Verifier left one open item: the `?tab=` fallback test
(AC SETT-04.3) does not discriminate `Settings.jsx`'s own allow-list guard,
because `Tabs.jsx`'s independent `tabs.find(...) ?? tabs[0]` fallback masks its
removal. End-user behaviour is correct; the test is not load-bearing. This
feature touches both files and is the natural place to close it.

## Goals

- [ ] The selected tab is unmistakable at a glance
- [ ] Switching tabs does not shift the other tabs' positions
- [ ] Every accessibility and keyboard behaviour from `23` survives intact
- [ ] `23`'s carried-forward test-strength gap is closed

## Out of Scope

| Feature | Reason |
|---|---|
| New settings tabs or new settings content | `23` and `24` defined the content. This is the shelf, not what is on it. |
| Changing `?tab=` routing behaviour | It works. Only its *test* is strengthened. |
| A generic tab system for other pages | `Tabs` is already generic. `30-game-reference-manager` consumes it as-is. |
| Vertical or scrollable-overflow tab layouts | Two tabs. Solving for twenty is speculative. |
| Dark mode | None exists. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Visual direction | A **segmented control**: a rounded `bg-gray-100` track holding the tabs, the active one lifted onto a white pill with a shadow | It makes the radius meaningful (there is now a background to round) and gives a filled, unambiguous selected state instead of a hairline. | n |
| No weight change on select | Both states use the same font weight; the active pill carries the emphasis | `font-semibold`-on-select is what makes neighbouring tabs jump. | n |
| Contrast | Inactive label text is at least 4.5:1 on the track; active at least 4.5:1 on the pill | The same bar `14-ratings-contrast` set. Verified by hand at implementation and recorded in the doc comment, since jsdom cannot measure it. | n |
| Keyboard and ARIA | Unchanged — `role`s, `aria-selected`, `aria-controls`, roving `tabIndex`, Left/Right with wrap, single mounted panel | `23`'s ACs stay in force. This is a restyle; every one of them is re-asserted rather than assumed. | n |
| Focus ring | Kept, and must remain visible **against the new pill background** | A focus ring that disappears on the active tab is a regression a purely visual change can easily introduce. | n |
| `30` also uses `Tabs` | Yes, in the merged reference-lists popup | Recorded so whoever runs these out of order knows the blast radius is two surfaces, not one. | n |
| Closing the `23` gap | Give `Settings.jsx` a test that fails if its `TAB_IDS` allow-list is removed, by asserting a value that `Tabs.jsx`'s own fallback would resolve differently | Currently both guards land on the same tab, so neither is independently proven. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: The selected tab looks selected ⭐ MVP

**User Story**: As a coach on the Settings page, I want to see which tab I am on
so that I do not have to read the panel to work it out.

**Why P1**: This is the request.

**Acceptance Criteria**:

1. WHEN the tab strip renders THEN it SHALL render as a segmented track with a
   background and a radius, and SHALL NOT rely on a bottom-border hairline as
   its selected indicator
2. WHEN a tab is active THEN it SHALL carry a filled-pill class set distinct
   from the inactive tabs'
3. WHEN a tab is inactive THEN it SHALL carry no filled-pill background and
   SHALL show a hover state
4. WHEN the active tab changes THEN both tabs SHALL keep the same font weight,
   so no tab's width changes
5. WHEN a tab has keyboard focus THEN a focus ring SHALL be present on both the
   active and the inactive states

**Independent Test**: Render two tabs, assert the active one's pill classes and
the inactive one's absence of them, then switch and assert they swap.

---

### P2: Nothing from `23` regresses

**User Story**: As a keyboard user, I want the tabs to behave exactly as they
did so that a restyle does not cost me the control.

**Why P2**: This is the risk, written as requirements.

**Acceptance Criteria**:

1. WHEN the strip renders THEN it SHALL still be `role="tablist"` with one
   `role="tab"` per entry and exactly one `role="tabpanel"` in the document
2. WHEN a tab is active THEN it alone SHALL carry `aria-selected="true"`, and
   the inactive tab SHALL carry `aria-selected="false"`
3. WHEN Left or Right is pressed THEN focus SHALL move between tabs and wrap at
   both ends
4. WHEN a tab is not active THEN it SHALL carry `tabIndex={-1}`, so the strip is
   one tab stop
5. WHEN a tab is clicked THEN `onChange` SHALL be called with that tab's id and
   the component SHALL NOT change state on its own

---

### P3: The `?tab=` guard is independently proven

**User Story**: As a developer, I want the settings tab fallback to be tested
where it lives so that removing the guard fails a test.

**Why P3**: A carried-forward test-strength item from `23`, not user-visible.

**Acceptance Criteria**:

1. WHEN `Settings.jsx`'s `TAB_IDS` allow-list is removed THEN at least one test
   SHALL fail — proven by performing that mutation during implementation and
   observing the failure
2. WHEN `?tab=` holds an unrecognised value THEN the Profile panel SHALL render,
   unchanged from `23`

---

## Edge Cases

- WHEN there is only one tab THEN the strip SHALL render it as active and arrow
  keys SHALL leave it active (wrap of length 1)
- WHEN a tab label is long THEN the pill SHALL grow with it and the strip SHALL
  scroll horizontally rather than overflow its container
- WHEN the strip renders inside a popup (`30`) THEN it SHALL sit within the
  popup's width without forcing horizontal page scroll
- WHEN the strip is rendered at a narrow viewport THEN every tab SHALL remain
  reachable

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| TABUI-01 | P1: Selected tab is obvious | Tasks | Pending |
| TABUI-02 | P2: `23`'s behaviour preserved | Tasks | Pending |
| TABUI-03 | P3: `?tab=` guard proven | Tasks | Pending |

**Coverage:** 3 total, 3 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] The active tab is identifiable without reading the panel below it
- [ ] Every AC from `23`'s SETT-01 and SETT-05 still passes
- [ ] Removing `Settings.jsx`'s allow-list turns the suite red
