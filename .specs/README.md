# Coach Planner — Feature Roadmap

Twelve features derived from ten ideas, plus two foundations the ideas depend on.
Every feature has a `spec.md` (WHAT, with traceable requirement IDs) and a
`tasks.md` (atomic tasks with dependencies, tests and gates).

Nothing here has been implemented. This is the plan.

## Execution order

```
00-test-harness  ────────────────────────────────┐
      │                                          │ blocks everything
      ▼                                          │
01-persistence-layer ────────────────────────────┤
      │                                          │
      ├──► 02-select-team-color   (needs only 00)│
      ├──► 03-training-team-assignment           │
      ├──► 04-training-form                      │
      ├──► 05-training-number                    │
      ├──► 06-training-edit                      │
      │                                          │
      └──► 07-games-league-table                 │
                 ├──► 08-player-cards            │
                 ├──► 09-player-ratings          │
                 ├──► 10-calendar-navigation     │
                 └──► 11-dashboard  (consumes 07, 08, 09)
```

## Features

| # | Feature | Idea it serves | Scope | Tasks | Depends on |
|---|---------|----------------|-------|-------|------------|
| 00 | [test-harness](features/00-test-harness/spec.md) | *(foundation — AD-001)* | Medium | 6 | — |
| 01 | [persistence-layer](features/01-persistence-layer/spec.md) | *(foundation — AD-002)* | Large | 10 | 00 |
| 02 | [select-team-color](features/02-select-team-color/spec.md) | Fix select team color | Small | 4 | 00 |
| 03 | [training-team-assignment](features/03-training-team-assignment/spec.md) | Make training creation to the right team | Medium | 5 | 01 |
| 04 | [training-form](features/04-training-form/spec.md) | Make training form | Medium | 6 | 01, 03 |
| 05 | [training-number](features/05-training-number/spec.md) | Train Number logic | Medium | 4 | 01 |
| 06 | [training-edit](features/06-training-edit/spec.md) | Create edit for training | Medium | 5 | 01, 04 |
| 07 | [games-league-table](features/07-games-league-table/spec.md) | Games screen + league table | Large | 10 | 01 |
| 08 | [player-cards](features/08-player-cards/spec.md) | Add cards to players | Medium | 5 | 07 |
| 09 | [player-ratings](features/09-player-ratings/spec.md) | Give points to players | Large | 9 | 07 |
| 10 | [calendar-navigation](features/10-calendar-navigation/spec.md) | Clickable calendar events | Medium | 6 | 07 |
| 11 | [dashboard](features/11-dashboard/spec.md) | Make Dashboard | Large | 8 | 07, 08, 09 |

**78 atomic tasks total.**

## How to execute one

Each `tasks.md` opens with the execution protocol. In short:

1. Activate the `tlc-spec-driven` skill by name.
2. It counts the tasks and packs phases into ~7-task batches. Features with >8
   tasks (01, 07, 09, 11) will offer sub-agent delegation — accept or decline.
3. Each task: implement → tests pass → one atomic commit. Never batch commits.
4. After the last task a fresh Verifier runs automatically and writes
   `validation.md`.

## Design phase

Four features are Large enough to need an architecture pass:
**01, 07, 09, 11**. Their `tasks.md` carries a `Design Notes` section with the
decisions already identified, and is flagged **`Design: required before Execute`**
at the top. Run the skill's Design phase on those immediately before building
them — not now. A design doc written months ahead of implementation goes stale
against a codebase that has moved.

The other eight are straightforward enough to design inline.

## Project decisions

Read [`STATE.md`](STATE.md) before starting any feature. Eight decisions
(AD-001…AD-008) govern this roadmap — test stack, persistence, id generation,
service copy semantics, styling, training numbering, what "points" means, and how
the league table is populated. Each records what was given up, not just what was
chosen.

## What is deliberately not here

| Idea | Why not planned |
|------|-----------------|
| Real authentication | The mock in `AuthContext` is a known placeholder. It blocks nothing in these twelve features and deserves its own spec. |
| Backend / API | AD-002 chose localStorage. A backend is a separate epic; the service layer is already shaped to accept one. |
| Settings page | Placeholder with no stated requirements. `01` adds a reset-demo-data action, which is the only settings-shaped need these features create. |
