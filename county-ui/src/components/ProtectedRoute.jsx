import { Navigate } from "react-router-dom";
import { isPortalLoggedIn } from "../api";

export default function ProtectedRoute({ children }) {
  const ok = isPortalLoggedIn();
  if (!ok) return <Navigate to="/login" replace />;

  const role = (localStorage.getItem("actingRole") || "employee").toLowerCase();
  const dept = (localStorage.getItem("deptCode") || "").trim();

  // ✅ Prevent 403 spam: employees MUST have deptCode
  if (role === "employee" && !dept) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
