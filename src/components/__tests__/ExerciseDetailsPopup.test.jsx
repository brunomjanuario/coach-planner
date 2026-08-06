import { render, screen } from "@testing-library/react";
import ExerciseDetailsPopup from "../ExerciseDetailsPopup";

const fullExercise = {
  id: 1,
  trainingId: 1,
  description: "SSG",
  duration: 20,
  numberOfPlayers: 8,
  repetitions: 3,
};

test("renders Description, Duration, Number of players and Repetitions each under its own label (AC EXDET-01.5)", () => {
  render(<ExerciseDetailsPopup exercise={fullExercise} exercises={[fullExercise]} onClose={() => {}} />);

  expect(screen.getByText("Description")).toBeInTheDocument();
  expect(screen.getAllByText("SSG").length).toBeGreaterThan(0);
  expect(screen.getByText("Duration (minutes)")).toBeInTheDocument();
  expect(screen.getByText("20")).toBeInTheDocument();
  expect(screen.getByText("Number of players")).toBeInTheDocument();
  expect(screen.getByText("8")).toBeInTheDocument();
  expect(screen.getByText("Repetitions")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
});

test("a null optional field renders an em dash under its label rather than being omitted (AC EXDET-01.6)", () => {
  const exercise = {
    id: 1,
    description: "Corrida",
    duration: 10,
    numberOfPlayers: null,
    repetitions: null,
  };
  render(<ExerciseDetailsPopup exercise={exercise} exercises={[exercise]} onClose={() => {}} />);

  expect(screen.getByText("Number of players")).toBeInTheDocument();
  expect(screen.getByText("Repetitions")).toBeInTheDocument();
  const dashes = screen.getAllByText("—");
  expect(dashes.length).toBe(2);
});

test("the planned-time share renders when non-null (AC EXDET-04.1)", () => {
  const other = { id: 2, description: "Other", duration: 35, repetitions: null };
  render(
    <ExerciseDetailsPopup exercise={fullExercise} exercises={[fullExercise, other]} onClose={() => {}} />
  );

  // fullExercise contributes 20*3=60 of a 60+35=95 total => 63%
  expect(screen.getByText(/63% of the session's planned time/)).toBeInTheDocument();
});

test("the planned-time share is absent when plannedShare returns null (AC EXDET-04.2)", () => {
  const exercise = { id: 1, description: "Corrida", duration: 0, repetitions: null };
  render(<ExerciseDetailsPopup exercise={exercise} exercises={[exercise]} onClose={() => {}} />);

  expect(screen.queryByText(/% of the session's planned time/)).not.toBeInTheDocument();
});

test("the popup title is the exercise's description (AC EXDET-03.5)", () => {
  render(<ExerciseDetailsPopup exercise={fullExercise} exercises={[fullExercise]} onClose={() => {}} />);

  expect(screen.getByRole("heading", { name: "SSG" })).toBeInTheDocument();
});

test("a long description wraps in the title and carries no truncation class (edge case)", () => {
  const longDescription =
    "A very long exercise description that could plausibly wrap across more than one line of the popup title";
  const exercise = { id: 1, description: longDescription, duration: 10, repetitions: null };
  render(<ExerciseDetailsPopup exercise={exercise} exercises={[exercise]} onClose={() => {}} />);

  const heading = screen.getByRole("heading", { name: longDescription });
  expect(heading.className).not.toMatch(/truncate/);
});

test("renders no diagram region while exercise.diagram is absent (Assumptions: empty diagram slot)", () => {
  render(<ExerciseDetailsPopup exercise={fullExercise} exercises={[fullExercise]} onClose={() => {}} />);

  expect(screen.queryByText("Diagram")).not.toBeInTheDocument();
});

test("the footer uses the shared Button component, not a hand-written class", () => {
  render(<ExerciseDetailsPopup exercise={fullExercise} exercises={[fullExercise]} onClose={() => {}} />);

  const closeButton = screen.getByRole("button", { name: "Close" });
  expect(closeButton.className).toMatch(/border/);
  expect(closeButton.className).not.toMatch(/bg-gray-300/);
});
