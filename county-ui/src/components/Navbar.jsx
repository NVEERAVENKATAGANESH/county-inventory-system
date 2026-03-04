/**
 * Navbar.jsx — Fixed top navigation bar
 * Logo | Nav Links (with badge counts) | Search | Clock | Bell | User menu
 * Mobile: nav links collapse to hamburger dropdown
 */
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { portalLogout, api, isAdmin } from "../api";
import { useSearch } from "../context/SearchContext.jsx";
import { useTheme }  from "../context/ThemeContext.jsx";
import {
  Search, X, Bell, ChevronDown, LogOut, User, Shield, CheckCheck,
  AlertTriangle, Sun, Moon, Users, Building2, Inbox, FileBarChart, Package2,
  LayoutDashboard, Package, Boxes, TriangleAlert, ClipboardList, Wrench, Menu,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

/* ── All styles use CSS variables — no hardcoded colors ─────────────────────── */
const nbCss = `
/* ── Shell ── */
.nb { background:var(--bg-panel); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:200; backdrop-filter:blur(20px); transition:background 0.2s,border-color 0.2s; }
.nb-inner { max-width:1600px; margin:0 auto; padding:0 20px; height:58px; display:flex; align-items:center; gap:10px; position:relative; }

/* ── Logo ── */
.nb-logo { display:flex;align-items:center;gap:10px;flex-shrink:0;user-select:none;cursor:pointer; }
.nb-logo-mark { width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:#fff;box-shadow:0 0 16px var(--accent-glow);letter-spacing:-0.3px;flex-shrink:0; }
.nb-logo-text { font-size:15px;font-weight:700;color:var(--text-bright);letter-spacing:-0.3px; }

/* ── Divider ── */
.nb-div { width:1px;height:22px;background:var(--border);flex-shrink:0; }

/* ── Nav links ── */
.nb-nav { display:flex;align-items:center;gap:1px;overflow:hidden; }
.nb-nav-link {
  display:flex;align-items:center;gap:5px;
  padding:6px 10px;border-radius:var(--radius-md);
  font-size:13px;font-weight:500;color:var(--text-muted);
  text-decoration:none;transition:all 0.13s;white-space:nowrap;
  border:1px solid transparent;
}
.nb-nav-link:hover { color:var(--text);background:var(--bg-hover);text-decoration:none; }
.nb-nav-link.active { color:var(--accent-text);background:var(--accent-dim);border-color:var(--accent-glow);font-weight:600; }
.nb-nav-bdg {
  margin-left:2px;min-width:16px;height:16px;border-radius:999px;
  display:inline-flex;align-items:center;justify-content:center;
  font-size:9px;font-weight:700;padding:0 4px;
}
.nb-nav-bdg.red   { background:var(--red-dim);   color:var(--red-text);   }
.nb-nav-bdg.amber { background:var(--amber-dim); color:var(--amber-text); }

/* ── Spacer ── */
.nb-spacer { flex:1;min-width:8px; }

/* ── Search ── */
.nb-search { display:flex;align-items:center;gap:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-md);padding:0 12px;height:36px;width:220px;transition:border-color 0.15s,width 0.2s;flex-shrink:0; }
.nb-search:focus-within { border-color:var(--border-focus);width:290px; }
.nb-search input { background:none;border:none;outline:none;color:var(--text);font-size:13.5px;font-family:inherit;width:100%;min-width:0; }
.nb-search input::placeholder { color:var(--text-dim); }
.nb-search-clear { background:none;border:none;color:var(--text-muted);cursor:pointer;padding:2px;display:flex;align-items:center;border-radius:4px; }
.nb-search-clear:hover { color:var(--text); }
.nb-kbd { font-size:11px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;background:var(--bg-panel2);border:1px solid var(--border);border-radius:4px;padding:2px 5px;flex-shrink:0; }

/* ── Right controls ── */
.nb-right { display:flex;align-items:center;gap:8px;flex-shrink:0; }

/* ── Icon buttons ── */
.nb-icon-btn { position:relative;width:36px;height:36px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-panel2);color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.13s; }
.nb-icon-btn:hover,.nb-icon-btn.open { border-color:var(--border-md);color:var(--text);background:var(--bg-hover); }
.nb-badge { position:absolute;top:-5px;right:-5px;background:var(--red);color:#fff;font-size:9px;font-weight:700;min-width:15px;height:15px;border-radius:999px;display:flex;align-items:center;justify-content:center;padding:0 3px;border:2px solid var(--bg-panel); }

/* ── Notification dropdown ── */
.nb-notif-wrap { position:relative; }
.nb-notif-drop { position:absolute;top:calc(100% + 10px);right:0;width:330px;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);z-index:300; }
.nb-notif-hdr { display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--border); }
.nb-notif-title { font-size:14px;font-weight:600;color:var(--text-bright); }
.nb-notif-count { font-size:12px;color:var(--accent);margin-left:6px; }
.nb-mark-all { display:flex;align-items:center;gap:5px;font-size:12px;color:var(--accent);background:none;border:none;cursor:pointer;padding:5px 9px;border-radius:var(--radius-sm);transition:background 0.1s; }
.nb-mark-all:hover { background:var(--accent-dim); }
.nb-notif-list { max-height:340px;overflow-y:auto; }
.nb-notif-item { display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.1s; }
.nb-notif-item:last-child { border-bottom:none; }
.nb-notif-item:hover,.nb-notif-item.unread { background:var(--bg-hover); }
.nb-notif-icon { width:34px;height:34px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.nb-notif-icon.warn { background:var(--amber-dim);color:var(--amber); }
.nb-notif-icon.ok   { background:var(--green-dim);color:var(--green); }
.nb-notif-msg  { font-size:13.5px;color:var(--text);line-height:1.45; }
.nb-notif-time { font-size:11.5px;color:var(--text-muted);margin-top:2px;font-family:'JetBrains Mono',monospace; }
.nb-notif-dot  { width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:6px; }
.nb-notif-empty { padding:32px 16px;text-align:center;color:var(--text-muted);font-size:14px; }

/* ── User dropdown ── */
.nb-user-wrap { position:relative; }
.nb-user-btn { display:flex;align-items:center;gap:8px;padding:4px 10px 4px 5px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-panel2);cursor:pointer;transition:all 0.13s; }
.nb-user-btn:hover,.nb-user-btn.open { background:var(--bg-hover);border-color:var(--border-md); }
.nb-avatar { width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0; }
.nb-avatar.admin    { background:var(--blue-dim);color:var(--blue); }
.nb-avatar.employee { background:var(--green-dim);color:var(--green); }
.nb-user-name { font-size:13px;font-weight:500;color:var(--text); }
.nb-user-sub  { font-size:11px;color:var(--text-muted);font-family:'JetBrains Mono',monospace; }
.nb-chevron { color:var(--text-muted);transition:transform 0.2s; }
.nb-chevron.open { transform:rotate(180deg); }
.nb-drop { position:absolute;top:calc(100% + 10px);right:0;width:230px;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);z-index:300; }
.nb-drop-hdr { padding:13px 16px;border-bottom:1px solid var(--border); }
.nb-drop-name { font-size:14px;font-weight:600;color:var(--text-bright); }
.nb-drop-meta { font-size:11px;color:var(--text-muted);margin-top:2px;font-family:'JetBrains Mono',monospace; }
.nb-drop-item { display:flex;align-items:center;gap:9px;width:100%;padding:10px 16px;border:none;background:none;color:var(--text-muted);font-size:13.5px;font-family:inherit;cursor:pointer;text-align:left;transition:background 0.1s,color 0.1s; }
.nb-drop-item:hover { background:var(--bg-hover);color:var(--text); }
.nb-drop-item.active { color:var(--accent); }
.nb-drop-item.danger { color:var(--red); }
.nb-drop-item.danger:hover { background:var(--red-dim); }
.nb-drop-sep { height:1px;background:var(--border);margin:4px 0; }
.nb-drop-lbl { padding:9px 16px 3px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-dim); }
.nb-drop-note { display:flex;align-items:center;gap:5px;padding:0 16px 7px;font-size:11.5px;color:var(--text-muted); }
.nb-role-pill { margin-left:auto;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:999px;text-transform:uppercase; }
.nb-role-pill.admin    { background:var(--blue-dim);color:var(--blue); }
.nb-role-pill.employee { background:var(--green-dim);color:var(--green); }
.nb-check { margin-left:auto;font-size:12px;color:var(--accent);opacity:0; }
.nb-drop-item.active .nb-check { opacity:1; }

/* ── Mobile hamburger ── */
.nb-mob-btn { display:none;width:36px;height:36px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-panel2);color:var(--text-muted);align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
.nb-mob-btn:hover { color:var(--text);border-color:var(--border-md); }
.nb-mob-drop {
  position:absolute;top:58px;left:0;right:0;
  background:var(--bg-panel);border-bottom:1px solid var(--border);
  padding:10px 20px;box-shadow:var(--shadow-md);z-index:199;
  display:flex;flex-wrap:wrap;gap:4px;
}
.nb-mob-link {
  display:flex;align-items:center;gap:6px;
  padding:8px 12px;border-radius:var(--radius-md);
  font-size:13.5px;font-weight:500;color:var(--text-muted);
  text-decoration:none;transition:all 0.13s;border:1px solid transparent;
}
.nb-mob-link:hover { color:var(--text);background:var(--bg-hover); }
.nb-mob-link.active { color:var(--accent-text);background:var(--accent-dim);border-color:var(--accent-glow); }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .nb-nav { display:none; }
  .nb-mob-btn { display:flex; }
}
@media (max-width: 700px) {
  .nb-search { display:none; }
}
@media (max-width: 480px) {
  .nb-user-name,.nb-user-sub { display:none; }
}
`;

export default function Navbar() {
  const navigate = useNavigate();
  const { rawQuery, setQuery } = useSearch();
  const location = useLocation();
  const { theme, setTheme }  = useTheme();
  const isDark     = theme !== "light";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const admin    = isAdmin();

  const [userOpen,  setUserOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobOpen,   setMobOpen]   = useState(false);
  const [notifs,    setNotifs]    = useState([]);
  const [badges,    setBadges]    = useState({ lowStock: 0, pending: 0 });
  const userRef  = useRef(null);
  const notifRef = useRef(null);
  const mobRef   = useRef(null);

  const username = localStorage.getItem("username") || "User";
  const role     = (localStorage.getItem("actingRole") || "employee").toLowerCase();
  const deptCode = localStorage.getItem("deptCode") || "";
  const initials = username.slice(0, 2).toUpperCase();
  const unread   = notifs.filter(n => n.unread).length;

  /* Close dropdowns on outside click */
  useEffect(() => {
    const h = e => {
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (mobRef.current   && !mobRef.current.contains(e.target))   setMobOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* Clear search when navigating to a different page */
  useEffect(() => {
    setQuery("");
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ⌘K → focus search */
  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); document.getElementById("nb-search")?.focus();
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  /* Fetch badge counts (low stock + pending requests) every 60 s */
  const fetchBadges = useCallback(() => {
    Promise.all([
      api.get("/api/consumables/low-stock/", { params: { page_size: 1 } }).catch(() => null),
      admin
        ? api.get("/api/requests/", { params: { status: "PENDING", page_size: 1 } }).catch(() => null)
        : Promise.resolve(null),
    ]).then(([lsRes, reqRes]) => {
      setBadges({
        lowStock: lsRes?.data?.count  ?? 0,
        pending:  reqRes?.data?.count ?? 0,
      });
    });
  }, [admin]);

  useEffect(() => {
    fetchBadges();
    const t = setInterval(fetchBadges, 60000);
    return () => clearInterval(t);
  }, [fetchBadges]);

  /* Fetch notification data */
  useEffect(() => {
    Promise.all([
      api.get("/api/consumables/low-stock/",      { params: { page_size: 1 } }),
      api.get("/api/assets/warranty-alerts/",     { params: { days: 30, page_size: 1 } }),
    ]).then(([lowRes, warRes]) => {
      const items = [];
      const lc = lowRes.data?.count ?? 0;
      const wc = warRes.data?.count ?? 0;
      if (lc > 0) items.push({ id:"low", type:"warn", icon:AlertTriangle, msg:`${lc} consumable${lc > 1 ? "s" : ""} below reorder level`,        time:"now", unread:true  });
      if (wc > 0) items.push({ id:"war", type:"warn", icon:AlertTriangle, msg:`${wc} asset${wc > 1 ? "s" : ""} warranty expiring within 30 days`, time:"now", unread:true  });
      if (!items.length) items.push({ id:"ok", type:"ok", icon:AlertTriangle, msg:"All stock levels and warranties are healthy", time:"now", unread:false });
      setNotifs(items);
    }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => setNotifs(p => p.map(n => ({ ...n, unread:false }))), []);
  const markRead    = useCallback(id => setNotifs(p => p.map(n => n.id === id ? { ...n, unread:false } : n)), []);

  function logout() { setUserOpen(false); portalLogout(); navigate("/login"); }
  function switchRole(r) {
    if (r === role) { setUserOpen(false); return; }
    setUserOpen(false);
    localStorage.setItem("pendingRole", r);
    portalLogout();
    navigate("/login");
  }

  /* Nav items — shown in top bar */
  const navItems = [
    { to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
    { to: "/assets",      icon: Package,         label: "Assets" },
    { to: "/consumables", icon: Boxes,           label: "Consumables" },
    { to: "/low-stock",   icon: TriangleAlert,   label: "Low Stock",
      badge: badges.lowStock > 0 ? badges.lowStock : null, badgeCls: "red" },
    { to: "/audit",       icon: ClipboardList,   label: "Audit Logs" },
    { to: "/maintenance", icon: Wrench,          label: "Maintenance" },
    { to: "/requests",    icon: Inbox,           label: admin ? "Request Queue" : "Requests",
      badge: admin && badges.pending > 0 ? badges.pending : null, badgeCls: "amber" },
  ];

  const NavItems = ({ className, onClick }) => navItems.map(item => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) => `${className}${isActive ? " active" : ""}`}
      onClick={onClick}
    >
      <item.icon size={13} style={{ flexShrink: 0 }} />
      {item.label}
      {item.badge != null && (
        <span className={`nb-nav-bdg ${item.badgeCls || "blue"}`}>
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </NavLink>
  ));

  return (
    <>
      <style>{nbCss}</style>
      <header className="nb">
        <div className="nb-inner">

          {/* Logo */}
          <div className="nb-logo" onClick={() => navigate("/dashboard")}>
            <div className="nb-logo-mark">UIMS</div>
            <div className="nb-logo-text">UIMS</div>
          </div>

          <div className="nb-div" />

          {/* Horizontal nav links (desktop) */}
          <nav className="nb-nav">
            <NavItems className="nb-nav-link" onClick={() => setMobOpen(false)} />
          </nav>

          <div className="nb-spacer" />

          {/* Search */}
          <div className="nb-search">
            <Search size={14} style={{ color:"var(--text-dim)", flexShrink:0 }} />
            <input
              id="nb-search"
              value={rawQuery}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
            />
            {rawQuery
              ? <button className="nb-search-clear" onClick={() => setQuery("")}><X size={12} /></button>
              : <span className="nb-kbd">⌘K</span>
            }
          </div>

          {/* Right controls */}
          <div className="nb-right">

            {/* Notifications */}
            <div className="nb-notif-wrap" ref={notifRef}>
              <button
                className={`nb-icon-btn${notifOpen ? " open" : ""}`}
                onClick={() => { setNotifOpen(v => !v); setUserOpen(false); setMobOpen(false); }}
              >
                <Bell size={16} />
                {unread > 0 && <span className="nb-badge">{unread}</span>}
              </button>
              {notifOpen && (
                <div className="nb-notif-drop">
                  <div className="nb-notif-hdr">
                    <div>
                      <span className="nb-notif-title">Notifications</span>
                      {unread > 0 && <span className="nb-notif-count">· {unread} new</span>}
                    </div>
                    {unread > 0 && (
                      <button className="nb-mark-all" onClick={markAllRead}>
                        <CheckCheck size={13} />Mark all read
                      </button>
                    )}
                  </div>
                  <div className="nb-notif-list">
                    {notifs.length === 0
                      ? <div className="nb-notif-empty">All caught up ✓</div>
                      : notifs.map(n => {
                          const Icon = n.icon;
                          return (
                            <div
                              key={n.id}
                              className={`nb-notif-item${n.unread ? " unread" : ""}`}
                              onClick={() => markRead(n.id)}
                            >
                              <div className={`nb-notif-icon ${n.type}`}><Icon size={15} /></div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div className="nb-notif-msg">{n.msg}</div>
                                <div className="nb-notif-time">{n.time}</div>
                              </div>
                              {n.unread && <div className="nb-notif-dot" />}
                            </div>
                          );
                        })
                    }
                  </div>
                </div>
              )}
            </div>

            <div className="nb-div" />

            {/* User menu */}
            <div className="nb-user-wrap" ref={userRef}>
              <button
                className={`nb-user-btn${userOpen ? " open" : ""}`}
                onClick={() => { setUserOpen(v => !v); setNotifOpen(false); setMobOpen(false); }}
              >
                <div className={`nb-avatar ${role}`}>{initials}</div>
                <div>
                  <div className="nb-user-name">{username}</div>
                  <div className="nb-user-sub">{role}{deptCode ? ` · ${deptCode.toLowerCase()}` : ""}</div>
                </div>
                <ChevronDown size={13} className={`nb-chevron${userOpen ? " open" : ""}`} />
              </button>

              {userOpen && (
                <div className="nb-drop">
                  <div className="nb-drop-hdr">
                    <div className="nb-drop-name">{username}</div>
                    <div className="nb-drop-meta">{deptCode ? `dept · ${deptCode.toLowerCase()}` : "no department set"}</div>
                  </div>

                  <button className="nb-drop-item" onClick={() => { navigate("/settings"); setUserOpen(false); }}>
                    <User size={15} />Profile &amp; Settings
                  </button>
                  {role !== "admin" && (
                    <button className="nb-drop-item" onClick={() => { navigate("/my-assets"); setUserOpen(false); }}>
                      <Package2 size={15} />My Assets
                    </button>
                  )}
                  {role === "admin" && (
                    <>
                      <button className="nb-drop-item" onClick={() => { navigate("/reports"); setUserOpen(false); }}>
                        <FileBarChart size={15} />Reports
                      </button>
                      <button className="nb-drop-item" onClick={() => { navigate("/users"); setUserOpen(false); }}>
                        <Users size={15} />Manage Users
                      </button>
                      <button className="nb-drop-item" onClick={() => { navigate("/departments"); setUserOpen(false); }}>
                        <Building2 size={15} />Departments
                      </button>
                    </>
                  )}

                  {/* Theme toggle */}
                  <button className="nb-drop-item" onClick={toggleTheme}>
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                    {isDark ? "Switch to Light" : "Switch to Dark"}
                  </button>

                  <div className="nb-drop-sep" />
                  <div className="nb-drop-lbl">Switch Role</div>
                  <div className="nb-drop-note"><AlertTriangle size={11} />Requires re-login</div>
                  {["admin", "employee"].map(r => (
                    <button
                      key={r}
                      className={`nb-drop-item${role === r ? " active" : ""}`}
                      onClick={() => switchRole(r)}
                    >
                      {r === "admin" ? <Shield size={15} /> : <User size={15} />}
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                      <span className={`nb-role-pill ${r}`}>{r}</span>
                      <span className="nb-check">✓</span>
                    </button>
                  ))}

                  <div className="nb-drop-sep" />
                  <button className="nb-drop-item danger" onClick={logout}>
                    <LogOut size={15} />Sign out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <div ref={mobRef} style={{ position:"relative" }}>
              <button
                className="nb-mob-btn"
                onClick={() => { setMobOpen(v => !v); setUserOpen(false); setNotifOpen(false); }}
                aria-label="Toggle navigation"
              >
                <Menu size={17} />
              </button>
              {mobOpen && (
                <div className="nb-mob-drop">
                  <NavItems className="nb-mob-link" onClick={() => setMobOpen(false)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
