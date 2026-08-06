import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../context/AuthContext";
import Sidebar from "../Sidebar";

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <Sidebar />
      </AuthProvider>
    </MemoryRouter>
  );
}

test("renders all six navigation links with correct hrefs", () => {
  renderSidebar();

  const expectedLinks = {
    Home: "/",
    Teams: "/teams",
    Trainings: "/trainings",
    Games: "/games",
    Calendar: "/calendar",
    Settings: "/settings",
  };

  for (const [name, href] of Object.entries(expectedLinks)) {
    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  }
});

test("does not leak DOM state from the previous test", () => {
  expect(document.body).toBeEmptyDOMElement();

  renderSidebar();

  expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
});

test("clicking logout calls signOut, which leaves the stored credentials in localStorage so a later sign-in still works (feature 24)", async () => {
  localStorage.setItem("user", JSON.stringify({ email: "user@email.com" }));
  renderSidebar();

  const user = userEvent.setup();
  await user.click(screen.getByText("Logout"));

  expect(JSON.parse(localStorage.getItem("user"))).toEqual({
    email: "user@email.com",
  });
});

test("sizes itself from its parent (h-full) instead of declaring its own viewport height (AC SHELL-01.2)", () => {
  renderSidebar();

  const root = screen.getByRole("link", { name: "Home" }).closest(".bg-lightblack");
  expect(root.className).toMatch(/\bh-full\b/);
  expect(root.className).not.toMatch(/\bh-screen\b/);
});

test("does not shrink when placed beside a wide main region (edge case)", () => {
  renderSidebar();

  const root = screen.getByRole("link", { name: "Home" }).closest(".bg-lightblack");
  expect(root.className).toMatch(/flex-shrink-0/);
});
