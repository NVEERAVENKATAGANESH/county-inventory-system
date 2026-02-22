import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dev.css";
const DEV_TTL_MINUTES = 30;

function nowMs() {
  return Date.now();
}

function setDevKey(key) {
  localStorage.setItem("devKey", key);
  localStorage.setItem("devKeyTime", String(nowMs()));
}

function isDevActive() {
  const key = localStorage.getItem("devKey") || "";
  const t = parseInt(localStorage.getItem("devKeyTime") || "0", 10);
  if (!key || !t) return false;
  const ageMin = (nowMs() - t) / 60000;
  return ageMin <= DEV_TTL_MINUTES;
}

export default function DevGate() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const active = useMemo(() => isDevActive(), []);

  // Actions
  const goPortal = () => nav("/login");
  const goAdmin = () => window.open("http://127.0.0.1:8000/admin/", "_blank", "noreferrer");

  // Modal
  const openDevModal = () => {
    setMsg("");
    setCode("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setMsg("");
    setCode("");
  };

  const unlock = () => {
    const trimmed = code.trim();
    if (!trimmed) return setMsg("Enter developer key.");
    setDevKey(trimmed);
    setMsg("✅ Developer mode unlocked");
    setTimeout(() => nav("/_dev/panel"), 250);
  };

  const openDevPanel = () => {
    if (active) nav("/_dev/panel");
    else openDevModal();
  };

  return (
    <div className="devgate">
      {/* Header */}
      <header className="devgate__header">
        <div className="devgate__brand">
          <img
            src="/issi-logo.png"
            alt="ISSI"
            className="devgate__logo"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <div className="devgate__brandText">
            <div className="devgate__brandName">INTERNATIONAL SOFTWARE SYSTEMS, INC.</div>
          </div>
        </div>

        <div className="devgate__titleWrap">
          <div className="devgate__title">Unified Inventory Management System</div>
          <div className="devgate__subtitle">One Stop Solution for Inventory Management</div>
        </div>

        <button className="devgate__homeBtn" onClick={goPortal} title="Go to Portal">
          ⌂
        </button>
      </header>

      {/* Cards */}
      <main className="devgate__main">
        <div className="devgate__cards">
          <div className="devgate__card devgate__card--lift" style={{ animationDelay: "40ms" }}>
            <div className="devgate__image devgate__image--one" />
            <div className="devgate__cardBody">
              <div className="devgate__cardTitle">UIMS Portal</div>
              <div className="devgate__cardDesc">
                Access Assets, Consumables, Low Stock and Audit Logs based on your role.
              </div>
              <button className="devgate__primaryBtn" onClick={goPortal}>
                Enter Portal
              </button>
            </div>
          </div>

          <div className="devgate__card devgate__card--lift" style={{ animationDelay: "140ms" }}>
            <div className="devgate__image devgate__image--two" />
            <div className="devgate__cardBody">
              <div className="devgate__cardTitle">Developer Access</div>
              <div className="devgate__cardDesc">
                Restricted tools for UI configuration and feature flags.
              </div>
              <button className="devgate__primaryBtn devgate__primaryBtn--dark" onClick={openDevPanel}>
                {active ? "Open Dev Panel" : "Developer Panel"}
              </button>
              <div className="devgate__hint">
                Hidden URL: <span className="devgate__mono">/_dev</span>
              </div>
            </div>
          </div>

          <div className="devgate__card devgate__card--lift" style={{ animationDelay: "240ms" }}>
            <div className="devgate__image devgate__image--three" />
            <div className="devgate__cardBody">
              <div className="devgate__cardTitle">Admin Console</div>
              <div className="devgate__cardDesc">
                Open Django Admin for system administration and seed maintenance.
              </div>
              <button className="devgate__primaryBtn" onClick={goAdmin}>
                Open Admin ↗
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="devgate__footer">
        © Copyright 2026. International Software Systems, Inc | All Rights Reserved
      </footer>

      {/* Dev Key Modal */}
      {open && (
        <div className="devgate__modalOverlay" onClick={closeModal}>
          <div className="devgate__modal" onClick={(e) => e.stopPropagation()}>
            <div className="devgate__modalHead">
              <div>
                <div className="devgate__modalTitle">Developer Panel Login</div>
                <div className="devgate__modalSub">Enter developer key to unlock.</div>
              </div>
              <button className="devgate__modalClose" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="devgate__modalBody">
              <input
                className="devgate__input"
                placeholder="Developer Key"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") unlock();
                  if (e.key === "Escape") closeModal();
                }}
                autoFocus
              />

              {msg ? <div className="devgate__msg">{msg}</div> : null}

              <div className="devgate__modalActions">
                <button className="devgate__btnGhost" onClick={closeModal}>
                  Cancel
                </button>
                <button className="devgate__btnSolid" onClick={unlock}>
                  Unlock
                </button>
              </div>

              <div className="devgate__tiny">
                Auto-lock after <b>{DEV_TTL_MINUTES} minutes</b>.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
