# 01 — Overview

## Purpose

Coach Planner gives a football coach one place to keep the things they otherwise
track on paper or in a spreadsheet:

- the squads they coach (club, age group, season),
- the players in each squad and their season statistics,
- training sessions, each broken down into exercises,
- (planned) matches and a combined calendar of everything.

## Who uses it

A single coach, working on their own machine. There is no multi-user support,
no sharing and no roles — the sign-in screen exists to shape the future app, not
to protect anything today.

## Feature status

| Area | Route | Status | Notes |
| --- | --- | --- | --- |
| Sign in / Sign up | `/signin`, `/signup` | Mock | Hard-coded demo credentials, `localStorage` session |
| Home dashboard | `/` | Placeholder | Six static tiles, no data wired up |
| Teams & Players | `/teams` | Working | Full create / edit / delete for both teams and players |
| Trainings | `/trainings` | Working | List, filter by team, view details, create |
| Games | `/games` | Placeholder | Heading only |
| Calendar | `/calendar` | Partial | Month grid renders, but from its own hard-coded events |
| Settings | `/settings` | Placeholder | Heading only |

## What "working" means here

Data lives in module-level arrays in [`src/model/mock.js`](../src/model/mock.js).
The service layer mutates those arrays in place. That means:

- changes survive navigation between pages within a session,
- changes are **lost on page reload**,
- nothing is sent to a server.

See [05 — Services](05-services.md) for the details and
[10 — Known Issues](10-known-issues.md) for what this implies.

## Seed data

The app ships with two teams:

- **Amadora Sub-11** — 5 players
- **Areias Sub-19** — 3 players

and two training sessions, both belonging to team `1` (Amadora Sub-11): one
dated 2024-10-24 and one dated 2023-06-24. Both dates are in the past, so with
the shipped data the "Next Trainings" list on `/trainings` starts empty and the
"Past Trainings" list holds both sessions.
