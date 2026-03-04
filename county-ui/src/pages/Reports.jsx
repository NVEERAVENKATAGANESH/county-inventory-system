/**
 * Reports.jsx — Admin printable / exportable inventory reports
 *
 * Sections:
 *  1. Executive Summary — KPI tiles (assets, consumables, value, low stock, warranties)
 *  2. Assets by Department — bar list with asset counts + value
 *  3. Assets by Condition — pie-like breakdown
 *  4. Warranty Status — counts by ACTIVE / EXPIRING / EXPIRED / N/A
 *  5. Low Stock — table of items below reorder level
 *  6. Top Maintenance Cost — assets ranked by total maintenance spend
 *
 * Print: window.print() — uses @media print rules to hide nav / chrome
 */
import { useEffect, useState } from "react";
import { api, fmtApiError, isAdmin } from "../api";
import { FileText, Printer, RefreshCw, TrendingUp, ShieldAlert, BarChart2 } from "lucide-react";

const css = `
.rp { font-family:'DM Sans',system-ui,sans-serif; color:var(--text); }
.rp-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:28px; flex-wrap:wrap; }
.rp-title { font-size:28px; font-weight:700; color:var(--page-title); letter-spacing:-.5px; margin:0; display:flex; align-items:center; gap:10px; }
.rp-sub { font-size:15px; color:var(--page-sub); margin:5px 0 0; }
.rp-acts { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.rp-btn {
  padding:9px 16px; border-radius:10px; font-size:14px; font-weight:500;
  font-family:inherit; cursor:pointer; transition:all .13s;
  border:1px solid var(--page-btn-border); background:var(--page-btn-bg); color:var(--page-btn-text);
  display:inline-flex; align-items:center; gap:7px; white-space:nowrap;
}
.rp-btn:hover { border-color:var(--border-md); color:var(--text); background:var(--bg-panel2); }
.rp-btn:disabled { opacity:.4; cursor:not-allowed; }
.rp-btn.primary { background:var(--blue-dim); border-color:var(--blue-dim); color:var(--blue-text); }
.rp-err { background:var(--red-dim); border:1px solid var(--red-dim); border-radius:10px; padding:10px 15px; font-size:14px; color:var(--red-text); margin-bottom:16px; }
/* Section */
.rp-section { margin-bottom:32px; }
.rp-section-title {
  font-size:13px; font-weight:700; color:var(--page-sub);
  text-transform:uppercase; letter-spacing:.7px; margin:0 0 14px;
  display:flex; align-items:center; gap:8px;
  padding-bottom:10px; border-bottom:1px solid var(--page-card-border);
}
/* KPI grid */
.rp-kpi { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:14px; }
.rp-kpi-card { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:16px 18px; }
.rp-kpi-val  { font-size:28px; font-weight:700; color:var(--page-title); font-variant-numeric:tabular-nums; line-height:1.1; }
.rp-kpi-lbl  { font-size:12px; color:var(--page-sub); margin-top:4px; font-weight:500; text-transform:uppercase; letter-spacing:.5px; }
.rp-kpi-card.accent-blue   { border-top:3px solid #60a5fa; }
.rp-kpi-card.accent-purple { border-top:3px solid #c084fc; }
.rp-kpi-card.accent-green  { border-top:3px solid #34d399; }
.rp-kpi-card.accent-red    { border-top:3px solid #f87171; }
.rp-kpi-card.accent-amber  { border-top:3px solid #fbbf24; }
.rp-kpi-card.accent-indigo { border-top:3px solid #818cf8; }
/* Dept table */
.rp-tbl-wrap { background:var(--page-tbl-bg); border:1px solid var(--page-card-border); border-radius:14px; overflow:hidden; }
.rp-tbl { width:100%; border-collapse:collapse; }
.rp-tbl th { text-align:left; padding:11px 16px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--page-th-text); border-bottom:1px solid var(--page-card-border); background:var(--page-th-bg); }
.rp-tbl td { padding:11px 16px; font-size:14px; color:var(--page-td-text); border-bottom:1px solid var(--page-card-border); }
.rp-tbl tr:last-child td { border-bottom:none; }
.rp-tbl tr:hover td { background:var(--bg-hover); }
/* Bar progress */
.rp-bar-row { display:flex; align-items:center; gap:10px; }
.rp-bar-track { flex:1; height:7px; background:var(--page-card-border); border-radius:4px; overflow:hidden; }
.rp-bar-fill  { height:100%; border-radius:4px; transition:width .4s ease; }
.rp-bar-num   { font-size:13px; font-variant-numeric:tabular-nums; color:var(--text); min-width:32px; text-align:right; }
/* Condition / Warranty grid */
.rp-2col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media(max-width:640px){ .rp-2col { grid-template-columns:1fr; } }
.rp-panel { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:18px 20px; }
.rp-panel-title { font-size:13px; font-weight:700; color:var(--page-sub); text-transform:uppercase; letter-spacing:.5px; margin:0 0 14px; }
.rp-cond-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--page-card-border); }
.rp-cond-row:last-child { border-bottom:none; }
.rp-cond-lbl { font-size:14px; display:flex; align-items:center; gap:8px; }
.rp-cond-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.rp-cond-num { font-size:20px; font-weight:700; color:var(--page-title); font-variant-numeric:tabular-nums; }
/* Low stock table */
.rp-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; font-family:'DM Mono',monospace; }
.rp-badge.critical { background:var(--red-dim);   color:var(--red-text); }
.rp-badge.low      { background:var(--amber-dim);  color:var(--amber-text); }
/* Skel */
.rp-skel { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:24px; }
.rp-skel-bar { height:12px; border-radius:4px; background:var(--page-skel); animation:skel 1.5s ease-in-out infinite; margin-bottom:12px; }
@keyframes skel{0%,100%{opacity:.45}50%{opacity:.85}}
/* Print */
@media print {
  .rp-acts, .layout-sidebar, .layout-footer, .nb { display:none !important; }
  .rp { padding:0; }
  .rp-hdr { margin-bottom:16px; }
  .rp-section { page-break-inside:avoid; margin-bottom:20px; }
  .rp-kpi-card, .rp-panel, .rp-tbl-wrap { border:1px solid #ccc !important; }
}
`;

