import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { SearchProvider } from "./context/SearchContext.jsx";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Assets from "./pages/Assets.jsx";
import Consumables from "./pages/Consumables.jsx";
import LowStock from "./pages/LowStock.jsx";
import Audit from "./pages/Audit.jsx";
import DevGate from "./pages/DevGate.jsx";
import DevPanel from "./pages/DevPanel.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <SearchProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Hidden Dev entry */}
          <Route path="/_dev" element={<DevGate />} />
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
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="assets" element={<Assets />} />
            <Route path="consumables" element={<Consumables />} />
            <Route path="low-stock" element={<LowStock />} />
            <Route path="audit" element={<Audit />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </SearchProvider>
    </BrowserRouter>
  );
}
