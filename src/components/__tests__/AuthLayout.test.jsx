import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthLayout, { AuthField } from "../AuthLayout";

// AuthLayout + AuthField are pure presentational pieces (no router / no auth
// context), so they render standalone. These tests assert the spec's shared
// scaffold + a11y contract, independent of how SignIn/SignUp wire them up.
// Covers REQ-07 (shared structure), REQ-08 (no app shell), REQ-10 (a11y),
// REQ-12 (password toggle).

describe("AuthLayout — shared scaffold (REQ-07, REQ-08, REQ-10)", () => {
  test("renders the title as the single page heading (REQ-10 AC4)", () => {
    render(<AuthLayout title="Sign In">{null}</AuthLayout>);

    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Sign In" })
    ).toBeInTheDocument();
  });

  test("renders the error inside a role=alert live region when error is truthy (REQ-10 AC2)", () => {
    render(<AuthLayout title="Sign In" error="Invalid email or password" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Invalid email or password");
  });

  test("renders no alert region and no error text when error is falsy (REQ-10 AC2)", () => {
    render(<AuthLayout title="Sign In" error="" />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("renders the children (form) and footer slots (REQ-07)", () => {
    render(
      <AuthLayout
        title="Sign In"
        footer={<span>footer-content</span>}
      >
        <div>form-content</div>
      </AuthLayout>
    );

    expect(screen.getByText("form-content")).toBeInTheDocument();
    expect(screen.getByText("footer-content")).toBeInTheDocument();
  });

  test("introduces no app shell — no <main> and no combined .h-screen.overflow-hidden (REQ-08)", () => {
    const { container } = render(<AuthLayout title="Sign In">{null}</AuthLayout>);

    expect(container.querySelector("main")).not.toBeInTheDocument();
    expect(
      container.querySelector(".h-screen.overflow-hidden")
    ).not.toBeInTheDocument();
  });

  test("uses Tailwind classes only — no inline style attribute on any node (REQ-01/REQ-04 basis)", () => {
    const { container } = render(
      <AuthLayout title="Sign In" error="boom" footer={<span>f</span>}>
        <div>child</div>
      </AuthLayout>
    );

    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });
});

describe("AuthField — labelled input + password toggle (REQ-10, REQ-12)", () => {
  test("associates its label with the input via htmlFor/id (REQ-10 AC1)", () => {
    render(
      <AuthField id="email" name="email" label="Email" value="" onChange={() => {}} />
    );

    // getByLabelText only resolves when the label is programmatically bound.
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "email");
  });

  test("a non-password field renders no show/hide toggle (REQ-12)", () => {
    render(
      <AuthField id="email" name="email" type="email" label="Email" value="" onChange={() => {}} />
    );

    expect(
      screen.queryByRole("button", { name: /show password|hide password/i })
    ).not.toBeInTheDocument();
  });

  test("a password field starts hidden (type=password) with a labelled toggle button (REQ-12 AC2)", () => {
    render(
      <AuthField id="password" name="password" type="password" label="Password" value="" onChange={() => {}} />
    );

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(
      screen.getByRole("button", { name: "Show password" })
    ).toBeInTheDocument();
  });

  test("activating the toggle flips the input type and the button's accessible name (REQ-12 AC1/AC2)", async () => {
    const user = userEvent.setup();
    render(
      <AuthField id="password" name="password" type="password" label="Password" value="" onChange={() => {}} />
    );

    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(
      screen.getByRole("button", { name: "Show password" })
    ).toBeInTheDocument();
  });
});
