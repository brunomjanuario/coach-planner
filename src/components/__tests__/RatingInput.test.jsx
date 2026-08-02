import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RatingInput from "../RatingInput";

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders an input labelled for screen readers with min/max/step for a 0-10 scale", () => {
  render(<RatingInput value={null} onChange={() => {}} label="Rate João" />);

  const input = screen.getByLabelText("Rate João");
  expect(input).toHaveAttribute("type", "number");
  expect(input).toHaveAttribute("min", "0");
  expect(input).toHaveAttribute("max", "10");
  expect(input).toHaveAttribute("step", "1");
});

test("an unset (null) value renders empty, distinguishable from 0 (edge case: null-vs-zero)", () => {
  render(<RatingInput value={null} onChange={() => {}} label="Rate João" />);

  expect(screen.getByLabelText("Rate João")).toHaveValue(null);
});

test("a value of exactly 0 renders as 0, not empty (edge case: null-vs-zero)", () => {
  render(<RatingInput value={0} onChange={() => {}} label="Rate João" />);

  expect(screen.getByLabelText("Rate João")).toHaveValue(0);
});

test("typing a valid whole number 0-10 emits it via onChange", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<RatingInput value={null} onChange={onChange} label="Rate João" />);

  await user.type(screen.getByLabelText("Rate João"), "7");

  expect(onChange).toHaveBeenCalledWith(7);
});

test("typing a value above 10 shows an error message and does not call onChange (AC RATE-01.5)", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<RatingInput value={null} onChange={onChange} label="Rate João" />);

  await user.type(screen.getByLabelText("Rate João"), "11");

  expect(
    await screen.findByText("Enter a whole number between 0 and 10.")
  ).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalledWith(11);
});

test("typing a negative value shows an error message and does not call onChange (AC RATE-01.5)", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<RatingInput value={null} onChange={onChange} label="Rate João" />);

  await user.type(screen.getByLabelText("Rate João"), "-1");

  expect(
    await screen.findByText("Enter a whole number between 0 and 10.")
  ).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalledWith(-1);
});

test("clearing a previously set value emits null, not 0 (AC RATE-01.3)", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<RatingInput value={6} onChange={onChange} label="Rate João" />);

  await user.clear(screen.getByLabelText("Rate João"));

  expect(onChange).toHaveBeenCalledWith(null);
});

test("is reachable and operable by keyboard alone, without a pointer", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<RatingInput value={null} onChange={onChange} label="Rate João" />);

  await user.tab();
  expect(screen.getByLabelText("Rate João")).toHaveFocus();
  await user.keyboard("8");

  expect(onChange).toHaveBeenCalledWith(8);
});

test("clears its error message once a valid value replaces an invalid one", async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<RatingInput value={null} onChange={onChange} label="Rate João" />);
  const input = screen.getByLabelText("Rate João");

  await user.type(input, "11");
  expect(
    await screen.findByText("Enter a whole number between 0 and 10.")
  ).toBeInTheDocument();

  await user.clear(input);
  await user.type(input, "9");

  expect(
    screen.queryByText("Enter a whole number between 0 and 10.")
  ).not.toBeInTheDocument();
  expect(onChange).toHaveBeenCalledWith(9);
});
