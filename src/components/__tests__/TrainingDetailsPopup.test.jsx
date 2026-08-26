import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrainingDetailsPopup from "../TrainingDetailsPopup";
import { teamService } from "../../services/teamService";
import { ratingService } from "../../services/ratingService";
import { trainingService } from "../../services/trainingService";
import { apiFetch } from "../../lib/apiClient";
import { triggerDownload } from "../../lib/download";
import { createFakeApi } from "../../test/fakeApi";
import { AuthError, NetworkError, NotFoundError, ApiError, ValidationError } from "../../lib/errors";

// The real services now hit a live backend (F4/F7). apiFetch is replaced
// with the shared stateful fake so the "Rate squad" tests' setRating/
// getByEvent round trips stay deterministic with zero real network calls.
// None of these tests depend on fakeApi's specific seed contents, so the
// default seed is used as-is.
vi.mock("../../lib/apiClient", () => ({
  apiFetch: vi.fn(),
  silentRefresh: vi.fn(),
  apiFetchBlob: vi.fn(),
}));

// exportPdf is a binary call fakeApi's JSON-only routing can't stand in
// for, and triggerDownload touches the DOM/URL APIs jsdom doesn't fully
// implement (T3) -- both are mocked directly rather than exercised.
vi.mock("../../services/trainingService", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, trainingService: { ...actual.trainingService, exportPdf: vi.fn() } };
});
vi.mock("../../lib/download", () => ({ triggerDownload: vi.fn() }));

beforeEach(() => {
  apiFetch.mockImplementation(createFakeApi().apiFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// A string id, not a number: `ratingService.setRating` interpolates
// `training.id` into the fake's `/ratings/{type}/{id}/players/{id}` URL,
// which always round-trips ids as strings (a real API would too) — a
// numeric literal here would make `toMatchObject({ eventId: training.id })`
// compare a number against the string the fake actually stored.
const baseTraining = {
  id: "1",
  teamId: "1",
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

test("Delete is danger, Edit is primary, and Close and Rate squad are secondary (AC BTN-02.4)", () => {
  const training = { id: 1, teamId: 1, number: 4, day: new Date(), duration: 60, exercises: [] };
  render(
    <TrainingDetailsPopup
      training={training}
      onClose={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
    />
  );

  const closeButton = screen.getByRole("button", { name: "Close" });
  const rateButton = screen.getByRole("button", { name: "Rate squad" });
  const editButton = screen.getByRole("button", { name: "Edit" });
  const deleteButton = screen.getByRole("button", { name: "Delete" });

  expect(deleteButton.className).toMatch(/bg-red-600/);
  expect(editButton.className).toMatch(/bg-blue-600/);
  expect(closeButton.className).toMatch(/border/);
  expect(rateButton.className).toMatch(/border/);
  expect(closeButton.className).not.toMatch(/bg-gray-300/);
  expect(rateButton.className).not.toMatch(/bg-green-600/);
});

test("each exercise row is a focusable button whose accessible name includes its description (AC EXDET-01.1)", () => {
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "SSG", duration: 20, numberOfPlayers: 8, repetitions: 3 },
    ],
  };
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);

  expect(screen.getByRole("button", { name: /SSG/ })).toBeInTheDocument();
});

test("Enter on a focused exercise row opens its details popup, same as a click (AC EXDET-01.2)", async () => {
  const user = userEvent.setup();
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "SSG", duration: 20, numberOfPlayers: 8, repetitions: 3 },
    ],
  };
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);

  screen.getByRole("button", { name: /SSG/ }).focus();
  await user.keyboard("{Enter}");

  expect(screen.getByRole("heading", { name: "SSG" })).toBeInTheDocument();
});

test("clicking an exercise row opens its details popup, with the training popup still in the document (AC EXDET-01.2, EXDET-01.3)", async () => {
  const user = userEvent.setup();
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "SSG", duration: 20, numberOfPlayers: 8, repetitions: 3 },
    ],
    number: 4,
  };
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);

  await user.click(screen.getByRole("button", { name: /SSG/ }));

  expect(screen.getByRole("heading", { name: "SSG" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Training #4" })).toBeInTheDocument();
});

test("closing the exercise popup leaves the training popup open and removes the exercise popup (AC EXDET-01.4)", async () => {
  const user = userEvent.setup();
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "SSG", duration: 20, numberOfPlayers: 8, repetitions: 3 },
    ],
    number: 4,
  };
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);
  await user.click(screen.getByRole("button", { name: /SSG/ }));
  const exerciseDialogs = screen.getAllByRole("dialog");
  const closeButtons = screen.getAllByRole("button", { name: "Close" });

  await user.click(closeButtons[closeButtons.length - 1]);

  expect(screen.getByRole("heading", { name: "Training #4" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "SSG" })).not.toBeInTheDocument();
  expect(exerciseDialogs.length).toBeGreaterThan(0);
});

