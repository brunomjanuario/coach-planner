import { renderHook, act } from "@testing-library/react";
import { AuthProvider } from "../AuthContext";
import { useAuth } from "../useAuth";

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe("signUp validation (feature 36, AC AUTH-01)", () => {
  test("rejects an email that fails the email pattern, writing nothing (AC AUTH-01.1)", () => {
    const { result } = renderAuth();

    let signUpResult;
    act(() => {
      signUpResult = result.current.signUp("Coach", "not-an-email", "hunter2");
    });

    expect(signUpResult).toEqual({
      success: false,
      message: "Enter a valid email address",
    });
    expect(localStorage.getItem("user")).toBeNull();
  });

  test("rejects an empty username, writing nothing (AC AUTH-01.2)", () => {
    const { result } = renderAuth();

    let signUpResult;
    act(() => {
      signUpResult = result.current.signUp("", "coach@club.pt", "hunter2");
    });

    expect(signUpResult).toEqual({
      success: false,
      message: "Username cannot be empty",
    });
    expect(localStorage.getItem("user")).toBeNull();
  });

  test("treats a whitespace-only username as empty (edge case)", () => {
    const { result } = renderAuth();

    let signUpResult;
    act(() => {
      signUpResult = result.current.signUp("   ", "coach@club.pt", "hunter2");
    });

    expect(signUpResult).toEqual({
      success: false,
      message: "Username cannot be empty",
    });
  });

  test("rejects an empty password, writing nothing (AC AUTH-01.3)", () => {
    const { result } = renderAuth();

    let signUpResult;
    act(() => {
      signUpResult = result.current.signUp("Coach", "coach@club.pt", "");
    });

    expect(signUpResult).toEqual({
      success: false,
      message: "Password cannot be empty",
    });
    expect(localStorage.getItem("user")).toBeNull();
  });

  test("the existing duplicate-email check still fires first, unaffected (AC AUTH-01.4)", () => {
    const { result } = renderAuth();

    let signUpResult;
    act(() => {
      signUpResult = result.current.signUp("", "user@email.com", "");
    });

    expect(signUpResult).toEqual({
      success: false,
      message: "Email already taken",
    });
  });

  test("valid username, email and password still succeed (AC AUTH-01.5)", () => {
    const { result } = renderAuth();

    let signUpResult;
    act(() => {
      signUpResult = result.current.signUp("Coach", "coach@club.pt", "hunter2");
    });

    expect(signUpResult).toEqual({ success: true });
    expect(result.current.user).toMatchObject({
      username: "Coach",
      email: "coach@club.pt",
    });
  });
});

describe("session persistence (feature 36, AC AUTH-02, AD-018)", () => {
  test("signUp itself sets the session flag, surviving a remount with no signIn/signOut in between", () => {
    const { result, unmount } = renderAuth();
    act(() => {
      result.current.signUp("Coach", "coach@club.pt", "hunter2");
    });
    unmount();

    const remounted = renderAuth();
    expect(remounted.result.current.user).toMatchObject({
      username: "Coach",
      email: "coach@club.pt",
    });
  });

  test("signing out then remounting the provider (simulating a refresh) leaves user null (AC AUTH-02.2)", () => {
    const { result, unmount } = renderAuth();
    act(() => {
      result.current.signUp("Coach", "coach@club.pt", "hunter2");
    });
    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.signOut();
    });
    unmount();

    const remounted = renderAuth();
    expect(remounted.result.current.user).toBeNull();
  });

  test("signing in then remounting the provider (simulating a refresh) restores the user", () => {
    const { result, unmount } = renderAuth();
    act(() => {
      result.current.signUp("Coach", "coach@club.pt", "hunter2");
      result.current.signOut();
    });
    act(() => {
      result.current.signIn("coach@club.pt", "hunter2");
    });
    unmount();

    const remounted = renderAuth();
    expect(remounted.result.current.user).toMatchObject({ email: "coach@club.pt" });
  });

  test("a session flag with no stored account is treated as signed out, not a fabricated user (edge case)", () => {
    localStorage.setItem("session", "active");
    const { result } = renderAuth();

    expect(result.current.user).toBeNull();
  });

  test("signing in with the hard-coded demo pair also sets the session, surviving a remount (edge case)", () => {
    const { result, unmount } = renderAuth();
    act(() => {
      result.current.signIn("user@email.com", "password");
    });
    unmount();

    const remounted = renderAuth();
    expect(remounted.result.current.user).toMatchObject({ email: "user@email.com" });
  });

  test("a browser that has never signed in behaves exactly as before: signed out, demo credentials work (AC AUTH-02.4)", () => {
    const { result } = renderAuth();

    expect(result.current.user).toBeNull();
    let signInResult;
    act(() => {
      signInResult = result.current.signIn("user@email.com", "password");
    });
    expect(signInResult).toEqual({ success: true });
  });
});

