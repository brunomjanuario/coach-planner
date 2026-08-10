# CSS Foundation Reset Specification

**Scope:** Large · **Design:** required · **Depends on:** none

## Problem Statement

`src/index.css` still carries ~40 lines of unremoved Vite scaffold CSS,
written as bare element selectors (`h1`, `button`, `a:hover`, `:root`)
mostly outside any `@layer`. Unlayered CSS beats every `@layer utilities`
rule regardless of source order, so these five scaffold rules silently
outrank Tailwind everywhere:

1. `h1 { font-size: 3.2em }` — every `<h1>` in the app renders at ~51px
   regardless of its `text-lg`/`text-xl` utility (measured: Settings'
   `text-xl` computes to `51.2px`, not `20px`). Hits `Games.jsx`,
   `Trainings.jsx`, `Settings.jsx`.
2. `@layer base { button { background-color: #1a1a1a } }` — every
   `<button>` with no explicit `bg-*` utility renders a dark box. Measured
   on the restyled `Tabs.jsx` (feature 31): the inactive tab computes
   `rgb(26, 26, 26)`, directly contradicting that feature's own
   AC TABUI-01.3 ("inactive SHALL carry no filled-pill background"). Also
   hits team-select pills, `NextGameCard`, icon buttons — measured 2-3
   leaked buttons per page across Teams, Trainings, Games.