test("two exercises sharing a description each open their own record (edge case)", async () => {
  const user = userEvent.setup();
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "Passing", duration: 10, numberOfPlayers: null, repetitions: null },
      { id: 2, description: "Passing", duration: 25, numberOfPlayers: null, repetitions: null },
    ],
  };
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);
  const rows = screen.getAllByRole("button", { name: /Passing/ });

  await user.click(rows[1]);

  expect(screen.getByText("25")).toBeInTheDocument();
});

test("with no exercises, 'No exercises' renders and is not a button (edge case)", () => {
  const training = { ...baseTraining, exercises: [] };
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);

  expect(screen.getByText("No exercises")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "No exercises" })).not.toBeInTheDocument();
});

test("closing the training popup while an exercise popup is open removes both (edge case)", async () => {
  const user = userEvent.setup();
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "SSG", duration: 20, numberOfPlayers: 8, repetitions: 3 },
    ],
  };
  const { rerender } = render(
    <TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />
  );
  await user.click(screen.getByRole("button", { name: /SSG/ }));
  expect(screen.getByRole("heading", { name: "SSG" })).toBeInTheDocument();

  rerender(<TrainingDetailsPopup training={null} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);

  expect(screen.queryByRole("heading", { name: "SSG" })).not.toBeInTheDocument();
  expect(screen.queryAllByRole("dialog")).toHaveLength(0);
});

