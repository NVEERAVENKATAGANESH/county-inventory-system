import { NavLink, useNavigate } from "react-router-dom";
import { portalLogout } from "../api";
import { useSearch } from "../context/SearchContext.jsx";
import { Search } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const { query, setQuery } = useSearch();

  const username = localStorage.getItem("username") || "User";
  const role = (localStorage.getItem("actingRole") || "employee").toLowerCase();
  const deptCode = localStorage.getItem("deptCode") || "";

  function logout() {
    portalLogout();
    navigate("/login");
  }

  function switchRole(newRole) {
    localStorage.setItem("actingRole", newRole);
    window.location.reload();
  }

  return (
    <header
      style={{
        borderBottom: "1px solid #222",
        background: "#0b0b0b",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 320 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            Unified Inventory Management System (UIMS)
          </div>
          <nav style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 14 }}>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/assets">Assets</NavLink>
            <NavLink to="/consumables">Consumables</NavLink>
            <NavLink to="/low-stock">Low Stock</NavLink>
            <NavLink to="/audit">Audit Logs</NavLink>
          </nav>
        </div>

        {/* Search */}
        <div
          style={{
            flex: 1,
            maxWidth: 520,
            minWidth: 260,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#121212",
            border: "1px solid #2a2a2a",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          <Search size={18} style={{ opacity: 0.7 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets, SKUs, tags, serials..."
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "#fff",
              fontSize: 14,
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              style={{
                border: "1px solid #333",
                background: "#141414",
                color: "#fff",
                padding: "6px 10px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          ) : null}
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            <b>{username}</b>
            <span style={{ opacity: 0.6 }}> · {role}</span>
            {deptCode && <span style={{ opacity: 0.6 }}> · {deptCode}</span>}
          </div>

          <select
            value={role}
            onChange={(e) => switchRole(e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "#141414",
              color: "#fff",
            }}
          >
            <option value="admin">admin</option>
            <option value="employee">employee</option>
          </select>

          <button
            onClick={logout}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "#141414",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
