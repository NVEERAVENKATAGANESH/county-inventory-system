/**
 * Login.test.jsx — Render + interaction tests for the Login page.
 *
 * These tests verify:
 *  - Form fields are present and controllable
 *  - Client-side validation fires before any fetch
 *  - Successful login calls portalLogin + navigates
 *  - Bad credentials render an error message
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Mock portalLogin so we don't hit localStorage side-effects
vi.mock("../api", () => ({
  portalLogin: vi.fn(),
  isPortalLoggedIn: vi.fn(() => false),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import Login from "../pages/Login.jsx";
import { portalLogin } from "../api";

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

// ─── Render tests ─────────────────────────────────────────────────────────────

describe("Login — rendering", () => {
  it("renders the username input", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Enter your username")).toBeInTheDocument();
  });

  it("renders the password input", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  });

  it("renders the Sign In button", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the Remember me checkbox", () => {
    renderLogin();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
  });

  it("password field is type=password by default", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Enter your password")).toHaveAttribute("type", "password");
  });

  it("does not show an error alert initially", () => {
    renderLogin();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ─── Controlled input tests ───────────────────────────────────────────────────

describe("Login — form inputs", () => {
  it("allows typing into the username field", async () => {
    renderLogin();
    const input = screen.getByPlaceholderText("Enter your username");
    await userEvent.type(input, "testadmin");
    expect(input).toHaveValue("testadmin");
  });

  it("allows typing into the password field", async () => {
    renderLogin();
    const input = screen.getByPlaceholderText("Enter your password");
    await userEvent.type(input, "secret123");
    expect(input).toHaveValue("secret123");
  });

  it("toggles password visibility when eye button clicked", async () => {
    renderLogin();
    const pwInput = screen.getByPlaceholderText("Enter your password");
    const eyeBtn  = screen.getByRole("button", { name: "" }); // eye icon button has no text
    expect(pwInput).toHaveAttribute("type", "password");
    await userEvent.click(eyeBtn);
    expect(pwInput).toHaveAttribute("type", "text");
  });
});

// ─── Client-side validation tests ─────────────────────────────────────────────

describe("Login — client-side validation", () => {
  beforeEach(() => {
    global.fetch = vi.fn(); // ensure no real fetch fires
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("shows error when username is empty on submit", async () => {
    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/username/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows error when password is empty on submit", async () => {
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("Enter your username"), "testuser");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/password/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── Network interaction tests ────────────────────────────────────────────────

describe("Login — network responses", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls portalLogin and navigates on successful login", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => ({
        username: "testadmin", role: "admin",
        department_code: "FAC", department_name: "Facilities",
      }),
    });

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("Enter your username"), "testadmin");
    await userEvent.type(screen.getByPlaceholderText("Enter your password"), "Pass1234!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(portalLogin).toHaveBeenCalledWith({
        username: "testadmin", role: "admin", deptCode: "FAC",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("shows API error message on 401 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok:   false,
      json: async () => ({ detail: "Invalid username or password." }),
    });

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("Enter your username"), "baduser");
    await userEvent.type(screen.getByPlaceholderText("Enter your password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password.");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("shows connection error when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    renderLogin();
    await userEvent.type(screen.getByPlaceholderText("Enter your username"), "testadmin");
    await userEvent.type(screen.getByPlaceholderText("Enter your password"), "Pass1234!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot reach server/i);
  });
});
