# 03 — Architecture

## Folder layout

```
coach-planner/
├── index.html                  Vite entry HTML
├── vite.config.js              React + Tailwind plugins
├── eslint.config.js            ESLint 9 flat config
├── package.json
├── docs/                       this documentation
└── src/
    ├── main.jsx                app bootstrap
    ├── App.jsx                 route table + auth guard
    ├── index.css               Tailwind import, @theme tokens, global styles
    ├── App.css                 empty (still imported)
    ├── assets/images/          logo.png, person.png, coach-planner*.png
    ├── context/
    │   └── AuthContext.jsx     mock auth provider + useAuth hook
    ├── model/
    │   └── mock.js             seed data: teams, players, trainings, exercises
    ├── services/
    │   ├── teamService.js      team + player CRUD
    │   └── trainingService.js  training CRUD
    ├── pages/                  one component per route
    │   ├── Home.jsx
    │   ├── Teams.jsx
    │   ├── Trainings.jsx
    │   ├── Games.jsx
    │   ├── Calendar.jsx
    │   ├── Settings.jsx
    │   ├── SignIn.jsx
    │   └── SignUp.jsx
    └── components/             reusable UI
        ├── Sidebar.jsx
        ├── TeamCard.jsx
        ├── PlayerCard.jsx
        ├── TeamPopup.jsx
        ├── PlayerPopup.jsx
        ├── TrainingSavePopup.jsx
        ├── TrainingDetailsPopup.jsx
        └── ConfirmationPopup.jsx
```

## Layers

The codebase has four layers, from the outside in:

1. **Pages** (`src/pages`) — own route-level state, load data on mount, decide
   which components and modals are visible.
2. **Components** (`src/components`) — presentational cards and modal dialogs.
   They receive data via props and call services directly for mutations.
3. **Services** (`src/services`) — the only modules allowed to read or write
   data. Async by design so a real HTTP backend can replace them.
4. **Model** (`src/model/mock.js`) — the in-memory store standing in for a
   database.

Cross-cutting: **`AuthContext`** wraps the whole tree and supplies the session.

## Bootstrap

[`src/main.jsx`](../src/main.jsx) mounts three providers around the app:

```
ReactDOM.createRoot(#root)
└── <BrowserRouter>              client-side routing
    └── <AuthProvider>           session state from localStorage
        └── <App />
```

`main.jsx` also imports `./index.css`, which is what actually pulls Tailwind
into the bundle.

## Render tree

[`src/App.jsx`](../src/App.jsx) uses **nested `<Routes>`**. The outer set splits
public from private; the inner set — rendered only after the guard passes —
holds the application routes, and is rendered as a sibling of the persistent
`<Sidebar />`.

```
<div className="flex w-screen">
  <Routes>
    /signin  → <SignIn />                    public
    /signup  → <SignUp />                    public
    /*       → <PrivateRoute>                everything else
                 <Sidebar />
                 <Routes>
                   /          → <Home />
                   /teams     → <Teams />
                   /trainings → <Trainings />
                   /games     → <Games />
                   /calendar  → <Calendar />
                   /settings  → <Settings />
                 </Routes>
               </PrivateRoute>
  </Routes>
</div>
```

The outer `<div>` is `flex w-screen`, so the sidebar sits on the left and the
active page fills the remaining width.

## Data flow

A read follows this path:

```
Page mounts
  └── useEffect → service.getAll()      async, resolves from mock.js
        └── setState(data)
              └── render list / cards
```

A write follows this path:

```
User submits a Popup
  └── service.create/update/delete(...)  mutates the mock array in place
        └── onClose()
              └── parent re-reads via service (or re-renders from live objects)
```

### The consequence of in-place mutation

Services mutate the same array objects that React state already holds. Two
things follow:

- **Mutations do not trigger a re-render on their own.** React sees the same
  array reference and skips the update.
- **Some screens appear to update anyway**, because the state holds a reference
  to the very object that was mutated, and something else caused a re-render.

The codebase handles this explicitly in [`pages/Teams.jsx`](../src/pages/Teams.jsx),
where `closeTeam()` calls `loadTeams()` to re-read from the service after an
edit or delete. Other paths — adding a training, adding a player — do not
refresh, so the new entity only appears after the page re-renders for some other
reason.

If you replace the mock store with a real API, prefer returning fresh objects
from the services and re-fetching after every mutation. That removes the class
of bug entirely.

## State management

There is no state library. State is:

- **Route state** — React Router.
- **Session state** — `AuthContext` (React Context + `localStorage`).
- **Page state** — `useState` inside each page: the loaded lists, the current
  selection, and one boolean per modal.

The modal booleans follow a consistent shape:

```jsx
const [showPopup, setShowPopup] = useState(false);
...
{showPopup && <SomePopup onClose={() => setShowPopup(false)} />}
```

## Extension points

- **Adding a route:** create the page in `src/pages`, add a `<Route>` inside the
  inner `<Routes>` in `App.jsx`, and add a `<Link>` in `Sidebar.jsx`.
- **Adding an entity:** add its shape to `src/model/mock.js` and a matching
  service in `src/services`. Keep every method `async`.
- **Swapping in a backend:** rewrite the service modules only. Pages and
  components already `await` every call.
