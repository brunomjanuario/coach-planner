import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrainingCard from "../TrainingCard";

function baseTraining(overrides = {}) {
  return {
    id: "t1",
    number: 3,
    day: new Date(2027, 0, 5, 16, 0), // Tuesday 5 January 2027
    duration: 90,
    exercises: [],
    ...overrides,
  };
}

function renderCard(props = {}) {
  return render(
    <TrainingCard training={baseTraining()} teamName="Amadora Sub-11" onSelect={() => {}} {...props} />
  );
}

test("renders the number, formatted date, duration, team and exercise summary (AC TCARD-01.1, TCARD-01.2)", () => {
  renderCard({
    training: baseTraining({
      exercises: [
        { duration: 10, repetitions: null },
        { duration: 20, repetitions: null },
        { duration: 10, repetitions: null },
      ],
      duration: 40,
    }),
  });

  expect(screen.getByText("Training #3")).toBeInTheDocument();
  expect(screen.getByText("Tue 5 Jan, 16:00")).toBeInTheDocument();
  expect(screen.getByText("40 min")).toBeInTheDocument();
  expect(screen.getByText("Amadora Sub-11")).toBeInTheDocument();
  expect(screen.getByText("3 exercises · 40 min planned")).toBeInTheDocument();
});

test("a training with no exercises renders the explicit empty text (AC TCARD-01.3)", () => {
  renderCard({ training: baseTraining({ exercises: [] }) });

  expect(screen.getByText("No exercises")).toBeInTheDocument();
});

test("a planned/scheduled mismatch renders the planned total alongside the duration (AC TCARD-01.4)", () => {
  renderCard({
    training: baseTraining({
      duration: 90,
      exercises: [
        { duration: 10, repetitions: null },
        { duration: 20, repetitions: null },
        { duration: 10, repetitions: null },
      ],
    }),
  });

  expect(screen.getByText("3 exercises · 40 min planned of 90")).toBeInTheDocument();
});

test("a planned/scheduled match does not repeat the duration (AC TCARD-01.4)", () => {
  renderCard({
    training: baseTraining({
      duration: 40,
      exercises: [
        { duration: 10, repetitions: null },
        { duration: 20, repetitions: null },
        { duration: 10, repetitions: null },
      ],
    }),
  });

  expect(screen.getByText("3 exercises · 40 min planned")).toBeInTheDocument();
  expect(screen.queryByText(/of 40/)).not.toBeInTheDocument();
});

test("a missing or dangling teamId renders 'Unassigned' (AC TCARD-01.6)", () => {
  renderCard({ teamName: null });

  expect(screen.getByText("Unassigned")).toBeInTheDocument();
});

test("a missing number renders the '—' placeholder (AC TCARD-01.7)", () => {
  renderCard({ training: baseTraining({ number: undefined }) });

  expect(screen.getByText("Training #—")).toBeInTheDocument();
});

test("an invalid day renders 'Invalid date' and still renders every other field (AC TCARD-01.5)", () => {
  renderCard({ training: baseTraining({ day: new Date("not-a-date") }) });

  expect(screen.getByText("Invalid date")).toBeInTheDocument();
  expect(screen.getByText("Training #3")).toBeInTheDocument();
  expect(screen.getByText("90 min")).toBeInTheDocument();
  expect(screen.getByText("Amadora Sub-11")).toBeInTheDocument();
});

test("is a real <button> element", () => {
  renderCard();

  expect(screen.getByRole("button").tagName).toBe("BUTTON");
});

test("clicking the card invokes onSelect exactly once (AC TCARD-03.3)", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  renderCard({ onSelect });

  await user.click(screen.getByRole("button"));

  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("pressing Enter while focused fires onSelect (AC TCARD-03.2)", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  renderCard({ onSelect });

  screen.getByRole("button").focus();
  await user.keyboard("{Enter}");

  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("pressing Space while focused fires onSelect (AC TCARD-03.2)", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  renderCard({ onSelect });

  screen.getByRole("button").focus();
  await user.keyboard(" ");

  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("is reachable by Tab", async () => {
  const user = userEvent.setup();
  renderCard();

  await user.tab();

  expect(screen.getByRole("button")).toHaveFocus();
});

test("renders a visible focus indicator class (AC TCARD-03.4)", () => {
  renderCard();

  expect(screen.getByRole("button").className).toMatch(/focus:outline/);
});

test("the accessible name identifies the training by number, date and team (AC TCARD-03.5)", () => {
  renderCard();

  const button = screen.getByRole("button", {
    name: "Training #3, Tue 5 Jan, 16:00, Amadora Sub-11",
  });
  expect(button).toBeInTheDocument();
});

test("a past training renders the muted treatment while staying readable (guard against the 14 defect class)", () => {
  renderCard({ past: true });

  const button = screen.getByRole("button");
  expect(button.className).toContain("bg-lightgrey");
  expect(button.className).toContain("text-gray-300");
  expect(button.className).not.toContain("bg-lightblack");
});

test("an upcoming (non-past) training does not render the muted treatment", () => {
  renderCard({ past: false });

  const button = screen.getByRole("button");
  expect(button.className).toContain("bg-lightblack");
  expect(button.className).not.toContain("bg-lightgrey");
});

test("a long team name wraps rather than overflowing (edge case)", () => {
  renderCard({ teamName: "A Very Long Club Name That Should Wrap Rather Than Overflow Its Container" });

  const teamNode = screen.getByText(
    "A Very Long Club Name That Should Wrap Rather Than Overflow Its Container"
  );
  expect(teamNode.className).toContain("break-words");
});
