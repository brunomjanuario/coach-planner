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

test("clicking logout calls signOut and clears the stored user", async () => {
  localStorage.setItem("user", JSON.stringify({ email: "user@email.com" }));
  renderSidebar();

  const user = userEvent.setup();
  await user.click(screen.getByText("Logout"));

  expect(localStorage.getItem("user")).toBeNull();
});
