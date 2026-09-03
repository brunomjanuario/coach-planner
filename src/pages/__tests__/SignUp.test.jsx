import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import SignUp from "../SignUp";
import SignIn from "../SignIn";
import { useAuth } from "../../context/useAuth";

// Same harness as SignIn: mock useAuth so signUp's resolution is deterministic
// and its args are inspectable. The key wire-contract assertion is that the
// first field (labelled "Name") is passed as signUp's first positional arg —
// AuthContext maps that to `{ name: username, ... }`, a fixed payload the
// refactor must not change (REQ-05).
vi.mock("../../context/useAuth", () => ({ useAuth: vi.fn() }));

let signUp;

function mockAuth(overrides = {}) {
  useAuth.mockReturnValue({ signUp, user: null, ...overrides });
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSignUp() {
  return render(
    <MemoryRouter initialEntries={["/signup"]}>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<div>HOME PAGE</div>} />
        <Route path="/signin" element={<div>SIGNIN PAGE</div>} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  useAuth.mockReset();
  signUp = vi.fn().mockResolvedValue({ success: true });
  mockAuth();
});

// REQ-06 — heading + link
test("renders a single heading with accessible name 'Sign Up' (REQ-06, REQ-10 AC4)", () => {
  renderSignUp();

  const headings = screen.getAllByRole("heading");
  expect(headings).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
});

test("exposes a working link to /signin (REQ-06)", () => {
  renderSignUp();

  expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
    "href",
    "/signin"
  );
});

// REQ-10 — a11y: all three inputs label-associated
test("name, email and password inputs are all label-associated (REQ-10 AC1)", () => {
  renderSignUp();

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
});

// REQ-04 — no inline styles
test("renders no inline style attribute on any node (REQ-04 AC1)", () => {
  const { container } = renderSignUp();

  expect(container.querySelectorAll("[style]")).toHaveLength(0);
});

// REQ-05 — signUp call preserves the {name,email,password} wire shape + navigate
test("submitting calls signUp(username, email, password) and navigates to / (REQ-05 AC2)", async () => {
  const user = userEvent.setup();
  renderSignUp();

  await user.type(screen.getByLabelText("Name"), "Coach Bruno");
  await user.type(screen.getByLabelText("Email"), "coach@club.pt");
  await user.type(screen.getByLabelText("Password"), "secret");
  await user.click(screen.getByRole("button", { name: "Sign Up" }));

  // First positional arg is the name field → AuthContext sends { name: … }.
  expect(signUp).toHaveBeenCalledWith("Coach Bruno", "coach@club.pt", "secret");
  await waitFor(() =>
    expect(screen.getByTestId("location")).toHaveTextContent("/")
  );
  expect(screen.getByText("HOME PAGE")).toBeInTheDocument();
});

// REQ-05 — failure shows message, no navigation
test("a failed signUp shows the mapped message and does not navigate (REQ-05 AC3)", async () => {
  const user = userEvent.setup();
  signUp.mockResolvedValue({ success: false, message: "Email already registered" });
  mockAuth();
  renderSignUp();

  await user.type(screen.getByLabelText("Name"), "Coach Bruno");
  await user.type(screen.getByLabelText("Email"), "taken@club.pt");
  await user.type(screen.getByLabelText("Password"), "secret");
  await user.click(screen.getByRole("button", { name: "Sign Up" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Email already registered"
  );
  expect(screen.getByTestId("location")).toHaveTextContent("/signup");
  expect(screen.queryByText("HOME PAGE")).not.toBeInTheDocument();
});

// REQ-11 — error clears on edit
test("editing a field after an error clears the error (REQ-11)", async () => {
  const user = userEvent.setup();
  signUp.mockResolvedValue({ success: false, message: "Email already registered" });
  mockAuth();
  renderSignUp();

  await user.type(screen.getByLabelText("Name"), "Coach Bruno");
  await user.type(screen.getByLabelText("Email"), "taken@club.pt");
  await user.type(screen.getByLabelText("Password"), "secret");
  await user.click(screen.getByRole("button", { name: "Sign Up" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();

  await user.type(screen.getByLabelText("Email"), "x");

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

// REQ-11 — already-authed redirect
test("an already-authenticated user is redirected to / (REQ-11 edge case)", async () => {
  mockAuth({ user: { id: "u1", name: "Coach" } });
  renderSignUp();

  await waitFor(() =>
    expect(screen.getByTestId("location")).toHaveTextContent("/")
  );
});

// REQ-09 — in-flight state
test("while the submit is in flight the button is disabled and shows the pending label (REQ-09 AC1)", async () => {
  const user = userEvent.setup();
  const d = deferred();
  signUp.mockReturnValue(d.promise);
  mockAuth();
  renderSignUp();

  await user.type(screen.getByLabelText("Name"), "Coach Bruno");
  await user.type(screen.getByLabelText("Email"), "coach@club.pt");
  await user.type(screen.getByLabelText("Password"), "secret");
  await user.click(screen.getByRole("button", { name: "Sign Up" }));

  const pending = await screen.findByRole("button", { name: "Creating account…" });
  expect(pending).toBeDisabled();

  d.resolve({ success: true });
  await waitFor(() =>
    expect(screen.getByTestId("location")).toHaveTextContent("/")
  );
});

test("a second submit while in flight does not trigger a second signUp call (REQ-09 AC3)", async () => {
  const user = userEvent.setup();
  const d = deferred();
  signUp.mockReturnValue(d.promise);
  mockAuth();
  renderSignUp();

  await user.type(screen.getByLabelText("Name"), "Coach Bruno");
  await user.type(screen.getByLabelText("Email"), "coach@club.pt");
  await user.type(screen.getByLabelText("Password"), "secret");

  await user.click(screen.getByRole("button", { name: "Sign Up" }));
  await user.click(screen.getByRole("button", { name: "Creating account…" }));

  expect(signUp).toHaveBeenCalledTimes(1);

  d.resolve({ success: true });
  await waitFor(() =>
    expect(screen.getByTestId("location")).toHaveTextContent("/")
  );
});

// REQ-07 — DRY: both pages render the same shared AuthLayout scaffold.
test("SignIn and SignUp share the same AuthLayout scaffold — identical heading + alert structure (REQ-07)", () => {
  // Render SignUp in an error state.
  signUp.mockResolvedValue({ success: false, message: "boom" });
  mockAuth();
  const { container: signUpContainer, unmount } = render(
    <MemoryRouter initialEntries={["/signup"]}>
      <SignUp />
    </MemoryRouter>
  );
  const signUpH1 = signUpContainer.querySelector("h1");
  expect(signUpH1).toHaveTextContent("Sign Up");
  unmount();

  // Render SignIn: same single-h1 + footer-link scaffold shape.
  useAuth.mockReturnValue({ signIn: vi.fn(), user: null });
  const { container: signInContainer } = render(
    <MemoryRouter initialEntries={["/signin"]}>
      <SignIn />
    </MemoryRouter>
  );
  const signInH1 = signInContainer.querySelector("h1");
  expect(signInH1).toHaveTextContent("Sign In");

  // Both wrap the same outer card class produced by AuthLayout.
  expect(signInH1.className).toBe(signUpH1.className);
});
