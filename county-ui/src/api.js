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

// Toast hook (your app already references this)
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

export const api = axios.create({
  baseURL: "",
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

  // ✅ Seed unlock headers (portal UI)
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
    if (error.response) {
      error.displayMessage = fmtApiError(error);
      if (error.response.status === 403) showToast("Access denied.", "error");
    }
    return Promise.reject(error);
  }
);

// Dev API client (DevPanel)
export const devApi = axios.create({
  baseURL: "",
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

  // Dev calls are allowed anyway, but we keep it consistent:
  if (isSeedUnlocked() && isDevSessionActive()) {
    config.headers["X-Demo-Unlock"] = "1";
  }

  return config;
});
/* ─────────────────────────────────────────────────────────────
 * Portal session helpers (required by ProtectedRoute/Login/Navbar)
 * ───────────────────────────────────────────────────────────── */

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
