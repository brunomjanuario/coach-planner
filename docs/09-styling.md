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

Plain CSS applied outside Tailwind:

- `:root` — system font stack, `line-height: 1.5`, `color-scheme: light dark`,
  light text on a grey background, font smoothing.
- `a:hover` — grey background with a 12px radius (this is what gives the sidebar
  links their hover pill).
- `body` — zero margin, `display: flex`, `place-items: center`,
  `min-width: 320px`, `min-height: 100vh`.
- `h1` — `font-size: 3.2em`. This is large and global; pages that want a normal
  heading override it with Tailwind (`text-lg font-semibold`).
- `button` — 8px radius, padding, dark background, `#646cff` border on hover,
  focus ring.
- A `@media (prefers-color-scheme: light)` block that flips `:root` to dark text
  on white and lightens buttons.

The base `button` rule is why buttons look consistent even where no Tailwind
classes are applied — but it also means Tailwind background utilities on buttons
compete with a global `background-color`.

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

## Dark and light mode

`index.css` sets `color-scheme: light dark` and defines a
`prefers-color-scheme: light` override, so the global chrome does adapt. The
component-level colors do not — cards are hard-coded to `bg-lightblack` with
light text, and modals are hard-coded to `bg-white text-black`. In practice the
app reads as a dark UI regardless of system preference, and the inline-styled
pages read as light. Unifying this is worth doing before any visual polish.

## Assets

Images live in [`src/assets/images/`](../src/assets/images):

| File | Used by |
| --- | --- |
| `logo.png` | `TeamCard` team crest |
| `person.png` | `PlayerCard` avatar placeholder |
| `coach-planner.png`, `coach-planner-logo.png` | not referenced in code |

`TeamCard` and `PlayerCard` reference these with a raw relative path
(`src="src/assets/images/logo.png"`). Vite does not process string literals in
`src` attributes, so the path works only because the dev server happens to serve
the project root — it **breaks in the production build**. Use an import instead:

```jsx
import logo from "../assets/images/logo.png";
…
<img src={logo} />
```

The favicon is an inline SVG data URI in `index.html` rendering the ⚽️ emoji.
