import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Trainings from "../Trainings";
import { teamService } from "../../services/teamService";

afterEach(() => {
  vi.restoreAllMocks();
});

function getTeamsColumn(container) {
  return container.querySelector(".text-center.overflow-y-auto");
}

function getFutureList() {
  return screen.getByText("Next Trainings").nextElementSibling;
}

function getPastList() {
  return screen.getByText("Past Trainings").nextElementSibling;
}

function getFormFor(headingText) {
  return screen
    .getByRole("heading", { name: headingText })
    .closest("div")
    .querySelector("form");
}

async function typeInto(user, form, name, value) {
  const input = form.querySelector(`[name="${name}"]`);
  await user.clear(input);
  await user.type(input, value);
}

async function openCreatePopup(user, container) {
  await user.click(container.querySelector(".bg-blue-500"));
}

test("renders teams returned by teamService.getAll on mount", async () => {
  const { container } = render(<Trainings />);

  expect(await screen.findByText("Amadora Sub-11")).toBeInTheDocument();
  expect(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  ).toBeInTheDocument();
});

test("logs an error and does not crash when teamService.getAll rejects", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(teamService, "getAll").mockRejectedValueOnce(new Error("boom"));

  const { container } = render(<Trainings />);

  await waitFor(() => {
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load teams:",
      expect.any(Error)
    );
  });
  expect(
    within(getTeamsColumn(container)).queryByText("Amadora Sub-11")
  ).not.toBeInTheDocument();
});

test("loads and splits all trainings into past and future buckets on mount when no team is selected", async () => {
  render(<Trainings />);
  await screen.findByText("Amadora Sub-11");

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  expect(within(getFutureList()).queryAllByRole("listitem")).toHaveLength(0);
});

test("selecting a team filters both trainings lists to that team's trainings only", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await waitFor(() => {
    expect(within(getPastList()).queryAllByRole("listitem")).toHaveLength(0);
  });
  expect(within(getFutureList()).queryAllByRole("listitem")).toHaveLength(0);
});

test("deselecting the selected team reverts to showing all trainings", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );
  await waitFor(() => {
    expect(within(getPastList()).queryAllByRole("listitem")).toHaveLength(0);
  });

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
});

test("creating a training with a future date refreshes the Next Trainings list without a manual reload", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");

  await openCreatePopup(user, container);

  const form = getFormFor("Create Training");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "61");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(within(getFutureList()).getAllByRole("listitem")).toHaveLength(1);
  });
  expect(within(getFutureList()).getByText(/61$/)).toBeInTheDocument();
});

test("creating a training with a past date immediately places it under Past Trainings", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  await openCreatePopup(user, container);

  const form = getFormFor("Create Training");
  await typeInto(user, form, "day", "2020-01-01T10:00");
  await typeInto(user, form, "duration", "62");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(3);
  });
});

test("creating a training while a team filter is active preserves the filter and does not leak other teams' trainings", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );
  await waitFor(() => {
    expect(within(getPastList()).queryAllByRole("listitem")).toHaveLength(0);
  });

  await openCreatePopup(user, container);

  const form = getFormFor("Create Training");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "63");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(within(getFutureList()).getAllByRole("listitem")).toHaveLength(1);
  });
  expect(within(getPastList()).queryAllByRole("listitem")).toHaveLength(0);
});

test("canceling the create-training popup does not add a training and preserves the current team filter", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  await openCreatePopup(user, container);
  await user.click(screen.getByRole("button", { name: "Cancel" }));

  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });
  expect(within(getFutureList()).queryAllByRole("listitem")).toHaveLength(0);
  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).toHaveAttribute("aria-current", "true");
});

test("renders no React key warnings for the team filter and training lists", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  render(<Trainings />);
  await screen.findByText("Amadora Sub-11");
  await waitFor(() => {
    expect(within(getPastList()).getAllByRole("listitem")).toHaveLength(2);
  });

  const keyWarning = errorSpy.mock.calls.find((call) =>
    String(call[0]).includes('unique "key" prop')
  );
  expect(keyWarning).toBeUndefined();
});

test("renders an empty-state message for Next Trainings when there are none", async () => {
  render(<Trainings />);
  await screen.findByText("Amadora Sub-11");

  expect(await screen.findByText("No upcoming trainings.")).toBeInTheDocument();
});

test("renders an empty-state message for Past Trainings when the filtered team has none", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");

  await user.click(
    within(getTeamsColumn(container)).getByText("Areias Sub-19")
  );

  expect(
    await screen.findByText("No past trainings.")
  ).toBeInTheDocument();
});

test("marks the selected team row with aria-current", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );

  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).toHaveAttribute("aria-current", "true");
});

test("clicking the selected team again clears aria-current from its row", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");
  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );

  await user.click(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  );

  expect(
    within(getTeamsColumn(container)).getByText("Amadora Sub-11")
  ).not.toHaveAttribute("aria-current");
});

test("creating a future training removes the Next Trainings empty-state message", async () => {
  const user = userEvent.setup();
  const { container } = render(<Trainings />);
  await screen.findByText("Amadora Sub-11");
  await screen.findByText("No upcoming trainings.");

  await openCreatePopup(user, container);
  const form = getFormFor("Create Training");
  await typeInto(user, form, "day", "2027-01-01T10:00");
  await typeInto(user, form, "duration", "61");
  await user.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => {
    expect(screen.queryByText("No upcoming trainings.")).not.toBeInTheDocument();
  });
});
