import { render, screen, within } from "@testing-library/react";
import TrainingSavePopup from "../TrainingSavePopup";
import { teamService } from "../../services/teamService";

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleTeams = [
  { id: 1, club: "Amadora", name: "Sub-11" },
  { id: 2, club: "Areias", name: "Sub-19" },
];

function renderPopup(props = {}) {
  return render(
    <TrainingSavePopup onClose={() => {}} {...props} />
  );
}

test("loads teams via teamService.getAll rather than a teams prop", async () => {
  const getAllSpy = vi
    .spyOn(teamService, "getAll")
    .mockResolvedValue(sampleTeams);

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(getAllSpy).toHaveBeenCalledTimes(1);
});

test("renders every team as an option formatted as club + name", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup();

  const select = await screen.findByRole("combobox");
  expect(
    within(select).getByRole("option", { name: "Amadora Sub-11" })
  ).toBeInTheDocument();
  expect(
    within(select).getByRole("option", { name: "Areias Sub-19" })
  ).toBeInTheDocument();
});

test("renders the select disabled while teams are still loading", () => {
  vi.spyOn(teamService, "getAll").mockReturnValue(new Promise(() => {}));

  renderPopup();

  expect(screen.getByRole("combobox")).toBeDisabled();
});

test("renders the select disabled with a message pointing at Teams when there are zero teams", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue([]);

  renderPopup();

  expect(await screen.findByText(/No teams yet/)).toBeInTheDocument();
  expect(screen.getByRole("combobox")).toBeDisabled();
});

test("enables the select once teams have loaded", async () => {
  vi.spyOn(teamService, "getAll").mockResolvedValue(sampleTeams);

  renderPopup();

  await screen.findByRole("option", { name: "Amadora Sub-11" });
  expect(screen.getByRole("combobox")).toBeEnabled();
});

test("logs an error and stops loading when teamService.getAll rejects", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(teamService, "getAll").mockRejectedValueOnce(new Error("boom"));

  renderPopup();

  await screen.findByText(/No teams yet/);
  expect(errorSpy).toHaveBeenCalledWith("Failed to load teams:", expect.any(Error));
});
