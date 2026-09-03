import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import SignIn from "../SignIn";
import { useAuth } from "../../context/useAuth";

// The page pulls its behaviour from useAuth(); mocking that module lets these
// tests drive signIn's resolution deterministically and read back the exact
// args the page passed — without a live backend or the real AuthProvider.
// Navigation is observed through a sibling LocationDisplay: navigate("/") on
// success lands on the "/" route.
vi.mock("../../context/useAuth", () => ({ useAuth: vi.fn() }));

let signIn;

function mockAuth(overrides = {}) {
  useAuth.mockReturnValue({ signIn, user: null, ...overrides });
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSignIn() {
  return render(
    <MemoryRouter initialEntries={["/signin"]}>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<div>HOME PAGE</div>} />
        <Route path="/signup" element={<div>SIGNUP PAGE</div>} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
}

/** A promise plus its resolver, for driving an in-flight submit. */
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  useAuth.mockReset();
  signIn = vi.fn().mockResolvedValue({ success: true });
  mockAuth();
});

// REQ-03 — heading + link
test("renders a single heading with accessible name 'Sign In' (REQ-03, REQ-10 AC4)", () => {
  renderSignIn();

  const headings = screen.getAllByRole("heading");
  expect(headings).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
});

test("exposes a working link to /signup (REQ-03)", () => {
  renderSignIn();

  expect(screen.getByRole("link", { name: "Sign Up" })).toHaveAttribute(
    "href",
    "/signup"
  );
});

// REQ-10 — a11y
test("email and password inputs are label-associated (REQ-10 AC1)", () => {
  renderSignIn();

  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
});

// REQ-01 — no inline styles
test("renders no inline style attribute on any node (REQ-01 AC1)", () => {
  const { container } = renderSignIn();

  expect(container.querySelectorAll("[style]")).toHaveLength(0);
});

// REQ-02 — signIn call + navigate on success
test("submitting valid creds calls signIn(email, password) and navigates to / (REQ-02 AC2)", async () => {
  const user = userEvent.setup();
  renderSignIn();

  await user.type(screen.getByLabelText("Email"), "coach@club.pt");
  await user.type(screen.getByLabelText("Password"), "secret");
  await user.click(screen.getByRole("button", { name: "Sign In" }));

  expect(signIn).toHaveBeenCalledWith("coach@club.pt", "secret");
  await waitFor(() =>
    expect(screen.getByTestId("location")).toHaveTextContent("/")
  );
  expect(screen.getByText("HOME PAGE")).toBeInTheDocument();
});

// REQ-02 — failure shows message, no navigation
test("a failed signIn shows the mapped message and does not navigate (REQ-02 AC3)", async () => {
  const user = userEvent.setup();
  signIn.mockResolvedValue({ success: false, message: "Invalid email or password" });
  mockAuth();
  renderSignIn();

  await user.type(screen.getByLabelText("Email"), "coach@club.pt");
  await user.type(screen.getByLabelText("Password"), "wrong");
  await user.click(screen.getByRole("button", { name: "Sign In" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid email or password"
  );
  expect(screen.getByTestId("location")).toHaveTextContent("/signin");
  expect(screen.queryByText("HOME PAGE")).not.toBeInTheDocument();
});

// REQ-11 — error clears on edit
test("editing a field after an error clears the error (REQ-11)", async () => {
  const user = userEvent.setup();
  signIn.mockResolvedValue({ success: false, message: "Invalid email or password" });
  mockAuth();
  renderSignIn();

  await user.type(screen.getByLabelText("Email"), "coach@club.pt");
  await user.type(screen.getByLabelText("Password"), "wrong");
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();

  await user.type(screen.getByLabelText("Password"), "x");

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

// REQ-11 — already-authed redirect
test("an already-authenticated user is redirected to / (REQ-11 edge case)", async () => {
  mockAuth({ user: { id: "u1", name: "Coach" } });
  renderSignIn();

  await waitFor(() =>
    expect(screen.getByTestId("location")).toHaveTextContent("/")
  );
});

// REQ-09 — in-flight state
test("while the submit is in flight the button is disabled and shows the pending label (REQ-09 AC1)", async () => {
  const user = userEvent.setup();
  const d = deferred();
  signIn.mockReturnValue(d.promise);
  mockAuth();
  renderSignIn();

  await user.type(screen.getByLabelText("Email"), "coach@club.pt");
  await user.type(screen.getByLabelText("Password"), "secret");
  await user.click(screen.getByRole("button", { name: "Sign In" }));

  const pending = await screen.findByRole("button", { name: "Signing in…" });
  expect(pending).toBeDisabled();

  d.resolve({ success: true });
  await waitFor(() =>
    expect(screen.getByTestId("location")).toHaveTextContent("/")
  );
});

test("a second submit while in flight does not trigger a second signIn call (REQ-09 AC3)", async () => {
  const user = userEvent.setup();
  const d = deferred();
  signIn.mockReturnValue(d.promise);
  mockAuth();
  renderSignIn();

  await user.type(screen.getByLabelText("Email"), "coach@club.pt");
  await user.type(screen.getByLabelText("Password"), "secret");

  const button = screen.getByRole("button", { name: "Sign In" });
  await user.click(button);
  // Button is now disabled + pending; a click must not re-enter the handler.
  await user.click(screen.getByRole("button", { name: "Signing in…" }));

  expect(signIn).toHaveBeenCalledTimes(1);

  d.resolve({ success: true });
  await waitFor(() =>
    expect(screen.getByTestId("location")).toHaveTextContent("/")
  );
});

test("after a failed submit settles, the button re-enables with its default label (REQ-09 AC2)", async () => {
  const user = userEvent.setup();
  signIn.mockResolvedValue({ success: false, message: "Invalid email or password" });
  mockAuth();
  renderSignIn();

  await user.type(screen.getByLabelText("Email"), "coach@club.pt");
  await user.type(screen.getByLabelText("Password"), "wrong");
  await user.click(screen.getByRole("button", { name: "Sign In" }));

  const button = await screen.findByRole("button", { name: "Sign In" });
  expect(button).toBeEnabled();
});