test("stepping between exercises does not close or remount the training popup behind it (AC EXDET-03)", async () => {
  const user = userEvent.setup();
  const training = {
    ...baseTraining,
    exercises: [
      { id: 1, description: "First", duration: 10, numberOfPlayers: null, repetitions: null },
      { id: 2, description: "Second", duration: 20, numberOfPlayers: null, repetitions: null },
    ],
    number: 4,
  };
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />);
  await user.click(screen.getByRole("button", { name: /First/ }));

  await user.click(screen.getByRole("button", { name: "Next" }));

  expect(screen.getByRole("heading", { name: "Second" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Training #4" })).toBeInTheDocument();
});

test("renders an enabled 'Export PDF' action in the action row (PDFEX-01)", () => {
  const training = { ...baseTraining, number: 4, exercises: [] };

  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  const exportButton = screen.getByRole("button", { name: "Export PDF" });
  expect(exportButton).toBeInTheDocument();
  expect(exportButton).toBeEnabled();
});

test("clicking 'Export PDF' calls trainingService.exportPdf exactly once with the training's id (PDFEX-02)", async () => {
  trainingService.exportPdf.mockResolvedValueOnce({ blob: "the-blob", filename: "session.pdf" });
  const training = { ...baseTraining, id: "tr-99", number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  expect(trainingService.exportPdf).toHaveBeenCalledTimes(1);
  expect(trainingService.exportPdf).toHaveBeenCalledWith("tr-99");
});

test("on a successful export, hands the resolved blob and filename to triggerDownload (PDFEX-05)", async () => {
  const resolved = { blob: "the-blob", filename: "sub-11-session-4-2026-08-25.pdf" };
  trainingService.exportPdf.mockResolvedValueOnce(resolved);
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  await waitFor(() => expect(triggerDownload).toHaveBeenCalledTimes(1));
  expect(triggerDownload).toHaveBeenCalledWith(resolved.blob, resolved.filename);
});

test("after a successful export the popup stays open, still showing the training, with no alert (PDFEX-06)", async () => {
  trainingService.exportPdf.mockResolvedValueOnce({ blob: "b", filename: "f.pdf" });
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));
  await waitFor(() => expect(triggerDownload).toHaveBeenCalledTimes(1));

  expect(screen.getByRole("heading", { name: "Training #4" })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("an unassigned training (teamId: null) exports identically -- same call, same download (PDFEX-07)", async () => {
  const resolved = { blob: "b", filename: "training-2026-08-25.pdf" };
  trainingService.exportPdf.mockResolvedValueOnce(resolved);
  const training = { ...baseTraining, teamId: null, number: null, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  expect(trainingService.exportPdf).toHaveBeenCalledWith(training.id);
  await waitFor(() => expect(triggerDownload).toHaveBeenCalledWith(resolved.blob, resolved.filename));
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("while the export is in flight, the button is disabled and reads 'Exporting…' (PDFEX-20)", async () => {
  const { promise, resolve } = deferred();
  trainingService.exportPdf.mockReturnValueOnce(promise);
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  const button = screen.getByRole("button", { name: "Exporting…" });
  expect(button).toBeDisabled();

  resolve({ blob: "b", filename: "f.pdf" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled());
});

test("two rapid clicks issue exactly one export request (PDFEX-21)", async () => {
  const { promise, resolve } = deferred();
  trainingService.exportPdf.mockReturnValueOnce(promise);
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  const button = screen.getByRole("button", { name: "Export PDF" });
  await user.click(button);
  await user.click(button); // now disabled/"Exporting…" — a second click is a no-op

  expect(trainingService.exportPdf).toHaveBeenCalledTimes(1);
  resolve({ blob: "b", filename: "f.pdf" });
  await waitFor(() => expect(triggerDownload).toHaveBeenCalledTimes(1));
});

test("after a failed export settles, the button returns to enabled 'Export PDF' (PDFEX-22)", async () => {
  trainingService.exportPdf.mockRejectedValueOnce(new NotFoundError("not found"));
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled()
  );
});

test("NotFoundError renders an alert naming the missing training and does not trigger a download (PDFEX-23)", async () => {
  trainingService.exportPdf.mockRejectedValueOnce(new NotFoundError("not found"));
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This training could not be found."
  );
  expect(triggerDownload).not.toHaveBeenCalled();
});

test("NetworkError renders an alert with wording distinct from the NotFoundError case (PDFEX-24)", async () => {
  trainingService.exportPdf.mockRejectedValueOnce(new NetworkError("offline"));
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Could not reach the server. Please try again.");
  expect(alert.textContent).not.toBe("This training could not be found.");
});

test.each([
  ["ApiError(500)", () => new ApiError("server exploded", 500)],
  ["ValidationError", () => new ValidationError("bad zone")],
])("%s renders the generic failure message and logs to console.error (PDFEX-25)", async (_label, makeError) => {
  const err = makeError();
  trainingService.exportPdf.mockRejectedValueOnce(err);
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Failed to export the PDF. Please try again."
  );
  expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), err);
});

test("AuthError renders no alert and triggers no download (PDFEX-26)", async () => {
  trainingService.exportPdf.mockRejectedValueOnce(new AuthError("session expired"));
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  await waitFor(() => expect(trainingService.exportPdf).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(triggerDownload).not.toHaveBeenCalled();
});

test("a retry that succeeds after a failure clears the previous alert before the download fires (PDFEX-27)", async () => {
  trainingService.exportPdf.mockRejectedValueOnce(new NotFoundError("not found"));
  const resolved = { blob: "b", filename: "f.pdf" };
  trainingService.exportPdf.mockResolvedValueOnce(resolved);
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  render(<TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />);
  await user.click(screen.getByRole("button", { name: "Export PDF" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  await waitFor(() => expect(triggerDownload).toHaveBeenCalledWith(resolved.blob, resolved.filename));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("closing (unmounting) the popup mid-flight fires no download and logs no unmounted-setState warning (edge case)", async () => {
  // A real close removes TrainingDetailsPopup from the tree entirely
  // (Trainings.jsx: {showTrainingDetailsPopup && <TrainingDetailsPopup .../>})
  // -- unlike rerendering the same instance with training={null}, only a
  // true unmount() runs the mounted-ref's cleanup effect.
  const { promise, resolve } = deferred();
  trainingService.exportPdf.mockReturnValueOnce(promise);
  const training = { ...baseTraining, number: 4, exercises: [] };
  const user = userEvent.setup();
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const { unmount } = render(
    <TrainingDetailsPopup training={training} onClose={() => {}} onEdit={() => {}} />
  );
  await user.click(screen.getByRole("button", { name: "Export PDF" }));

  unmount();
  resolve({ blob: "b", filename: "f.pdf" });
  await new Promise((r) => setTimeout(r, 0));

  expect(triggerDownload).not.toHaveBeenCalled();
  const unmountedWarnings = consoleErrorSpy.mock.calls.filter(
    ([msg]) => typeof msg === "string" && msg.includes("unmounted")
  );
  expect(unmountedWarnings).toHaveLength(0);
});
