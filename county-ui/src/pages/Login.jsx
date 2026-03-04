import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Loader2, AlertTriangle,
  Lock, User2, ShieldCheck, Bell, Archive,
} from "lucide-react";
import { portalLogin } from "../api";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  .lg-root {
    min-height: 100vh; background: #000;
    display: grid; grid-template-columns: 1fr 480px;
    font-family: 'Inter', sans-serif; overflow: hidden;
  }
  @media (max-width: 920px) {
    .lg-root { grid-template-columns: 1fr; }
    .lg-left { display: none !important; }
  }

  /* ─── LEFT PANEL ─── */
  .lg-left {
    position: relative; background: #020818;
    border-right: 1px solid rgba(255,255,255,0.04);
    display: flex; flex-direction: column;
    padding: 44px 52px; overflow: hidden;
  }

  /* Animated ambient orbs */
  .lg-orb {
    position: absolute; border-radius: 50%; pointer-events: none;
  }
  .lg-orb1 {
    width: 700px; height: 700px; top: -260px; left: -220px;
    background: radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 60%);
    animation: lg-float1 20s ease-in-out infinite;
  }
  .lg-orb2 {
    width: 560px; height: 560px; bottom: -180px; right: -120px;
    background: radial-gradient(circle, rgba(109,40,217,0.09) 0%, transparent 65%);
    animation: lg-float2 26s ease-in-out infinite;
  }
  .lg-orb3 {
    width: 320px; height: 320px; top: 50%; left: 52%;
    background: radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 65%);
    animation: lg-float3 16s ease-in-out infinite;
  }
  @keyframes lg-float1 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(32px,45px)} 66%{transform:translate(-22px,18px)} }
  @keyframes lg-float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-28px,-22px)} }
  @keyframes lg-float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(18px,-28px)} }

  .lg-grid-bg {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 56px 56px; pointer-events: none;
  }

  /* Brand */
  .lg-brand { display: flex; align-items: center; gap: 13px; position: relative; z-index: 2; }
  .lg-brand-mark {
    width: 38px; height: 38px; border-radius: 10px;
    background: linear-gradient(135deg, #1d4ed8, #4338ca);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #fff; letter-spacing: -0.3px;
    box-shadow: 0 0 28px rgba(29,78,216,0.35), inset 0 1px 0 rgba(255,255,255,0.12);
  }
  .lg-brand-name { font-size: 16px; font-weight: 700; color: #e2e8f0; letter-spacing: -0.3px; }
  .lg-brand-sub  { font-size: 11px; color: #4a6fa5; letter-spacing: 0.2px; }

  /* Hero area */
  .lg-left-body {
    flex: 1; display: flex; flex-direction: column; justify-content: center;
    position: relative; z-index: 2; padding: 16px 0;
  }

  .lg-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(37,99,235,0.12); border: 1px solid rgba(37,99,235,0.25);
    color: #93c5fd; font-size: 11px; font-weight: 600;
    letter-spacing: 1.2px; text-transform: uppercase;
    padding: 5px 12px; border-radius: 999px; margin-bottom: 26px; width: fit-content;
  }
  .lg-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #3b82f6; animation: lg-blink 2s ease-in-out infinite; }
  @keyframes lg-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .lg-headline {
    font-size: 62px; font-weight: 800; color: #fff;
    line-height: 0.98; letter-spacing: -3px; margin-bottom: 24px;
  }
  .lg-headline em {
    font-style: normal;
    background: linear-gradient(130deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }

  .lg-desc {
    font-size: 16px; color: #7c9ab8; line-height: 1.72;
    max-width: 400px; margin-bottom: 40px; font-weight: 400;
  }

  /* Feature cards */
  .lg-features { display: flex; flex-direction: column; gap: 9px; max-width: 390px; }
  .lg-feature {
    display: flex; align-items: center; gap: 13px;
    background: rgba(255,255,255,0.022); border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px; padding: 13px 15px;
    transition: border-color 0.2s, background 0.2s;
  }
  .lg-feature:hover { background: rgba(255,255,255,0.034); border-color: rgba(255,255,255,0.08); }
  .lg-feature-ico {
    width: 34px; height: 34px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .lg-feature-name { font-size: 14px; font-weight: 600; color: #cbd5e1; margin-bottom: 2px; }
  .lg-feature-desc { font-size: 13px; color: #64748b; }

  .lg-left-foot { position: relative; z-index: 2; font-size: 12px; color: #3d5a7a; margin-top: 28px; }

  /* ─── RIGHT PANEL ─── */
  .lg-right {
    background: #000;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 32px 48px; position: relative;
  }
  .lg-right::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% -10%, rgba(37,99,235,0.05) 0%, transparent 55%);
    pointer-events: none;
  }

  .lg-form-wrap {
    width: 100%; max-width: 362px;
    animation: lg-in 0.42s cubic-bezier(.16,1,.3,1);
    position: relative; z-index: 1;
  }
  @keyframes lg-in { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }

  .lg-form-logo {
    width: 48px; height: 48px; border-radius: 13px;
    background: linear-gradient(135deg, #1d4ed8, #4338ca);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 800; color: #fff; margin-bottom: 22px;
    box-shadow: 0 0 44px rgba(29,78,216,0.22), 0 0 0 1px rgba(255,255,255,0.07);
  }
  .lg-form-title { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.8px; margin-bottom: 6px; }
  .lg-form-sub   { font-size: 15px; color: #6b7280; margin-bottom: 28px; }

  .lg-alert {
    border-radius: 10px; padding: 11px 14px; font-size: 13.5px;
    margin-bottom: 16px; line-height: 1.4;
    display: flex; gap: 9px; align-items: flex-start;
  }
  .lg-alert.err  { background: rgba(239,68,68,0.07);  border: 1px solid rgba(239,68,68,0.18);  color: #f87171; }
  .lg-alert.warn { background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.18); color: #fbbf24; }

  .lg-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .lg-label { font-size: 13px; font-weight: 600; color: #9ca3af; display: flex; align-items: center; gap: 7px; letter-spacing: 0.2px; }
  .lg-input {
    background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 11px; padding: 13px 15px;
    color: #f1f5f9; font-size: 15px; font-family: 'Inter', sans-serif;
    outline: none; width: 100%; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .lg-input:focus { border-color: rgba(59,130,246,0.55); box-shadow: 0 0 0 3px rgba(59,130,246,0.09); }
  .lg-input::placeholder { color: #1c1c1c; }
  .lg-input:disabled { opacity: 0.4; cursor: not-allowed; }

  .lg-pw-wrap { position: relative; }
  .lg-pw-eye {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.06); background: transparent;
    color: #2d3748; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.13s;
  }
  .lg-pw-eye:hover { color: #9ca3af; border-color: rgba(255,255,255,0.11); background: rgba(255,255,255,0.04); }

  .lg-divider { height: 1px; background: rgba(255,255,255,0.055); margin: 16px 0 14px; }
  .lg-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 18px; }
  .lg-check { display: inline-flex; align-items: center; gap: 8px; color: #6b7280; font-size: 13.5px; cursor: pointer; user-select: none; }
  .lg-check input { accent-color: #3b82f6; cursor: pointer; }
  .lg-fgt { color: #60a5fa; font-size: 13.5px; background: none; border: none; cursor: pointer; padding: 0; font-family: 'Inter', sans-serif; transition: opacity 0.13s; }
  .lg-fgt:hover { opacity: 0.8; }

  .lg-btn {
    width: 100%; padding: 14px; border-radius: 11px; border: none;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: #fff; font-size: 16px; font-weight: 600;
    font-family: 'Inter', sans-serif; cursor: pointer;
    box-shadow: 0 4px 24px rgba(37,99,235,0.32), 0 1px 2px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.18s; letter-spacing: -0.2px;
  }
  .lg-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
    box-shadow: 0 6px 32px rgba(37,99,235,0.42), 0 1px 2px rgba(0,0,0,0.5);
    transform: translateY(-1px);
  }
  .lg-btn:active:not(:disabled) { transform: translateY(0); }
  .lg-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  .lg-tip {
    margin-top: 20px; font-size: 13.5px; color: #4b5563;
    text-align: center; line-height: 1.65;
  }
  .lg-tip strong { color: #6b7280; }

  .lg-footer {
    position: fixed; bottom: 18px; left: 0; right: 0;
    text-align: center; font-size: 12px; color: #374151;
    pointer-events: none;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 0.9s linear infinite; }
`;

const FEATURES = [
  {
    icon: <ShieldCheck size={16} />,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    name: "Role-Based Access Control",
    desc: "County Admin, Manager & Employee permissions",
  },
  {
    icon: <Bell size={16} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.11)",
    name: "Real-Time Low Stock Alerts",
    desc: "Instant visibility on critical inventory levels",
  },
  {
    icon: <Archive size={16} />,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.11)",
    name: "Complete Audit Trail",
    desc: "Every change tracked across all departments",
  },
];

export default function Login() {
  const nav = useNavigate();

  const remembered = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("rememberLogin") || "null"); }
    catch { return null; }
  }, []);

  const [username,   setUsername]   = useState(remembered?.username || "");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(!!remembered);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [capsWarn,   setCapsWarn]   = useState(false);

  const userRef = useRef(null);
  const pwRef   = useRef(null);

  useEffect(() => {
    if (username) pwRef.current?.focus();
    else userRef.current?.focus();
  }, []); // eslint-disable-line

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("Please enter your username."); return; }
    if (!password)        { setError("Please enter your password."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login/", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Login failed.");
        setLoading(false);
        return;
      }
      portalLogin({ username: data.username, role: data.role, deptCode: data.department_code });
      if (rememberMe) {
        localStorage.setItem("rememberLogin", JSON.stringify({ username: data.username }));
      } else {
        localStorage.removeItem("rememberLogin");
      }
      nav("/dashboard", { replace: true });
    } catch {
      setError("Cannot reach server. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="lg-root">

        {/* ── LEFT PANEL ── */}
        <div className="lg-left">
          <div className="lg-orb lg-orb1" />
          <div className="lg-orb lg-orb2" />
          <div className="lg-orb lg-orb3" />
          <div className="lg-grid-bg" />

          {/* Brand */}
          <div className="lg-brand">
            <div className="lg-brand-mark">ISSI</div>
            <div>
              <div className="lg-brand-name">UIMS</div>
              <div className="lg-brand-sub">International Software Systems, Inc.</div>
            </div>
          </div>

          {/* Hero */}
          <div className="lg-left-body">
            <div className="lg-badge">
              <span className="lg-badge-dot" />
              Unified County Platform
            </div>

            <div className="lg-headline">
              One System.<br />
              <em>Every Asset.</em><br />
              Full Control.
            </div>

            <div className="lg-desc">
              Manage assets, consumables, low‑stock alerts, and audit history
              across every county department — from a single, unified platform.
            </div>

            <div className="lg-features">
              {FEATURES.map((f) => (
                <div key={f.name} className="lg-feature">
                  <div className="lg-feature-ico" style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <div>
                    <div className="lg-feature-name">{f.name}</div>
                    <div className="lg-feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg-left-foot">© 2026 International Software Systems, Inc.</div>
        </div>

        {/* ── RIGHT FORM ── */}
        <div className="lg-right">
          <div className="lg-form-wrap">
            <div className="lg-form-logo">ISSI</div>
            <div className="lg-form-title">Welcome back</div>
            <div className="lg-form-sub">Sign in to your UIMS account</div>

            {error && (
              <div className="lg-alert err" role="alert">
                <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
            {capsWarn && !error && (
              <div className="lg-alert warn" role="status">
                <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                <span><strong>Caps Lock is on</strong> — may cause password errors.</span>
              </div>
            )}

            <form onSubmit={submit} noValidate>
              <div className="lg-field">
                <label className="lg-label"><User2 size={12} /> Username</label>
                <input
                  ref={userRef}
                  className="lg-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="lg-field">
                <label className="lg-label"><Lock size={12} /> Password</label>
                <div className="lg-pw-wrap">
                  <input
                    ref={pwRef}
                    className="lg-input"
                    placeholder="Enter your password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsWarn(e.getModifierState?.("CapsLock") || false)}
                    autoComplete="current-password"
                    disabled={loading}
                    style={{ paddingRight: 48 }}
                  />
                  <button type="button" className="lg-pw-eye" tabIndex={-1}
                    onClick={() => setShowPw((v) => !v)}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="lg-divider" />
              <div className="lg-row">
                <label className="lg-check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="lg-fgt"
                  onClick={() => alert("Contact your system administrator to reset your password.")}
                >
                  Need help?
                </button>
              </div>

              <button className="lg-btn" type="submit" disabled={loading}>
                {loading
                  ? <><Loader2 size={15} className="spin" /> Signing in…</>
                  : "Sign In →"}
              </button>
            </form>

            <div className="lg-tip">
              Sign in with your county-issued credentials.<br />
              <strong>Contact your administrator</strong> if you're having trouble.
            </div>
          </div>
        </div>

      </div>
      <div className="lg-footer">© 2026 International Software Systems, Inc. · All rights reserved.</div>
    </>
  );
}
