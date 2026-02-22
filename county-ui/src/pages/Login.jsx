import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { portalLogin } from "../api";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [role, setRole] = useState("employee");
  const [deptCode, setDeptCode] = useState("");

  function submit(e) {
    e.preventDefault();

    if (role === "employee" && !deptCode.trim()) {
      alert("Department code is required for employee login.");
      return;
    }

    portalLogin({
      username: username.trim() || "User",
      role,
      deptCode: deptCode.trim(),
    });

    nav("/dashboard"); // or "/assets" if you prefer
  }

  const showDept = role === "employee";

  return (
    <div className="loginWrap">
      <div className="loginCard">
        <h2>Unified Inventory Management System (UIMS)</h2>
        <p>Portal Login</p>

        <form onSubmit={submit}>
          <div style={{ display: "grid", gap: 10 }}>
            <input
              className="input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="employee">employee</option>
              <option value="admin">admin</option>
            </select>

            {showDept && (
              <input
                className="input"
                placeholder="Department Code (e.g., IT)"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
              />
            )}

            <button className="btn btnPrimary" type="submit">
              Enter Portal
            </button>

            {/* Optional helper */}
            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
              Tip: Employee users must provide a Department Code (ex: IT, HR, FIN).
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