3. `:root { background-color: grey; color: rgba(255,255,255,.87) }` plus
   `@media (prefers-color-scheme: light)` — `App.jsx`'s `<main>` has no
   background utility of its own, so this scaffold value is the app's
   *actual* rendered background everywhere, not a fallback. Measured:
   `rgb(128, 128, 128)` (`grey`) behind every page. White-ish text on that
   grey computes to **3.95:1** — already below the 4.5:1 AA floor in the
   supposedly-working default state. Flipping to light mode (`prefers-color-scheme: light`)
   makes it catastrophic: dark cards (`bg-lightblack`, built with no
   explicit text color, inheriting `:root`'s light text) drop to
   **1.42:1** on `TeamCard`/`PlayerCard`, and a selected list row drops to
   **1.22:1**. Neither path was ever actually designed — `docs/09-styling.md`
   already flags this: *"Unifying this is worth doing before any visual
   polish."*

None of this was caught by 1413 passing tests, because jsdom applies no
external stylesheet cascade — `getComputedStyle` in a test only sees
inline styles. Class-string assertions (`toMatch(/bg-white/)`) pass
whether or not the class actually wins the cascade. The suite is
structurally blind to this entire bug class.

## Goals

- [ ] Every rendered heading, button and page background matches its
      Tailwind utility — no unlayered scaffold CSS out-ranks them
- [ ] The app commits to one color scheme (dark, per user decision — see
      Assumptions) instead of two half-built, undesigned paths
- [ ] Every text/background pairing measured during audit clears 4.5:1
      WCAG AA in the shipped scheme
- [ ] A regression guard exists so an unlayered element-selector reappearing
      in `index.css` fails the suite, not a future screenshot

## Out of Scope

| Feature | Reason |
|---|---|
| Light mode, in any form | User decision: dark-only (see Assumptions/AD-017). Building a second designed theme is a separate, much larger feature. |
| `TeamCard`/`PlayerCard` image paths (bug 4) | Unrelated failure mode (asset pipeline, not CSS cascade). Planned separately as `34-asset-pipeline-fix`. |
| Converting `Calendar.jsx`/`SignIn.jsx`/`SignUp.jsx` off inline `style` | `docs/09-styling.md` already notes this as a standalone cleanup; those three files use explicit `color: "black"` and are not affected by the scaffold-CSS bug this feature removes. |
| Automated visual-regression/screenshot testing | The regression guard here is a static source check (no unlayered element selectors), cheap and precise for *this* defect class. Screenshot diffing is a separate infrastructure decision. |
| Re-theming `bg-gray-300` "Cancel" buttons or other pre-`27` popup color choices | `27-popup-button-system` already owns popup button color decisions via `Button`/`PopupActions`. This feature only removes the scaffold CSS interfering with rendering, not audits color choices already made. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Color scheme | **Dark-only.** Remove `color-scheme: light dark` and the `prefers-color-scheme: light` block entirely. Recorded as **AD-017**. | User decision (asked directly): matches how the app is actually built — dark shell, `bg-lightblack` cards, white sidebar text, white popups as a deliberate light-on-dark contrast surface. The light path was never a designed theme, just Vite scaffold. | y |
| App background color | `bg-neutral-950` (`#0a0a0a`) on the element that owns page background (see next row), replacing the `grey` (`#808080`) scaffold value | Distinct from `lightblack` (`#171717`, the *card/surface* color per `docs/09-styling.md`) so cards remain visually separated from the page behind them. Near-black, not pure black, avoids a harsh OLED-black clash with `lightblack` surfaces. | n |
| Where the background is set | `App.jsx`'s outer wrapper div (`flex w-screen h-screen overflow-hidden`), as an explicit Tailwind utility — not `:root`/`body` | `:root`/`body` styles are invisible at the component level and are exactly the mechanism that caused this bug; an explicit utility on the layout root is visible in the component that owns layout and matches how every other surface color in this app is set. | n |
| Text color on the new background | Explicit `text-gray-100` (or equivalent) added wherever text currently relies on inherited `:root` color, rather than re-adding a global `color` rule | Same reasoning as the background: an inherited global text color is what let three components (`TeamCard`, `PlayerCard`, `SelectableListItem`) ship with *zero* explicit text-color declarations. Making every consumer explicit is more verbose but removes the next hidden dependency on `:root`. | n |
| `h1` global override | Delete the rule. Do not replace it with a scoped default. | Every current `<h1>` already carries its own Tailwind size utility (`text-lg`, `text-xl`); the global rule only ever fights those, never helps. `docs/09-styling.md` already documents pages "override it" — the override is the only path exercised. | n |
| `button` global background/hover/focus rule | Delete the whole `@layer base { button {...} }` block, including the light-mode nested override | `Button.jsx` (feature 27) is the app's real button styling system and already sets its own background per variant. Every other raw `<button>` needs an explicit background decided per Task 2 below, rather than an implicit dark box. | n |
| `a:hover` global rule | Keep, but move inside `@layer base` and re-verify it's still needed | Sidebar hover pills may depend on it (feature not yet audited at spec time — resolved during Task 1's implementation, not guessed here). If audit shows nothing depends on it, delete instead; recorded as a Task 1 sub-decision, not a spec ambiguity, since it doesn't change scope or acceptance criteria either way. | n |
| Regression guard mechanism | A Vitest test that reads `src/index.css` as text and asserts (regex) it contains no bare element selector for `h1`/`button`/`a` outside an `@layer` block | jsdom cannot render the real cascade, so a rendered-DOM contrast test is not reliable here (confirmed: this is *why* the bug shipped). A source-level static check is cheap, deterministic, and directly targets the actual defect mechanism (unlayered selectors), not a proxy for it. | n |
| Every button needing a background decision | Enumerated exhaustively during Task 2 (implementation), not pre-listed here | The full list depends on live DOM measurement per page/popup, already gathered during spec research (see Design doc's Component Inventory) — encoding it twice would drift. Design.md is the source of truth for the list; spec.md's ACs bound the *behavior* every button must satisfy. | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: The rendered app matches its Tailwind classes ⭐ MVP

**User Story**: As a coach using the app, I want headings, buttons and
page backgrounds to look like what the code says, so that the UI I see is
the UI that was actually designed.

**Why P1**: This is the defect. Everything else is scope-bounding it.

**Acceptance Criteria**:

1. WHEN any page with a `<h1 className="text-lg">` or `text-xl` renders
   THEN its computed `font-size` SHALL match that utility's value (not
   `3.2em`/`51.2px`)
2. WHEN a `<button>` carries no explicit `bg-*` utility (e.g. `Tabs.jsx`'s
   inactive tab, icon-only buttons) THEN its computed `background-color`
   SHALL NOT be `rgb(26, 26, 26)` (the removed scaffold value) or any
   other color the component didn't explicitly declare
