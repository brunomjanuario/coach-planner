# Coach Planner — Documentation

Coach Planner is a single-page React application that helps football (soccer)
coaches manage their teams, players and training sessions.

> **Status:** early prototype. The app runs entirely in the browser against
> in-memory mock data. There is no backend, no database and no real
> authentication.

## Contents

| Document | What it covers |
| --- | --- |
| [01 — Overview](01-overview.md) | What the product does, current feature status |
| [02 — Getting Started](02-getting-started.md) | Install, run, build, lint |
| [03 — Architecture](03-architecture.md) | Folder layout, render tree, data flow |
| [04 — Data Model](04-data-model.md) | Team, Player, Training, Exercise, Event |
| [05 — Services](05-services.md) | `teamService` / `trainingService` API reference |
| [06 — Routing & Pages](06-routing-and-pages.md) | Route table and page-by-page walkthrough |
| [07 — Components](07-components.md) | Props reference for every component |
| [08 — Authentication](08-authentication.md) | `AuthContext`, `PrivateRoute`, demo credentials |
| [09 — Styling](09-styling.md) | Tailwind 4 setup, theme tokens, conventions |
| [10 — Known Issues & Roadmap](10-known-issues.md) | Bugs, gaps and suggested next steps |

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Then open the printed URL (Vite defaults to `http://localhost:5173`) and sign in
with the demo account:

- **Email:** `user@email.com`
- **Password:** `password`

## Tech stack at a glance

- **React 19** with function components and hooks
- **React Router 7** (`BrowserRouter`) for client-side routing
- **Vite 6** for dev server and bundling
- **Tailwind CSS 4** through the `@tailwindcss/vite` plugin
- **@tabler/icons-react** for iconography
- **ESLint 9** flat config

## Repository conventions

- One default-exported function component per `.jsx` file.
- Pages fetch data; components render it and call services to mutate it.
- Modal dialogs are named `*Popup`; entity views are named `*Card`.
- UI copy is written in English.
