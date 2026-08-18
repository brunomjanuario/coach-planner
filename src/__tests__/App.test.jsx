import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import App from "../App";
import { apiFetch, silentRefresh } from "../lib/apiClient";
import { setTokens, clearTokens } from "../lib/tokenStore";

// AuthContext now boots by calling the real API through apiClient.js (a
// silent refresh, then GET /users/me) instead of reading a localStorage
// mock. These tests mock that module so `signIn()` below can simulate an
// already-authenticated session without a live backend.
vi.mock("../lib/apiClient", () => ({
  apiFetch: vi.fn(),
  silentRefresh: vi.fn(),
}));

beforeEach(() => {
  apiFetch.mockReset();
  silentRefresh.mockReset();
  clearTokens();
});

function signIn() {
  setTokens("access-token", "refresh-token");
  silentRefresh.mockResolvedValue("access-token");
  apiFetch.mockResolvedValue({
    id: "u1",
    name: "Coach Bruno",
    email: "user@email.com",
  });
}

function renderApp(initialEntries = ["/trainings"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

test("the authenticated shell is bounded to the viewport and clips its own overflow (AC SHELL-01.1)", async () => {
  signIn();
  const { container } = await renderApp();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const shell = container.querySelector(".h-screen.overflow-hidden");
  expect(shell).toBeInTheDocument();
});

test("the inner routes render inside a <main> carrying flex-1 min-w-0 overflow-y-auto (AC SHELL-01.3)", async () => {
  signIn();
  await renderApp();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const main = document.querySelector("main");
  expect(main).toBeInTheDocument();
  expect(main.className).toMatch(/flex-1/);
  expect(main.className).toMatch(/min-w-0/);
  expect(main.className).toMatch(/overflow-y-auto/);
});

test("<main> is the only element in the tree carrying overflow-y-auto (AC SHELL-01.3)", async () => {
  signIn();
  await renderApp();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const scrollContainers = document.querySelectorAll(".overflow-y-auto");
  expect(scrollContainers).toHaveLength(1);
  expect(scrollContainers[0].tagName).toBe("MAIN");
});

test("the sidebar and <main> are siblings — the sidebar is not inside the scroll container (AC SHELL-01.4)", async () => {
  signIn();
  await renderApp();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const main = document.querySelector("main");
  const sidebarLink = screen.getByRole("link", { name: "Home" });
  const sidebarRoot = sidebarLink.closest(".bg-lightblack");

  expect(sidebarRoot).toBeInTheDocument();
  expect(main.contains(sidebarRoot)).toBe(false);
  expect(sidebarRoot.parentElement).toBe(main.parentElement);
});

test("the shell carries no transform, filter, backdrop, perspective or contain class (AC SHELL-04.1)", async () => {
  signIn();
  const { container } = await renderApp();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const shell = container.querySelector(".h-screen.overflow-hidden");
  expect(shell.className).not.toMatch(/\btransform\b/);
  expect(shell.className).not.toMatch(/\bfilter\b/);
  expect(shell.className).not.toMatch(/backdrop-/);
  expect(shell.className).not.toMatch(/perspective/);
  expect(shell.className).not.toMatch(/\bcontain-/);
});

test("/signin renders with no shell wrapper (edge case)", async () => {
  const { container } = await renderApp(["/signin"]);

  expect(container.querySelector(".h-screen.overflow-hidden")).not.toBeInTheDocument();
  expect(document.querySelector("main")).not.toBeInTheDocument();
});

test("/signup renders with no shell wrapper (edge case)", async () => {
  const { container } = await renderApp(["/signup"]);

  expect(container.querySelector(".h-screen.overflow-hidden")).not.toBeInTheDocument();
  expect(document.querySelector("main")).not.toBeInTheDocument();
});

test("an unauthenticated visit to a private route redirects to /signin with no shell wrapper", async () => {
  const { container } = await renderApp(["/trainings"]);

  expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  expect(container.querySelector(".h-screen.overflow-hidden")).not.toBeInTheDocument();
});

test("an authenticated visit to an unmatched path renders NotFound, not a blank <main> (AC HOUSE-01.1)", async () => {
  signIn();
  await renderApp(["/does-not-exist"]);
  await screen.findByRole("heading", { name: "Page not found" });

  const main = document.querySelector("main");
  expect(main.textContent.trim()).not.toBe("");
});

test("NotFound includes a link back to Home (AC HOUSE-01.2)", async () => {
  signIn();
  await renderApp(["/does-not-exist"]);
  await screen.findByRole("heading", { name: "Page not found" });

  expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
    "href",
    "/"
  );
});

test("a defined route still renders its own page when NotFound is present in the route table (AC HOUSE-01.3)", async () => {
  signIn();
  await renderApp(["/teams"]);

  expect(
    await screen.findByRole("heading", { name: "Teams" })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Page not found" })
  ).not.toBeInTheDocument();
});

test("an unauthenticated visit to an unmatched path still redirects to /signin before the catch-all is reached (edge case)", async () => {
  await renderApp(["/does-not-exist"]);

  expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Page not found" })
  ).not.toBeInTheDocument();
});
