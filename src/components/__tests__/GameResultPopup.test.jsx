import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameResultPopup from "../GameResultPopup";

afterEach(() => {
  vi.restoreAllMocks();
});

const scheduledGame = {
  id: "g1",
  teamId: 1,
  opponent: "Benfica",
  date: new Date(2027, 5, 15, 14, 30),
  isHome: true,
  competition: "League",
  usScore: null,
  themScore: null,
};

const playedGame = { ...scheduledGame, usScore: 2, themScore: 1 };

function renderPopup(props = {}) {
  return render(<GameResultPopup onClose={() => {}} {...props} />);
}

test("renders nothing when no game is passed", () => {
  const { container } = renderPopup({ game: null });

  expect(container).toBeEmptyDOMElement();
});

test("renders 'Record Result' heading for a scheduled game", () => {
  renderPopup({ game: scheduledGame });

  expect(
    screen.getByRole("heading", { name: "Record Result" })
  ).toBeInTheDocument();
});

test("renders 'Edit Result' heading and pre-fills the scores for an already-played game (AC GAME-06.4)", () => {
  renderPopup({ game: playedGame });

  expect(
    screen.getByRole("heading", { name: "Edit Result" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Us")).toHaveValue("2");
  expect(screen.getByLabelText("Benfica")).toHaveValue("1");
});

test("entering a valid result calls onSubmit with numeric scores and closes (AC GAME-06.1)", async () => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: scheduledGame, onSubmit, onClose });

  await user.type(screen.getByLabelText("Us"), "3");
  await user.type(screen.getByLabelText("Benfica"), "1");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith({ us: 3, them: 1 });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("recording a 0-0 result is accepted and submitted (null-vs-zero edge case)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: scheduledGame, onSubmit });

  await user.type(screen.getByLabelText("Us"), "0");
  await user.type(screen.getByLabelText("Benfica"), "0");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith({ us: 0, them: 0 });
});

test("blocks submission with a message when a score is negative (AC GAME-06.2)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: scheduledGame, onSubmit });

  await user.type(screen.getByLabelText("Us"), "-1");
  await user.type(screen.getByLabelText("Benfica"), "2");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(
      "Please enter a valid, non-negative score for both teams."
    )
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("blocks submission with a message when a score is non-numeric (AC GAME-06.2)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: scheduledGame, onSubmit });

  await user.type(screen.getByLabelText("Us"), "abc");
  await user.type(screen.getByLabelText("Benfica"), "1");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(
      "Please enter a valid, non-negative score for both teams."
    )
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("blocks submission with a message when a score is left empty (AC GAME-06.2)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: scheduledGame, onSubmit });

  await user.type(screen.getByLabelText("Us"), "2");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(
      "Please enter a valid, non-negative score for both teams."
    )
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("does not render a 'Clear Result' button for a scheduled game with no result yet", () => {
  renderPopup({ game: scheduledGame });

  expect(
    screen.queryByRole("button", { name: "Clear Result" })
  ).not.toBeInTheDocument();
});

test("clearing a result calls onClear and closes the popup (AC GAME-06.5)", async () => {
  const onClear = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: playedGame, onClear, onClose });

  await user.click(screen.getByRole("button", { name: "Clear Result" }));

  expect(onClear).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("editing an existing result submits the new values in place (AC GAME-06.4)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: playedGame, onSubmit });

  const usInput = screen.getByLabelText("Us");
  await user.clear(usInput);
  await user.type(usInput, "5");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith({ us: 5, them: 1 });
});

test("cancelling calls onClose without calling onSubmit or onClear", async () => {
  const onSubmit = vi.fn();
  const onClear = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: playedGame, onSubmit, onClear, onClose });

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(onClear).not.toHaveBeenCalled();
});

test("does not render a 'Delete Game' button when onDelete is not provided", () => {
  renderPopup({ game: playedGame });

  expect(
    screen.queryByRole("button", { name: "Delete Game" })
  ).not.toBeInTheDocument();
});

test("deleting a game asks for confirmation, then calls onDelete and closes (edge case: deleting a played game)", async () => {
  const onDelete = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: playedGame, onDelete, onClose });

  await user.click(screen.getByRole("button", { name: "Delete Game" }));
  expect(onDelete).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("cancelling the delete confirmation does not call onDelete", async () => {
  const onDelete = vi.fn();
  const user = userEvent.setup();
  renderPopup({ game: playedGame, onDelete });

  await user.click(screen.getByRole("button", { name: "Delete Game" }));
  const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
  await user.click(cancelButtons[cancelButtons.length - 1]);

  expect(onDelete).not.toHaveBeenCalled();
  expect(
    screen.queryByText("Delete the game against Benfica?")
  ).not.toBeInTheDocument();
});
