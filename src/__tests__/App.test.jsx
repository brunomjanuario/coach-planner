import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import App from "../App";

function signIn() {
  localStorage.setItem(
    "user",
    JSON.stringify({ email: "user@email.com", password: "password" })
  );
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
  const { container } = renderApp();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const shell = container.querySelector(".h-screen.overflow-hidden");
  expect(shell).toBeInTheDocument();
});

test("the inner routes render inside a <main> carrying flex-1 min-w-0 overflow-y-auto (AC SHELL-01.3)", async () => {
  signIn();
  renderApp();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const main = document.querySelector("main");
  expect(main).toBeInTheDocument();
  expect(main.className).toMatch(/flex-1/);
  expect(main.className).toMatch(/min-w-0/);
  expect(main.className).toMatch(/overflow-y-auto/);
});

test("<main> is the only element in the tree carrying overflow-y-auto (AC SHELL-01.3)", async () => {
  signIn();
  renderApp();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const scrollContainers = document.querySelectorAll(".overflow-y-auto");
  expect(scrollContainers).toHaveLength(1);
  expect(scrollContainers[0].tagName).toBe("MAIN");
});

test("the sidebar and <main> are siblings — the sidebar is not inside the scroll container (AC SHELL-01.4)", async () => {
  signIn();
  renderApp();
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
  const { container } = renderApp();
  await screen.findByRole("button", { name: "Amadora Sub-11" });

  const shell = container.querySelector(".h-screen.overflow-hidden");
  expect(shell.className).not.toMatch(/\btransform\b/);
  expect(shell.className).not.toMatch(/\bfilter\b/);
  expect(shell.className).not.toMatch(/backdrop-/);
  expect(shell.className).not.toMatch(/perspective/);
  expect(shell.className).not.toMatch(/\bcontain-/);
});

test("/signin renders with no shell wrapper (edge case)", () => {
  const { container } = renderApp(["/signin"]);

  expect(container.querySelector(".h-screen.overflow-hidden")).not.toBeInTheDocument();
  expect(document.querySelector("main")).not.toBeInTheDocument();
});

test("/signup renders with no shell wrapper (edge case)", () => {
  const { container } = renderApp(["/signup"]);

  expect(container.querySelector(".h-screen.overflow-hidden")).not.toBeInTheDocument();
  expect(document.querySelector("main")).not.toBeInTheDocument();
});

test("an unauthenticated visit to a private route redirects to /signin with no shell wrapper", () => {
  const { container } = renderApp(["/trainings"]);

  expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  expect(container.querySelector(".h-screen.overflow-hidden")).not.toBeInTheDocument();
});
