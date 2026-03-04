/**
 * layout/AppLayout.jsx — Fixed
 *
 * Changes:
 *  1. Removed ALL hardcoded inline styles and the DARK/LIGHT constant objects
 *  2. Now uses CSS classes from app.css (.layout-root, .layout-sidebar, etc.)
 *     which are driven by CSS variables — so the whole layout responds to theme changes
 *  3. Removed the local isDark/event-listener hack — ThemeContext manages theme now
 *  4. Sidebar brand, nav items, and footer all inherit colors from CSS vars
 */
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { getUsername, getRole, getDept } from "../api";
import {
  LayoutDashboard, Package, Boxes,
  TriangleAlert, ClipboardList, Settings, Menu, X,
} from "lucide-react";

const NAV = [
  { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard"   },
  { to: "/assets",      icon: Package,          label: "Assets"      },
  { to: "/consumables", icon: Boxes,            label: "Consumables" },
  { to: "/low-stock",   icon: TriangleAlert,    label: "Low Stock"   },
  { to: "/audit",       icon: ClipboardList,    label: "Audit Logs"  },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const username = getUsername();
  const role     = getRole();
  const dept     = getDept();

  // Read announcement fresh each render (no stale state)
  const annEnabled = localStorage.getItem("ANN_ENABLED") === "true";
  const annText    = localStorage.getItem("ANN_TEXT") || "";

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="layout-root">
      <Navbar />

      {annEnabled && annText && (
        <div className="layout-banner">{annText}</div>
      )}

      <div className="layout-body">
        {/* Mobile overlay */}
        <div
          className={`layout-sidebar-overlay${sidebarOpen ? " open" : ""}`}
          onClick={closeSidebar}
        />

        <aside className={`layout-sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="layout-sidebar-brand">
            <div className="layout-sidebar-brand-name">UIMS</div>
            <div className="layout-sidebar-brand-sub">Unified Inventory Management</div>
            <div className="layout-sidebar-brand-user">
              <span>{username}</span>
              <span className={`layout-sidebar-brand-pill ${role}`}>{role}</span>
              {dept && <span>· {dept}</span>}
            </div>
          </div>

          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) => `layout-nav-item${isActive ? " active" : ""}`}
            >
              <item.icon size={16} style={{ flexShrink: 0 }} />
              {item.label}
            </NavLink>
          ))}

          <div className="layout-nav-spacer" />

          <NavLink
            to="/settings"
            onClick={closeSidebar}
            className={({ isActive }) => `layout-nav-item${isActive ? " active" : ""}`}
          >
            <Settings size={16} style={{ flexShrink: 0 }} />
            Settings
          </NavLink>
        </aside>

        <main className="layout-main">
          <Outlet />
        </main>
      </div>

      <footer className="layout-footer">
        © 2026 International Software Systems, Inc. All rights reserved.
      </footer>

      {/* Mobile fab */}
      <button
        className="layout-mob-toggle"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
    </div>
  );
}