test("signUp stores the chosen password and a later signIn with that pair succeeds", () => {
  const { result } = renderAuth();

  act(() => {
    result.current.signUp("Coach", "coach@club.pt", "hunter2");
    result.current.signOut();
  });

  let signInResult;
  act(() => {
    signInResult = result.current.signIn("coach@club.pt", "hunter2");
  });

  expect(signInResult).toEqual({ success: true });
});

test("with a stored user, signIn checks the submitted pair against it", () => {
  const { result } = renderAuth();
  act(() => {
    result.current.signUp("Coach", "coach@club.pt", "hunter2");
    result.current.signOut();
  });

  let wrongPassword;
  act(() => {
    wrongPassword = result.current.signIn("coach@club.pt", "wrong");
  });
  expect(wrongPassword).toEqual({
    success: false,
    message: "Invalid email or password",
  });

  let rightPassword;
  act(() => {
    rightPassword = result.current.signIn("coach@club.pt", "hunter2");
  });
  expect(rightPassword).toEqual({ success: true });
});

test("with no stored user, the demo pair still works", () => {
  const { result } = renderAuth();

  let signInResult;
  act(() => {
    signInResult = result.current.signIn("user@email.com", "password");
  });

  expect(signInResult).toEqual({ success: true });
});

test("a stored user with no password field accepts the demo password", () => {
  localStorage.setItem("user", JSON.stringify({ email: "legacy@club.pt" }));
  const { result } = renderAuth();

  let signInResult;
  act(() => {
    signInResult = result.current.signIn("legacy@club.pt", "password");
  });

  expect(signInResult).toEqual({ success: true });
});

test("a failed sign-in returns the existing message and does not distinguish which field was wrong", () => {
  const { result } = renderAuth();

  let wrongEmail;
  let wrongPassword;
  act(() => {
    wrongEmail = result.current.signIn("nobody@club.pt", "password");
    wrongPassword = result.current.signIn("user@email.com", "wrong");
  });

  expect(wrongEmail).toEqual({
    success: false,
    message: "Invalid email or password",
  });
  expect(wrongPassword).toEqual({
    success: false,
    message: "Invalid email or password",
  });
});

test("sign-out clears the session state and leaves the stored credentials in localStorage", () => {
  const { result } = renderAuth();
  act(() => {
    result.current.signUp("Coach", "coach@club.pt", "hunter2");
  });

  act(() => {
    result.current.signOut();
  });

  expect(result.current.user).toBeNull();
  const stored = JSON.parse(localStorage.getItem("user"));
  expect(stored).toMatchObject({ email: "coach@club.pt", password: "hunter2" });
});

test("sign-out clears the session but the stored credentials survive for a later sign-in", () => {
  const { result } = renderAuth();
  act(() => {
    result.current.signUp("Coach", "coach@club.pt", "hunter2");
  });
  expect(result.current.user).not.toBeNull();

  act(() => {
    result.current.signOut();
  });
  expect(result.current.user).toBeNull();

  let signInResult;
  act(() => {
    signInResult = result.current.signIn("coach@club.pt", "hunter2");
  });
  expect(signInResult).toEqual({ success: true });
});

test("with a stored user, a wrong email is rejected even with the right password", () => {
  const { result } = renderAuth();
  act(() => {
    result.current.signUp("Coach", "coach@club.pt", "hunter2");
    result.current.signOut();
  });

  let signInResult;
  act(() => {
    signInResult = result.current.signIn("someone-else@club.pt", "hunter2");
  });

  expect(signInResult).toEqual({
    success: false,
    message: "Invalid email or password",
  });
});

