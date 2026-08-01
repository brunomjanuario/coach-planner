import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrainingDetailsPopup from "../TrainingDetailsPopup";

const baseTraining = {
  id: 1,
  teamId: 1,
  day: new Date("2027-01-01T10:00:00Z"),
  duration: 90,
};

test("renders each exercise's duration, players and repetitions alongside its description (AC TFORM-07.1)", () => {
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "SSG", duration: 20, numberOfPlayers: 8, repetitions: 3, image: "" },
    ],
  };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} />);

  const item = screen.getByText(/SSG/).closest("li");
  expect(item).toHaveTextContent("20min");
  expect(item).toHaveTextContent("8 players");
  expect(item).toHaveTextContent("x3");
});

test("renders '—' for null fields rather than blank or null (AC TFORM-07.2)", () => {
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "Corrida", duration: 10, numberOfPlayers: null, repetitions: null, image: "" },
    ],
  };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} />);

  const item = screen.getByText(/Corrida/).closest("li");
  expect(item).toHaveTextContent("— players");
  expect(item).toHaveTextContent("x—");
});

test("renders the existing 'No exercises' message when a training has no exercises (AC TFORM-07.3)", () => {
  const training = { ...baseTraining, exercises: [] };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} />);

  expect(screen.getByText("No exercises")).toBeInTheDocument();
});

test("displays the total planned time for the training (AC TFORM-07.4)", () => {
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "Corrida", duration: 10, numberOfPlayers: 21, repetitions: 1, image: "" },
      { id: 2, description: "SSG", duration: 20, numberOfPlayers: 21, repetitions: 2, image: "" },
    ],
  };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} />);

  expect(screen.getByText(/Total planned time: 50min/)).toBeInTheDocument();
});

test("does not render a total planned time when there are no exercises", () => {
  const training = { ...baseTraining, exercises: [] };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} />);

  expect(screen.queryByText(/Total planned time/)).not.toBeInTheDocument();
});

test("renders 'Training #N' in the heading when a number is present (AC TNUM-05.1)", () => {
  const training = { ...baseTraining, number: 7, exercises: [] };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} />);

  expect(screen.getByRole("heading", { name: "Training #7" })).toBeInTheDocument();
});

test("falls back to 'Training Details' when number is null, never rendering 'Training #null'", () => {
  const training = { ...baseTraining, number: null, exercises: [] };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} />);

  expect(
    screen.getByRole("heading", { name: "Training Details" })
  ).toBeInTheDocument();
  expect(screen.queryByText(/Training #null/)).not.toBeInTheDocument();
});

test("renders a Delete control beside Edit and Close", () => {
  const training = { ...baseTraining, number: 4, exercises: [] };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
});

test("clicking Delete opens a confirmation dialog naming the training by its number (AC TEDIT-05.1)", async () => {
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Delete" }));

  expect(screen.getByText("Delete Training #4?")).toBeInTheDocument();
});

test("trainingService.delete-equivalent onDelete is not called until confirmation", async () => {
  const training = { ...baseTraining, number: 4, exercises: [] };
  const onDelete = vi.fn();
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={onDelete} />);

  await user.click(screen.getByRole("button", { name: "Delete" }));

  expect(onDelete).not.toHaveBeenCalled();
});

test("confirming delete calls onDelete and closes both popups (AC TEDIT-05.2)", async () => {
  const training = { ...baseTraining, number: 4, exercises: [] };
  const onDelete = vi.fn().mockResolvedValue();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={onClose} onEdit={() => {}} onDelete={onDelete} />);

  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(onDelete).toHaveBeenCalledWith(training);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Delete Training #4?")).not.toBeInTheDocument();
});

test("cancelling the delete confirmation leaves the training in place (AC TEDIT-05.3)", async () => {
  const training = { ...baseTraining, number: 4, exercises: [] };
  const onDelete = vi.fn();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={onClose} onEdit={() => {}} onDelete={onDelete} />);
  await user.click(screen.getByRole("button", { name: "Delete" }));

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onDelete).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.queryByText("Delete Training #4?")).not.toBeInTheDocument();
});

test("falls back to naming 'this training' in the confirmation when number is null", async () => {
  const training = { ...baseTraining, number: null, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Delete" }));

  expect(screen.getByText("Delete this training?")).toBeInTheDocument();
});

test("renders a sparse and a fully-populated exercise together without layout shift (edge case)", () => {
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "Sparse", duration: 10, numberOfPlayers: null, repetitions: null, image: "" },
      { id: 2, description: "Full", duration: 20, numberOfPlayers: 21, repetitions: 3, image: "" },
    ],
  };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} />);

  const sparseItem = screen.getByText(/Sparse/).closest("li");
  const fullItem = screen.getByText(/Full/).closest("li");
  expect(sparseItem.className).toBe(fullItem.className);
});
