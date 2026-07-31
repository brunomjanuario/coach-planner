import { render, screen } from "@testing-library/react";
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
