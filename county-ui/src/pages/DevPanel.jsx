/**
 * pages/DevPanel.jsx
 *
 * Tabs:
 *   flags    — Feature Flags (8 toggles, reset, export JSON)
 *   diag     — Diagnostics (8 endpoints, copy report, last-run timestamp)
 *   announce — Announcement Banner editor
 *   session  — Session info + Extend Session button
 *   profile  — Developer profile + Change Password form
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { devApi } from "../api";
import "../styles/dev.css";

const DEV_TTL_MINUTES = 30;
const nowMs = () => Date.now();

const isDevActive = () => {
  const key = localStorage.getItem("devKey") || "";
  const t   = parseInt(localStorage.getItem("devKeyTime") || "0", 10);
  if (!key || !t) return false;
  return (nowMs() - t) / 60000 <= DEV_TTL_MINUTES;
};

const lockDev = () => {
  localStorage.removeItem("devKey");
  localStorage.removeItem("devKeyTime");
  localStorage.removeItem("devUsername");
};

const getFlag = (k, d = false) => {
  const raw = localStorage.getItem(k);
  return raw === null ? d : raw === "true";
};
const setFlag = (k, v) => localStorage.setItem(k, v ? "true" : "false");

const DEFAULT_FLAGS = {
  FF_ENABLE_IMPORT:      { label: "Enable Import",      hint: "Allow data import actions",                           default: true  },
  FF_ENABLE_EXPORT:      { label: "Enable Export",      hint: "Allow data export/download",                          default: true  },
  FF_ENABLE_AUDIT:       { label: "Show Audit Logs",    hint: "Audit log tab visible",                               default: true  },
  FF_ADMIN_ACTIONS:      { label: "Admin Actions",      hint: "Write operations for admins",                         default: true  },
  FF_SHOW_SEARCH:        { label: "Global Search",      hint: "Top search bar visible",                              default: true  },
  FF_MAINTENANCE_MODULE: { label: "Maintenance Module", hint: "Show /maintenance route",                             default: true  },
  FF_REQUEST_MODULE:     { label: "Requests Module",    hint: "Show /requests route",                                default: true  },
  FF_CHARTS_DASHBOARD:   { label: "Dashboard Charts",   hint: "Show chart components",                               default: true  },
  FF_SEED_UNLOCK:       { label: "Unlock Seed Data", hint: "Show real DB seed data only after Apply (adds unlock headers)", default: false },
};

const DIAG_ENDPOINTS = [
  { key: "assets",      label: "Assets API",       url: "/api/assets/?page_size=1",         field: "count"   },
  { key: "consumables", label: "Consumables API",   url: "/api/consumables/?page_size=1",    field: "count"   },
  { key: "lowstock",    label: "Low Stock API",     url: "/api/consumables/low-stock/",      field: "count"   },
  { key: "auditlogs",   label: "Audit Logs API",    url: "/api/auditlogs/?page_size=1",      field: "count"   },
  { key: "users",       label: "Users API",         url: "/api/users/?page_size=1",          field: "count"   },
  { key: "maintenance", label: "Maintenance API",   url: "/api/maintenance/?page_size=1",    field: "count"   },
  { key: "requests",    label: "Requests API",      url: "/api/requests/?page_size=1",       field: "count"   },
  { key: "devstatus",   label: "Dev Status",        url: "/api/dev/status/",                 field: "message" },
];

const panelCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  .dp-wrap {
    min-height: 100vh; background: #000; color: #e0e0e0;
    font-family: 'Inter', sans-serif;
  }

  .dp-topbar {
    position: sticky; top: 0; z-index: 50;
    background: rgba(0,0,0,0.92); backdrop-filter: blur(18px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 0 28px; height: 56px;
    display: flex; align-items: center; gap: 16px;
  }
  .dp-topbar-mark {
    width: 30px; height: 30px; border-radius: 8px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0;
    box-shadow: 0 0 16px rgba(139,92,246,0.3);
  }
  .dp-topbar-title { font-size: 14px; font-weight: 600; color: #fff; letter-spacing: -0.2px; }
  .dp-topbar-sub   { font-size: 11px; color: #444; }
  .dp-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }

  .dp-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 999px; font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    border: 1px solid rgba(255,255,255,0.08); background: #0d0d0d; color: #666;
  }
  .dp-pill.ok   { border-color: rgba(16,185,129,0.3);  color: #10b981; background: rgba(16,185,129,0.06); }
  .dp-pill.bad  { border-color: rgba(239,68,68,0.3);   color: #f87171; background: rgba(239,68,68,0.06); }
  .dp-pill.warn { border-color: rgba(245,158,11,0.3);  color: #fbbf24; background: rgba(245,158,11,0.06); }
  .dp-pill-dot  { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

  .dp-topbar-btn {
    padding: 6px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 500;
    font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.13s;
    border: 1px solid rgba(255,255,255,0.08); background: #0d0d0d; color: #888;
  }
  .dp-topbar-btn:hover { border-color: rgba(255,255,255,0.15); color: #ccc; background: #141414; }
  .dp-topbar-btn.danger { border-color: rgba(239,68,68,0.25); color: #f87171; }
  .dp-topbar-btn.danger:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.4); }
  .dp-topbar-btn.extend { border-color: rgba(16,185,129,0.25); color: #10b981; }
  .dp-topbar-btn.extend:hover { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.4); }

  .dp-timer-bar {
    height: 2px; background: rgba(255,255,255,0.04); position: relative; overflow: hidden;
  }
  .dp-timer-fill {
    height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6);
    transition: width 1s linear;
  }
  .dp-timer-fill.warn  { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
  .dp-timer-fill.crit  { background: linear-gradient(90deg, #ef4444, #f87171); }

  .dp-body { max-width: 1100px; margin: 0 auto; padding: 32px 28px; }

  .dp-tabs {
    display: flex; gap: 2px; margin-bottom: 28px;
    background: #0a0a0a; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 11px; padding: 4px;
  }
  .dp-tab {
    flex: 1; padding: 9px 16px; border-radius: 8px; border: none;
    background: transparent; color: #555; font-size: 13px; font-weight: 500;
    font-family: 'Inter', sans-serif; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: all 0.15s;
  }
  .dp-tab:hover { color: #aaa; background: #111; }
  .dp-tab.active {
    background: #1a1a1a; color: #f0f0f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.5);
  }
  .dp-tab-badge {
    background: rgba(139,92,246,0.15); color: #8b5cf6;
    font-size: 10px; font-weight: 700; padding: 1px 6px;
    border-radius: 999px; font-family: 'JetBrains Mono', monospace;
  }

  .dp-section-title {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.8px; color: #444; margin-bottom: 12px;
  }

  /* ── Feature Flags ── */
  .dp-flags-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px; margin-bottom: 20px;
  }
  .dp-flag-card {
    background: #0c0c0c; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 14px 16px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    transition: border-color 0.15s;
  }
  .dp-flag-card:hover { border-color: rgba(255,255,255,0.11); }
  .dp-flag-card.on  { border-color: rgba(16,185,129,0.2); background: rgba(16,185,129,0.03); }
  .dp-flag-card.off { border-color: rgba(239,68,68,0.15); }
  .dp-flag-label { font-size: 13px; font-weight: 500; color: #d0d0d0; }
  .dp-flag-hint  { font-size: 11px; color: #444; margin-top: 2px; font-family: 'JetBrains Mono', monospace; }

  .dp-switch {
    width: 40px; height: 22px; border-radius: 11px; border: none;
    background: #1e1e1e; cursor: pointer; position: relative;
    flex-shrink: 0; transition: background 0.2s;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .dp-switch.on { background: #10b981; border-color: transparent; }
  .dp-switch-knob {
    position: absolute; width: 16px; height: 16px; border-radius: 50%;
    background: #444; top: 2px; left: 2px;
    transition: transform 0.2s, background 0.2s;
  }
  .dp-switch.on .dp-switch-knob { transform: translateX(18px); background: #fff; }

  .dp-flag-actions { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
  .dp-btn {
    padding: 8px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 500;
    font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.13s;
    border: 1px solid rgba(255,255,255,0.08); background: #0d0d0d; color: #888;
  }
  .dp-btn:hover { border-color: rgba(255,255,255,0.15); color: #ccc; background: #141414; }
  .dp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .dp-btn.primary { background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.3); color: #818cf8; }
  .dp-btn.primary:hover { background: rgba(99,102,241,0.18); }
  .dp-btn.success { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
  .dp-btn.success:hover { background: rgba(16,185,129,0.16); }
  .dp-btn.danger  { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); color: #f87171; }
  .dp-btn.danger:hover  { background: rgba(239,68,68,0.14); }

  /* ── Diagnostics ── */
  .dp-diag-row {
    background: #0c0c0c; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 14px 16px; margin-bottom: 8px;
    display: flex; align-items: center; gap: 14px;
  }
  .dp-diag-icon {
    width: 34px; height: 34px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; flex-shrink: 0;
  }
  .dp-diag-icon.idle    { background: #151515; }
  .dp-diag-icon.running { background: rgba(99,102,241,0.12); animation: dp-pulse 1s ease-in-out infinite; }
  .dp-diag-icon.ok      { background: rgba(16,185,129,0.12); }
  .dp-diag-icon.err     { background: rgba(239,68,68,0.12); }
  @keyframes dp-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  .dp-diag-name  { font-size: 13px; font-weight: 500; color: #ccc; }
  .dp-diag-value { font-size: 11.5px; color: #555; margin-top: 2px; font-family: 'JetBrains Mono', monospace; }
  .dp-diag-value.ok  { color: #10b981; }
  .dp-diag-value.err { color: #f87171; }
  .dp-diag-ms    { margin-left: auto; font-size: 11px; color: #333; font-family: 'JetBrains Mono', monospace; }

  /* ── Announcement ── */
  .dp-ann-card {
    background: #0c0c0c; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px; padding: 20px;
  }
  .dp-ann-label { font-size: 13px; font-weight: 500; color: #ccc; margin-bottom: 4px; }
  .dp-ann-hint  { font-size: 12px; color: #444; margin-bottom: 14px; }
  .dp-textarea {
    width: 100%; background: #0e0e0e; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px; padding: 12px 14px;
    color: #d0d0d0; font-size: 13px; font-family: 'Inter', sans-serif;
    resize: vertical; outline: none; min-height: 90px;
    transition: border-color 0.15s;
  }
  .dp-textarea:focus { border-color: rgba(99,102,241,0.4); }
  .dp-textarea::placeholder { color: #2a2a2a; }

  /* ── Session ── */
  .dp-session-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .dp-session-card {
    background: #0c0c0c; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 16px;
  }
  .dp-session-key   { font-size: 11px; color: #444; font-family: 'JetBrains Mono', monospace; margin-bottom: 6px; }
  .dp-session-val   { font-size: 18px; font-weight: 600; color: #fff; font-family: 'JetBrains Mono', monospace; }
  .dp-session-val.warn { color: #fbbf24; }
  .dp-session-val.crit { color: #f87171; }

  /* ── Profile tab ── */
  .dp-profile-head {
    display: flex; align-items: center; gap: 18px;
    background: #0c0c0c; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px; padding: 22px; margin-bottom: 14px;
  }
  .dp-avatar {
    width: 60px; height: 60px; border-radius: 14px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 700; color: #fff; flex-shrink: 0;
    box-shadow: 0 0 28px rgba(139,92,246,0.3); letter-spacing: -1px;
  }
  .dp-profile-name { font-size: 19px; font-weight: 700; color: #fff; margin-bottom: 5px; }
  .dp-profile-role {
    display: inline-block;
    font-size: 11px; font-family: 'JetBrains Mono', monospace;
    background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.25);
    color: #8b5cf6; padding: 2px 9px; border-radius: 999px;
  }
  .dp-profile-sub { font-size: 12px; color: #555; margin-top: 4px; }

  .dp-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .dp-info-card {
    background: #0c0c0c; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 14px 16px;
  }
  .dp-info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #444; margin-bottom: 6px; font-weight: 600; }
  .dp-info-val { font-size: 13px; color: #bbb; font-family: 'JetBrains Mono', monospace; word-break: break-all; }

  .dp-pw-card {
    background: #0c0c0c; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px; padding: 20px; margin-top: 4px;
  }
  .dp-pw-title { font-size: 14px; font-weight: 600; color: #ccc; margin-bottom: 4px; }
  .dp-pw-sub   { font-size: 12px; color: #444; margin-bottom: 16px; }
  .dp-pw-grid  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  @media (max-width: 680px) { .dp-pw-grid { grid-template-columns: 1fr; } }
  .dp-pw-field { display: flex; flex-direction: column; gap: 5px; }
  .dp-pw-label { font-size: 11px; font-weight: 500; color: #555; letter-spacing: 0.3px; }
  .dp-pw-input {
    background: #0e0e0e; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; padding: 10px 12px;
    color: #e0e0e0; font-size: 13px; font-family: 'Inter', sans-serif;
    outline: none; width: 100%; transition: border-color 0.15s;
  }
  .dp-pw-input:focus { border-color: rgba(139,92,246,0.45); box-shadow: 0 0 0 3px rgba(139,92,246,0.07); }
  .dp-pw-input:disabled { opacity: 0.35; cursor: not-allowed; }
  .dp-pw-err {
    background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2);
    border-radius: 8px; padding: 9px 12px; font-size: 12px; color: #f87171; margin-bottom: 12px;
    display: flex; align-items: center; gap: 7px;
  }
  .dp-pw-ok {
    background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.2);
    border-radius: 8px; padding: 9px 12px; font-size: 12px; color: #10b981; margin-bottom: 12px;
    display: flex; align-items: center; gap: 7px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  .dp-spin { animation: spin 0.8s linear infinite; display: inline-block; }

  /* ── Users Tab ── */
  .dp-users-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:12px; flex-wrap:wrap; }
  .dp-users-search {
    flex:1; min-width:220px; max-width:360px;
    background:#0e0e0e; border:1px solid rgba(255,255,255,0.08);
    border-radius:8px; padding:9px 13px; color:#d0d0d0;
    font-size:13px; font-family:'Inter',sans-serif; outline:none;
    transition:border-color 0.15s;
  }
  .dp-users-search:focus { border-color:rgba(139,92,246,0.4); }
  .dp-users-search::placeholder { color:#2a2a2a; }
  .dp-users-count { font-size:12px; color:#444; font-family:'JetBrains Mono',monospace; white-space:nowrap; }
  .dp-users-wrap { border:1px solid rgba(255,255,255,0.07); border-radius:12px; overflow:hidden; }
  .dp-users-table { width:100%; border-collapse:collapse; font-size:13px; }
  .dp-users-table thead tr { background:#0c0c0c; border-bottom:1px solid rgba(255,255,255,0.07); }
  .dp-users-table th {
    padding:10px 16px; text-align:left;
    font-size:10px; font-weight:600; text-transform:uppercase;
    letter-spacing:0.7px; color:#3a3a3a;
  }
  .dp-users-row { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.12s; }
  .dp-users-row:last-child { border-bottom:none; }
  .dp-users-row:hover { background:#0d0d0d; }
  .dp-users-cell { padding:11px 16px; color:#888; vertical-align:middle; }
  .dp-users-mono { font-family:'JetBrains Mono',monospace; font-size:12px; color:#c0c0c0; font-weight:500; }
  .dp-users-empty { text-align:center; color:#333; padding:32px 0; }

  /* light mode — users table */
  .dp-wrap.dp-light .dp-users-search { background:#f8fafc; border-color:rgba(0,0,0,0.09); color:#1e293b; }
  .dp-wrap.dp-light .dp-users-search::placeholder { color:#cbd5e1; }
  .dp-wrap.dp-light .dp-users-count { color:#94a3b8; }
  .dp-wrap.dp-light .dp-users-wrap { border-color:rgba(0,0,0,0.08); }
  .dp-wrap.dp-light .dp-users-table thead tr { background:#f8fafc; border-color:rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-users-table th { color:#94a3b8; }
  .dp-wrap.dp-light .dp-users-row { border-color:rgba(0,0,0,0.04); }
  .dp-wrap.dp-light .dp-users-row:hover { background:#f1f5f9; }
  .dp-wrap.dp-light .dp-users-cell { color:#64748b; }
  .dp-wrap.dp-light .dp-users-mono { color:#1e293b; }
  .dp-wrap.dp-light .dp-users-empty { color:#94a3b8; }

  /* ── Env Badge ── */
  .dp-env-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 999px; font-size: 10px;
    font-family: 'JetBrains Mono', monospace; font-weight: 600;
    letter-spacing: 0.5px; border: 1px solid transparent; user-select: none;
  }
  .dp-env-badge.local { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.25); color: #fbbf24; }
  .dp-env-badge.prod  { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.25);  color: #818cf8; }
  .dp-env-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

  /* ── User Dropdown ── */
  .dp-user-wrap { position: relative; }
  .dp-user-btn {
    display: flex; align-items: center; gap: 9px;
    padding: 5px 10px 5px 5px; border-radius: 10px;
    background: transparent; border: 1px solid rgba(255,255,255,0.07);
    cursor: pointer; transition: all 0.14s; font-family: 'Inter', sans-serif;
  }
  .dp-user-btn:hover { background: #111; border-color: rgba(255,255,255,0.13); }
  .dp-user-av {
    width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: 10.5px; font-weight: 700; color: #fff; letter-spacing: -0.5px;
  }
  .dp-user-info-name { font-size: 12.5px; font-weight: 600; color: #d0d0d0; line-height: 1.2; }
  .dp-user-info-role { font-size: 10px; color: #555; font-family: 'JetBrains Mono', monospace; }
  .dp-user-chevron { font-size: 9px; color: #444; margin-left: 2px; transition: transform 0.15s; }
  .dp-user-btn.open .dp-user-chevron { transform: rotate(180deg); color: #888; }

  .dp-user-drop {
    position: absolute; top: calc(100% + 8px); right: 0; z-index: 300;
    min-width: 210px; background: #0f0f0f; border: 1px solid rgba(255,255,255,0.09);
    border-radius: 13px; padding: 6px; box-shadow: 0 20px 60px rgba(0,0,0,0.8);
    animation: dp-drop-in 0.12s ease;
  }
  @keyframes dp-drop-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }

  .dp-user-drop-head {
    padding: 10px 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 5px;
  }
  .dp-user-drop-name { font-size: 13px; font-weight: 600; color: #e0e0e0; margin-bottom: 5px; }
  .dp-user-drop-badge {
    font-size: 10px; font-family: 'JetBrains Mono', monospace;
    background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.22);
    color: #8b5cf6; padding: 2px 9px; border-radius: 999px; display: inline-block;
  }

  .dp-user-item {
    display: flex; align-items: center; gap: 9px;
    padding: 9px 12px; border-radius: 8px; width: 100%;
    background: transparent; border: none; text-align: left;
    font-size: 13px; color: #aaa; font-family: 'Inter', sans-serif;
    cursor: pointer; transition: all 0.12s;
  }
  .dp-user-item:hover { background: #1c1c1c; color: #e0e0e0; }
  .dp-user-item.danger { color: #f87171; }
  .dp-user-item.danger:hover { background: rgba(239,68,68,0.08); color: #fca5a5; }
  .dp-user-item-icon { width: 18px; text-align: center; font-size: 13px; flex-shrink: 0; }
  .dp-user-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 5px 0; }

  /* ── Light Mode overrides ── */
  .dp-wrap.dp-light { background: #f1f5f9; color: #1e293b; }
  .dp-wrap.dp-light .dp-topbar {
    background: rgba(248,250,252,0.95); border-color: rgba(0,0,0,0.08);
  }
  .dp-wrap.dp-light .dp-topbar-title { color: #0f172a; }
  .dp-wrap.dp-light .dp-topbar-sub   { color: #94a3b8; }
  .dp-wrap.dp-light .dp-topbar-btn   { background: #fff; border-color: rgba(0,0,0,0.1); color: #475569; }
  .dp-wrap.dp-light .dp-topbar-btn:hover { background: #f8fafc; color: #1e293b; }
  .dp-wrap.dp-light .dp-topbar-btn.extend { border-color: rgba(16,185,129,0.3); color: #059669; }
  .dp-wrap.dp-light .dp-topbar-btn.danger { border-color: rgba(239,68,68,0.3); color: #dc2626; }
  .dp-wrap.dp-light .dp-user-btn { border-color: rgba(0,0,0,0.1); }
  .dp-wrap.dp-light .dp-user-btn:hover { background: #e8edf4; }
  .dp-wrap.dp-light .dp-user-info-name { color: #1e293b; }
  .dp-wrap.dp-light .dp-user-info-role { color: #94a3b8; }
  .dp-wrap.dp-light .dp-user-drop { background: #fff; border-color: rgba(0,0,0,0.09); box-shadow: 0 16px 48px rgba(0,0,0,0.15); }
  .dp-wrap.dp-light .dp-user-drop-name { color: #1e293b; }
  .dp-wrap.dp-light .dp-user-item { color: #64748b; }
  .dp-wrap.dp-light .dp-user-item:hover { background: #f1f5f9; color: #1e293b; }
  .dp-wrap.dp-light .dp-user-divider { background: rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-tabs { background: #fff; border-color: rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-tab { color: #94a3b8; }
  .dp-wrap.dp-light .dp-tab:hover { background: #f8fafc; color: #475569; }
  .dp-wrap.dp-light .dp-tab.active { background: #f1f5f9; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .dp-wrap.dp-light .dp-flag-card { background: #fff; border-color: rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-flag-label { color: #1e293b; }
  .dp-wrap.dp-light .dp-flag-hint  { color: #94a3b8; }
  .dp-wrap.dp-light .dp-switch { background: #e2e8f0; border-color: rgba(0,0,0,0.1); }
  .dp-wrap.dp-light .dp-switch-knob { background: #94a3b8; }
  .dp-wrap.dp-light .dp-diag-row { background: #fff; border-color: rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-diag-name  { color: #1e293b; }
  .dp-wrap.dp-light .dp-diag-value { color: #94a3b8; }
  .dp-wrap.dp-light .dp-diag-icon.idle { background: #f1f5f9; }
  .dp-wrap.dp-light .dp-session-card { background: #fff; border-color: rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-session-key  { color: #94a3b8; }
  .dp-wrap.dp-light .dp-session-val  { color: #0f172a; }
  .dp-wrap.dp-light .dp-ann-card { background: #fff; border-color: rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-ann-label { color: #1e293b; }
  .dp-wrap.dp-light .dp-ann-hint  { color: #94a3b8; }
  .dp-wrap.dp-light .dp-textarea {
    background: #f8fafc; border-color: rgba(0,0,0,0.09); color: #1e293b;
  }
  .dp-wrap.dp-light .dp-textarea::placeholder { color: #cbd5e1; }
  .dp-wrap.dp-light .dp-section-title { color: #94a3b8; }
  .dp-wrap.dp-light .dp-profile-head { background: #fff; border-color: rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-profile-name { color: #0f172a; }
  .dp-wrap.dp-light .dp-profile-sub  { color: #94a3b8; }
  .dp-wrap.dp-light .dp-info-card { background: #fff; border-color: rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-info-label { color: #94a3b8; }
  .dp-wrap.dp-light .dp-info-val   { color: #334155; }
  .dp-wrap.dp-light .dp-pw-card { background: #fff; border-color: rgba(0,0,0,0.07); }
  .dp-wrap.dp-light .dp-pw-title { color: #1e293b; }
  .dp-wrap.dp-light .dp-pw-sub   { color: #94a3b8; }
  .dp-wrap.dp-light .dp-pw-label { color: #64748b; }
  .dp-wrap.dp-light .dp-pw-input { background: #f8fafc; border-color: rgba(0,0,0,0.09); color: #1e293b; }
  .dp-wrap.dp-light .dp-btn { background: #fff; border-color: rgba(0,0,0,0.1); color: #475569; }
  .dp-wrap.dp-light .dp-btn:hover { background: #f8fafc; color: #1e293b; }
  .dp-wrap.dp-light .dp-pill { background: #fff; border-color: rgba(0,0,0,0.1); color: #64748b; }
  .dp-wrap.dp-light .dp-pill.ok   { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.25); color: #059669; }
  .dp-wrap.dp-light .dp-pill.bad  { background: rgba(239,68,68,0.06);  border-color: rgba(239,68,68,0.25);  color: #dc2626; }
  .dp-wrap.dp-light .dp-pill.warn { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.25); color: #d97706; }
  .dp-wrap.dp-light .dp-timer-bar { background: rgba(0,0,0,0.06); }
`;

function Toggle({ value, onChange }) {
  return (
    <button type="button" className={`dp-switch${value ? " on" : ""}`} onClick={onChange}>
      <span className="dp-switch-knob" />
    </button>
  );
}

export default function DevPanel() {
  const nav = useNavigate();

  const [apiOk,   setApiOk]   = useState(null);
  const [tab,     setTab]     = useState("flags");
  const [flags,   setFlags]   = useState(() =>
    Object.fromEntries(Object.entries(DEFAULT_FLAGS).map(([k, v]) => [k, getFlag(k, v.default)]))
  );

  // Live countdown
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const t = parseInt(localStorage.getItem("devKeyTime") || "0", 10);
    if (!t) return 0;
    return Math.max(0, Math.round(DEV_TTL_MINUTES * 60 - (nowMs() - t) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); lockDev(); nav("/_dev", { replace: true }); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [nav]);

  const minsLeft = Math.floor(secondsLeft / 60);
  const secsLeft = secondsLeft % 60;
  const pct      = (secondsLeft / (DEV_TTL_MINUTES * 60)) * 100;
  const timerCls = pct < 10 ? "crit" : pct < 25 ? "warn" : "";

  const devUser = localStorage.getItem("devUsername") || "—";

  // Session extend
  function extendSession() {
    localStorage.setItem("devKeyTime", String(nowMs()));
    setSecondsLeft(DEV_TTL_MINUTES * 60);
  }

  // Diagnostics
  const [diagResults, setDiagResults] = useState(() =>
    Object.fromEntries(DIAG_ENDPOINTS.map((d) => [d.key, { status: "idle", value: "", ms: null }]))
  );
  const [diagRunning,  setDiagRunning]  = useState(false);
  const [diagLastRun,  setDiagLastRun]  = useState(null);
  const [diagCopied,   setDiagCopied]   = useState(false);

  useEffect(() => {
    if (!isDevActive()) {
      setTimeout(() => nav("/_dev", { replace: true }), 400);
      return;
    }
    devApi.get("/api/dev/status/")
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, [nav]);

  // Feature Flags
  const toggleFlag = (k) => {
    const next = { ...flags, [k]: !flags[k] };
    setFlags(next);
    setFlag(k, next[k]);
  };

  const resetFlags = () => {
    const reset = Object.fromEntries(Object.entries(DEFAULT_FLAGS).map(([k, v]) => [k, v.default]));
    setFlags(reset);
    Object.entries(reset).forEach(([k, v]) => setFlag(k, v));
  };

  const exportFlags = () => {
    const json = JSON.stringify(
      Object.fromEntries(Object.entries(flags).map(([k, v]) => [k, v])),
      null, 2
    );
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "feature-flags.json"; a.click();
    URL.revokeObjectURL(url);
  };

  // Diagnostics
  const runDiagnostics = async () => {
    setDiagRunning(true);
    setDiagResults(Object.fromEntries(DIAG_ENDPOINTS.map((d) => [d.key, { status: "running", value: "", ms: null }])));

    await Promise.all(
      DIAG_ENDPOINTS.map(async (endpoint) => {
        const start = Date.now();
        try {
          const res = await devApi.get(endpoint.url);
          const ms  = Date.now() - start;
          const val = endpoint.field === "count"
            ? `${res.data?.[endpoint.field] ?? 0} records`
            : String(res.data?.[endpoint.field] ?? "ok");
          setDiagResults((prev) => ({ ...prev, [endpoint.key]: { status: "ok", value: val, ms } }));
        } catch (e) {
          const ms = Date.now() - start;
          setDiagResults((prev) => ({
            ...prev,
            [endpoint.key]: { status: "err", value: `Error ${e?.response?.status ?? "?"}`, ms },
          }));
        }
      })
    );
    setDiagLastRun(new Date().toLocaleTimeString());
    setDiagRunning(false);
  };

  const copyDiagReport = () => {
    const lines = [`Dev Diagnostics — ${new Date().toLocaleString()}`, ""];
    DIAG_ENDPOINTS.forEach((ep) => {
      const r = diagResults[ep.key];
      const status = r.status === "idle" ? "not run" : r.status === "ok" ? r.value : r.value || "error";
      const ms = r.ms !== null ? ` (${r.ms}ms)` : "";
      lines.push(`${ep.label.padEnd(20)} ${status}${ms}`);
    });
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    setDiagCopied(true);
    setTimeout(() => setDiagCopied(false), 2000);
  };

  // Profile
  const [profileData,    setProfileData]    = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwForm,   setPwForm]   = useState({ current: "", new: "", confirm: "" });
  const [pwError,  setPwError]  = useState("");
  const [pwOk,     setPwOk]     = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (tab !== "profile" || profileData !== null) return;
    setProfileLoading(true);
    devApi.get("/api/dev/profile/")
      .then((r) => { setProfileData(r.data); setProfileLoading(false); })
      .catch(() => { setProfileData(false); setProfileLoading(false); });
  }, [tab, profileData]);

  async function changePassword(e) {
    e.preventDefault();
    setPwError(""); setPwOk("");
    if (!pwForm.current || !pwForm.new || !pwForm.confirm) {
      setPwError("All fields are required."); return;
    }
    if (pwForm.new !== pwForm.confirm) {
      setPwError("New passwords do not match."); return;
    }
    if (pwForm.new.length < 8) {
      setPwError("New password must be at least 8 characters."); return;
    }
    if (pwForm.new === pwForm.current) {
      setPwError("New password must differ from current password."); return;
    }
    setPwLoading(true);
    try {
      await devApi.post("/api/dev/change-password/", {
        current_password: pwForm.current,
        new_password:     pwForm.new,
        confirm_password: pwForm.confirm,
      });
      setPwOk("Password updated successfully.");
      setPwForm({ current: "", new: "", confirm: "" });
    } catch (err) {
      setPwError(err?.response?.data?.detail || "Failed to update password.");
    }
    setPwLoading(false);
  }

  const logoutDev = () => { lockDev(); nav("/_dev", { replace: true }); };

  const [userDropOpen, setUserDropOpen] = useState(false);
  const [lightMode,    setLightMode]    = useState(() => localStorage.getItem("devLightMode") === "true");
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target))
        setUserDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const statusPill = apiOk === null
    ? { cls: "warn", label: "Checking…" }
    : apiOk
    ? { cls: "ok",   label: "Backend online" }
    : { cls: "bad",  label: "Backend error" };

  const avatarInitials = devUser !== "—"
    ? devUser.slice(0, 2).toUpperCase()
    : "DV";

  const isLocal  = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const envLabel = isLocal ? "LOCAL" : "PROD";
  const envCls   = isLocal ? "local" : "prod";

  return (
    <>
      <style>{panelCss}</style>
      <div className={`dp-wrap${lightMode ? " dp-light" : ""}`}>

        <div className="dp-topbar">
          <div className="dp-topbar-mark">DEV</div>
          <div>
            <div className="dp-topbar-title">Developer Panel</div>
            <div className="dp-topbar-sub">Logged in as <strong style={{ color: "#888" }}>{devUser}</strong></div>
          </div>
          <div className="dp-topbar-right">
            <span className={`dp-env-badge ${envCls}`}>
              <span className="dp-env-badge-dot" />{envLabel}
            </span>
            <div className={`dp-pill ${statusPill.cls}`}>
              <span className="dp-pill-dot" />{statusPill.label}
            </div>
            <div className={`dp-pill${timerCls ? ` ${timerCls}` : ""}`}>
              <span className="dp-pill-dot" />
              {String(minsLeft).padStart(2, "0")}:{String(secsLeft).padStart(2, "0")} left
            </div>
            <button className="dp-topbar-btn extend" onClick={extendSession} title="Extend session by 30 min">
              +30 min
            </button>

            {/* ── User dropdown ── */}
            <div className="dp-user-wrap" ref={dropRef}>
              <button
                className={`dp-user-btn${userDropOpen ? " open" : ""}`}
                onClick={() => setUserDropOpen((v) => !v)}
              >
                <div className="dp-user-av">{avatarInitials}</div>
                <div>
                  <div className="dp-user-info-name">{devUser}</div>
                  <div className="dp-user-info-role">developer</div>
                </div>
                <span className="dp-user-chevron">▾</span>
              </button>

              {userDropOpen && (
                <div className="dp-user-drop">
                  {/* Header */}
                  <div className="dp-user-drop-head">
                    <div className="dp-user-drop-name">{devUser}</div>
                    <span className="dp-user-drop-badge">developer</span>
                  </div>

                  {/* Profile & Settings */}
                  <button className="dp-user-item" onClick={() => { setTab("profile"); setUserDropOpen(false); }}>
                    <span className="dp-user-item-icon">⚙</span>
                    Profile &amp; Settings
                  </button>

                  {/* Manage Users — opens DevPanel Users tab, not portal */}
                  <button className="dp-user-item" onClick={() => { setTab("users"); setUserDropOpen(false); }}>
                    <span className="dp-user-item-icon">👥</span>
                    Manage Users
                  </button>

                  <div className="dp-user-divider" />

                  {/* Go to Portal */}
                  <button className="dp-user-item" onClick={() => { window.open("/", "_blank"); setUserDropOpen(false); }}>
                    <span className="dp-user-item-icon">↗</span>
                    Go to Portal
                  </button>

                  {/* Theme toggle */}
                  <button className="dp-user-item" onClick={() => { setLightMode((v) => { const next = !v; localStorage.setItem("devLightMode", next ? "true" : "false"); return next; }); setUserDropOpen(false); }}>
                    <span className="dp-user-item-icon">{lightMode ? "☀" : "🌙"}</span>
                    {lightMode ? "Switch to Dark" : "Switch to Light"}
                  </button>

                  <div className="dp-user-divider" />

                  {/* Lock & Sign out */}
                  <button className="dp-user-item danger" onClick={() => { logoutDev(); setUserDropOpen(false); }}>
                    <span className="dp-user-item-icon">🔒</span>
                    Lock &amp; Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dp-timer-bar">
          <div className={`dp-timer-fill${timerCls ? ` ${timerCls}` : ""}`} style={{ width: `${pct}%` }} />
        </div>

        <div className="dp-body">

          <div className="dp-tabs">
            {[
              { key: "flags",    label: "Feature Flags", badge: Object.values(flags).filter((v) => !v).length || null },
              { key: "diag",     label: "Diagnostics" },
              { key: "users",    label: "Users" },
              { key: "announce", label: "Announcement" },
              { key: "session",  label: "Session" },
              { key: "profile",  label: "Profile" },
            ].map((t) => (
              <button key={t.key} className={`dp-tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
                {t.label}
                {t.badge ? <span className="dp-tab-badge">{t.badge} off</span> : null}
              </button>
            ))}
          </div>

          {/* ── Feature Flags ── */}
          {tab === "flags" && (
            <>
              <div className="dp-section-title">Toggle feature availability across the portal</div>
              <div className="dp-flags-grid">
                {Object.entries(DEFAULT_FLAGS).map(([k, meta]) => (
                  <div key={k} className={`dp-flag-card${flags[k] ? " on" : " off"}`}>
                    <div>
                      <div className="dp-flag-label">{meta.label}</div>
                      <div className="dp-flag-hint">{flags[k] ? "enabled" : "disabled"} · {meta.hint}</div>
                    </div>
                    <Toggle value={flags[k]} onChange={() => toggleFlag(k)} />
                  </div>
                ))}
              </div>
              <div className="dp-flag-actions">
                <button className="dp-btn" onClick={resetFlags}>Reset to Defaults</button>
                <button className="dp-btn" onClick={exportFlags}>Export JSON</button>
               <button
  className="dp-btn primary"
  onClick={async () => {
    // If unlocking seed data, ensure DB is seeded (dev-only endpoint)
    try {
      if (flags.FF_SEED_UNLOCK) {
        await devApi.post("/api/dev/seed/");
      }
    } catch (e) {
      // show any error in console; page will still reload
      console.error("Seed apply failed:", e);
    } finally {
      window.location.reload();
    }
  }}
>
  Apply &amp; Reload
</button>
              </div>
            </>
          )}

          {/* ── Diagnostics ── */}
          {tab === "diag" && (
            <>
              <div className="dp-section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>API endpoint health check{diagLastRun && <span style={{ fontWeight: 400, color: "#333", marginLeft: 10 }}>last run: {diagLastRun}</span>}</span>
              </div>
              {DIAG_ENDPOINTS.map((ep) => {
                const r = diagResults[ep.key];
                const icon = r.status === "idle" ? "○" : r.status === "running" ? "⟳" : r.status === "ok" ? "✓" : "✕";
                return (
                  <div key={ep.key} className="dp-diag-row">
                    <div className={`dp-diag-icon ${r.status}`}>{icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="dp-diag-name">{ep.label}</div>
                      <div className={`dp-diag-value${r.status === "ok" ? " ok" : r.status === "err" ? " err" : ""}`}>
                        {r.status === "idle" ? ep.url : r.value || "—"}
                      </div>
                    </div>
                    {r.ms !== null && <div className="dp-diag-ms">{r.ms}ms</div>}
                  </div>
                );
              })}
              <div className="dp-flag-actions" style={{ marginTop: 12 }}>
                <button className="dp-btn primary" onClick={runDiagnostics} disabled={diagRunning}>
                  {diagRunning ? "Running…" : "Run All Diagnostics"}
                </button>
                <button className="dp-btn success" onClick={copyDiagReport} disabled={diagRunning}>
                  {diagCopied ? "Copied ✓" : "Copy Report"}
                </button>
              </div>
            </>
          )}

          {/* ── Users ── */}
          {tab === "users" && <UsersTab />}

          {/* ── Announcement ── */}
          {tab === "announce" && <AnnouncementTab />}

          {/* ── Session ── */}
          {tab === "session" && (
            <>
              <div className="dp-section-title">Current developer session</div>
              <div className="dp-session-grid">
                <div className="dp-session-card">
                  <div className="dp-session-key">username</div>
                  <div className="dp-session-val">{devUser}</div>
                </div>
                <div className="dp-session-card">
                  <div className="dp-session-key">time remaining</div>
                  <div className={`dp-session-val${timerCls ? ` ${timerCls}` : ""}`}>
                    {String(minsLeft).padStart(2, "0")}:{String(secsLeft).padStart(2, "0")}
                  </div>
                </div>
                <div className="dp-session-card">
                  <div className="dp-session-key">backend api</div>
                  <div className="dp-session-val" style={{ fontSize: 14, marginTop: 2, color: apiOk ? "#10b981" : apiOk === false ? "#f87171" : "#555" }}>
                    {apiOk === null ? "Checking…" : apiOk ? "Online ✓" : "Error ✕"}
                  </div>
                </div>
                <div className="dp-session-card">
                  <div className="dp-session-key">dev url</div>
                  <div className="dp-session-val" style={{ fontSize: 13, color: "#666" }}>/_dev</div>
                </div>
              </div>
              <div className="dp-flag-actions" style={{ marginTop: 14 }}>
                <button className="dp-btn extend" style={{ borderColor: "rgba(16,185,129,0.25)", color: "#10b981" }}
                  onClick={extendSession}>
                  Extend Session +30 min
                </button>
                <button className="dp-btn danger" onClick={logoutDev}>
                  Lock &amp; End Session
                </button>
              </div>
            </>
          )}

          {/* ── Profile ── */}
          {tab === "profile" && (
            <>
              <div className="dp-section-title">Developer account</div>

              {profileLoading && (
                <div style={{ color: "#444", fontSize: 13, marginBottom: 20 }}>
                  <span className="dp-spin">⟳</span>&nbsp; Loading profile…
                </div>
              )}

              {profileData && (
                <>
                  <div className="dp-profile-head">
                    <div className="dp-avatar">{avatarInitials}</div>
                    <div>
                      <div className="dp-profile-name">{profileData.full_name || profileData.username}</div>
                      <span className="dp-profile-role">DEVELOPER</span>
                      {profileData.is_staff && (
                        <span className="dp-profile-role" style={{ marginLeft: 6, background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.25)", color: "#fbbf24" }}>
                          staff
                        </span>
                      )}
                      <div className="dp-profile-sub">{profileData.email || "No email set"}</div>
                    </div>
                  </div>

                  <div className="dp-info-grid">
                    <div className="dp-info-card">
                      <div className="dp-info-label">Username</div>
                      <div className="dp-info-val">{profileData.username}</div>
                    </div>
                    <div className="dp-info-card">
                      <div className="dp-info-label">Email</div>
                      <div className="dp-info-val">{profileData.email || "—"}</div>
                    </div>
                    <div className="dp-info-card">
                      <div className="dp-info-label">Member Since</div>
                      <div className="dp-info-val">{profileData.date_joined || "—"}</div>
                    </div>
                    <div className="dp-info-card">
                      <div className="dp-info-label">Last Login</div>
                      <div className="dp-info-val">{profileData.last_login || "—"}</div>
                    </div>
                  </div>
                </>
              )}

              {profileData === false && (
                <div style={{ color: "#f87171", fontSize: 13, marginBottom: 20 }}>
                  Could not load profile. Check connection.
                </div>
              )}

              {/* Change Password */}
              <div className="dp-section-title" style={{ marginTop: 8 }}>Change Password</div>
              <div className="dp-pw-card">
                <div className="dp-pw-title">Update Developer Password</div>
                <div className="dp-pw-sub">Requires your current password. Min 8 characters.</div>

                {pwError && <div className="dp-pw-err">⚠ {pwError}</div>}
                {pwOk    && <div className="dp-pw-ok">✓ {pwOk}</div>}

                <form onSubmit={changePassword} noValidate>
                  <div className="dp-pw-grid">
                    <div className="dp-pw-field">
                      <label className="dp-pw-label">Current Password</label>
                      <input
                        className="dp-pw-input"
                        type="password"
                        placeholder="Current password"
                        value={pwForm.current}
                        onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                        autoComplete="current-password"
                        disabled={pwLoading}
                      />
                    </div>
                    <div className="dp-pw-field">
                      <label className="dp-pw-label">New Password</label>
                      <input
                        className="dp-pw-input"
                        type="password"
                        placeholder="New password (min 8)"
                        value={pwForm.new}
                        onChange={(e) => setPwForm((f) => ({ ...f, new: e.target.value }))}
                        autoComplete="new-password"
                        disabled={pwLoading}
                      />
                    </div>
                    <div className="dp-pw-field">
                      <label className="dp-pw-label">Confirm New Password</label>
                      <input
                        className="dp-pw-input"
                        type="password"
                        placeholder="Repeat new password"
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                        autoComplete="new-password"
                        disabled={pwLoading}
                      />
                    </div>
                  </div>
                  <button className="dp-btn primary" type="submit" disabled={pwLoading}>
                    {pwLoading ? <><span className="dp-spin">⟳</span> Updating…</> : "Update Password"}
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

const ROLE_COLORS = {
  COUNTY_ADMIN: { bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.25)",  color: "#818cf8" },
  DEPT_MANAGER: { bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)",  color: "#60a5fa" },
  EMPLOYEE:     { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)",  color: "#34d399" },
  DEVELOPER:    { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  color: "#fbbf24" },
};

function UsersTab() {
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");

  // Server-side search with 350ms debounce
  useEffect(() => {
    setLoading(true); setError("");
    const timer = setTimeout(() => {
      const params = {};
      if (search.trim()) params.search = search.trim();
      devApi.get("/api/dev/users/", { params })
        .then((r) => {
          setUsers(r.data?.results ?? r.data ?? []);
          setTotal(r.data?.count ?? (r.data?.results ?? r.data ?? []).length);
          setLoading(false);
        })
        .catch(() => { setError("Could not load users. Check dev session."); setLoading(false); });
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = users; // filtering now done server-side

  return (
    <>
      <div className="dp-users-toolbar">
        <div>
          <div className="dp-section-title" style={{ marginBottom: 0 }}>System Users — fetched via Dev API (no portal login required)</div>
        </div>
        {!loading && !error && (
          <span className="dp-users-count">{filtered.length} / {total} users</span>
        )}
      </div>

      {!loading && !error && (
        <input
          className="dp-users-search"
          placeholder="Search by username, name, role, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 14, display: "block" }}
        />
      )}

      {loading && (
        <div style={{ color: "#444", fontSize: 13 }}>
          <span className="dp-spin">⟳</span>&nbsp; Loading users…
        </div>
      )}
      {error && <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>}

      {!loading && !error && (
        <div className="dp-users-wrap">
          <table className="dp-users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email</th>
                <th>Assets</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="dp-users-empty dp-users-cell">
                    No users match your search
                  </td>
                </tr>
              )}
              {filtered.map((u) => {
                const rc = ROLE_COLORS[u.role] || { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)", color: "#888" };
                const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={u.id} className="dp-users-row">
                    <td className="dp-users-cell dp-users-mono">{u.username}</td>
                    <td className="dp-users-cell" style={{ color: "#bbb" }}>{fullName}</td>
                    <td className="dp-users-cell">
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color, whiteSpace: "nowrap" }}>
                        {u.role || "—"}
                      </span>
                    </td>
                    <td className="dp-users-cell" style={{ fontSize: 12, color: "#555", fontFamily: "'JetBrains Mono',monospace" }}>
                      {u.department_name || "—"}
                    </td>
                    <td className="dp-users-cell" style={{ fontSize: 12, color: "#555" }}>{u.email || "—"}</td>
                    <td className="dp-users-cell" style={{ fontSize: 12, color: "#555", textAlign: "center" }}>
                      {u.assigned_assets_count ?? "—"}
                    </td>
                    <td className="dp-users-cell">
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
                        background:   u.is_active ? "rgba(16,185,129,0.08)"  : "rgba(239,68,68,0.08)",
                        border:       `1px solid ${u.is_active ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                        color:        u.is_active ? "#10b981" : "#f87171",
                      }}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AnnouncementTab() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("ANN_ENABLED") === "true");
  const [text,    setText]    = useState(() => localStorage.getItem("ANN_TEXT") || "");
  const [saved,   setSaved]   = useState(false);

  const save = () => {
    localStorage.setItem("ANN_ENABLED", enabled ? "true" : "false");
    localStorage.setItem("ANN_TEXT",    text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <div className="dp-section-title">Manage portal announcement banner</div>
      <div className="dp-ann-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div className="dp-ann-label">Announcement Banner</div>
            <div className="dp-ann-hint">Shown to all users at the top of the portal</div>
          </div>
          <Toggle value={enabled} onChange={() => setEnabled((v) => !v)} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="dp-section-title" style={{ marginBottom: 8 }}>Message</div>
          <textarea className="dp-textarea"
            placeholder="e.g. Scheduled maintenance Sunday 2:00 AM – 3:00 AM EST. Portal will be briefly unavailable."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4} />
        </div>

        {enabled && text && (
          <div style={{
            background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#fbbf24",
            marginBottom: 14,
          }}>
            <strong>Preview:</strong> {text}
          </div>
        )}

        <div className="dp-flag-actions">
          <button className="dp-btn primary" onClick={save}>
            {saved ? "Saved ✓" : "Save & Apply"}
          </button>
        </div>
      </div>
    </>
  );
}
