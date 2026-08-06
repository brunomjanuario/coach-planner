# Settings Tabs Specification

**Scope:** Small · **Design:** skipped · **Depends on:** 01-persistence-layer

## Problem Statement

The Settings page is a heading and one red button (`src/pages/Settings.jsx`, 32
lines). "Reset demo data" — the most destructive action in the app — is the first
and only thing on the page, with nothing separating it from the settings a coach
would actually visit Settings to change. There is no place to put anything else,
so anything else gets put somewhere else.

## Goals

- [x] Settings has a tab structure with a place for everyday settings and a place for destructive ones
- [x] Reset demo data moves behind the Advanced tab
- [x] The tabs are keyboard-operable and linkable

## Out of Scope

| Feature | Reason |
|---|---|
| Editing the profile | `24-profile-settings` owns it. This feature builds the shelf; `24` puts something on it. |
| Any new advanced action beyond the existing reset | Nothing else is asked for. |
| App preferences (theme, locale, date format) | No stated need, and no mechanism behind them. |
| A tab component shared with other pages | One page uses tabs. Extract when a second one does. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Tabs | Two: **Profile** and **Advanced** | User's stated structure | y — user chose it |
| Default tab | Profile | The destructive tab should never be what opens by default | n |
| Profile tab in this feature | Shows the signed-in user's details read-only, with a note that editing arrives with `24` | A tab that renders nothing looks broken; a read-only view is honest and testable | n |
| Advanced tab content | The existing reset button and its confirmation, moved verbatim | Moving and changing it in one step makes a regression indistinguishable from a redesign | n |
| Tab state | Local component state, reflected in the URL as `?tab=` so a tab is linkable and survives a refresh | The app already reads query params for deep links (`useDeepLinkPopup`) | n |
| Unknown `?tab=` value | Falls back to Profile without an error | A stale link should not break the page | n |
| Accessibility | `role="tablist"`/`tab`/`tabpanel`, `aria-selected`, arrow-key movement between tabs | A div-based tab strip is a keyboard trap; the pattern is well defined | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Two tabs ⭐ MVP

**User Story**: As a coach, I want Settings organised into sections so that the reset
button is not the first thing I see.

**Why P1**: The requested change.

**Acceptance Criteria**:

1. WHEN the settings page opens THEN the system SHALL render a Profile tab and an Advanced tab
2. WHEN the page opens with no tab specified THEN the system SHALL show the Profile tab
3. WHEN a tab is selected THEN the system SHALL show that tab's panel and hide the other
4. WHEN a tab is selected THEN only that tab SHALL be marked selected
5. WHEN the page renders THEN exactly one tab panel SHALL be in the document at a time

**Independent Test**: Open `/settings`; Profile is shown, the reset button is not in the document.

---

### P1: The reset action moves to Advanced ⭐ MVP

**User Story**: As a coach, I want the destructive action behind a deliberate click.

**Why P1**: It is why the tabs exist.

**Acceptance Criteria**:

1. WHEN the Advanced tab is selected THEN the system SHALL show the reset-demo-data action
2. WHEN reset is triggered THEN the system SHALL ask for confirmation, as it does today
3. WHEN reset is confirmed THEN the system SHALL clear and re-seed the store, as it does today
4. WHEN reset is cancelled THEN nothing SHALL change
5. WHEN the Advanced tab renders THEN it SHALL explain what reset does before the user clicks it

**Independent Test**: Reset from the Advanced tab; the seed data returns, exactly as before this feature.

---

### P2: Tabs are linkable and keyboard-operable

**User Story**: As a keyboard user, I want to move between tabs without a mouse.

**Why P2**: The structure is P1; this is what makes it usable.

**Acceptance Criteria**:

1. WHEN the URL carries `?tab=advanced` THEN the system SHALL open the Advanced tab
2. WHEN a tab is selected THEN the system SHALL update the URL without a page reload
3. WHEN the URL carries an unrecognised tab value THEN the system SHALL show Profile
4. WHEN a tab has focus and an arrow key is pressed THEN focus SHALL move to the adjacent tab
5. WHEN a tab is focused THEN a visible focus indicator SHALL render

**Independent Test**: Open `/settings?tab=advanced` directly; the Advanced panel is shown.

---

## Edge Cases

- WHEN the page is refreshed on the Advanced tab THEN it SHALL reopen on Advanced
- WHEN reset completes THEN the page SHALL stay on the Advanced tab rather than jump
- WHEN no user is signed in THEN the route is already guarded by `PrivateRoute`, so the Profile tab SHALL assume a user and SHALL NOT render a null-user state
- WHEN the viewport is narrow THEN the tab strip SHALL remain fully reachable rather than overflow off-screen

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| SETT-01 | P1: Tab structure with Profile default | Tasks | Done |
| SETT-02 | P1: Advanced tab hosts the reset action unchanged | Tasks | Done |
| SETT-03 | P1: Read-only profile details | Tasks | Done |
| SETT-04 | P2: URL-linkable tabs | Tasks | Done |
| SETT-05 | P2: Keyboard tab navigation | Tasks | Done |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] Reset demo data is never the first thing on the settings page
- [x] Reset behaves exactly as it did before the move
- [x] Every tab is reachable and operable by keyboard