3. WHEN the app shell renders THEN the page background SHALL be an
   explicit utility on a component (not an inherited `:root`/`body` value)
   and SHALL compute to the chosen dark background, not `grey`
   (`rgb(128, 128, 128)`)
4. WHEN `Tabs.jsx`'s inactive tab renders THEN its background SHALL be
   transparent/track-colored per AC TABUI-01.3 (feature 31), not the
   removed scaffold dark box — this feature closes the regression feature
   31 accidentally shipped

**Independent Test**: Render Settings; assert the `<h1>`'s computed
`font-size` is 20px (`text-xl`), not 51.2px. Render `Tabs` with two tabs;
assert the inactive tab's computed background is not `rgb(26, 26, 26)`.

---

### P2: Every text/background pairing clears WCAG AA

**User Story**: As a coach reading the app, I want every label, heading
and list row to be legible, so contrast never gets in the way of actually
using the tool.

**Why P2**: The direct, measurable consequence of P1 — once the cascade
is fixed, every pairing that was silently relying on scaffold CSS needs an
explicit, correct color.

**Acceptance Criteria**:

1. WHEN any text renders against the app's background (page, card, popup,
   selected-row, tab) THEN its computed foreground/background contrast
   ratio SHALL be at least 4.5:1 (WCAG AA, normal text)
2. WHEN `TeamCard`, `PlayerCard`, `SelectableListItem`, `GameRow`,
   `ReferenceListManager`'s rows render THEN they SHALL carry an explicit
   text-color utility (not rely on inherited `:root` color)
3. WHEN the light-mode media query path existed THEN it SHALL be removed
   entirely — there is one rendered appearance, not two

**Independent Test**: For each component listed in Design.md's Component
Inventory, render it standalone and assert an explicit text-color class is
present on its text-bearing elements.

---

### P3: The bug class cannot silently reappear

**User Story**: As whoever touches `index.css` next, I want a fast, clear
failure if I reintroduce an unlayered element selector, so this doesn't
ship a fourth time.

**Why P3**: Prevention, not remediation — the actual root-cause fix for
*why* 1413 tests missed this.

**Acceptance Criteria**:

1. WHEN `src/index.css` contains a bare element selector (`h1`, `button`,
   `a`, etc.) outside an `@layer` block THEN a test SHALL fail, naming the
   offending selector
2. WHEN the same selectors exist properly scoped inside `@layer base`/
   `@layer components` THEN the test SHALL pass

**Independent Test**: Temporarily reintroduce `h1 { font-size: 3.2em }`
unlayered; confirm the guard test fails with a message naming `h1`. Revert.

---

## Edge Cases

- WHEN a component already sets its own explicit background/text color
  (popups: `bg-white text-black`; `Sidebar`: explicit `text-white`) THEN
  this feature SHALL NOT change its appearance — only components currently
  depending on the removed scaffold rules are in scope
- WHEN `Calendar.jsx`/`SignIn.jsx`/`SignUp.jsx` render (inline `style`,
  explicit `color: "black"`) THEN they SHALL be unaffected — confirmed out
  of the cascade this feature touches
- WHEN a popup's `ConfirmationPopup`/`PopupShell` renders inside the new
  dark app background THEN its own `bg-white` surface SHALL be unchanged
  (popups already set an explicit background)
- WHEN the guard test runs against a scoped `@layer base { a:hover {...} }`
  (if kept per the Assumptions row) THEN it SHALL pass — the guard targets
  *unlayered* selectors, not the presence of element selectors generally

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| CSSF-01 | P1: Rendered app matches Tailwind classes | Implementing | Verified |
| CSSF-02 | P2: Every pairing clears WCAG AA | Implementing | Verified |
| CSSF-03 | P3: Regression guard | Implementing | Verified |

**Coverage:** 3 total, 3 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] No unlayered element selector remains in `src/index.css` except by
      deliberate, guard-approved exception
- [ ] Every component in Design.md's Component Inventory renders with an
      explicit background and text color, verifiable by class presence
- [ ] The regression-guard test fails on the exact mutation that shipped
      bug 1/2/3 originally, proven during implementation
- [ ] `docs/09-styling.md` and `docs/STATE.md` reflect AD-017 and the new
      baseline
