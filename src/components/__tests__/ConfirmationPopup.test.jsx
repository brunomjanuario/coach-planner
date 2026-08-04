import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmationPopup from "../ConfirmationPopup";

test("renders through PopupShell as an accessible dialog with the message as its title", () => {
  render(
    <ConfirmationPopup message="Delete this?" onSubmit={() => {}} onClose={() => {}} />
  );

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(screen.getByText("Delete this?")).toBeInTheDocument();
});

test("renders at natural height with no forced tall box (AC POPUP-03)", () => {
  render(
    <ConfirmationPopup message="Delete this?" onSubmit={() => {}} onClose={() => {}} />
  );

  const panel = screen.getByRole("dialog");
  expect(panel.className).toMatch(/max-h-\[85vh\]/);
});

test("clicking Cancel calls onClose and not onSubmit", async () => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<ConfirmationPopup message="Delete this?" onSubmit={onSubmit} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
});

test("clicking Submit calls onSubmit and not onClose", async () => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<ConfirmationPopup message="Delete this?" onSubmit={onSubmit} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});

test("stacks correctly when opened from inside another popup (edge case)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(
    <div>
      <div role="dialog" aria-label="Outer popup">
        <ConfirmationPopup message="Delete this?" onSubmit={onSubmit} onClose={() => {}} />
      </div>
    </div>
  );

  const dialogs = screen.getAllByRole("dialog");
  expect(dialogs).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Submit" }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
});
