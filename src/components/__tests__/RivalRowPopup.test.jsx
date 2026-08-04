import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RivalRowPopup from "../RivalRowPopup";

afterEach(() => {
  vi.restoreAllMocks();
});

const existingRow = {
  id: "r1",
  name: "Benfica B",
  played: 4,
  won: 3,
  drawn: 1,
  lost: 0,
  goalsFor: 10,
  goalsAgainst: 2,
};

function renderPopup(props = {}) {
  return render(<RivalRowPopup onClose={() => {}} {...props} />);
}

async function fillValidRow(user, { name = "Sporting B" } = {}) {
  await user.type(screen.getByLabelText("Team Name"), name);
  await user.type(screen.getByLabelText("Played"), "3");
  await user.type(screen.getByLabelText("Won"), "2");
  await user.type(screen.getByLabelText("Drawn"), "1");
  await user.type(screen.getByLabelText("Lost"), "0");
  await user.type(screen.getByLabelText("Goals For"), "5");
  await user.type(screen.getByLabelText("Goals Against"), "1");
}

test("the form fields sit inside the scroll region while Cancel/Add stay outside it (AC POPUP-02.4)", () => {
  const { container } = renderPopup();

  const shellBody = screen.getByRole("dialog").querySelector(".overflow-y-auto.min-h-0");
  const form = container.querySelector("form");
  const cancelButton = screen.getByRole("button", { name: "Cancel" });
  const addButton = screen.getByRole("button", { name: "Add" });

  expect(shellBody).toContainElement(form);
  expect(shellBody).not.toContainElement(cancelButton);
  expect(shellBody).not.toContainElement(addButton);
});

test("renders 'Add Rival Row' heading for a new row", () => {
  renderPopup();
  expect(
    screen.getByRole("heading", { name: "Add Rival Row" })
  ).toBeInTheDocument();
});

test("renders 'Edit Rival Row' heading and pre-fills every field for an existing row", () => {
  renderPopup({ row: existingRow });

  expect(
    screen.getByRole("heading", { name: "Edit Rival Row" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Team Name")).toHaveValue("Benfica B");
  expect(screen.getByLabelText("Played")).toHaveValue("4");
  expect(screen.getByLabelText("Won")).toHaveValue("3");
  expect(screen.getByLabelText("Goals Against")).toHaveValue("2");
});

test("submitting a valid row calls onSubmit with name, played, won, drawn, lost, goalsFor, goalsAgainst (AC GAME-09.1)", async () => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderPopup({ onSubmit, onClose });

  await fillValidRow(user);
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onSubmit).toHaveBeenCalledWith({
    id: undefined,
    name: "Sporting B",
    played: 3,
    won: 2,
    drawn: 1,
    lost: 0,
    goalsFor: 5,
    goalsAgainst: 1,
  });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("does not send points or goalDifference in the submitted payload (AC GAME-09.2)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ onSubmit });

  await fillValidRow(user);
  await user.click(screen.getByRole("button", { name: "Add" }));

  const payload = onSubmit.mock.calls[0][0];
  expect(payload.points).toBeUndefined();
  expect(payload.goalDifference).toBeUndefined();
});

test("blocks submission with a message when won + drawn + lost does not sum to played (AC GAME-09.3)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ onSubmit });

  await user.type(screen.getByLabelText("Team Name"), "Sporting B");
  await user.type(screen.getByLabelText("Played"), "5");
  await user.type(screen.getByLabelText("Won"), "3");
  await user.type(screen.getByLabelText("Drawn"), "1");
  await user.type(screen.getByLabelText("Lost"), "0");
  await user.type(screen.getByLabelText("Goals For"), "5");
  await user.type(screen.getByLabelText("Goals Against"), "1");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText(
      "Won, drawn and lost (4) must add up to played (5)."
    )
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("blocks submission with a message when a figure is negative", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ onSubmit });

  await user.type(screen.getByLabelText("Team Name"), "Sporting B");
  await user.type(screen.getByLabelText("Played"), "3");
  await user.type(screen.getByLabelText("Won"), "2");
  await user.type(screen.getByLabelText("Drawn"), "1");
  await user.type(screen.getByLabelText("Lost"), "-1");
  await user.type(screen.getByLabelText("Goals For"), "5");
  await user.type(screen.getByLabelText("Goals Against"), "1");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText(
      "Please enter a valid, non-negative number for every figure."
    )
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("blocks submission with a message when the name is empty", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ onSubmit });

  await user.type(screen.getByLabelText("Played"), "0");
  await user.type(screen.getByLabelText("Won"), "0");
  await user.type(screen.getByLabelText("Drawn"), "0");
  await user.type(screen.getByLabelText("Lost"), "0");
  await user.type(screen.getByLabelText("Goals For"), "0");
  await user.type(screen.getByLabelText("Goals Against"), "0");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(
    await screen.findByText("Please enter the team's name.")
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("editing an existing row submits the new values in place (AC GAME-09.4)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ row: existingRow, onSubmit });

  const goalsForInput = screen.getByLabelText("Goals For");
  await user.clear(goalsForInput);
  await user.type(goalsForInput, "20");
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(onSubmit).toHaveBeenCalledWith({
    id: "r1",
    name: "Benfica B",
    played: 4,
    won: 3,
    drawn: 1,
    lost: 0,
    goalsFor: 20,
    goalsAgainst: 2,
  });
});

test("warns rather than blocking submission when the rival name matches our own team's name (edge case)", async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  renderPopup({ onSubmit, ourTeamName: "Amadora Sub-11" });

  await user.type(screen.getByLabelText("Team Name"), "Amadora Sub-11");

  expect(
    screen.getByText(
      "This matches your own team's name — you'll have two rows for the same club."
    )
  ).toBeInTheDocument();

  await user.type(screen.getByLabelText("Played"), "1");
  await user.type(screen.getByLabelText("Won"), "1");
  await user.type(screen.getByLabelText("Drawn"), "0");
  await user.type(screen.getByLabelText("Lost"), "0");
  await user.type(screen.getByLabelText("Goals For"), "1");
  await user.type(screen.getByLabelText("Goals Against"), "0");
  await user.click(screen.getByRole("button", { name: "Add" }));

  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test("cancelling calls onClose without calling onSubmit", async () => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderPopup({ row: existingRow, onSubmit, onClose });

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
});
