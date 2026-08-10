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
 * `findUnlayeredElementSelectors` walks a CSS source at depth 0, skipping
 * the interior of any @layer/@media/@theme block (those may legitimately
 * declare bare element selectors — Tailwind's own preflight does), and
 * flags any other top-level rule whose selector is a bare HTML element name
 * (":root" and "body"/"html" are accepted top-level exceptions, matching
 * design.md's explicit decision to leave body's non-color structural rules
 * and :root's non-color rules in place).
 */
function findUnlayeredElementSelectors(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const offenders = [];
  let i = 0;
  const n = stripped.length;

  function skipBlock() {
    // Called right after consuming the block's opening '{', so it already
    // represents depth 1 — loop until the matching close brings depth to 0.
    let depth = 1;
    while (depth > 0 && i < n) {
      if (stripped[i] === "{") depth++;
      else if (stripped[i] === "}") depth--;
      i++;
    }
  }

  while (i < n) {
    const start = i;
    while (i < n && stripped[i] !== "{") i++;
    if (i >= n) break;
    const header = stripped.slice(start, i).trim();
    i++;

    if (/^@(layer|media|theme)\b/.test(header)) {
      skipBlock();
      continue;
    }

    const selectors = header.split(",").map((s) => s.trim());
    for (const sel of selectors) {
      const base = sel.split(":")[0].trim();
      if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(base) && !["body", "html"].includes(base)) {
        offenders.push(sel);
      }
    }

    skipBlock();
  }

  return offenders;
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
