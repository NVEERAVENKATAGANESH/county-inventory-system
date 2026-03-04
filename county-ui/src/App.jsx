/**
 * App.jsx — with ThemeProvider, ErrorBoundary, ConfirmProvider
 *
 * ThemeProvider wraps everything so CSS vars are available everywhere.
 * Import app.css here (once) so theme variables load globally.
 */
import "./styles/app.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider }   from "./context/ThemeContext";
import { SearchProvider }  from "./context/SearchContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import ErrorBoundary       from "./components/ErrorBoundary";
import AppLayout           from "./layout/AppLayout";
import ProtectedRoute      from "./components/ProtectedRoute";

import Login       from "./pages/Login";
import Dashboard   from "./pages/Dashboard";
import Assets      from "./pages/Assets";
import Consumables from "./pages/Consumables";
import LowStock    from "./pages/LowStock";
import Audit       from "./pages/Audit";
import Users       from "./pages/Users";
import Departments from "./pages/Departments";
import Settings    from "./pages/Settings";
import Maintenance from "./pages/Maintenance";
import MyAssets    from "./pages/MyAssets";
import Requests    from "./pages/Requests";
import Reports     from "./pages/Reports";
import DevGate, { DevLogin } from "./pages/DevGate";
import DevPanel    from "./pages/DevPanel";
import NotFound    from "./pages/NotFound";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <SearchProvider>
            <ConfirmProvider>
              <Routes>
                {/* Public */}
                <Route path="/login"      element={<Login />} />

                {/* Dev routes */}
                <Route path="/_dev"       element={<DevGate />} />
                <Route path="/_dev/login" element={<DevLogin />} />
                <Route path="/_dev/panel" element={<DevPanel />} />

                {/* Protected portal */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index                element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard"     element={<Dashboard />} />
                  <Route path="assets"        element={<Assets />} />
                  <Route path="consumables"   element={<Consumables />} />
                  <Route path="low-stock"     element={<LowStock />} />
                  <Route path="audit"         element={<Audit />} />
                  <Route path="users"         element={<Users />} />
                  <Route path="departments"   element={<Departments />} />
                  <Route path="maintenance"   element={<Maintenance />} />
                  <Route path="my-assets"     element={<MyAssets />} />
                  <Route path="requests"      element={<Requests />} />
                  <Route path="requests/new"  element={<Requests />} />
                  <Route path="reports"       element={<Reports />} />
                  <Route path="settings"      element={<Settings />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </ConfirmProvider>
          </SearchProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
