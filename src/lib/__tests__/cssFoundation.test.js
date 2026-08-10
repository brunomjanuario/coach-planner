import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Deliberate exception to this repo's "test a src/lib/*.js sibling"
 * convention: this file has no matching src/lib/cssFoundation.js. It exists
 * to guard src/index.css directly (feature 33) — jsdom applies no external
 * stylesheet cascade, so a rendered-DOM contrast test cannot see this bug
 * class at all (confirmed: that's why the original defect shipped past
 * 1413 passing tests). A static source check is the only reliable guard.
 *
 * `findUnlayeredElementSelectors` walks a CSS source, recursively, and
 * flags any bare-element-name selector (":root" and "body"/"html" are
 * accepted exceptions) that isn't inside a genuine cascade-layer boundary.
 *
 * Only `@layer` and `@theme` grant that boundary and are skipped wholesale
 * without inspecting their contents (Tailwind's own preflight declares
 * element selectors inside `@layer base` on purpose). Every OTHER at-rule
 * — `@media`, `@supports`, `@keyframes`, `@font-face`, etc. — does NOT
 * establish a cascade layer, so an unlayered selector nested inside one
 * still beats every Tailwind utility exactly as if it weren't wrapped at
 * all; those blocks are recursed into, not skipped. (The original scaffold
 * bug nested `:root`/`a:hover`/`@layer base {...}` all inside one
 * `@media (prefers-color-scheme: light) {...}` block — a flat "any
 * @-rule is safe" fast-path would have missed exactly that shape.)
 */
function findUnlayeredElementSelectors(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const offenders = [];
  scan(stripped);
  return offenders;

  function scan(source) {
    let i = 0;
    const n = source.length;

    while (i < n) {
      const start = i;
      while (i < n && source[i] !== "{") i++;
      if (i >= n) break;
      const header = source.slice(start, i).trim();
      const blockStart = i + 1;

      let depth = 1;
      i = blockStart;
      while (depth > 0 && i < n) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") depth--;
        i++;
      }
      const inner = source.slice(blockStart, i - 1);

      if (/^@(layer|theme)\b/.test(header)) {
        continue; // genuine cascade-layer boundary — fully trusted
      }
      if (header.startsWith("@")) {
        scan(inner); // no layer immunity — its contents are still exposed
        continue;
      }

      const selectors = header.split(",").map((s) => s.trim());
      for (const sel of selectors) {
        const base = sel.split(":")[0].trim();
        if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(base) && !["body", "html"].includes(base)) {
          offenders.push(sel);
        }
      }
      // a plain rule's block is declarations, not nested rules — no recursion
    }
  }
}

const INDEX_CSS_PATH = resolve(import.meta.dirname, "../../index.css");

function readIndexCss() {
  return readFileSync(INDEX_CSS_PATH, "utf-8");
}

test("the real src/index.css contains no bare element selector outside @layer (AC CSSF-03.2)", () => {
  const offenders = findUnlayeredElementSelectors(readIndexCss());

  expect(offenders).toEqual([]);
});

test("flags an unlayered h1 rule, naming the selector — the exact original defect (AC CSSF-03.1)", () => {
  const withRegression = `
    @theme { --color-x: red; }
    :root { color: white; }
    h1 { font-size: 3.2em; }
  `;

  const offenders = findUnlayeredElementSelectors(withRegression);

  expect(offenders).toContain("h1");
});

test("flags an unlayered button rule, naming the selector", () => {
  const withRegression = `
    button {
      background-color: #1a1a1a;
    }
  `;

  const offenders = findUnlayeredElementSelectors(withRegression);

  expect(offenders).toContain("button");
});

test("flags an unlayered a:hover rule by its base element name", () => {
  const withRegression = `
    a:hover {
      background-color: rgb(71, 71, 71);
    }
  `;

  const offenders = findUnlayeredElementSelectors(withRegression);

  expect(offenders).toContain("a:hover");
});

test("does NOT flag the same selectors when properly scoped inside @layer base (AC CSSF-03.2)", () => {
  const properlyLayered = `
    @layer base {
      h1 { font-size: 3.2em; }
      button { background-color: #1a1a1a; }
      a:hover { background-color: rgb(71, 71, 71); }
    }
  `;

  const offenders = findUnlayeredElementSelectors(properlyLayered);

  expect(offenders).toEqual([]);
});

test("does not flag :root, body or html — the accepted top-level exceptions", () => {
  const accepted = `
    :root { font-family: system-ui; }
    body { margin: 0; }
    html { box-sizing: border-box; }
  `;

  const offenders = findUnlayeredElementSelectors(accepted);

  expect(offenders).toEqual([]);
});

test("does not flag class or id selectors", () => {
  const classSelectors = `
    .my-class { color: red; }
    #my-id { color: blue; }
  `;

  const offenders = findUnlayeredElementSelectors(classSelectors);

  expect(offenders).toEqual([]);
});

test("flags an unlayered selector nested inside @media — a media query grants no cascade-layer immunity", () => {
  const nested = `
    @media (prefers-color-scheme: light) {
      h1 { font-size: 2em; }
    }
  `;

  const offenders = findUnlayeredElementSelectors(nested);

  expect(offenders).toContain("h1");
});

test("does NOT flag a selector inside @layer even when that @layer is itself nested inside @media — reproduces the original scaffold's exact nesting shape", () => {
  const originalShape = `
    @media (prefers-color-scheme: light) {
      :root { color: #213547; }
      a:hover { color: #747bff; }
      @layer base {
        button { background-color: #f9f9f9; }
      }
    }
  `;

  const offenders = findUnlayeredElementSelectors(originalShape);

  expect(offenders).toContain("a:hover");
  expect(offenders).not.toContain("button");
});
