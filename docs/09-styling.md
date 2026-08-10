# 09 — Styling

## Setup

Tailwind CSS 4, wired through the official Vite plugin rather than PostCSS:

```js
// vite.config.js
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

There is **no `tailwind.config.js`** — that is the Tailwind 4 model. Content
scanning is automatic and theme customisation happens in CSS.

`postcss` and `autoprefixer` are still in `devDependencies` but no PostCSS config
file exists; they are leftovers from the Tailwind 3 setup.

## Entry stylesheet

[`src/index.css`](../src/index.css) is imported by `src/main.jsx` and is the
single source of global styles. It has three parts.

**1. Tailwind import**

```css
@import "tailwindcss";
```

**2. Theme tokens**

```css
@theme {
  --color-lightblack: #171717;
  --color-lightgrey: rgb(71, 71, 71);
}
```

Declaring `--color-*` inside `@theme` generates the full set of Tailwind color
utilities for each name. Available in this project:

| Token | Value | Utilities |
| --- | --- | --- |
| `lightblack` | `#171717` | `bg-lightblack`, `text-lightblack`, `border-lightblack`, … |
| `lightgrey` | `rgb(71,71,71)` | `bg-lightgrey`, `text-lightgrey`, … |

`bg-lightblack` is the app's surface color — the sidebar, cards and selected list
rows all use it. `hover:bg-lightgrey` is the standard hover for icon buttons.

**3. Global element styles**

As of `33-css-foundation-reset`, this is deliberately small. Every rule that
used to compete with Tailwind utilities — a bare `h1` selector, a bare
`button` selector, `:root`'s color/background, the `prefers-color-scheme:
light` path — was Vite scaffold CSS, unremoved since the project's creation,
and it was winning: unlayered/same-layer-later CSS beats `@layer utilities`
regardless of specificity, so `text-xl` never won against the scaffold's
`h1 { font-size: 3.2em }`, and every plain `<button>` rendered a dark box
regardless of its own classes. What remains:

- `:root` — system font stack, `line-height: 1.5`, `font-weight: 400`, font
  smoothing. No color, no background, no `color-scheme` — see "Dark and light
  mode" below.
- `body` — zero margin, `display: flex`, `place-items: center`,
  `min-width: 320px`, `min-height: 100vh`. Structural only; deliberately left
  bare since it declares no color/background and so doesn't compete with
  Tailwind the way the removed rules did.
- No global `h1`, `button` or `a:hover` rule. Headings size themselves with
  Tailwind utilities (`text-lg font-semibold`, etc.) with nothing to fight.
  Buttons get Tailwind's own preflight default (`background-color:
  transparent; color: inherit`) unless a component gives one its own `bg-*`.
  `Sidebar.jsx`'s hover pills are `hover:bg-lightgrey rounded-xl` on each
  `Link`, not a global `a:hover` rule.

A `src/lib/__tests__/cssFoundation.test.js` guard fails the suite if a future
change reintroduces a bare element selector outside `@layer` — the exact
defect shape above. It's a static source check, not a rendered-DOM contrast
test, because jsdom applies no external stylesheet cascade at all; that gap is
*why* the original scaffold CSS shipped past 1413 passing tests undetected.

[`src/App.css`](../src/App.css) is **empty** and still imported by `App.jsx` and
`pages/Calendar.jsx`.

## Conventions

Tailwind utility classes are the default. Recurring patterns:

| Pattern | Classes |
| --- | --- |
| Modal backdrop | `fixed inset-0 bg-black/[var(--bg-opacity)] [--bg-opacity:50%] flex items-center justify-center z-50` |
| Modal panel | `bg-white p-6 rounded-2xl shadow-md w-full max-w-md text-black` |
| Card | `bg-lightblack rounded-2xl shadow-lg p-4 w-full max-w-sm hover:shadow-xl transition-all duration-300` |
| Selectable list row | `mt-2 p-3 rounded cursor-pointer hover:bg-lightblack` + `bg-lightblack` when selected |
| Icon button | `cursor-pointer rounded hover:bg-lightgrey` |
| Form input | `w-full border px-3 py-2 rounded` |
| Primary action | `px-4 py-2 bg-blue-600 text-white rounded` |
| Cancel action | `px-4 py-2 bg-gray-300 text-white rounded` |
| Destructive action | `px-4 py-2 bg-red-500 text-white rounded` |

The modal backdrop uses the `bg-black/[var(--bg-opacity)]` + `[--bg-opacity:50%]`
arbitrary-property form. `bg-black/50` is the modern equivalent and would be
clearer.

## Layout

`App.jsx` wraps everything in `flex w-screen`, so the `Sidebar` (`w-15
h-screen`) and the active page sit side by side and the page fills the rest.

`pages/Trainings.jsx` is the most involved layout — a full-height flex column
with `min-h-0` on the flex children so the two training panels can scroll
independently inside `overflow-y-auto` containers.

## Inline-style exceptions

Three files bypass Tailwind entirely and use React inline `style` objects:

- [`pages/Calendar.jsx`](../src/pages/Calendar.jsx)
- [`pages/SignIn.jsx`](../src/pages/SignIn.jsx)
- [`pages/SignUp.jsx`](../src/pages/SignUp.jsx)

They share a "white card on grey" look — `background: #fff`, `borderRadius: 16`,
`boxShadow: "0 4px 24px rgba(0,0,0,0.08)"`, `padding: 32` — with explicit
`color: "black"` because the global `:root` text color is light.

The calendar also hard-codes its palette: `#eaf6ff` for today, `#f7f7fa` for
other days, `#d1eaff` for game events, `#ffe6b3` for training events.

**Prefer Tailwind for new work.** Converting these three files is a good
standalone cleanup task.

## Dark mode only (AD-017)

Coach Planner is dark-only. There is no `color-scheme` declaration and no
`prefers-color-scheme` branch — that path was never a designed second theme,
just Vite scaffold, and building one is out of scope until a future feature
deliberately takes it on.

The app's one explicit background/text pair lives on `App.jsx`'s
authenticated shell wrapper: `bg-neutral-950 text-gray-100`. Every descendant
that declares no color of its own inherits it via ordinary CSS
inheritance — confirmed safe app-wide since the codebase uses no
`ReactDOM.createPortal`. `bg-lightblack` (`#171717`) stays the card/surface
color, distinct from the page background so cards remain visually separated.
Popups keep their own explicit `bg-white text-black` surface, unaffected by
any of this.

A component that sets its own text color must clear 4.5:1 (WCAG AA) against
whatever it actually renders on — `text-gray-500` and `text-gray-600` measure
below that floor against both the page background and `bg-lightblack` cards;
`text-gray-400` is the floor that clears both (verified: 7.06–7.80:1).
`text-blue-600` links measure 3.47–3.83:1 against the same surfaces;
`text-blue-400` clears both (6.80–7.79:1).

## Assets

Images live in [`src/assets/images/`](../src/assets/images):

| File | Used by |
| --- | --- |
| `logo.png` | `TeamCard` team crest |
| `person.png` | `PlayerCard` avatar placeholder |
| `coach-planner.png`, `coach-planner-logo.png` | not referenced in code |

As of `34-asset-pipeline-fix`, `TeamCard` and `PlayerCard` import both images
as standard ES modules rather than referencing them by a raw string path —
the raw-string form only ever resolved in dev (the dev server happens to
serve the project root) and 404s in a production build:

```jsx
import logo from "../assets/images/logo.png";
…
<img src={logo} alt={`${team.club} ${team.name} crest`} />
```

The favicon is an inline SVG data URI in `index.html` rendering the ⚽️ emoji.
