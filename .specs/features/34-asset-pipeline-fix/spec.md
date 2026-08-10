# Asset Pipeline Fix Specification

**Scope:** Small · **Design:** skipped · **Depends on:** 33-css-foundation-reset (touches the same two files)

## Problem Statement

`TeamCard.jsx` and `PlayerCard.jsx` reference their images with a raw string
path — `src="src/assets/images/logo.png"` / `src="src/assets/images/person.png"`.
Vite does not process string literals inside JSX attributes, so this only
resolves in dev, where the dev server happens to serve the project root.
Confirmed against a real production build: `dist/assets/` contains no image
files at all, while the bundled JS still carries the literal path string —
both images 404 for every user of a built app. Neither image has an `alt`
either.

## Goals

- [ ] Both images render correctly in a production build, not just dev
- [ ] Both images have appropriate alt text

## Out of Scope

| Feature | Reason |
|---|---|
| `coach-planner.png`/`coach-planner-logo.png` | Not referenced in code today (per `docs/09-styling.md`'s Assets table). Wiring them in is a product decision, not a bug fix. |
| Replacing the placeholder images themselves | Only the loading mechanism is broken, not the assets. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Fix mechanism | Standard ES module `import` (`import logo from "../assets/images/logo.png"`), matching `docs/09-styling.md`'s own documented recommendation | Already the documented correct pattern for this exact bug in this repo; Vite fingerprints and copies imported assets into the build automatically. | y |
| Alt text | `TeamCard`: `` `${team.club} ${team.name} crest` ``. `PlayerCard`: `` `${player.name} avatar` `` | Matches the descriptive convention this app already uses for accessible names elsewhere (e.g. `Rename ${name}`, `Delete ${name}` aria-labels). | n |

**Open questions:** none.

---

## User Stories

### P1: Images survive a production build ⭐ MVP

**User Story**: As a coach using the deployed app, I want to see team crests
and player avatars, so the UI isn't missing images I was shown in dev.

**Why P1**: This is the whole bug.

**Acceptance Criteria**:

1. WHEN the app is built with `npm run build` THEN `dist/assets/` SHALL
   contain the referenced image files (fingerprinted, per Vite's normal
   asset pipeline)
2. WHEN `TeamCard`/`PlayerCard` render THEN their `<img>` `src` SHALL resolve
   to the Vite-processed asset URL, not the literal source-tree string
3. WHEN either image renders THEN it SHALL carry descriptive `alt` text

**Independent Test**: `npm run build`, grep `dist/assets/*.js` for the
fingerprinted image filenames (confirming Vite processed them), and confirm
the literal string `src/assets/images/` no longer appears anywhere in `dist/`.

---

## Edge Cases

- WHEN the dev server runs THEN both images SHALL still render exactly as
  before (no dev-only regression)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| ASSET-01 | P1: Images survive a production build | Tasks | Pending |

**Coverage:** 1 total, 1 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `dist/assets/` contains both images after a build
- [ ] Neither `TeamCard.jsx` nor `PlayerCard.jsx` contains a raw
      `src/assets/images/...` string
- [ ] Both `<img>` elements have `alt` text
