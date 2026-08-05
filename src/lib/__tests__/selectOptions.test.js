import { describe, it, expect } from "vitest";
import { toOptions } from "../selectOptions";

const items = [
  { id: "1", name: "Sporting" },
  { id: "2", name: "benfica" },
  { id: "3", name: "Águeda" },
];

describe("toOptions", () => {
  it("returns the list alphabetically, case-insensitively (AC GSEL-01.1)", () => {
    const options = toOptions(items, "");
    expect(options.map((o) => o.value)).toEqual(["Águeda", "benfica", "Sporting"]);
  });

  it("marks every listed option as inList: true", () => {
    const options = toOptions(items, "");
    expect(options.every((o) => o.inList === true)).toBe(true);
  });

  it("appends a currentValue absent from the list as an extra flagged option (AC GSEL-03)", () => {
    const options = toOptions(items, "Porto");
    const extra = options.find((o) => o.value === "Porto");
    expect(extra).toEqual({ value: "Porto", label: "Porto", inList: false });
  });

  it("does not duplicate a currentValue matching a list entry case-insensitively (edge case)", () => {
    const options = toOptions(items, "BENFICA");
    expect(options.filter((o) => o.value.toLowerCase() === "benfica")).toHaveLength(1);
    expect(options.find((o) => o.value.toLowerCase() === "benfica").inList).toBe(true);
  });

  it("does not duplicate a currentValue matching a list entry exactly", () => {
    const options = toOptions(items, "Sporting");
    expect(options.filter((o) => o.value === "Sporting")).toHaveLength(1);
  });

  it("an empty currentValue adds nothing", () => {
    const options = toOptions(items, "");
    expect(options).toHaveLength(items.length);
  });

  it("a null currentValue adds nothing", () => {
    const options = toOptions(items, null);
    expect(options).toHaveLength(items.length);
  });

  it("an undefined currentValue adds nothing", () => {
    const options = toOptions(items, undefined);
    expect(options).toHaveLength(items.length);
  });

  it("a whitespace-only currentValue adds nothing", () => {
    const options = toOptions(items, "   ");
    expect(options).toHaveLength(items.length);
  });

  it("an empty list with a legacy value returns exactly that one flagged option", () => {
    const options = toOptions([], "Legacy FC");
    expect(options).toEqual([{ value: "Legacy FC", label: "Legacy FC", inList: false }]);
  });

  it("an empty list with no currentValue returns an empty array", () => {
    expect(toOptions([], "")).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const original = [...items];
    toOptions(items, "Porto");
    expect(items).toEqual(original);
  });
});
