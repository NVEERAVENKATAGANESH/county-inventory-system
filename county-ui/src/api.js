import axios from "axios";

export function getRole()     { return (localStorage.getItem("actingRole") || "employee").toLowerCase(); }
export function getDept()     { return (localStorage.getItem("deptCode") || "").trim().toUpperCase(); }
export function getUsername() { return localStorage.getItem("username") || "User"; }
export function isAdmin()     { return getRole() === "admin"; }

export function isSeedUnlocked() {
  return localStorage.getItem("FF_SEED_UNLOCK") === "true";
}

const DEV_TTL_MINUTES = 30;
function isDevSessionActive() {
  const key = (localStorage.getItem("devKey") || "").trim();
  const t   = parseInt(localStorage.getItem("devKeyTime") || "0", 10);
  if (!key || !t) return false;
  return (Date.now() - t) / 60000 <= DEV_TTL_MINUTES;
}

// Toast hook
let _toastFn = null;
export function registerToast(fn) { _toastFn = fn; }
export function showToast(message, type = "info") { if (_toastFn) _toastFn(message, type); }

export function fmtApiError(err) {
  if (!err?.response) return err?.message || "Network error — is the Django server running?";
  const { status, data } = err.response;
  if (!data) return `HTTP ${status}`;
  if (typeof data === "string") return `HTTP ${status}: ${data}`;
  if (data?.detail) return `HTTP ${status}: ${data.detail}`;
  if (typeof data === "object") {
    const lines = Object.entries(data)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
    return `HTTP ${status}:\n${lines}`;
  }
  return `HTTP ${status}`;
}

/**
 * API base:
 * - Local dev: VITE_API_BASE="" -> uses Vite proxy (/api -> localhost:8000)
 * - Production: VITE_API_BASE="https://county-inventory-system.onrender.com"
 */
const API_BASE = (() => {
  const raw = (import.meta.env.VITE_API_BASE || "").trim();

  // Local dev: keep empty so Vite proxy handles /api → localhost:8000
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1");

  if (isLocal) return ""; // use Vite proxy

  // Production/Preview: must be Render
  return raw || "https://county-inventory-system.onrender.com";
})();

console.log("VITE_API_BASE =", API_BASE, "MODE =", import.meta.env.MODE);
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

api.interceptors.request.use((config) => {
  const role     = getRole();
  const dept     = getDept();
  const username = getUsername();

  config.headers["X-Acting-Role"] = role;
  config.headers["X-Username"]    = username;
  if (dept) config.headers["X-Dept-Code"] = dept;

  if (isSeedUnlocked() && isDevSessionActive()) {
    config.headers["X-Demo-Unlock"] = "1";
    const devKey = (localStorage.getItem("devKey") || "").trim();
    if (devKey) config.headers["X-Dev-Key"] = devKey;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    error.displayMessage = fmtApiError(error);
    if (error?.response?.status === 403) showToast("Access denied.", "error");
    return Promise.reject(error);
  }
);

// DevPanel client (same base)
export const devApi = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

devApi.interceptors.request.use((config) => {
  const devKey  = (localStorage.getItem("devKey") || "").trim();
  const devUser = (localStorage.getItem("devUsername") || "").trim();

  if (devKey) {
    config.headers["X-Dev-Key"]     = devKey;
    config.headers["X-Acting-Role"] = "admin";
    config.headers["X-Username"]    = devUser || devKey;
  }

  if (isSeedUnlocked() && isDevSessionActive()) {
    config.headers["X-Demo-Unlock"] = "1";
  }

  return config;
});

/* Portal helpers */
export function isPortalLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

export function portalLogin({ username, role, deptCode }) {
  const u = (username || "").trim();
  const r = (role || "employee").toLowerCase();
  const d = (deptCode || "").trim().toUpperCase();
  if (!u) throw new Error("Username is required.");

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("username", u);
  localStorage.setItem("actingRole", r);
  localStorage.setItem("deptCode", d);
}

export function portalLogout() {
  ["isLoggedIn", "username", "actingRole", "deptCode"].forEach((k) =>
    localStorage.removeItem(k)
  );
}