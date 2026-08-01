# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — Before relying on a custom test-setup afterEach hook (cleanup, storage clearing), verify it is actually load-bearing by checking whether the testing library's own built-in defaults already provide the same guarantee, since a call that only duplicates a library default is unfalsifiable by the suite.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `test-harness` · harmful: 0
- features: 00-test-harness
- evidence: src/test/setup.js:5-8 (mutation 1) (test-harness)
- last seen: 2026-07-31T08:17:25Z

### L-002 — A config flag whose only effect is on an edge case with no committed test file (e.g. exit-code-on-empty-suite) cannot be regression-tested by the repo's own gate; document it as manually-verified-only instead of assuming future changes to it will be caught.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `test-harness` · harmful: 0
- features: 00-test-harness
- evidence: vite.config.js:11 (mutation 3, AC TEST-01.3) (test-harness)
- last seen: 2026-07-31T08:17:28Z

### L-003 — When a spec edge case is a CSS/layout claim untestable in jsdom (e.g. wrapping content, computed height), name the test after what it actually asserts (class presence) instead of the layout outcome, or note the jsdom limitation in a comment.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: 02-select-team-color
- evidence: SelectableListItem.test.jsx:88-97 (components)
- last seen: 2026-07-31T15:39:39Z

### L-004 — When a spec edge case says 'every empty list gets an empty-state message,' apply it to every list-rendering call site in the diff, not just the ones with an existing precedent to copy.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `pages` · harmful: 0
- features: 02-select-team-color
- evidence: src/pages/Trainings.jsx:100-110 (pages)
- last seen: 2026-07-31T15:39:39Z

### L-005 — When a task's Done-when claims a specific contrast ratio, verify it against every active color-scheme variant (light and dark media queries), not just the one visually checked during implementation.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `theme` · harmful: 0
- features: 02-select-team-color
- evidence: src/index.css:6 (T1 Done-when: WCAG AA 4.5:1) (theme)
- last seen: 2026-07-31T15:39:39Z

### L-006 — When a service sanitizes a dangling/foreign-key-like field before deriving computed values, add a direct test asserting the sanitized-field's computed output for the dangling-reference case, not just for the null/valid cases.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `services` · harmful: 0
- features: 05-training-number
- evidence: src/services/trainingService.js:30-33 mutant 2 (services)
- last seen: 2026-08-01T08:33:48Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
