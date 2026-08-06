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

### L-007 — When an AC requires an unchanged element to remain readable, add a className assertion for it, not just a text-presence assertion — symmetric elements (e.g. two empty-state messages fixed by the same feature) can end up with asymmetric test coverage.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `components` · harmful: 0
- features: 14-ratings-contrast
- evidence: src/components/__tests__/SquadRanking.test.jsx:173,190,199 (components)
- last seen: 2026-08-04T16:32:42Z

### L-008 — When a spec AC names a visual attribute (e.g. a colour swatch), assert that attribute's class/value directly in the test, not just the presence of adjacent text.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `calendar` · harmful: 0
- features: 15-calendar-event-colours
- evidence: AC CALCOL-04.1 / src/pages/__tests__/Calendar.test.jsx:360-370 (calendar)
- last seen: 2026-08-04T17:01:33Z

### L-009 — Write one test per listed spec Edge Case, even when the underlying implementation is a static class already covered by another test — an untested static class is still an unverified requirement.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `testing` · harmful: 0
- features: 15-calendar-event-colours
- evidence: spec.md Edge Cases (hover/focus, long-title truncation) — no test in src/pages/__tests__/Calendar.test.jsx (testing)
- last seen: 2026-08-04T17:01:38Z

### L-010 — When a spec edge case names a specific field as the long-value example, assert the wrap-related class on that exact field's element, not on a nearby sibling field that happens to lengthen too.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `dashboard` · harmful: 0
- features: 18-dashboard-grid
- evidence: spec.md Edge Cases (long value wraps); Home.test.jsx:721-741 (dashboard)
- last seen: 2026-08-04T19:40:51Z

### L-011 — When a spec edge case describes two sibling components with differing content sizes behaving identically, add a test that renders both together and directly compares their computed properties, not just a test that the shared behavior holds in isolation for each.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `dashboard` · harmful: 0
- features: 18-dashboard-grid
- evidence: spec.md Edge Cases (uneven leader entry counts fill row height); Home.test.jsx (no direct pairing test) (dashboard)
- last seen: 2026-08-04T19:41:00Z

### L-012 — When one component has its own defensive fallback for an invalid id (e.g. Tabs.jsx falling back to the first tab), a caller's separate allow-list guard for the same value needs its own test that can't be satisfied by the child's fallback alone.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `settings` · harmful: 0
- features: 23-settings-tabs
- evidence: src/pages/Settings.jsx:65 (mutant 3, validation.md) (settings)
- last seen: 2026-08-06T08:29:12Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