test("once a user is stored, the demo pair no longer works", () => {
  const { result } = renderAuth();
  act(() => {
    result.current.signUp("Coach", "coach@club.pt", "hunter2");
    result.current.signOut();
  });

  let signInResult;
  act(() => {
    signInResult = result.current.signIn("user@email.com", "password");
  });

  expect(signInResult).toEqual({
    success: false,
    message: "Invalid email or password",
  });
});

test("a failed sign-in does not change the session", () => {
  const { result } = renderAuth();

  act(() => {
    result.current.signIn("nobody@club.pt", "wrong");
  });

  expect(result.current.user).toBeNull();
});

describe("email/password comparison rules at sign-in", () => {
  beforeEach(() => {
    localStorage.setItem(
      "user",
      JSON.stringify({ email: "Coach@Club.pt", password: "hunter2" })
    );
  });

  test("matching email and password succeeds", () => {
    const { result } = renderAuth();
    let signInResult;
    act(() => {
      signInResult = result.current.signIn("Coach@Club.pt", "hunter2");
    });
    expect(signInResult).toEqual({ success: true });
  });

  test("email differing only by case still matches", () => {
    const { result } = renderAuth();
    let signInResult;
    act(() => {
      signInResult = result.current.signIn("coach@club.pt", "hunter2");
    });
    expect(signInResult).toEqual({ success: true });
  });

  test("email with surrounding whitespace still matches", () => {
    const { result } = renderAuth();
    let signInResult;
    act(() => {
      signInResult = result.current.signIn("  Coach@Club.pt  ", "hunter2");
    });
    expect(signInResult).toEqual({ success: true });
  });

  test("password differing only by case does not match", () => {
    const { result } = renderAuth();
    let signInResult;
    act(() => {
      signInResult = result.current.signIn("Coach@Club.pt", "HUNTER2");
    });
    expect(signInResult).toEqual({
      success: false,
      message: "Invalid email or password",
    });
  });

  test("password with surrounding whitespace does not match", () => {
    const { result } = renderAuth();
    let signInResult;
    act(() => {
      signInResult = result.current.signIn("Coach@Club.pt", " hunter2 ");
    });
    expect(signInResult).toEqual({
      success: false,
      message: "Invalid email or password",
    });
  });
});

test("a corrupt stored user value is treated as signed out instead of throwing", () => {
  localStorage.setItem("user", "{not valid json");

  expect(() => renderAuth()).not.toThrow();
  const { result } = renderAuth();
  expect(result.current.user).toBeNull();

  let signInResult;
  act(() => {
    signInResult = result.current.signIn("user@email.com", "password");
  });
  expect(signInResult).toEqual({ success: true });
});

test("loading is false once the mount read has completed", () => {
  const { result } = renderAuth();

  expect(result.current.loading).toBe(false);
});

test("a legacy stored user with username and no name is read as having that name", () => {
  localStorage.setItem(
    "user",
    JSON.stringify({ username: "Legacy Coach", email: "legacy@club.pt" })
  );
  localStorage.setItem("session", "active");
  const { result } = renderAuth();

  expect(result.current.user.name).toBe("Legacy Coach");
});

