/**
 * Dashboard.jsx — Professional rebuild with Recharts
 * 6 KPI cards + Area/Pie/Bar charts + Warranty alerts + Low stock + Activity feed
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Package, Boxes, AlertTriangle, ShieldAlert,
  DollarSign, ClipboardList, RefreshCw, ChevronRight,
  TrendingUp, Wrench, Inbox, CalendarClock, AlertCircle,
} from "lucide-react";
import { api } from "../api";

// Recharts cannot read CSS variables — use fixed hex values matching our theme
const C = {
  blue:   "#60a5fa",
  purple: "#c084fc",
  green:  "#34d399",
  amber:  "#fbbf24",
  red:    "#f87171",
  indigo: "#818cf8",
  teal:   "#2dd4bf",
  pink:   "#f472b6",
};

const PIE_COLORS = [C.blue, C.purple, C.green, C.amber, C.red, C.indigo, C.teal, C.pink];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtMonth(iso) {
  try {
    const d = new Date(iso);
    return `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
  } catch { return iso; }
}

function fmtCurrency(n) {
  if (!n) return "$0";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function warrantyDays(expiryStr) {
  if (!expiryStr) return null;
  return Math.floor((new Date(expiryStr) - new Date()) / 86400000);
}

const css = `
.db { font-family:'DM Sans',system-ui,sans-serif; color:var(--text); }

.db-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
@media(max-width:900px){ .db-kpis{ grid-template-columns:repeat(2,1fr); } }
@media(max-width:550px){ .db-kpis{ grid-template-columns:1fr; } }

.db-kpi {
  background:var(--page-card-bg); border:1px solid var(--page-card-border);
  border-radius:16px; padding:20px 22px; cursor:pointer;
  transition:border-color .15s, transform .12s;
  display:flex; align-items:flex-start; gap:14px;
}
.db-kpi:hover { border-color:var(--border-md); transform:translateY(-2px); }
.db-kpi-icon {
  width:44px; height:44px; border-radius:12px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
}
.db-kpi-val {
  font-size:32px; font-weight:700; letter-spacing:-1.5px; line-height:1;
  font-family:'DM Mono',monospace;
}
.db-kpi-lbl { font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; color:var(--page-stat-lbl); margin-top:6px; }
.db-kpi-sub { font-size:12px; color:var(--text-dim); margin-top:3px; display:flex; align-items:center; gap:4px; }

.db-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
.db-row3 { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-bottom:20px; }
@media(max-width:1100px){ .db-row3{ grid-template-columns:1fr 1fr; } }
@media(max-width:840px){ .db-row{ grid-template-columns:1fr; } .db-row3{ grid-template-columns:1fr; } }
@keyframes db-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
.db { animation: db-in 0.3s cubic-bezier(.16,1,.3,1); }

.db-card {
  background:var(--page-card-bg); border:1px solid var(--page-card-border);
  border-radius:16px; overflow:hidden;
}
.db-card-hdr {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-bottom:1px solid var(--page-card-border);
}
.db-card-title {
  font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.6px;
  color:var(--page-th-text); display:flex; align-items:center; gap:7px;
}
.db-card-body { padding:18px; }

.db-war-list { display:grid; gap:9px; max-height:300px; overflow-y:auto; }
.db-war-item {
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:11px 14px; border-radius:10px;
  background:var(--bg-panel2); border:1px solid var(--page-card-border);
}
.db-war-tag  { font-family:'DM Mono',monospace; font-size:12px; color:var(--purple-text); }
.db-war-name { font-size:13px; font-weight:500; color:var(--page-td-name); margin-top:2px; }
.db-war-days {
  font-size:11px; font-weight:700; font-family:'DM Mono',monospace;
  padding:3px 8px; border-radius:999px; white-space:nowrap; border:1px solid transparent;
}
.db-war-days.red   { background:var(--red-dim);   color:var(--red-text);   border-color:var(--red-dim);   }
.db-war-days.amber { background:var(--amber-dim); color:var(--amber-text); border-color:var(--amber-dim); }
.db-war-days.green { background:var(--green-dim); color:var(--green-text); border-color:var(--green-dim); }

.db-ls-list { display:grid; gap:8px; max-height:300px; overflow-y:auto; }
.db-ls-item {
  display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:10px;
  background:var(--bg-panel2); border:1px solid var(--page-card-border);
}
.db-ls-sku  { font-family:'DM Mono',monospace; font-size:11px; color:var(--purple-text); white-space:nowrap; }
.db-ls-name { font-size:13px; font-weight:500; color:var(--page-td-name); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.db-ls-qty  { font-family:'DM Mono',monospace; font-size:13px; font-weight:700; color:var(--red-text); white-space:nowrap; }
.db-ls-reorder { font-size:11px; color:var(--text-dim); white-space:nowrap; }

.db-act-list { display:grid; gap:6px; max-height:300px; overflow-y:auto; }
.db-act-item {
  display:flex; align-items:flex-start; gap:10px; padding:10px 14px; border-radius:10px;
  background:var(--bg-panel2); border:1px solid var(--page-card-border);
}
.db-act-ico {
  width:30px; height:30px; border-radius:8px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700;
}
.db-act-ico.CREATE { background:var(--green-dim); color:var(--green-text); }
.db-act-ico.UPDATE { background:var(--blue-dim);  color:var(--blue-text);  }
.db-act-ico.DELETE { background:var(--red-dim);   color:var(--red-text);   }
.db-act-summary { font-size:13px; color:var(--page-td-name); line-height:1.4; }
.db-act-meta { font-size:11px; color:var(--text-dim); margin-top:2px; font-family:'DM Mono',monospace; }

.db-link-btn {
  font-size:12px; color:var(--blue-text); background:none; border:none; cursor:pointer;
  display:inline-flex; align-items:center; gap:3px; padding:0; font-family:inherit;
}
.db-link-btn:hover { text-decoration:underline; }
.db-empty { padding:32px; text-align:center; color:var(--page-empty); font-size:13px; }
.db-skel-bar { height:14px; border-radius:4px; background:var(--page-skel); animation:skel 1.5s ease-in-out infinite; margin-bottom:10px; }
@keyframes skel{0%,100%{opacity:.45}50%{opacity:.85}}
@keyframes spin{to{transform:rotate(360deg)}}

.db-err-banner {
  display:flex; align-items:center; gap:10px; padding:12px 16px;
  background:var(--red-dim); border:1px solid var(--red-dim); border-radius:12px;
  color:var(--red-text); font-size:13.5px; margin-bottom:20px;
}
.db-kpi-arrow { opacity:0; transition:opacity .15s; margin-left:auto; flex-shrink:0; }
.db-kpi:hover .db-kpi-arrow { opacity:1; }

.db-pie-legend { display:flex; flex-wrap:wrap; gap:5px 12px; margin-top:12px; }
.db-pie-dot { width:9px; height:9px; border-radius:3px; flex-shrink:0; margin-top:3px; }
.db-pie-lbl { font-size:12px; color:var(--page-sub); display:flex; align-items:flex-start; gap:5px; }
`;

const ACT_ICON = { CREATE: "✦", UPDATE: "↺", DELETE: "✕" };

function Skel({ lines = 3 }) {
  return (
    <div className="db-card-body">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="db-skel-bar" style={{ width: i === 0 ? "60%" : "90%" }} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [summary,    setSummary]    = useState(null);
  const [trends,     setTrends]     = useState(null);
  const [categories, setCategories] = useState(null);
  const [depts,      setDepts]      = useState(null);
  const [warranty,   setWarranty]   = useState(null);
  const [lowStock,   setLowStock]   = useState(null);
  const [activity,   setActivity]   = useState(null);
  const [dueSoon,    setDueSoon]    = useState(null);
  const [dueSoonErr, setDueSoonErr] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [dataError,  setDataError]  = useState("");
  const [lastLoaded, setLastLoaded] = useState(null);

  async function load() {
    setLoading(true);
    setDataError("");
    setDueSoonErr(false);
    try {
      const [sumRes, trendRes, catRes, deptRes, warRes, lsRes, actRes] = await Promise.all([
        api.get("/api/dashboard/summary/"),
        api.get("/api/dashboard/trends/"),
        api.get("/api/dashboard/categories/"),
        api.get("/api/dashboard/departments/"),
        api.get("/api/assets/warranty-alerts/?days=90&page_size=10"),
        api.get("/api/consumables/low-stock/?page_size=6"),
        api.get("/api/auditlogs/?page_size=8&ordering=-timestamp"),
      ]);
      setSummary(sumRes.data);

      // Merge asset + consumable trends into per-month objects
      const trendMap = {};
      (trendRes.data?.assets || []).forEach(({ month, count }) => {
        trendMap[month] = { ...trendMap[month], month, assets: count };
      });
      (trendRes.data?.consumables || []).forEach(({ month, count }) => {
        trendMap[month] = { ...trendMap[month], month, consumables: count };
      });
      setTrends(
        Object.values(trendMap)
          .sort((a, b) => a.month.localeCompare(b.month))
          .map(d => ({ ...d, month: fmtMonth(d.month), assets: d.assets || 0, consumables: d.consumables || 0 }))
      );
      setCategories((catRes.data || []).slice(0, 8));
      setDepts(deptRes.data || []);
      setWarranty(Array.isArray(warRes.data) ? warRes.data : warRes.data?.results || []);
      setLowStock(Array.isArray(lsRes.data)  ? lsRes.data  : lsRes.data?.results  || []);
      setActivity(Array.isArray(actRes.data) ? actRes.data : actRes.data?.results || []);
      setLastLoaded(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Dashboard load error:", e);
      setDataError("Some dashboard data failed to load. Check your connection and try refreshing.");
    } finally {
      setLoading(false);
    }

    // Independent fetch — failure must never crash the main dashboard load
    try {
      const dueRes = await api.get("/api/maintenance/due-soon/?days=14&page_size=5");
      setDueSoon(Array.isArray(dueRes.data) ? dueRes.data : dueRes.data?.results || []);
      setDueSoonErr(false);
    } catch {
      setDueSoon([]);
      setDueSoonErr(true);
    }
  }

  useEffect(() => { load(); }, []);

  const low = summary?.low_stock ?? 0;
  const war = summary?.warranty_expiring_30 ?? 0;

  const kpis = [
    { label:"Total Assets",           value: summary?.total_assets      ?? "—", sub:"tracked items",             icon:Package,     color:C.blue,   bg:"rgba(96,165,250,.10)",   path:"/assets"     },
    { label:"Consumables",            value: summary?.total_consumables  ?? "—", sub:"SKUs on hand",              icon:Boxes,       color:C.purple, bg:"rgba(192,132,252,.10)",  path:"/consumables"},
    { label:"Low Stock Alerts",       value: low,                                sub: low > 0 ? "need restocking" : "all healthy",
      icon:AlertTriangle, color: low > 0 ? C.red   : C.green, bg: low > 0 ? "rgba(248,113,113,.10)" : "rgba(52,211,153,.10)", path:"/low-stock" },
    { label:"Warranty Alerts (30d)",  value: war,                                sub: war > 0 ? "expiring soon"  : "all valid",
      icon:ShieldAlert,   color: war > 0 ? C.amber : C.green, bg: war > 0 ? "rgba(251,191,36,.10)"  : "rgba(52,211,153,.10)", path:"/assets"    },
    { label:"Asset Portfolio Value",  value: fmtCurrency(summary?.total_asset_value), sub:"total purchase value", icon:DollarSign,  color:C.green,  bg:"rgba(52,211,153,.10)",   path:"/assets"     },
    { label:"Audit Records",          value: summary?.audit_records      ?? "—", sub:"change events logged",      icon:ClipboardList,color:C.indigo, bg:"rgba(129,140,248,.10)", path:"/audit"      },
    { label:"Pending Requests",       value: summary?.pending_requests    ?? "—", sub:"awaiting approval",         icon:Inbox,        color:C.amber,  bg:"rgba(251,191,36,.10)",   path:"/requests"   },
    { label:"Maintenance Records",    value: summary?.maintenance_count   ?? "—", sub:"service events",           icon:Wrench,       color:C.teal,   bg:"rgba(45,212,191,.10)",   path:"/maintenance"},
  ];

  const tt = {
    contentStyle: {
      background:"var(--page-card-bg)", border:"1px solid var(--page-card-border)",
      borderRadius:10, fontSize:12, color:"var(--page-td-text)",
    },
    labelStyle: { color:"var(--page-th-text)" },
    cursor: { fill:"rgba(255,255,255,0.04)" },
  };

  return (
    <>
      <style>{css}</style>
      <div className="db">
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:700, color:"var(--page-title)", letterSpacing:"-.5px", margin:0 }}>Dashboard</h1>
            <p style={{ fontSize:14, color:"var(--page-sub)", margin:"5px 0 0" }}>
              County inventory overview{lastLoaded ? ` · updated ${lastLoaded}` : ""}
            </p>
          </div>
          <button
            onClick={load} disabled={loading}
            style={{
              padding:"9px 16px", borderRadius:10, fontSize:14, fontWeight:500, fontFamily:"inherit",
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
              border:"1px solid var(--page-btn-border)", background:"var(--page-btn-bg)",
              color:"var(--page-btn-text)", display:"inline-flex", alignItems:"center", gap:7,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin .9s linear infinite" : "none" }} />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Error banner */}
        {dataError && (
          <div className="db-err-banner">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{dataError}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="db-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="db-kpi" onClick={() => nav(k.path)} title={`Go to ${k.label}`}>
              <div className="db-kpi-icon" style={{ background: k.bg }}>
                <k.icon size={20} style={{ color: k.color }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="db-kpi-val" style={{ color: k.color }}>{k.value}</div>
                <div className="db-kpi-lbl">{k.label}</div>
                <div className="db-kpi-sub">{k.sub}</div>
              </div>
              <ChevronRight size={14} className="db-kpi-arrow" style={{ color:"var(--text-dim)" }} />
            </div>
          ))}
        </div>

        {/* Row 1: Area Trend + Pie Categories */}
        <div className="db-row">
          <div className="db-card">
            <div className="db-card-hdr">
              <span className="db-card-title"><TrendingUp size={13} />Monthly Creation Trend</span>
              <button className="db-link-btn" onClick={() => nav("/assets")}>Assets <ChevronRight size={12} /></button>
            </div>
            <div className="db-card-body" style={{ padding:"18px 12px 12px" }}>
              {loading || !trends ? <Skel lines={4} /> : trends.length === 0 ? (
                <div className="db-empty">No trend data yet — add some assets or consumables.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trends} margin={{ top:5, right:5, bottom:0, left:-20 }}>
                    <defs>
                      <linearGradient id="gBlue"   x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C.blue}   stopOpacity={0.3} />
                        <stop offset="100%" stopColor={C.blue}   stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gPurple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={C.purple} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={C.purple} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill:"var(--page-th-text)", fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:"var(--page-th-text)", fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...tt} />
                    <Legend wrapperStyle={{ fontSize:12, color:"var(--page-sub)", paddingTop:8 }} />
                    <Area type="monotone" dataKey="assets"      name="Assets"      stroke={C.blue}   fill="url(#gBlue)"   strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="consumables" name="Consumables" stroke={C.purple} fill="url(#gPurple)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-hdr">
              <span className="db-card-title"><Package size={13} />Asset Categories</span>
            </div>
            <div className="db-card-body" style={{ padding:"14px 12px 12px" }}>
              {loading || !categories ? <Skel lines={4} /> : categories.length === 0 ? (
                <div className="db-empty">No category data yet.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={categories} dataKey="count" nameKey="category" cx="50%" cy="50%" innerRadius={45} outerRadius={78} paddingAngle={2}>
                        {categories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tt} formatter={(v, n) => [v + " items", n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="db-pie-legend">
                    {categories.map((c, i) => (
                      <div key={c.category} className="db-pie-lbl">
                        <div className="db-pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span>{c.category || "Other"} ({c.count})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Bar Depts + Warranty Alerts */}
        <div className="db-row">
          <div className="db-card">
            <div className="db-card-hdr">
              <span className="db-card-title"><Boxes size={13} />Department Breakdown</span>
              <button className="db-link-btn" onClick={() => nav("/departments")}>Manage <ChevronRight size={12} /></button>
            </div>
            <div className="db-card-body" style={{ padding:"18px 12px 12px" }}>
              {loading || !depts ? <Skel lines={4} /> : depts.length === 0 ? (
                <div className="db-empty">No departments configured yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, depts.length * 36)}>
                  <BarChart data={depts} layout="vertical" margin={{ top:0, right:10, bottom:0, left:0 }} barSize={10}>
                    <XAxis type="number" tick={{ fill:"var(--page-th-text)", fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="code" tick={{ fill:"var(--page-th-text)", fontSize:11, fontFamily:"'DM Mono',monospace" }} axisLine={false} tickLine={false} width={42} />
                    <Tooltip {...tt} />
                    <Legend wrapperStyle={{ fontSize:12, color:"var(--page-sub)" }} />
                    <Bar dataKey="asset_count"      name="Assets"      fill={C.blue}   radius={[0,4,4,0]} />
                    <Bar dataKey="consumable_count" name="Consumables" fill={C.purple} radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-hdr">
              <span className="db-card-title"><ShieldAlert size={13} />Warranty Expiry — 90 Days</span>
              <button className="db-link-btn" onClick={() => nav("/assets")}>All assets <ChevronRight size={12} /></button>
            </div>
            <div className="db-card-body">
              {loading || !warranty ? <Skel /> : warranty.length === 0 ? (
                <div className="db-empty">✅ No warranties expiring within 90 days.</div>
              ) : (
                <div className="db-war-list">
                  {warranty.map(a => {
                    const days = warrantyDays(a.warranty_expiry);
                    const cls  = days < 7 ? "red" : days < 30 ? "amber" : "green";
                    const lbl  = days < 1 ? "Expires today!" : days === 1 ? "1 day" : `${days} days`;
                    return (
                      <div key={a.id} className="db-war-item">
                        <div>
                          <div className="db-war-tag">{a.asset_tag}</div>
                          <div className="db-war-name">{a.name}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div className={`db-war-days ${cls}`}>{lbl}</div>
                          <div style={{ fontSize:11, color:"var(--text-dim)", marginTop:3, fontFamily:"'DM Mono',monospace" }}>
                            {a.warranty_expiry}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Low Stock + Maintenance Due + Activity — 3 columns */}
        <div className="db-row3">
          <div className="db-card">
            <div className="db-card-hdr">
              <span className="db-card-title"><AlertTriangle size={13} />Low Stock Quick View</span>
              <button className="db-link-btn" onClick={() => nav("/low-stock")}>View all <ChevronRight size={12} /></button>
            </div>
            <div className="db-card-body">
              {loading || !lowStock ? <Skel /> : lowStock.length === 0 ? (
                <div className="db-empty">✅ All consumable stock levels are healthy.</div>
              ) : (
                <div className="db-ls-list">
                  {lowStock.map(r => (
                    <div key={r.id ?? r.sku} className="db-ls-item">
                      <span className="db-ls-sku">{r.sku}</span>
                      <span className="db-ls-name">{r.name}</span>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div className="db-ls-qty">{r.quantity_on_hand}</div>
                        <div className="db-ls-reorder">/ {r.reorder_level} min</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-hdr">
              <span className="db-card-title"><CalendarClock size={13} />Maintenance Due (14 days)</span>
              <button className="db-link-btn" onClick={() => nav("/maintenance")}>All records <ChevronRight size={12} /></button>
            </div>
            <div className="db-card-body">
              {loading || !dueSoon ? <Skel /> : dueSoonErr ? (
                <div className="db-empty" style={{ color:"var(--amber-text)" }}>⚠ Could not load maintenance schedule.</div>
              ) : dueSoon.length === 0 ? (
                <div className="db-empty">✅ No maintenance due in the next 14 days.</div>
              ) : (
                <div className="db-war-list">
                  {dueSoon.map(m => {
                    const days = m.next_due_date
                      ? Math.floor((new Date(m.next_due_date) - new Date()) / 86400000)
                      : null;
                    const cls = days === null ? "green" : days < 0 ? "red" : days < 3 ? "red" : days < 7 ? "amber" : "green";
                    const lbl = days === null ? "Due" : days < 0 ? "OVERDUE" : days < 1 ? "Due today!" : days === 1 ? "1 day" : `${days} days`;
                    return (
                      <div key={m.id} className="db-war-item">
                        <div>
                          <div className="db-war-tag">{m.asset_tag || `#${m.id}`}</div>
                          <div className="db-war-name">{m.asset_name || m.description?.slice(0, 40) || "Maintenance"}</div>
                          <div style={{ fontSize:11, color:"var(--text-dim)", marginTop:2 }}>{m.maintenance_type}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div className={`db-war-days ${cls}`}>{lbl}</div>
                          <div style={{ fontSize:11, color:"var(--text-dim)", marginTop:3, fontFamily:"'DM Mono',monospace" }}>
                            {m.next_due_date}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-hdr">
              <span className="db-card-title"><ClipboardList size={13} />Recent Activity</span>
              <button className="db-link-btn" onClick={() => nav("/audit")}>Full log <ChevronRight size={12} /></button>
            </div>
            <div className="db-card-body">
              {loading || !activity ? <Skel /> : activity.length === 0 ? (
                <div className="db-empty">No activity recorded yet.</div>
              ) : (
                <div className="db-act-list">
                  {activity.map((x, i) => (
                    <div key={x.id ?? i} className="db-act-item">
                      <div className={`db-act-ico ${x.action}`}>{ACT_ICON[x.action] || "·"}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="db-act-summary">{x.summary || `${x.action} ${x.entity_type}`}</div>
                        <div className="db-act-meta">
                          {x.changed_by_username || "system"} · {x.entity_id}
                          {x.department_code ? ` · ${x.department_code}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
