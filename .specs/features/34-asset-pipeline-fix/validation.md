# Asset Pipeline Fix Validation

**Date**: 2026-08-10
**Spec**: `.specs/features/34-asset-pipeline-fix/spec.md`
**Diff range**: `main..HEAD` (branch `feat/asset-pipeline-fix`, 4 commits: `15f4906`, `c0e01fa`, `0095c93`, `a870fb9`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1: Fix TeamCard's image import and add alt text | ✅ Done | `import logo from "../assets/images/logo.png"`; `<img src={logo} alt={...}/>`; new `TeamCard.test.jsx` |
| T2: Fix PlayerCard's image import and add alt text | ✅ Done | `import avatar from "../assets/images/person.png"`; `<img src={avatar} alt={...}/>`; `PlayerCard.test.jsx` gained the two ASSET-01 tests |
| T3: Prove the production-build claim | ✅ Done | `docs(assets)` commit updates spec traceability status; independently re-verified below (own build run, not just trusted from the commit) |

---

## Spec-Anchored Acceptance Criteria

### P1: Images survive a production build (ASSET-01)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | --------------------- | ------------------------ | ------ |
| WHEN the app is built with `npm run build` THEN `dist/assets/` SHALL contain the referenced image files (fingerprinted) | `dist/assets/` contains a fingerprinted file per image; no unit test possible (jsdom) | Verifier's own build run: `ls dist/assets/` → `logo-oWxnnCML.png`, `person-C3Rfjs2-.png`; `grep -r "src/assets/images" dist/` → no matches | ✅ PASS (build-level evidence, not test-level) |
| WHEN `TeamCard`/`PlayerCard` render THEN their `<img>` `src` SHALL resolve to the Vite-processed asset URL, not the literal source-tree string | `img.getAttribute("src")` must not equal the literal string `"src/assets/images/logo.png"` / `"src/assets/images/person.png"` | `src/components/__tests__/TeamCard.test.jsx:13-18` — `expect(img.getAttribute("src")).not.toBe("src/assets/images/logo.png")`; `src/components/__tests__/PlayerCard.test.jsx:53-59` — `expect(img.getAttribute("src")).not.toBe("src/assets/images/person.png")` | ✅ PASS |
| WHEN either image renders THEN it SHALL carry descriptive `alt` text | `TeamCard`: `` `${team.club} ${team.name} crest` ``; `PlayerCard`: `` `${player.name} avatar` `` (per spec's Assumptions table) | `TeamCard.test.jsx:20-25` — `screen.getByAltText("Amadora Sub-11 crest")`; `PlayerCard.test.jsx:61-65` — `screen.findByAltText(\`${player.name} avatar\`)` | ✅ PASS — exact spec-defined string matched |

**Status**: ✅ All ACs covered — no spec-precision gaps. The single AC (production build) whose evidence can't be produced by a unit test is independently confirmed below with a real `npm run build` + grep, not trusted from the commit message.

---

## Independent Production-Build Proof (re-run, not trusted from commit)

```
$ npm run build
✓ 6080 modules transformed.
dist/assets/person-C3Rfjs2-.png       5.19 kB
dist/assets/logo-oWxnnCML.png        23.86 kB
✓ built in 1.86s

$ ls dist/assets/ | grep -iE 'logo|person'
logo-oWxnnCML.png
person-C3Rfjs2-.png

$ grep -r "src/assets/images" dist/
(no output — literal raw path is genuinely absent from the build output)
```

**Confirms**: both images are fingerprinted and emitted by Vite's asset pipeline, and the literal `src/assets/images/...` string is completely gone from `dist/`. This is not a formality — it is the actual proof for AC ASSET-01.1, since jsdom-based component tests cannot exercise the real Vite build pipeline.

---

## Discrimination Sensor

Sensor ran in the real working tree with mutations applied and reverted via `git checkout --` immediately after each run (tree confirmed clean via `git status --short` before and after). No worktree/stash needed given the two-file surface.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `src/components/TeamCard.jsx:22` | Reverted `src={logo}` back to the hardcoded literal `src="src/assets/images/logo.png"` | ✅ Killed — `TeamCard.test.jsx` "not a raw source-tree path" test failed: `expected 'src/assets/images/logo.png' not to be 'src/assets/images/logo.png'` |
| 2 | `src/components/PlayerCard.jsx:93` | Removed alt text, `alt={...}` → `alt=""` | ✅ Killed — both ASSET-01 tests in `PlayerCard.test.jsx` failed (the alt-text assertion directly, and the `src` test transitively since it locates the element via `getByRole("img", {name: ...})`, which depends on the accessible name) |

**Sensor depth**: lightweight (2 mutations, proportional to a 2-file/1-AC fix)
**Result**: 2/2 killed — ✅ PASS

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅ — one import + one `<img>` attribute swap per file, matching `docs/09-styling.md`'s already-documented fix exactly |
| Surgical changes | ✅ — only `TeamCard.jsx`, `PlayerCard.jsx`, their test files, and `.specs/` files touched |
| No scope creep   | ✅ — out-of-scope items (unreferenced logo assets, replacing placeholder images) correctly left untouched |
| Matches patterns | ✅ — import style matches other asset imports elsewhere in the codebase; alt-text convention matches existing `aria-label` patterns (`Rename ${name}`, `Delete ${name}`) cited in the spec |
| Spec-anchored outcome check (asserted values match spec) | ✅ — alt text asserted against the exact spec-defined template strings |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — component-level 1:1 coverage of both testable ACs (src resolution, alt text); the build-emission AC is correctly left to build-level verification, not force-fit into a component test |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — all 4 new/added assertions map directly to ASSET-01.2/01.3 |
| Documented guidelines followed: `docs/09-styling.md` (Assets section) | ✅ — followed exactly as documented |

**Minor observation (not a gap against this feature's scope)**: `docs/09-styling.md:167-176` still describes the raw-string bug as the current implementation ("`TeamCard` and `PlayerCard` reference these with a raw relative path... Use an import instead") even though the import fix is now in place. Updating that doc section wasn't a task in `tasks.md` and isn't part of any AC, so this isn't a validation gap — flagging only as a drive-by note for a future docs pass.

---

## Edge Cases

- [x] WHEN the dev server runs THEN both images SHALL still render exactly as before (no dev-only regression) — ES module imports are handled by Vite in dev exactly as in prod (same asset pipeline), and the existing/new component tests render both cards successfully under jsdom with the imported reference, giving no indication of regression. Not separately UAT'd in a running dev server, but low-risk given imports are strictly more correct than raw strings and Vite's dev asset handling is standard behavior.

---

## Gate Check

- **Gate command**: `npm run lint && npm run build && npm test`
- **Result**: lint clean (0 errors/warnings), build succeeded, 1434 passed, 0 failed, 0 skipped (69 test files)
- **Test count before feature** (baseline: `git worktree add` on `main`, which already includes feature 33): 68 files / 1430 tests
- **Test count after feature**: 69 files / 1434 tests
- **Delta**: +1 test file (`TeamCard.test.jsx`, new), +4 tests (2 new in `TeamCard.test.jsx`, 2 new in `PlayerCard.test.jsx`)
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ----------- |
| ASSET-01    | Implementing      | ✅ Verified |

(Note: spec.md's own traceability table already shows `Implementing / Verified` as of commit `a870fb9` — confirmed consistent with this validation.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 3/3 criteria matched spec-defined outcomes, 0 spec-precision gaps
**Sensor**: 2/2 mutations killed
**Gate**: 1434 passed, 0 failed (lint clean, build clean)

**What works**:
- Both `TeamCard.jsx` and `PlayerCard.jsx` now import their images as ES modules instead of raw string literals, exactly matching the pattern already documented in `docs/09-styling.md`.
- Independently re-run `npm run build` confirms both images are fingerprinted and copied into `dist/assets/`, and the literal `src/assets/images/` string is completely absent from the build output — the core bug is fixed, verified first-hand rather than trusted from the commit message.
- Both images carry the spec-defined descriptive alt text.
- Tests are discriminating: reverting either fix (raw path, or missing alt) fails the corresponding assertions.
- No regressions: 1434/1434 tests pass, +4 over baseline, lint and build both clean.

**Issues found**: none blocking.

**Next steps**: none required. Optional low-priority follow-up: update `docs/09-styling.md:167-176` to stop describing the now-fixed raw-string pattern as current (out of scope for this feature; not a gap).
