# 07 — Components

Everything in [`src/components`](../src/components). All are default-exported
function components.

Two families:

- **`*Card`** — renders one entity, with edit and delete affordances.
- **`*Popup`** — a modal dialog. Always a fixed full-screen overlay, always
  takes `onClose`, always mounted conditionally by its parent.

## Modal overlay pattern

Every popup shares this wrapper:

```jsx
<div className="fixed inset-0 bg-black/[var(--bg-opacity)] [--bg-opacity:50%] flex items-center justify-center z-50">
  <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md text-black">
    …
  </div>
</div>
```

Consequences of this pattern as implemented:

- Clicking the backdrop does **not** close the modal — only the Cancel/Close
  button does.
- `Escape` is not handled.
- There is no focus trap and no `role="dialog"` / `aria-modal`.
- The parent controls visibility, so the modal fully unmounts when closed and
  its form state resets.

---

## `Sidebar`

[`Sidebar.jsx`](../src/components/Sidebar.jsx)

**Props:** none.

Fixed-width (`w-15`), full-height vertical nav rendered for every private route.
Six `<Link>`s plus a logout action, each an icon with a tooltip that appears on
hover (`group` / `group-hover` Tailwind classes).

Logout calls `signOut()` from `AuthContext` and navigates to `/signin`. The
logout element is a `<Link to="/">` wrapped in a `<div onClick={handleLogout}>`;
`handleLogout` calls `preventDefault()` so the link navigation does not fire.
A `<button>` would be the cleaner element here.

---

## `TeamCard`

[`TeamCard.jsx`](../src/components/TeamCard.jsx)

| Prop | Type | Description |
| --- | --- | --- |
| `team` | `Team` | Team to display. |
| `onClose` | `() => void` | Called after a successful delete. `pages/Teams.jsx` uses it to clear the selection and reload. |

Shows the club logo, `club` + `name`, and `season`. Edit opens `TeamPopup`
pre-filled; delete opens `ConfirmationPopup` and, on confirm, calls
`teamService.delete(team.id)` then `onClose()`.

The logo is `<img src="src/assets/images/logo.png">` — a relative path that
resolves in dev but breaks in the production build. Import the asset instead.

---

## `PlayerCard`

[`PlayerCard.jsx`](../src/components/PlayerCard.jsx)

| Prop | Type | Description |
| --- | --- | --- |
| `player` | `Player` | Player to display. |
| `onClose` | `() => void` | Called after a successful delete. |

Shows a placeholder avatar, `shirtNumber` + `name`, then age, position, goals and
conceded goals. `assists` is not displayed. Edit opens `PlayerPopup`; delete
opens `ConfirmationPopup` and calls `teamService.deletePlayer(player)`.

Same hard-coded image path issue as `TeamCard` (`src/assets/images/person.png`).

---

## `TeamPopup`

[`TeamPopup.jsx`](../src/components/TeamPopup.jsx)

| Prop | Type | Description |
| --- | --- | --- |
| `team` | `Team \| undefined` | Omit (or pass `null`) to create; pass a team to edit. |
| `onClose` | `() => void` | Closes the modal. |

Create/edit form with `name`, `club` and `season` — all required text inputs.

On submit: `teamService.update(formData)` when `team != null`, otherwise
`teamService.create(formData)`, then `onClose()`.

In create mode the id is `Math.floor(Math.random() * 100)` and `players` starts
as `[]`.

---

## `PlayerPopup`

[`PlayerPopup.jsx`](../src/components/PlayerPopup.jsx)

| Prop | Type | Description |
| --- | --- | --- |
| `player` | `Player \| null` | Pass `null` explicitly to create. **Required** — the component reads `player !== null`, so omitting it entirely throws. |
| `teamId` | `number` | Team the new player joins. Ignored in edit mode (uses `player.teamId`). |
| `onClose` | `() => void` | Closes the modal. |

Form fields: `name`, `age`, `shirtNumber`, `position` — all required. `age` and
`shirtNumber` are coerced with `Number()` in `handleChange`; the others stay
strings. Stats (`goals`, `assists`, `concededGoals`) are carried through the form
state but not editable, and default to `0` when creating.

`position` is a free-text input — nothing restricts it to the standard position
codes.

On submit: `teamService.updatePlayer(formData)` or
`teamService.addPlayer(teamId, formData)`, then `onClose()`.

---

## `TrainingSavePopup`

[`TrainingSavePopup.jsx`](../src/components/TrainingSavePopup.jsx)

| Prop | Type | Description |
| --- | --- | --- |
| `teamId` | `number \| undefined` | Team the training belongs to. Falls back to `null`. |
| `onClose` | `() => void` | Closes the modal. |

Despite the name, this component only **creates** — there is no edit path.

Fields:

- `day` — a `datetime-local` input, converted with `new Date(...)` on submit.
- `duration` — number of minutes, defaults to `90`.
- `exercises` — a description text box plus an **Add** button. Each added
  exercise becomes `{ id: Date.now(), description }` and appears in a list with
  a **Remove** button.

`exerciseInput` is held in the same `formData` object as the real fields but is
stripped out before saving.

Note the shadowed callback: the component defines a local
`function onSubmit(training) { trainingService.create(training); }`. Any
`onSubmit` prop a parent passes is **ignored** — `pages/Trainings.jsx` passes one
that just closes the modal, and it never runs. The save always goes through
`trainingService.create`.

Because the parent does not reload after `onClose()`, a newly created training
may not appear in the list until the page re-renders for another reason.

---

## `TrainingDetailsPopup`

[`TrainingDetailsPopup.jsx`](../src/components/TrainingDetailsPopup.jsx)

| Prop | Type | Description |
| --- | --- | --- |
| `training` | `Training \| null` | Training to display. Returns `null` when falsy. |
| `onClose` | `() => void` | Closes the modal. |
| `onEdit` | `() => void` | Fired by the Edit button. **No caller currently passes it**, so the button does nothing. |

Read-only view: formatted date/time, duration, and a list of exercise
descriptions (or "No exercises"). Handles `day` being either a `Date` or a
string.

---

## `ConfirmationPopup`

[`ConfirmationPopup.jsx`](../src/components/ConfirmationPopup.jsx)

| Prop | Type | Description |
| --- | --- | --- |
| `message` | `string` | Question shown as the heading. |
| `onSubmit` | `() => void` | Confirm action. |
| `onClose` | `() => void` | Cancel action. |

Generic yes/no dialog with a red **Cancel** and a green **Submit**. Used by
`TeamCard` and `PlayerCard` before destructive actions.

The confirm button is `type="submit"` but sits outside any `<form>`, so it
behaves as a plain button — harmless, but `type="button"` would be more accurate.

## Composition map

```
Teams (page)
├── TeamPopup                     create team
├── PlayerPopup                   create player
├── TeamCard
│   ├── TeamPopup                 edit team
│   └── ConfirmationPopup         delete team
└── PlayerCard
    ├── PlayerPopup               edit player
    └── ConfirmationPopup         delete player

Trainings (page)
├── TrainingSavePopup             create training
└── TrainingDetailsPopup          view training
```

Note that `TeamPopup` and `PlayerPopup` each appear twice in the tree — once
mounted by the page for creation, once by a card for editing. The `team` /
`player` prop is what switches the mode.
