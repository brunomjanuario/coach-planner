/* global process */
import { toInputValue, fromInputValue } from "../datetime";

const originalTZ = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "Pacific/Auckland";
});

afterAll(() => {
  process.env.TZ = originalTZ;
});

test("toInputValue returns a YYYY-MM-DDTHH:mm string in local time (AC TEDIT-03.2)", () => {
  const date = new Date(2027, 0, 5, 14, 30);

  expect(toInputValue(date)).toBe("2027-01-05T14:30");
});

test("toInputValue zero-pads single-digit month, day, hour and minute", () => {
  const date = new Date(2027, 0, 5, 9, 5);

  expect(toInputValue(date)).toBe("2027-01-05T09:05");
});

test("toInputValue on an invalid Date returns an empty string (AC TEDIT-03.4)", () => {
  expect(toInputValue(new Date("not-a-date"))).toBe("");
});

test("toInputValue on a non-Date value returns an empty string", () => {
  expect(toInputValue(undefined)).toBe("");
});

test("fromInputValue returns a Date at the same local instant", () => {
  const result = fromInputValue("2027-01-05T14:30");

  expect(result).toEqual(new Date(2027, 0, 5, 14, 30));
});

test("fromInputValue parses zero-padded single-digit fields", () => {
  const result = fromInputValue("2027-01-05T09:05");

  expect(result).toEqual(new Date(2027, 0, 5, 9, 5));
});

test("fromInputValue('') returns null, not Invalid Date", () => {
  expect(fromInputValue("")).toBeNull();
});

test("a round trip fromInputValue(toInputValue(d)) preserves the instant to the minute (AC TEDIT-03.3)", () => {
  const date = new Date(2027, 5, 15, 23, 59);

  const result = fromInputValue(toInputValue(date));

  expect(result.getTime()).toBe(date.getTime());
});

test("toInputValue is verified under a non-UTC timezone offset", () => {
  expect(process.env.TZ).toBe("Pacific/Auckland");
  const date = new Date(2027, 2, 10, 6, 0);

  expect(toInputValue(date)).toBe("2027-03-10T06:00");
});

test("fromInputValue is verified under a non-UTC timezone offset", () => {
  expect(process.env.TZ).toBe("Pacific/Auckland");
  const result = fromInputValue("2027-03-10T06:00");

  expect(result.getFullYear()).toBe(2027);
  expect(result.getMonth()).toBe(2);
  expect(result.getDate()).toBe(10);
  expect(result.getHours()).toBe(6);
  expect(result.getMinutes()).toBe(0);
});
