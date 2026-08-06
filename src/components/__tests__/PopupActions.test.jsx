import { render, screen } from "@testing-library/react";
import Button from "../Button";
import PopupActions from "../PopupActions";

test("renders one flex row that is right-aligned and wraps (AC BTN-02.1, BTN-02.5)", () => {
  const { container } = render(
    <PopupActions>
      <Button>Close</Button>
    </PopupActions>
  );

  const row = container.firstChild;
  expect(row.className).toMatch(/flex/);
  expect(row.className).toMatch(/justify-end/);
  expect(row.className).toMatch(/flex-wrap/);
});

test("puts destructive content on the left via mr-auto, ahead of the right-aligned children (AC BTN-02.1)", () => {
  render(
    <PopupActions destructive={<Button variant="danger">Delete</Button>}>
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Save</Button>
    </PopupActions>
  );

  const deleteButton = screen.getByRole("button", { name: "Delete" });
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const saveButton = screen.getByRole("button", { name: "Save" });

  expect(deleteButton.parentElement.className).toMatch(/mr-auto/);
  expect(
    deleteButton.compareDocumentPosition(cancelButton) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(
    cancelButton.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});

test("with no destructive content, renders no left slot and no extra gap element (edge case)", () => {
  const { container } = render(
    <PopupActions>
      <Button>Close</Button>
    </PopupActions>
  );

  expect(container.querySelector(".mr-auto")).not.toBeInTheDocument();
});

test("a single Close child renders right-aligned, not stretched (edge case)", () => {
  const { container } = render(
    <PopupActions>
      <Button>Close</Button>
    </PopupActions>
  );

  const row = container.firstChild;
  expect(row.children).toHaveLength(1);
  expect(row.className).toMatch(/justify-end/);
  expect(row.className).not.toMatch(/\bstretch\b/);
});

test("with destructive content and no other children, renders only the left slot", () => {
  const { container } = render(
    <PopupActions destructive={<Button variant="danger">Delete</Button>} />
  );

  const row = container.firstChild;
  expect(row.children).toHaveLength(1);
  expect(row.firstChild.className).toMatch(/mr-auto/);
});

test("multiple destructive buttons render together in the same left slot", () => {
  render(
    <PopupActions
      destructive={
        <>
          <Button variant="danger">Clear Result</Button>
          <Button variant="danger">Delete Game</Button>
        </>
      }
    >
      <Button variant="primary">Save</Button>
    </PopupActions>
  );

  const clearButton = screen.getByRole("button", { name: "Clear Result" });
  const deleteButton = screen.getByRole("button", { name: "Delete Game" });
  expect(clearButton.parentElement).toBe(deleteButton.parentElement);
  expect(clearButton.parentElement.className).toMatch(/mr-auto/);
});
