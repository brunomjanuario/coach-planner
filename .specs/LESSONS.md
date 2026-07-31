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

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
