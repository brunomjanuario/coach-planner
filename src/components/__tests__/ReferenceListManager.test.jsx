import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReferenceListManager from "../ReferenceListManager";

const NOUN_SETS = [
  { nouns: { singular: "opponent", plural: "opponents" }, sample: "Benfica", other: "Porto" },
  { nouns: { singular: "competition", plural: "competitions" }, sample: "Cup", other: "League" },
];

/** Renders the manager as a controlled host would: items live in state, callbacks mutate them. */
function Harness({
  initialItems,
  nouns,
  onCreate,
  onRename,
  onDelete,
  usageCount = async () => 0,
}) {
  const [items, setItems] = useState(initialItems);

  const create = async (name) => {
    const created = await onCreate(name, items);
    setItems((prev) => [...prev, created]);
  };

  const rename = async ({ id, name }) => {
    const updated = await onRename({ id, name }, items);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  const remove = async (id) => {
    await onDelete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <ReferenceListManager
      items={items}
      nouns={nouns}
      onCreate={create}
      onRename={rename}
      onDelete={remove}
      usageCount={usageCount}
    />
  );
}

function renderManager(props) {
  return render(<Harness {...props} />);
}

describe.each(NOUN_SETS)("ReferenceListManager ($nouns.singular)", ({ nouns, sample, other }) => {
  test("renders the list, the add form and per-row controls", () => {
    renderManager({
      initialItems: [{ id: "1", name: sample }],
      nouns,
      onCreate: async () => {},
      onRename: async () => {},
      onDelete: async () => {},
    });

    expect(screen.getByText(sample)).toBeInTheDocument();
    expect(screen.getByLabelText(`New ${nouns.singular}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Rename ${sample}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Delete ${sample}` })).toBeInTheDocument();
  });

  test("an empty list renders the nouns-derived empty message", () => {
    renderManager({ initialItems: [], nouns, onCreate: async () => {}, onRename: async () => {}, onDelete: async () => {} });

    expect(
      screen.getByText(`No ${nouns.plural} yet. Add your first one below.`)
    ).toBeInTheDocument();
  });

  test("adding a name calls onCreate and the rendered list reflects the result (AC GREF-02.1)", async () => {
    const onCreate = vi.fn(async (name) => ({ id: "new", name }));
    const user = userEvent.setup();
    renderManager({ initialItems: [], nouns, onCreate, onRename: async () => {}, onDelete: async () => {} });

    await user.type(screen.getByLabelText(`New ${nouns.singular}`), other);
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText(other)).toBeInTheDocument();
    expect(onCreate).toHaveBeenCalledWith(other, []);
  });

  test("a rejected create renders the thrown error's message and creates nothing (AC GREF-02.2)", async () => {
    const onCreate = vi.fn(async () => {
      throw new Error(`A ${nouns.singular} named "${other}" already exists.`);
    });
    const user = userEvent.setup();
    renderManager({ initialItems: [], nouns, onCreate, onRename: async () => {}, onDelete: async () => {} });

    await user.type(screen.getByLabelText(`New ${nouns.singular}`), other);
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText(`A ${nouns.singular} named "${other}" already exists.`)
    ).toBeInTheDocument();
    expect(screen.queryByText(other)).not.toBeInTheDocument();
  });

  test("a rename calls onRename and leaves edit mode (AC GREF-02.3)", async () => {
    const onRename = vi.fn(async ({ id, name }) => ({ id, name }));
    const user = userEvent.setup();
    renderManager({
      initialItems: [{ id: "1", name: sample }],
      nouns,
      onCreate: async () => {},
      onRename,
      onDelete: async () => {},
    });

    await user.click(screen.getByRole("button", { name: `Rename ${sample}` }));
    const input = screen.getByLabelText(`Rename ${sample}`);
    await user.clear(input);
    await user.type(input, other);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(other)).toBeInTheDocument();
    expect(onRename).toHaveBeenCalledWith(
      { id: "1", name: other },
      [{ id: "1", name: sample }]
    );
    expect(screen.queryByLabelText(`Rename ${sample}`)).not.toBeInTheDocument();
  });

  test("a rejected rename keeps edit mode and shows its error (AC GREF-02.3)", async () => {
    const onRename = vi.fn(async () => {
      throw new Error(`A ${nouns.singular} named "${other}" already exists.`);
    });
    const user = userEvent.setup();
    renderManager({
      initialItems: [{ id: "1", name: sample }],
      nouns,
      onCreate: async () => {},
      onRename,
      onDelete: async () => {},
    });

    await user.click(screen.getByRole("button", { name: `Rename ${sample}` }));
    const input = screen.getByLabelText(`Rename ${sample}`);
    await user.clear(input);
    await user.type(input, other);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(`A ${nouns.singular} named "${other}" already exists.`)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(`Rename ${sample}`)).toHaveValue(other);
  });

  test("requesting a delete shows a confirmation quoting usageCount, singular wording at count 1 (AC GREF-02.4)", async () => {
    const usageCount = vi.fn(async () => 1);
    const user = userEvent.setup();
    renderManager({
      initialItems: [{ id: "1", name: sample }],
      nouns,
      onCreate: async () => {},
      onRename: async () => {},
      onDelete: async () => {},
      usageCount,
    });

    await user.click(screen.getByRole("button", { name: `Delete ${sample}` }));

    expect(
      await screen.findByText(`Delete "${sample}"? 1 game use this ${nouns.singular}.`)
    ).toBeInTheDocument();
  });

  test("requesting a delete shows a confirmation quoting usageCount, plural wording at count 2 (AC GREF-02.4)", async () => {
    const usageCount = vi.fn(async () => 2);
    const user = userEvent.setup();
    renderManager({
      initialItems: [{ id: "1", name: sample }],
      nouns,
      onCreate: async () => {},
      onRename: async () => {},
      onDelete: async () => {},
      usageCount,
    });

    await user.click(screen.getByRole("button", { name: `Delete ${sample}` }));

    expect(
      await screen.findByText(`Delete "${sample}"? 2 games use this ${nouns.singular}.`)
    ).toBeInTheDocument();
  });

  test("cancelling a delete removes nothing (AC GREF-02.5)", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderManager({
      initialItems: [{ id: "1", name: sample }],
      nouns,
      onCreate: async () => {},
      onRename: async () => {},
      onDelete,
      usageCount: async () => 0,
    });

    await user.click(screen.getByRole("button", { name: `Delete ${sample}` }));
    await screen.findByText(`Delete "${sample}"? 0 games use this ${nouns.singular}.`);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText(sample)).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  test("confirming a delete calls onDelete and removes the row", async () => {
    const onDelete = vi.fn(async () => {});
    const user = userEvent.setup();
    renderManager({
      initialItems: [{ id: "1", name: sample }],
      nouns,
      onCreate: async () => {},
      onRename: async () => {},
      onDelete,
      usageCount: async () => 0,
    });

    await user.click(screen.getByRole("button", { name: `Delete ${sample}` }));
    await screen.findByText(`Delete "${sample}"? 0 games use this ${nouns.singular}.`);
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onDelete).toHaveBeenCalledWith("1");
    expect(await screen.findByText(`No ${nouns.plural} yet. Add your first one below.`)).toBeInTheDocument();
  });
});
