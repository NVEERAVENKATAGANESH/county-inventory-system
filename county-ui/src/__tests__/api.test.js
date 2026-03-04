/**
 * api.test.js — Unit tests for api.js utility functions.
 *
 * All functions tested here are pure localStorage helpers or pure logic —
 * no network calls needed.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getRole,
  getDept,
  getUsername,
  isAdmin,
  isPortalLoggedIn,
  portalLogin,
  portalLogout,
  fmtApiError,
} from "../api";

// ─── localStorage helpers ─────────────────────────────────────────────────────

describe("getRole", () => {
  afterEach(() => localStorage.clear());

  it("returns 'employee' when nothing is stored", () => {
    expect(getRole()).toBe("employee");
  });

  it("returns the stored role", () => {
    localStorage.setItem("actingRole", "admin");
    expect(getRole()).toBe("admin");
  });

  it("lowercases the stored value", () => {
    localStorage.setItem("actingRole", "ADMIN");
    expect(getRole()).toBe("admin");
  });
});

describe("isAdmin", () => {
  afterEach(() => localStorage.clear());

  it("returns false by default", () => {
    expect(isAdmin()).toBe(false);
  });

  it("returns true when role is admin", () => {
    localStorage.setItem("actingRole", "admin");
    expect(isAdmin()).toBe(true);
  });

  it("returns false when role is employee", () => {
    localStorage.setItem("actingRole", "employee");
    expect(isAdmin()).toBe(false);
  });
});

describe("getUsername", () => {
  afterEach(() => localStorage.clear());

  it("returns 'User' by default", () => {
    expect(getUsername()).toBe("User");
  });

  it("returns the stored username", () => {
    localStorage.setItem("username", "testadmin");
    expect(getUsername()).toBe("testadmin");
  });
});

describe("getDept", () => {
  afterEach(() => localStorage.clear());

  it("returns empty string by default", () => {
    expect(getDept()).toBe("");
  });

  it("returns stored value uppercased", () => {
    localStorage.setItem("deptCode", "fac");
    expect(getDept()).toBe("FAC");
  });

  it("trims whitespace", () => {
    localStorage.setItem("deptCode", "  IT  ");
    expect(getDept()).toBe("IT");
  });
});

describe("isPortalLoggedIn", () => {
  afterEach(() => localStorage.clear());

  it("returns false by default", () => {
    expect(isPortalLoggedIn()).toBe(false);
  });

  it("returns true when isLoggedIn is 'true'", () => {
    localStorage.setItem("isLoggedIn", "true");
    expect(isPortalLoggedIn()).toBe(true);
  });

  it("returns false for any other value", () => {
    localStorage.setItem("isLoggedIn", "yes");
    expect(isPortalLoggedIn()).toBe(false);
  });
});

// ─── portalLogin ──────────────────────────────────────────────────────────────

describe("portalLogin", () => {
  afterEach(() => localStorage.clear());

  it("sets isLoggedIn to 'true'", () => {
    portalLogin({ username: "alice", role: "admin", deptCode: "FAC" });
    expect(localStorage.getItem("isLoggedIn")).toBe("true");
  });

  it("stores username", () => {
    portalLogin({ username: "alice", role: "admin", deptCode: "FAC" });
    expect(localStorage.getItem("username")).toBe("alice");
  });

  it("stores role lowercased", () => {
    portalLogin({ username: "alice", role: "Admin", deptCode: "" });
    expect(localStorage.getItem("actingRole")).toBe("admin");
  });

  it("stores deptCode uppercased", () => {
    portalLogin({ username: "bob", role: "employee", deptCode: "fac" });
    expect(localStorage.getItem("deptCode")).toBe("FAC");
  });

  it("defaults role to employee when undefined", () => {
    portalLogin({ username: "carol" });
    expect(localStorage.getItem("actingRole")).toBe("employee");
  });

  it("throws when username is empty", () => {
    expect(() => portalLogin({ username: "", role: "admin" })).toThrow();
  });

  it("throws when username is only whitespace", () => {
    expect(() => portalLogin({ username: "   ", role: "admin" })).toThrow();
  });
});

// ─── portalLogout ─────────────────────────────────────────────────────────────

describe("portalLogout", () => {
  it("clears all four auth keys", () => {
    portalLogin({ username: "alice", role: "admin", deptCode: "FAC" });
    portalLogout();
    expect(localStorage.getItem("isLoggedIn")).toBeNull();
    expect(localStorage.getItem("username")).toBeNull();
    expect(localStorage.getItem("actingRole")).toBeNull();
    expect(localStorage.getItem("deptCode")).toBeNull();
  });

  it("is safe to call when already logged out", () => {
    expect(() => portalLogout()).not.toThrow();
  });
});

// ─── fmtApiError ─────────────────────────────────────────────────────────────

describe("fmtApiError", () => {
  it("returns the error message when there is no response", () => {
    expect(fmtApiError({ message: "Network Error" })).toBe("Network Error");
  });

  it("returns a fallback message when error is undefined", () => {
    expect(fmtApiError(undefined)).toBe("Network error — is the Django server running?");
  });

  it("includes HTTP status and detail field", () => {
    const err = { response: { status: 401, data: { detail: "Invalid credentials." } } };
    expect(fmtApiError(err)).toBe("HTTP 401: Invalid credentials.");
  });

  it("handles plain string response body", () => {
    const err = { response: { status: 500, data: "Internal Server Error" } };
    expect(fmtApiError(err)).toBe("HTTP 500: Internal Server Error");
  });

  it("formats object response with multiple fields", () => {
    const err = { response: { status: 400, data: { username: ["This field is required."] } } };
    const result = fmtApiError(err);
    expect(result).toContain("username");
    expect(result).toContain("This field is required.");
  });

  it("returns bare HTTP status when data is null", () => {
    const err = { response: { status: 503, data: null } };
    expect(fmtApiError(err)).toBe("HTTP 503");
  });

  it("returns bare HTTP status when data is undefined", () => {
    const err = { response: { status: 404, data: undefined } };
    expect(fmtApiError(err)).toBe("HTTP 404");
  });
});