function fmtMoney(v) {
  return "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="rp-cond-row">
      <span className="rp-cond-lbl">
        <span className="rp-cond-dot" style={{ background: color }} />
        {label}
      </span>
      <div className="rp-bar-row" style={{ flex: 1, marginLeft: 16 }}>
        <div className="rp-bar-track">
          <div className="rp-bar-fill" style={{ width: pct + "%", background: color }} />
        </div>
        <span className="rp-bar-num">{value}</span>
      </div>
    </div>
  );
}

export default function Reports() {
  const admin = isAdmin();

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [summary,    setSummary]    = useState(null);
  const [depts,      setDepts]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [lowStock,   setLowStock]   = useState([]);
  const [maint,      setMaint]      = useState([]);   // for maintenance cost ranking

  const load = async () => {
    setLoading(true); setError("");
    try {
      // Fetch all maintenance pages for accurate cost ranking
      let maintResults = [];
      let maintUrl = "/api/maintenance/";
      let maintParams = { page_size: 500, ordering: "-cost" };
      while (maintUrl) {
        // eslint-disable-next-line no-await-in-loop
        const res = await api.get(maintUrl, { params: maintParams });
        const data = res.data;
        maintResults = maintResults.concat(data?.results ?? []);
        // DRF returns absolute next URL — strip base for axios
        const nextUrl = data?.next ?? null;
        if (nextUrl) {
          const url = new URL(nextUrl);
          maintUrl = url.pathname + url.search;
          maintParams = {};
        } else {
          maintUrl = null;
        }
      }

      const [sumRes, deptRes, catRes, lsRes] = await Promise.all([
        api.get("/api/dashboard/summary/"),
        api.get("/api/dashboard/departments/"),
        api.get("/api/dashboard/categories/"),
        api.get("/api/consumables/low-stock/", { params: { page_size: 500 } }),
      ]);
      setSummary(sumRes.data);
      setDepts(deptRes.data ?? []);
      setCategories(catRes.data ?? []);
      setLowStock(lsRes.data?.results ?? lsRes.data ?? []);
      setMaint(maintResults);
    } catch (err) {
      setError(fmtApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Derived: maintenance cost per asset (all pages fetched)
  const maintByAsset = maint.reduce((acc, r) => {
    if (!r.asset_tag) return acc;
    acc[r.asset_tag] = (acc[r.asset_tag] || { tag: r.asset_tag, name: r.asset_name, total: 0 });
    acc[r.asset_tag].total += Number(r.cost || 0);
    return acc;
  }, {});
  const topMaint = Object.values(maintByAsset)
    .filter(a => a.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Condition + warranty counts from backend aggregation (summary endpoint)
  const condCounts = summary?.condition_breakdown ?? {};
  const warCounts  = summary?.warranty_breakdown  ?? {};
  const totalAssets = summary?.total_assets ?? 0;

  // Dept max for bar scaling
  const maxDeptAssets = Math.max(...depts.map(d => d.asset_count), 1);

  // Dept total asset value (approximate from summary — full breakdown needs backend change)
  const today = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });

  if (!admin) {
    return (
      <>
        <style>{css}</style>
        <div className="rp">
          <div className="rp-hdr">
            <div>
              <h1 className="rp-title"><FileText size={24} />Reports</h1>
              <p className="rp-sub">Admin access required</p>
            </div>
          </div>
          <div className="rp-err">Reports are restricted to Admin role. Switch role to access.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="rp">

        {/* Header */}
        <div className="rp-hdr">
          <div>
            <h1 className="rp-title"><FileText size={24} />Reports</h1>
            <p className="rp-sub">Inventory summary as of {today}</p>
          </div>
          <div className="rp-acts">
            <button className="rp-btn" onClick={load} disabled={loading}>
              <RefreshCw size={13} />Refresh
            </button>
            <button className="rp-btn primary" onClick={() => window.print()}>
              <Printer size={14} />Print / Save PDF
            </button>
          </div>
        </div>

        {error && <div className="rp-err">{error}</div>}

        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {[1,2,3].map(i => (
              <div key={i} className="rp-skel">
                <div className="rp-skel-bar" style={{ width:"30%" }} />
                <div className="rp-skel-bar" style={{ width:"70%" }} />
                <div className="rp-skel-bar" style={{ width:"55%" }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ── 1. Executive Summary ── */}
            <div className="rp-section">
              <div className="rp-section-title"><TrendingUp size={14} />Executive Summary</div>
              <div className="rp-kpi">
                <div className="rp-kpi-card accent-blue">
                  <div className="rp-kpi-val">{summary?.total_assets ?? 0}</div>
                  <div className="rp-kpi-lbl">Total Assets</div>
                </div>
                <div className="rp-kpi-card accent-purple">
                  <div className="rp-kpi-val">{summary?.total_consumables ?? 0}</div>
                  <div className="rp-kpi-lbl">Consumables</div>
                </div>
                <div className="rp-kpi-card accent-green">
                  <div className="rp-kpi-val" style={{ fontSize: 20 }}>{fmtMoney(summary?.total_asset_value)}</div>
                  <div className="rp-kpi-lbl">Total Asset Value</div>
                </div>
                <div className="rp-kpi-card accent-red">
                  <div className="rp-kpi-val" style={{ color: summary?.low_stock > 0 ? "var(--red-text)" : undefined }}>
                    {summary?.low_stock ?? 0}
                  </div>
                  <div className="rp-kpi-lbl">Low Stock Items</div>
                </div>
                <div className="rp-kpi-card accent-amber">
                  <div className="rp-kpi-val" style={{ color: summary?.warranty_expiring_30 > 0 ? "var(--amber-text)" : undefined }}>
                    {summary?.warranty_expiring_30 ?? 0}
                  </div>
                  <div className="rp-kpi-lbl">Warranties (30 days)</div>
                </div>
                <div className="rp-kpi-card accent-indigo">
                  <div className="rp-kpi-val">{summary?.audit_records ?? 0}</div>
                  <div className="rp-kpi-lbl">Audit Records</div>
                </div>
              </div>
            </div>

            {/* ── 2. Assets by Department ── */}
            <div className="rp-section">
              <div className="rp-section-title"><BarChart2 size={14} />Assets by Department</div>
              <div className="rp-tbl-wrap">
                <table className="rp-tbl">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Code</th>
                      <th>Assets</th>
                      <th style={{ width:"40%" }}>Distribution</th>
                      <th>Consumables</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depts.map(d => (
                      <tr key={d.code}>
                        <td style={{ fontWeight: 500 }}>{d.name}</td>
                        <td style={{ fontFamily:"'DM Mono',monospace", fontSize: 12, color:"var(--purple-text)" }}>{d.code}</td>
                        <td style={{ fontWeight: 600, fontVariantNumeric:"tabular-nums" }}>{d.asset_count}</td>
                        <td>
                          <div className="rp-bar-row">
                            <div className="rp-bar-track">
                              <div className="rp-bar-fill" style={{
                                width: Math.round((d.asset_count / maxDeptAssets) * 100) + "%",
                                background: "#60a5fa"
                              }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ fontVariantNumeric:"tabular-nums" }}>{d.consumable_count}</td>
                      </tr>
                    ))}
                    {depts.length === 0 && (
                      <tr><td colSpan={5} style={{ padding:"24px", textAlign:"center", color:"var(--page-sub)" }}>No departments found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── 3. Condition + Warranty side-by-side ── */}
            <div className="rp-section">
              <div className="rp-section-title"><ShieldAlert size={14} />Asset Condition &amp; Warranty Status</div>
              <div className="rp-2col">
                <div className="rp-panel">
                  <div className="rp-panel-title">Condition Breakdown</div>
                  <BarRow label="Good"         value={condCounts.GOOD         ?? 0} max={totalAssets} color="#34d399" />
                  <BarRow label="Needs Repair" value={condCounts.NEEDS_REPAIR ?? 0} max={totalAssets} color="#fbbf24" />
                  <BarRow label="Retired"      value={condCounts.RETIRED      ?? 0} max={totalAssets} color="#f87171" />
                </div>
                <div className="rp-panel">
                  <div className="rp-panel-title">Warranty Breakdown</div>
                  <BarRow label="Active"       value={warCounts.ACTIVE    ?? 0} max={totalAssets} color="#34d399" />
                  <BarRow label="Expiring Soon"value={warCounts.EXPIRING  ?? 0} max={totalAssets} color="#fbbf24" />
                  <BarRow label="Expired"      value={warCounts.EXPIRED   ?? 0} max={totalAssets} color="#f87171" />
                  <BarRow label="No Warranty"  value={warCounts["N/A"]    ?? 0} max={totalAssets} color="#94a3b8" />
                </div>
              </div>
            </div>

            {/* ── 4. Category Breakdown ── */}
            {categories.length > 0 && (
              <div className="rp-section">
                <div className="rp-section-title"><BarChart2 size={14} />Assets by Category</div>
                <div className="rp-panel">
                  {categories.map(c => (
                    <BarRow
                      key={c.category || "Uncategorized"}
                      label={c.category || "Uncategorized"}
                      value={c.count}
                      max={totalAssets}
                      color="#818cf8"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── 5. Low Stock Table ── */}
            {lowStock.length > 0 && (
              <div className="rp-section">
                <div className="rp-section-title" style={{ color:"var(--red-text)" }}>
                  <ShieldAlert size={14} />Low Stock Alert ({lowStock.length} items)
                </div>
                <div className="rp-tbl-wrap">
                  <table className="rp-tbl">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Dept</th>
                        <th>On Hand</th>
                        <th>Reorder Level</th>
                        <th>Needed</th>
                        <th>Supplier</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStock.map(c => {
                        const needed  = Math.max(0, c.reorder_level - c.quantity_on_hand);
                        const pct     = c.reorder_level > 0 ? c.quantity_on_hand / c.reorder_level : 1;
                        const cls     = pct <= 0 ? "critical" : "low";
                        return (
                          <tr key={c.id}>
                            <td style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"var(--purple-text)" }}>{c.sku}</td>
                            <td style={{ fontWeight:500 }}>{c.name}</td>
                            <td>{c.category || "—"}</td>
                            <td>{c.department_code || "—"}</td>
                            <td style={{ fontWeight:600, color: pct <= 0 ? "var(--red-text)" : "var(--amber-text)" }}>
                              {c.quantity_on_hand} {c.unit}
                            </td>
                            <td>{c.reorder_level} {c.unit}</td>
                            <td style={{ fontWeight:600 }}>{needed}</td>
                            <td>{c.supplier || "—"}</td>
                            <td><span className={`rp-badge ${cls}`}>{cls === "critical" ? "OUT" : "LOW"}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 6. Top Maintenance Cost ── */}
            {topMaint.length > 0 && (
              <div className="rp-section">
                <div className="rp-section-title"><TrendingUp size={14} />Top Maintenance Cost — Assets</div>
                <div className="rp-tbl-wrap">
                  <table className="rp-tbl">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Asset Tag</th>
                        <th>Asset Name</th>
                        <th>Total Maintenance Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topMaint.map((a, i) => (
                        <tr key={a.tag}>
                          <td style={{ color:"var(--page-sub)", width:40 }}>{i + 1}</td>
                          <td style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"var(--purple-text)" }}>{a.tag}</td>
                          <td>{a.name || "—"}</td>
                          <td style={{ fontWeight:700, color:"var(--amber-text)" }}>{fmtMoney(a.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
