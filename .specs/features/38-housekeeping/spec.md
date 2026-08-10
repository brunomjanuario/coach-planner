# Housekeeping Specification

**Scope:** Small · **Design:** skipped · **Depends on:** none

## Problem Statement

Three small, unrelated leftovers, grouped into one feature because none is
worth its own branch:

1. **No catch-all route.** `App.jsx`'s inner `<Routes>` (mounted once a coach
   is authenticated) lists six explicit paths and no `path="*"`. Navigating
   to an unknown path under the authenticated shell (e.g. `/nonexistent`)
   renders the `Sidebar` with a blank `<main>` — nothing matches, nothing
   renders, no feedback.
2. **Dead `App.css` import.** `src/App.css` is a zero-byte file. `CLAUDE.md`
   documented it as imported by both `App.jsx` and `pages/Calendar.jsx` —
   re-checked during this feature: `Calendar.jsx` no longer imports it (fixed
   by an earlier feature without updating that note); only `App.jsx` still
   does.
3. **A truthy-vs-`!= null` inconsistency.** `trainingService.getAllNumbered`
   filters with `teamId ? numbered.filter(...) : numbered` (line 41);
   `gameService.getAll` does the equivalent filter with `teamId != null`.
   No team in this app has an id of `0` or `""` (seed ids are `1`/`2`;
   generated ids are non-empty UUID strings), so this has never actually
   misbehaved — it is a latent inconsistency, not an observed bug, flagged
   for the same discipline reason `AD-003` already cares about id handling.

## Goals

- [ ] An unknown path under the authenticated shell renders a visible,
      helpful state instead of a blank pane
- [ ] `App.css`'s dead import is removed from both files that reference it
- [ ] `trainingService.getAllNumbered`'s `teamId` filter uses the same
      `!= null` convention `gameService.getAll` already uses

## Out of Scope

| Feature | Reason |
|---|---|
| Normalising the mixed numeric/UUID id types app-wide | A schema-v5 migration rewriting every id and cross-reference, for a defect that has never fired — explicitly logged as "not here" in `.specs/README.md`'s round-four section. This feature only fixes the one real, cheap inconsistency (`trainingService.getAllNumbered`'s truthy check), not the underlying id-type mix. |
| A styled 404 page matching a design system | No design system exists for empty/error states anywhere in this app yet (`NextGameCard`'s "No upcoming games", `SquadRanking`'s "No rated players yet" are the closest precedent — plain text, no illustration). A minimal, consistent-with-those page is in scope; a polished one is not. |
| Deleting `src/App.css` itself | Deleting an empty, harmless file is optional cleanup with zero behavioral effect either way; removing the two dead `import` statements is the actual fix (nothing byte-empty needs to stay imported). Left the file in place since Vite/the build treats a missing import target as an error, not a silent no-op, and deleting it is not necessary to close the bug — noted so a reviewer doesn't wonder why the file remains. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| 404 page content | A new `src/pages/NotFound.jsx`: a short heading + message + a link back to `/`, styled with the same Tailwind conventions every other page uses (no inline `style`) | Matches this codebase's one-file-per-route page convention; a link home is the minimum useful affordance, matching how `StatTile`/`ListTile`'s empty states offer a link rather than nothing. | n |
| Where the catch-all is mounted | Inside `App.jsx`'s *inner* `<Routes>` (the authenticated one), as `<Route path="*" element={<NotFound />} />` | The outer `<Routes>` already has an effective catch-all (`path="/*"` routes everything non-signin/signup into the authenticated shell); the actual gap is the *inner* route list having no fallback. Adding it there is the minimal, precisely-targeted fix. | y |

**Open questions:** none.

---

## User Stories

### P1: An unknown authenticated path shows something, not nothing ⭐ MVP

**User Story**: As a coach who mistypes a URL or follows a stale link, I
want to see a clear "not found" message, so I know what happened instead of
staring at a blank page.

**Why P1**: The only user-visible bug in this feature; the other two are
pure code hygiene.

**Acceptance Criteria**:

1. WHEN an authenticated coach navigates to a path that matches none of the
   six defined routes THEN the app SHALL render a visible message (not a
   blank `<main>`)
2. WHEN that message renders THEN it SHALL include a link back to `/`
3. WHEN a *defined* route is visited THEN behavior SHALL be unchanged
   (regression guard)

**Independent Test**: Render the authenticated app at `/does-not-exist`;
assert a heading/message is present and a link to `/` exists.

---

### P2: Two housekeeping fixes with no user-visible behavior

**User Story**: As a developer reading this codebase, I want dead imports
and inconsistent null-checks cleaned up, so the code matches its own
conventions.

**Why P2**: Zero product impact; still worth doing since both are one-line,
low-risk, and already documented as known issues.

**Acceptance Criteria**:

1. WHEN `App.jsx` and `pages/Calendar.jsx` are read THEN neither SHALL
   import `App.css`
2. WHEN `trainingService.getAllNumbered` is called with a `teamId` THEN its
   filter SHALL use `!= null`, matching `gameService.getAll`'s convention —
   behavior is unchanged for every id currently possible in this app (no
   `0`/`""` team id exists), verified by the full existing
   `Trainings.test.jsx`/`trainingService`-adjacent suite staying green

---

## Edge Cases

- WHEN the 404 route is hit while unauthenticated (e.g. `/does-not-exist`
  with no session) THEN `PrivateRoute` SHALL still redirect to `/signin`
  first — the new catch-all only ever renders for an authenticated coach,
  since it sits inside the `PrivateRoute`-gated inner `<Routes>`

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| HOUSE-01 | P1: Catch-all 404 route | Tasks | Pending |
| HOUSE-02 | P2: Dead import + null-check cleanup | Tasks | Pending |

**Coverage:** 2 total, 2 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `/does-not-exist` (authenticated) renders `NotFound`, not a blank pane
- [ ] `grep -rn "App.css" src` returns nothing
- [ ] `trainingService.getAllNumbered`'s `teamId` filter reads `!= null`
