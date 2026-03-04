/**
 * DevGate.jsx
 *
 * Routes:
 *   /_dev         → DevGate  (landing hub)
 *   /_dev/login   → DevLogin (full-page login, named export)
 *   /_dev/panel   → DevPanel
 *
 * Credentials:
 *   Production: read from VITE_DEV_USERNAME / VITE_DEV_PASSWORD in .env
 *   Local dev:  if env vars not set, falls back to VITE_DEV_USERNAME="dev" / VITE_DEV_PASSWORD="dev123"
 *               (safe only because this page is not exposed in production)
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/dev.css";

export const DEV_TTL_MINUTES = 30;
const nowMs = () => Date.now();

export function isDevActive() {
  const key = localStorage.getItem("devKey") || "";
  const t   = parseInt(localStorage.getItem("devKeyTime") || "0", 10);
  if (!key || !t) return false;
  return (nowMs() - t) / 60000 <= DEV_TTL_MINUTES;
}

export function setDevSession(username) {
  localStorage.setItem("devKey",      username);
  localStorage.setItem("devKeyTime",  String(nowMs()));
  localStorage.setItem("devUsername", username);
}

export function clearDevSession() {
  localStorage.removeItem("devKey");
  localStorage.removeItem("devKeyTime");
  localStorage.removeItem("devUsername");
}

/* ─────────────────────────────────────────
   DevGate — landing hub
───────────────────────────────────────── */
export default function DevGate() {
  const nav    = useNavigate();
  const active = useMemo(() => isDevActive(), []);

  const goPortal   = () => nav("/login");
  const goAdmin = () => {window.open("http://127.0.0.1:8000/admin/", "_blank");};
  const goDevLogin = () => nav(active ? "/_dev/panel" : "/_dev/login");

  return (
    <div className="devgate">
      <header className="devgate__header">
        <div className="devgate__brand">
          <img src="/issi-logo.png" alt="ISSI" className="devgate__logo"
            onError={(e) => (e.currentTarget.style.display = "none")} />
          <div className="devgate__brandText">
            <div className="devgate__brandName">INTERNATIONAL SOFTWARE SYSTEMS, INC.</div>
          </div>
        </div>
        <div className="devgate__titleWrap">
          <div className="devgate__title">Unified Inventory Management System</div>
          <div className="devgate__subtitle">One Stop Solution for Inventory Management</div>
        </div>
        <button className="devgate__homeBtn" onClick={goPortal} title="Go to Portal">⌂</button>
      </header>

      <main className="devgate__main">
        <div className="devgate__cards">

          <div className="devgate__card devgate__card--lift" style={{ animationDelay: "40ms" }}>
            <div className="devgate__image" style={{
              backgroundImage: "url('/uims.jpg')",
              backgroundSize: "cover", backgroundPosition: "center",
            }} />
            <div className="devgate__cardBody">
              <div className="devgate__cardTitle">UIMS Portal</div>
              <div className="devgate__cardDesc">
                Access Assets, Consumables, Low Stock and Audit Logs based on your role.
              </div>
              <button className="devgate__primaryBtn" onClick={goPortal}>Enter Portal</button>
            </div>
          </div>

          <div className="devgate__card devgate__card--lift" style={{ animationDelay: "140ms" }}>
            <div className="devgate__image" style={{
              backgroundImage: "url('/dev.jpg')",
              backgroundSize: "cover", backgroundPosition: "center",
            }} />
            <div className="devgate__cardBody">
              <div className="devgate__cardTitle">Developer Access</div>
              <div className="devgate__cardDesc">
                Restricted tools for UI configuration and feature flags.
                {active && (
                  <span className="devgate__activeBadge">
                    <span className="devgate__dot" /> Session active
                  </span>
                )}
              </div>
              <button className="devgate__primaryBtn devgate__primaryBtn--dark" onClick={goDevLogin}>
                {active ? "Open Dev Panel" : "Developer Login"}
              </button>
            </div>
          </div>

          <div className="devgate__card devgate__card--lift" style={{ animationDelay: "240ms" }}>
            <div className="devgate__image" style={{
              backgroundImage: "url('/admin.jpg')",
              backgroundSize: "cover", backgroundPosition: "center",
            }} />
            <div className="devgate__cardBody">
              <div className="devgate__cardTitle">Admin Console</div>
              <div className="devgate__cardDesc">
                Open Django Admin for system administration and seed maintenance.
              </div>
              <button className="devgate__primaryBtn" onClick={goAdmin}>Open Admin ↗</button>
            </div>
          </div>

        </div>
      </main>

      <footer className="devgate__footer">
        © Copyright 2026. International Software Systems, Inc | All Rights Reserved
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────
   DevLogin — full dedicated login page
   Route: /_dev/login
───────────────────────────────────────── */
import { useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, User2, ShieldAlert, Terminal } from "lucide-react";

const devLoginCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  .dl-root {
    min-height: 100vh; background: #000;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; font-family: 'Inter', sans-serif; position: relative; overflow: hidden;
  }
  .dl-root::before {
    content: ''; position: absolute;
    top: -200px; left: 50%; transform: translateX(-50%);
    width: 600px; height: 600px; border-radius: 50%;
    background: radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 65%);
    pointer-events: none;
  }
  .dl-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 60px 60px; pointer-events: none;
  }
  .dl-card {
    width: 100%; max-width: 420px;
    background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px; padding: 36px 32px;
    box-shadow: 0 28px 80px rgba(0,0,0,0.7);
    position: relative; z-index: 1;
    animation: dl-in 0.35s ease;
  }
  @keyframes dl-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

  .dl-header { text-align: center; margin-bottom: 28px; }
  .dl-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
    box-shadow: 0 0 36px rgba(139,92,246,0.28);
  }
  .dl-title { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.4px; margin-bottom: 6px; }
  .dl-sub   { font-size: 13px; color: #444; }

  .dl-fallback-note {
    background: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.2);
    border-radius: 10px; padding: 10px 13px; font-size: 12px; color: #818cf8;
    margin-bottom: 20px; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5;
  }
  .dl-warn {
    background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.18);
    border-radius: 10px; padding: 10px 13px;
    font-size: 12.5px; color: #fbbf24; margin-bottom: 20px; text-align: center;
    font-family: 'JetBrains Mono', monospace;
  }
  .dl-err {
    background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.18);
    border-radius: 10px; padding: 10px 13px;
    font-size: 12.5px; color: #f87171; margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px;
  }

  .dl-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .dl-label { font-size: 11.5px; font-weight: 500; color: #666; display: flex; align-items: center; gap: 7px; }
  .dl-input {
    background: #0e0e0e; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px; padding: 11px 14px;
    color: #f0f0f0; font-size: 14px; font-family: 'Inter', sans-serif;
    outline: none; width: 100%; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .dl-input:focus { border-color: rgba(139,92,246,0.5); box-shadow: 0 0 0 3px rgba(139,92,246,0.08); }
  .dl-input::placeholder { color: #2e2e2e; }
  .dl-input:disabled { opacity: 0.4; cursor: not-allowed; }

  .dl-pw-wrap { position: relative; }
  .dl-pw-eye {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.07); background: transparent;
    color: #555; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.13s;
  }
  .dl-pw-eye:hover { color: #ccc; border-color: rgba(255,255,255,0.14); }

  .dl-attempts { display: flex; gap: 4px; margin: 8px 0; justify-content: center; }
  .dl-dot { width: 6px; height: 6px; border-radius: 50%; background: #222; transition: background 0.2s; }
  .dl-dot.used { background: rgba(239,68,68,0.6); }

  .dl-btn {
    width: 100%; padding: 12px; border-radius: 10px; border: none;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff; font-size: 14px; font-weight: 600;
    font-family: 'Inter', sans-serif; cursor: pointer;
    box-shadow: 0 4px 20px rgba(139,92,246,0.25);
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.15s; margin-top: 4px;
  }
  .dl-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
  .dl-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  .dl-footer-row {
    display: flex; align-items: center; justify-content: space-between; margin-top: 18px;
  }
  .dl-back { font-size: 12px; color: #555; background: none; border: none; cursor: pointer; padding: 0; transition: color 0.13s; font-family: 'Inter', sans-serif; }
  .dl-back:hover { color: #aaa; }
  .dl-ttl  { font-size: 11px; color: #333; font-family: 'JetBrains Mono', monospace; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 0.9s linear infinite; }
`;

const MAX_ATTEMPTS = 5;

export function DevLogin() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Already active → go straight to panel
  if (isDevActive()) {
    nav("/_dev/panel", { replace: true });
    return null;
  }

  const locked = attempts >= MAX_ATTEMPTS;

  async function login(e) {
    e?.preventDefault();
    if (locked) return;

    const u = username.trim();
    const p = password;
    if (!u || !p) { setError("Username and password are required."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dev/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        const next = attempts + 1;
        setAttempts(next);
        setPassword("");
        const msg = data.detail || "Invalid credentials.";
        const remaining = MAX_ATTEMPTS - next;
        setError(next >= MAX_ATTEMPTS
          ? "Too many failed attempts. Locked."
          : `${msg} ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
        );
        setLoading(false);
        return;
      }
      setDevSession(data.username);
      setLoading(false);
      nav("/_dev/panel", { replace: true });
    } catch {
      setError("Cannot reach server. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <>
      <style>{devLoginCss}</style>
      <div className="dl-root">
        <div className="dl-grid" />
        <div className="dl-card">
          <div className="dl-header">
            <div className="dl-icon"><Terminal size={22} color="#fff" /></div>
            <div className="dl-title">Developer Login</div>
            <div className="dl-sub">Restricted access — authorised personnel only</div>
          </div>


          {locked ? (
            <div className="dl-err"><ShieldAlert size={14} style={{ flexShrink: 0 }} /> Too many failed attempts. Reload the page to retry.</div>
          ) : error ? (
            <div className="dl-err"><ShieldAlert size={14} style={{ flexShrink: 0 }} />{error}</div>
          ) : null}

          <form onSubmit={login} noValidate>
            <div className="dl-field">
              <label className="dl-label"><User2 size={13} /> Username</label>
              <input className="dl-input" type="text"
                placeholder="Developer username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                autoComplete="username" disabled={loading || locked}
                autoFocus />
            </div>
            <div className="dl-field">
              <label className="dl-label"><Lock size={13} /> Password</label>
              <div className="dl-pw-wrap">
                <input className="dl-input"
                  type={showPw ? "text" : "password"}
                  placeholder="Developer password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading || locked}
                  style={{ paddingRight: 46 }} />
                <button type="button" className="dl-pw-eye" tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {attempts > 0 && (
              <div className="dl-attempts">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div key={i} className={`dl-dot${i < attempts ? " used" : ""}`} />
                ))}
              </div>
            )}

            <button className="dl-btn" type="submit" disabled={loading || locked}>
              {loading ? <><Loader2 size={15} className="spin" /> Verifying…</> : locked ? "Locked" : "Sign In"}
            </button>
          </form>

          <div className="dl-footer-row">
            <button className="dl-back" onClick={() => nav("/_dev")}>← Back to hub</button>
            <div className="dl-ttl">TTL: {DEV_TTL_MINUTES} min</div>
          </div>
        </div>
      </div>
    </>
  );
}