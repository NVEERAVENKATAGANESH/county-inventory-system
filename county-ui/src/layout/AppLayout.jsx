/**
 * layout/AppLayout.jsx — Top-nav layout (no sidebar)
 * Navbar is fixed at top; content flows full-width below.
 */
import { Outlet } from "react-router-dom";
import Navbar            from "../components/Navbar.jsx";
import OfflineIndicator  from "../components/OfflineIndicator.jsx";
import KeyboardShortcuts from "../components/KeyboardShortcuts.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";

export default function AppLayout() {
  return (
    <ToastProvider>
      <div className="layout-root">
        <OfflineIndicator />
        <KeyboardShortcuts />
        <Navbar />
        <main className="layout-main">
          <Outlet />
        </main>
        <footer className="layout-footer">
          © 2026 International Software Systems, Inc. · All rights reserved.
        </footer>
      </div>
    </ToastProvider>
  );
}
