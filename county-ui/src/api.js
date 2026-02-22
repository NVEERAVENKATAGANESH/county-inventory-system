import axios from "axios";

/**
 * New design:
 * - No backend authentication (no sessions, no CSRF)
 * - Frontend portal login is purely client-side (localStorage)
 * - Authorization behavior is driven by headers:
 *    X-Acting-Role: admin | employee
 *    X-Dept-Code:  Department.code (required for employee reads)
 *
 * Dev-only endpoints (optional):
 *    X-Dev-Key: localStorage.devKey (only used by devApi)
 */

// ----------------------------
// Main API client (normal pages)
// ----------------------------
export const api = axios.create({
  baseURL: "",            // Vite proxy -> Django
  withCredentials: false, // no cookies
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

api.interceptors.request.use((config) => {
  const role = (localStorage.getItem("actingRole") || "employee").toLowerCase();
  const dept = (localStorage.getItem("deptCode") || "").trim().toLowerCase();

  config.headers["X-Acting-Role"] = role;

  if (role === "employee") {
    if (!dept) {
      return Promise.reject(
        new Error("Employee role requires Department Code. Please login again.")
      );
    }
    config.headers["X-Dept-Code"] = dept;
  } else if (dept) {
    config.headers["X-Dept-Code"] = dept;
  }

  return config;
});

// ----------------------------
// Dev API client (dev pages only)
// ----------------------------
export const devApi = axios.create({
  baseURL: "",
  withCredentials: false,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

devApi.interceptors.request.use((config) => {
  const devKey = localStorage.getItem("devKey") || "";
  if (devKey) config.headers["X-Dev-Key"] = devKey;
  return config;
});

// ----------------------------
// Portal helpers (client-side only)
// ----------------------------

export function portalLogin({ username, role, deptCode }) {
  const r = (role || "employee").toLowerCase();
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("username", username || "User");
  localStorage.setItem("actingRole", r);

  if (r === "employee") {
    localStorage.setItem("deptCode", (deptCode || "").trim().toLowerCase());
  } else {
    localStorage.removeItem("deptCode");
  }
}

export function portalLogout() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("username");
  // keep role/dept if you want convenience, or clear them:
  // localStorage.removeItem("actingRole");
  // localStorage.removeItem("deptCode");
}

export function isPortalLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

