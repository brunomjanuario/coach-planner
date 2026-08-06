# App Scroll Shell Specification

**Scope:** Medium · **Design:** skipped · **Depends on:** none (foundation for all pages)

## Problem Statement

`src/App.jsx:22` renders the whole authenticated app into
`<div className="flex w-screen">` — a width constraint with no height
constraint. `Sidebar` (`src/components/Sidebar.jsx:24`) is `h-screen`: exactly
one viewport tall, in normal document flow, with no `sticky` or `fixed`.

So when a page's content is taller than the viewport — which Trainings always is
once a team has more than a handful of sessions — the **document** scrolls. The
sidebar scrolls with it. Its `bg-lightblack` background and right border are
only `100vh` tall, so at any scroll offset the nav's painted area ends partway
up the screen and bare background shows below it. That is the "nav bar gets
deformed" report: the nav is not deforming, it is scrolling off the top while
its box runs out of height at the bottom.

Every page also assumes it can grow freely, so the fix has to be made once in
the shell rather than page by page.

## Goals

- [ ] The browser window itself never scrolls in the authenticated app
- [ ] The sidebar is always fully painted, at every scroll position
- [ ] Long page content scrolls inside the main region, not the document
- [ ] Popups keep working — they are `fixed`, and must stay unaffected

## Out of Scope

| Feature | Reason |
|---|---|
| Redesigning the sidebar | Only its scroll behaviour is wrong. Its contents are fine. |
| A collapsible / mobile drawer nav | A real feature with its own ACs. This one keeps the current nav and makes it stay put. |
| Per-page internal scroll panes | `17-trainings-page-layout` deliberately removed those. Reintroducing them would undo it. |
| Sign-in / sign-up layout | Those routes render outside the shell and scroll fine. |
| Focus-trap / scroll-lock while a popup is open | Body-scroll-locking is a modal concern; see `13-popup-shell`'s deferred list. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Where the scroll lives | The shell is `h-screen overflow-hidden`; a single `<main>` wrapper is `flex-1 min-w-0 overflow-y-auto` | One scroll container, defined once. Pages stay unaware of it, so no page can reintroduce the bug. | n |
| Sidebar technique | Keep it in flow, drop `h-screen` for `h-full` inside a `h-screen` shell | `sticky`/`fixed` would need a matching left offset on the content and a second source of truth for the nav width. Flex with a bounded parent needs neither. | n |
| No transforms on the shell | The shell and `<main>` must not get `transform`, `filter`, `perspective` or `contain` | Any of those makes the shell a containing block for `position: fixed`, which would break every `PopupShell` overlay. Recorded because it is invisible until it breaks. | n |
| Scroll position on route change | Not reset — the new page starts wherever the container was | Out of scope to add scroll restoration; each page currently fits or is entered fresh. Logged so it is a known behaviour, not a surprise. | n |
| Horizontal overflow | `overflow-x` stays clipped at the shell; wide content (the league table) scrolls in its own container | The complaint is vertical. Letting the page scroll sideways would reintroduce the same class of bug on the other axis. | n |
| Testability in jsdom | jsdom does not lay out or scroll, so ACs are asserted as **class and structure** on the rendered elements, not as measured overflow | Stated up front so tests are named for what they actually prove. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: The nav stays put ⭐ MVP

**User Story**: As a coach scrolling a long list of trainings, I want the
navigation to stay exactly where it is so that I can switch pages without
scrolling back to the top.

**Why P1**: This is the reported bug.

**Acceptance Criteria**:

1. WHEN the authenticated app renders THEN the shell element SHALL carry both a
   viewport-height class (`h-screen`) and `overflow-hidden`, so the document has
   no scrollable overflow
2. WHEN the sidebar renders THEN it SHALL fill the shell's height (`h-full`)
   rather than declaring its own `h-screen`
3. WHEN page content is taller than the viewport THEN the scrollable element
   SHALL be the `<main>` region, which carries `overflow-y-auto`
4. WHEN the main region scrolls THEN the sidebar element SHALL NOT be inside
   that scroll container — asserted structurally, as siblings under the shell

**Independent Test**: Render the app at `/trainings` with 40 seeded trainings;
assert the shell/sidebar/main classes and that `<main>` is the only element in
the tree carrying `overflow-y-auto`.

---

### P2: Every page fits the new shell

**User Story**: As a coach, I want every page to fill the available space so
that no page ends up with a second scrollbar or a squashed column.

**Why P2**: The shell is worthless if pages fight it. Each page's root today is
`w-full flex flex-col` with no height contract.

**Acceptance Criteria**:

1. WHEN any page renders inside `<main>` THEN it SHALL NOT declare `h-screen`
   or `min-h-screen` of its own
2. WHEN `Trainings`, `Games`, `Home`, `Teams`, `Calendar` or `Settings` renders
   THEN exactly one scroll container SHALL exist in the tree (the shell's
   `<main>`)
3. WHEN the league table renders THEN its own horizontal overflow container
   SHALL still be present, so a wide table scrolls sideways inside itself

**Independent Test**: For each of the six pages, render and assert no
`h-screen`/`min-h-screen` on the page root and no second `overflow-y-auto`.

---

### P3: Popups still overlay the whole viewport

**User Story**: As a coach, I want a popup to cover the screen the way it always
did so that the layout change is invisible to me.

**Why P3**: Regression protection, not new behaviour.

**Acceptance Criteria**:

1. WHEN a popup opens THEN its overlay SHALL still render `fixed inset-0` and
   SHALL still be positioned relative to the viewport — asserted by confirming
   no ancestor of the popup carries a `transform`/`filter`/`contain` class
2. WHEN a popup is open and the page behind it is long THEN the popup SHALL
   still cap at `85vh` and scroll its own body (unchanged `PopupShell`
   behaviour)

---

## Edge Cases

- WHEN a page's content is shorter than the viewport THEN the main region SHALL
  NOT show a scrollbar and the sidebar SHALL still fill the full height
- WHEN the viewport is narrower than `md` THEN the sidebar SHALL remain a fixed
  60px rail (unchanged) and the main region SHALL still be the scroll container
- WHEN a route changes THEN the shell SHALL remain mounted — only `<main>`'s
  children swap, so the sidebar never remounts
- WHEN the unauthenticated routes (`/signin`, `/signup`) render THEN they SHALL
  NOT be wrapped by the shell and SHALL keep normal document scrolling

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| SHELL-01 | P1: The nav stays put | Tasks | Pending |
| SHELL-02 | P1: The nav stays put | Tasks | Pending |
| SHELL-03 | P2: Every page fits | Tasks | Pending |
| SHELL-04 | P3: Popups unaffected | Tasks | Pending |

**Coverage:** 4 total, 4 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Scrolling `/trainings` with 40 sessions never moves the sidebar
- [ ] `document.body` has no vertical scrollbar on any authenticated route
- [ ] All existing tests still pass — no page test changes behaviour
