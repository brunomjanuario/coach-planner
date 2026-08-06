import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../Button";

test("primary renders a distinct filled class set", () => {
  render(<Button variant="primary">Save</Button>);

  const className = screen.getByRole("button", { name: "Save" }).className;
  expect(className).toMatch(/bg-blue-600/);
  expect(className).toMatch(/text-white/);
});

test("secondary renders dark text on a light, bordered background — not white-on-grey (AC BTN-01.1)", () => {
  render(<Button variant="secondary">Cancel</Button>);

  const className = screen.getByRole("button", { name: "Cancel" }).className;
  expect(className).toMatch(/border/);
  expect(className).toMatch(/text-gray-900/);
  expect(className).not.toMatch(/bg-gray-300/);
  expect(className).not.toMatch(/\btext-white\b/);
});

test("danger renders a distinct filled class set", () => {
  render(<Button variant="danger">Delete</Button>);

  const className = screen.getByRole("button", { name: "Delete" }).className;
  expect(className).toMatch(/bg-red-600/);
  expect(className).toMatch(/text-white/);
});

test("ghost renders a distinct, borderless class set", () => {
  render(<Button variant="ghost">Dismiss</Button>);

  const className = screen.getByRole("button", { name: "Dismiss" }).className;
  expect(className).toMatch(/bg-transparent/);
  expect(className).not.toMatch(/bg-blue-600|bg-red-600|bg-white/);
});

test.each(["primary", "secondary", "danger", "ghost"])(
  "%s carries a focus-visible outline class (AC BTN-01.2)",
  (variant) => {
    render(<Button variant={variant}>Go</Button>);

    expect(screen.getByRole("button", { name: "Go" }).className).toMatch(
      /focus-visible:outline/
    );
  }
);

test("disabled renders reduced opacity and not-allowed cursor, and the click handler does not fire (AC BTN-01.3)", async () => {
  const onClick = vi.fn();
  render(
    <Button disabled onClick={onClick}>
      Save
    </Button>
  );

  const button = screen.getByRole("button", { name: "Save" });
  expect(button.className).toMatch(/disabled:opacity-50/);
  expect(button.className).toMatch(/disabled:cursor-not-allowed/);
  expect(button).toBeDisabled();

  await userEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

test("a non-disabled button fires its click handler", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Save</Button>);

  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("defaults type to button, never the browser's implicit submit (AC BTN-01.4)", () => {
  render(<Button>Go</Button>);

  expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "button");
});

test("forwards an explicit type", () => {
  render(<Button type="submit">Save</Button>);

  expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
});

test("forwards form so a detached submit button keeps working (AC BTN-01.5)", () => {
  render(
    <Button type="submit" form="my-form">
      Save
    </Button>
  );

  expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("form", "my-form");
});

test("an unrecognised variant falls back to secondary rather than rendering unstyled (edge case)", () => {
  render(<Button variant="not-a-real-variant">Go</Button>);

  const className = screen.getByRole("button", { name: "Go" }).className;
  expect(className).toMatch(/border/);
  expect(className).toMatch(/text-gray-900/);
});

test("a long label is not truncated (edge case)", () => {
  const longLabel =
    "A very long button label that could plausibly wrap across more than one line";
  render(<Button>{longLabel}</Button>);

  const className = screen.getByRole("button", { name: longLabel }).className;
  expect(className).not.toMatch(/truncate/);
  expect(className).not.toMatch(/whitespace-nowrap/);
});

test("renders its children", () => {
  render(<Button>Rate squad</Button>);

  expect(screen.getByText("Rate squad")).toBeInTheDocument();
});

test("bg-gray-300 text-white never appears together anywhere in src (AC BTN-01.6)", () => {
  const offenders = [];
  const srcDir = join(import.meta.dirname, "..", "..");

  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      if (entry === "__tests__") continue;
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
      } else if (fullPath.endsWith(".jsx")) {
        const contents = readFileSync(fullPath, "utf8");
        if (contents.includes("bg-gray-300 text-white")) {
          offenders.push(fullPath);
        }
      }
    }
  }

  walk(srcDir);

  expect(offenders).toEqual([]);
});
