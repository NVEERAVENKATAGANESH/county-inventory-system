/**
 * components/ProtectedRoute.jsx — Fixed
 *
 * Fix applied:
 *  - Previously this file was actually a copy of AppLayout with NO auth guard
 *  - Users could navigate directly to /dashboard without logging in
 *  - Now correctly checks isPortalLoggedIn() and redirects to /login if not authenticated
 *  - AppLayout stays in layout/AppLayout.jsx where it belongs
 */
import { Navigate } from "react-router-dom";
import { isPortalLoggedIn } from "../api";

/**
 * Wrap any route that requires portal login.
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
 *     ...child routes...
 *   </Route>
 */
export default function ProtectedRoute({ children }) {
  if (!isPortalLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}