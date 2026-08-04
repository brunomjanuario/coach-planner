import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrainingDetailsPopup from "../TrainingDetailsPopup";
import { teamService } from "../../services/teamService";
import { ratingService } from "../../services/ratingService";

const baseTraining = {
  id: 1,
  teamId: 1,
  day: new Date("2027-01-01T10:00:00Z"),
  duration: 90,
};

function playerLabel(player) {
  return `#${player.shirtNumber} ${player.name}`;
}

test("renders through PopupShell with the exercise list inside the scroll region and the action row outside it (AC POPUP-02.4)", () => {
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "SSG", duration: 20, numberOfPlayers: 8, repetitions: 3, image: "" },
    ],
  };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);

  const dialog = screen.getByRole("dialog");
  const shellBody = dialog.querySelector(".overflow-y-auto.min-h-0");
  const exerciseItem = screen.getByText(/SSG/).closest("li");
  const closeButton = screen.getByRole("button", { name: "Close" });

  expect(shellBody).toContainElement(exerciseItem);
  expect(shellBody).not.toContainElement(closeButton);
});

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

test("renders a 'Rate squad' action alongside Close, Edit and Delete (AC RATE-02.1)", () => {
  const training = { ...baseTraining, number: 4, exercises: [] };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  expect(screen.getByRole("button", { name: "Rate squad" })).toBeInTheDocument();
});

test("clicking 'Rate squad' opens the squad rating view listing this training's team (AC RATE-02.1)", async () => {
  const [team] = await teamService.getAll();
  const training = { ...baseTraining, teamId: team.id, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  for (const player of team.players) {
    expect(
      await screen.findByLabelText(`Rate ${playerLabel(player)}`)
    ).toBeInTheDocument();
  }
});

test("ratings entered from the training's squad rating view persist against that specific training and survive a reload (AC RATE-02.3)", async () => {
  const [team] = await teamService.getAll();
  const training = { ...baseTraining, teamId: team.id, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);
  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  await user.type(
    await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`),
    "8"
  );
  await user.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(async () => {
    const ratings = await ratingService.getByEvent("training", training.id);
    expect(ratings).toHaveLength(1);
  });
  const ratings = await ratingService.getByEvent("training", training.id);
  expect(ratings[0]).toMatchObject({
    playerId: team.players[0].id,
    eventType: "training",
    eventId: training.id,
    value: 8,
  });
});

test("reopening 'Rate squad' pre-fills previously entered ratings (AC RATE-02.5)", async () => {
  const [team] = await teamService.getAll();
  const training = { ...baseTraining, teamId: team.id, number: 4, exercises: [] };
  await ratingService.setRating({
    playerId: team.players[0].id,
    eventType: "training",
    eventId: training.id,
    value: 6,
  });
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Rate squad" }));

  expect(
    await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`)
  ).toHaveValue(6);
});

test("cancelling the squad rating view persists no ratings against the training", async () => {
  const [team] = await teamService.getAll();
  const training = { ...baseTraining, teamId: team.id, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);
  await user.click(screen.getByRole("button", { name: "Rate squad" }));
  await user.type(
    await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`),
    "5"
  );

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(await ratingService.getByEvent("training", training.id)).toHaveLength(0);
});

test("closing the squad rating view returns to the training details view", async () => {
  const [team] = await teamService.getAll();
  const training = { ...baseTraining, teamId: team.id, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);
  await user.click(screen.getByRole("button", { name: "Rate squad" }));
  await screen.findByLabelText(`Rate ${playerLabel(team.players[0])}`);

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByLabelText(`Rate ${playerLabel(team.players[0])}`)).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Training #4" })).toBeInTheDocument();
});

test("the existing Close action still works alongside the new rating action (regression guard on 06)", async () => {
  const training = { ...baseTraining, number: 4, exercises: [] };
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={onClose} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Close" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});

test("the existing Edit and Delete actions still work alongside the new rating action (regression guard on 06)", async () => {
  const training = { ...baseTraining, number: 4, exercises: [] };
  const onEdit = vi.fn();
  const onDelete = vi.fn().mockResolvedValue();
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <TrainingDetailsPopup
      training={training}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  await user.click(screen.getByRole("button", { name: "Edit" }));
  expect(onEdit).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));
  expect(onDelete).toHaveBeenCalledWith(training);
});
