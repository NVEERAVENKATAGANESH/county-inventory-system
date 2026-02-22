import { NavLink, Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import {
  LayoutDashboard,
  Package,
  Boxes,
  TriangleAlert,
  ClipboardList,
} from "lucide-react";

function SideItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        textDecoration: "none",
        color: "#fff",
        background: isActive ? "#141414" : "transparent",
        border: isActive ? "1px solid #2c2c2c" : "1px solid transparent",
      })}
    >
      <Icon size={18} style={{ opacity: 0.9 }} />
      <span style={{ fontSize: 14 }}>{label}</span>
    </NavLink>
  );
}

export default function AppLayout() {
  return (
    <div
      style={{
        height: "100vh",              // ✅ lock to viewport
        background: "#070707",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",           // ✅ prevent whole-page scroll
      }}
    >
      <Navbar />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "270px 1fr",
          overflow: "hidden",         // ✅ only main scrolls
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            borderRight: "1px solid #222",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14, opacity: 0.9 }}>
              UIMS
            </div>
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
              Unified Inventory Management System
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <SideItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <SideItem to="/assets" icon={Package} label="Assets" />
            <SideItem to="/consumables" icon={Boxes} label="Consumables" />
            <SideItem to="/low-stock" icon={TriangleAlert} label="Low Stock" />
            <SideItem to="/audit" icon={ClipboardList} label="Audit Logs" />
          </div>

          {/* ✅ NO DevGate here */}
        </aside>

        {/* Main content scroll area */}
        <main
          style={{
            overflowY: "auto",         // ✅ only this scrolls
            padding: 16,
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Fixed footer (always visible) */}
      <footer
        style={{
          borderTop: "1px solid #222",
          padding: "14px 16px",
          textAlign: "center",
          color: "#cfcfcf",
          fontSize: 13,
          background: "#0b0b0b",
          flexShrink: 0,              // ✅ never shrinks
        }}
      >
        Copyright © 2026. International Software Systems, Inc. All rights reserved.
      </footer>
    </div>
  );
}