describe("updateProfile", () => {
  function signedInResult() {
    const { result } = renderAuth();
    act(() => {
      result.current.signUp("Coach", "coach@club.pt", "hunter2");
    });
    return result;
  }

  test("persists the new name and email and updates the context user", () => {
    const result = signedInResult();

    let updateResult;
    act(() => {
      updateResult = result.current.updateProfile({
        name: "New Name",
        email: "new@club.pt",
      });
    });

    expect(updateResult).toEqual({ success: true, message: "Profile updated" });
    expect(result.current.user).toMatchObject({
      name: "New Name",
      email: "new@club.pt",
    });
    const stored = JSON.parse(localStorage.getItem("user"));
    expect(stored).toMatchObject({ name: "New Name", email: "new@club.pt" });
  });

  test("rejects an invalid email and writes nothing", () => {
    const result = signedInResult();

    let updateResult;
    act(() => {
      updateResult = result.current.updateProfile({
        name: "New Name",
        email: "not-an-email",
      });
    });

    expect(updateResult).toEqual({
      success: false,
      message: "Enter a valid email address",
    });
    const stored = JSON.parse(localStorage.getItem("user"));
    expect(stored.email).toBe("coach@club.pt");
    expect(stored.name).toBeUndefined();
  });

  test("rejects an empty or whitespace-only name and writes nothing", () => {
    const result = signedInResult();

    let updateResult;
    act(() => {
      updateResult = result.current.updateProfile({
        name: "   ",
        email: "new@club.pt",
      });
    });

    expect(updateResult).toEqual({
      success: false,
      message: "Name cannot be empty",
    });
    const stored = JSON.parse(localStorage.getItem("user"));
    expect(stored.email).toBe("coach@club.pt");
  });

  test("trims the email before storing it", () => {
    const result = signedInResult();

    act(() => {
      result.current.updateProfile({
        name: "New Name",
        email: "  new@club.pt  ",
      });
    });

    expect(result.current.user.email).toBe("new@club.pt");
  });

  test("returns a failure result rather than success when storage throws", () => {
    const result = signedInResult();
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });

    let updateResult;
    act(() => {
      updateResult = result.current.updateProfile({
        name: "New Name",
        email: "new@club.pt",
      });
    });

    expect(updateResult).toEqual({
      success: false,
      message: "Could not save your profile. Try again.",
    });
    setItemSpy.mockRestore();
  });
});

describe("changePassword", () => {
  function signedInResult() {
    const { result } = renderAuth();
    act(() => {
      result.current.signUp("Coach", "coach@club.pt", "hunter2");
    });
    return result;
  }

  test("rejects a wrong current password without altering the stored one", () => {
    const result = signedInResult();

    let changeResult;
    act(() => {
      changeResult = result.current.changePassword({
        current: "wrong",
        next: "newpass",
        confirm: "newpass",
      });
    });

    expect(changeResult).toEqual({
      success: false,
      message: "Current password is incorrect",
    });
    const stored = JSON.parse(localStorage.getItem("user"));
    expect(stored.password).toBe("hunter2");
  });

  test("rejects a mismatched confirmation", () => {
    const result = signedInResult();

    let changeResult;
    act(() => {
      changeResult = result.current.changePassword({
        current: "hunter2",
        next: "newpass",
        confirm: "different",
      });
    });

    expect(changeResult).toEqual({
      success: false,
      message: "New passwords do not match",
    });
  });

  test("rejects an empty new password", () => {
    const result = signedInResult();

    let changeResult;
    act(() => {
      changeResult = result.current.changePassword({
        current: "hunter2",
        next: "",
        confirm: "",
      });
    });

    expect(changeResult).toEqual({
      success: false,
      message: "New password cannot be empty",
    });
  });

  test("a successful change keeps the user signed in and requires the new password on the next sign-in while rejecting the old one", () => {
    const result = signedInResult();

    let changeResult;
    act(() => {
      changeResult = result.current.changePassword({
        current: "hunter2",
        next: "newpass",
        confirm: "newpass",
      });
    });

    expect(changeResult).toEqual({ success: true, message: "Password updated" });
    expect(result.current.user).not.toBeNull();

    let oldPairResult;
    act(() => {
      oldPairResult = result.current.signIn("coach@club.pt", "hunter2");
    });
    expect(oldPairResult).toEqual({
      success: false,
      message: "Invalid email or password",
    });

    let newPairResult;
    act(() => {
      newPairResult = result.current.signIn("coach@club.pt", "newpass");
    });
    expect(newPairResult).toEqual({ success: true });
  });

  test("returns a failure result rather than success when storage throws", () => {
    const result = signedInResult();
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });

    let changeResult;
    act(() => {
      changeResult = result.current.changePassword({
        current: "hunter2",
        next: "newpass",
        confirm: "newpass",
      });
    });

    expect(changeResult).toEqual({
      success: false,
      message: "Could not save your password. Try again.",
    });
    setItemSpy.mockRestore();
  });

  test("returns the same { success, message } shape as signIn/signUp", () => {
    const result = signedInResult();

    let changeResult;
    act(() => {
      changeResult = result.current.changePassword({
        current: "hunter2",
        next: "newpass",
        confirm: "newpass",
      });
    });

    expect(Object.keys(changeResult).sort()).toEqual(["message", "success"]);
  });
});
