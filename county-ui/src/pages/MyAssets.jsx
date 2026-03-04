/**
 * MyAssets.jsx — Employee self-service: my assigned assets
 * - Shows assets assigned to the currently logged-in user
 * - "Report an Issue" button → pre-fills a CORRECTIVE maintenance request
 * - "Request Return" → opens request form pre-filled for return
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtApiError, getUsername } from "../api";
import { Package, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Wrench, ArrowLeftRight } from "lucide-react";

const css = `
.ma { font-family:'DM Sans',system-ui,sans-serif; color:var(--text); }
.ma-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
.ma-title { font-size:28px; font-weight:700; color:var(--page-title); letter-spacing:-.5px; margin:0; display:flex; align-items:center; gap:10px; }
.ma-sub { font-size:15px; color:var(--page-sub); margin:5px 0 0; }
.ma-acts { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.ma-btn {
  padding:9px 16px; border-radius:10px; font-size:14px; font-weight:500;
  font-family:inherit; cursor:pointer; transition:all .13s;
  border:1px solid var(--page-btn-border); background:var(--page-btn-bg); color:var(--page-btn-text);
  display:inline-flex; align-items:center; gap:7px; white-space:nowrap;
}
.ma-btn:hover { border-color:var(--border-md); color:var(--text); background:var(--bg-panel2); }
.ma-btn:disabled { opacity:.4; cursor:not-allowed; }
.ma-btn.primary { background:var(--blue-dim); border-color:var(--blue-dim); color:var(--blue-text); }
.ma-btn.warn    { background:var(--amber-dim); border-color:var(--amber-dim); color:var(--amber-text); }
.ma-btn.sm { padding:6px 12px; font-size:12.5px; border-radius:8px; }
.ma-err { background:var(--red-dim); border:1px solid var(--red-dim); border-radius:10px; padding:10px 15px; font-size:14px; color:var(--red-text); margin-bottom:16px; }
.ma-ok  { background:var(--green-dim); border:1px solid var(--green-dim); border-radius:10px; padding:10px 15px; font-size:14px; color:var(--green-text); margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }
/* Stats */
.ma-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:24px; }
@media(max-width:600px){ .ma-stats { grid-template-columns:1fr; } }
.ma-stat { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:14px 18px; }
.ma-stat-val { font-size:26px; font-weight:700; color:var(--page-title); font-variant-numeric:tabular-nums; }
.ma-stat-lbl { font-size:12px; color:var(--page-sub); margin-top:2px; font-weight:500; text-transform:uppercase; letter-spacing:.5px; }
/* Cards */
.ma-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; margin-bottom:24px; }
@media(max-width:480px){ .ma-grid { grid-template-columns:1fr; } }
.ma-card { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:16px; overflow:hidden; transition:box-shadow .15s; }
.ma-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.12); }
.ma-card-hdr { padding:16px 18px 12px; border-bottom:1px solid var(--page-card-border); display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.ma-card-tag { font-family:'DM Mono',monospace; font-size:12px; color:var(--purple-text); font-weight:600; }
.ma-card-name { font-size:16px; font-weight:600; color:var(--text); margin:4px 0 0; line-height:1.3; }
.ma-card-cat { font-size:12px; color:var(--page-sub); margin-top:2px; }
.ma-card-body { padding:14px 18px; display:flex; flex-direction:column; gap:8px; }
.ma-card-row { display:flex; align-items:center; justify-content:space-between; font-size:13px; }
.ma-card-key { color:var(--page-sub); }
.ma-card-val { font-weight:500; color:var(--text); }
.ma-card-ftr { padding:12px 18px; border-top:1px solid var(--page-card-border); display:flex; gap:8px; flex-wrap:wrap; }
/* Badges */
.ma-bdg { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; font-family:'DM Mono',monospace; border:1px solid transparent; white-space:nowrap; }
.ma-bdg.good     { background:var(--green-dim); color:var(--green-text); border-color:var(--green-dim); }
.ma-bdg.repair   { background:var(--amber-dim); color:var(--amber-text); border-color:var(--amber-dim); }
.ma-bdg.retired  { background:var(--red-dim);   color:var(--red-text);   border-color:var(--red-dim); }
.ma-bdg.war-act  { background:var(--green-dim); color:var(--green-text); border-color:var(--green-dim); }
.ma-bdg.war-exp  { background:var(--amber-dim); color:var(--amber-text); border-color:var(--amber-dim); }
.ma-bdg.war-dead { background:var(--red-dim);   color:var(--red-text);   border-color:var(--red-dim); }
.ma-bdg.war-na   { color:var(--page-sub); border-color:var(--page-card-border); }
/* Empty */
.ma-empty { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:16px; padding:60px 24px; text-align:center; }
.ma-empty-icon { color:var(--page-sub); opacity:.4; margin-bottom:12px; }
.ma-empty-txt { font-size:16px; color:var(--page-sub); }
/* Skel */
.ma-skel-card { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:16px; padding:18px; height:220px; }
.ma-skel-bar { height:12px; border-radius:4px; background:var(--page-skel); animation:skel 1.5s ease-in-out infinite; margin-bottom:10px; }
@keyframes skel{0%,100%{opacity:.45}50%{opacity:.85}}
`;

function condBadge(c) {
  const map = { GOOD:"good", NEEDS_REPAIR:"repair", RETIRED:"retired" };
  const label = { GOOD:"Good", NEEDS_REPAIR:"Needs Repair", RETIRED:"Retired" };
  return <span className={`ma-bdg ${map[c] || "good"}`}>{label[c] || c}</span>;
}

function warBadge(ws, expiry) {
  if (ws === "ACTIVE")   return <span className="ma-bdg war-act">Warranty Active</span>;
  if (ws === "EXPIRING") return <span className="ma-bdg war-exp">Expiring Soon · {expiry}</span>;
  if (ws === "EXPIRED")  return <span className="ma-bdg war-dead">Expired · {expiry}</span>;
  return <span className="ma-bdg war-na">No Warranty</span>;
}

export default function MyAssets() {
  const navigate  = useNavigate();
  const username  = getUsername();

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [toast,   setToast]   = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/api/assets/", {
        params: { assigned_to_username: username, page_size: 200, ordering: "asset_tag" },
      });
      const items = res.data?.results ?? res.data ?? [];
      setRows(items);
    } catch (err) { setError(fmtApiError(err)); setRows([]); }
    finally { setLoading(false); }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  function goReportIssue(asset) {
    // Navigate to requests page pre-filled for REPORT_ISSUE
    navigate(`/requests/new?type=REPORT_ISSUE&asset=${asset.asset_tag}&title=${encodeURIComponent("Issue with " + asset.name)}`);
  }

  function goRequestReturn(asset) {
    navigate(`/requests/new?type=RETURN&asset=${asset.asset_tag}&title=${encodeURIComponent("Return " + asset.name)}`);
  }

  const goodCount     = rows.filter(r => r.condition === "GOOD").length;
  const repairCount   = rows.filter(r => r.condition === "NEEDS_REPAIR").length;
  const warExpiring   = rows.filter(r => r.warranty_status === "EXPIRING" || r.warranty_status === "EXPIRED").length;

  return (
    <>
      <style>{css}</style>
      <div className="ma">
        {/* Header */}
        <div className="ma-hdr">
          <div>
            <h1 className="ma-title"><Package size={24} />My Assets</h1>
            <p className="ma-sub">
              Assets assigned to <strong>{username}</strong> · {rows.length} item{rows.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="ma-acts">
            <button className="ma-btn" onClick={load} disabled={loading}><RefreshCw size={13} />Refresh</button>
            <button className="ma-btn primary" onClick={() => navigate("/requests/new?type=ASSET_REQUEST")}>
              + Request Asset
            </button>
          </div>
        </div>

        {error && <div className="ma-err">{error}</div>}
        {toast && <div className="ma-ok"><span>{toast}</span><button className="ma-btn sm" onClick={() => setToast("")}>✕</button></div>}

        {/* Stats */}
        {!loading && rows.length > 0 && (
          <div className="ma-stats">
            <div className="ma-stat">
              <div className="ma-stat-val">{rows.length}</div>
              <div className="ma-stat-lbl">Total Assigned</div>
            </div>
            <div className="ma-stat">
              <div className="ma-stat-val" style={{ color: repairCount > 0 ? "var(--amber-text)" : "var(--green-text)" }}>
                {repairCount > 0 ? repairCount : goodCount}
              </div>
              <div className="ma-stat-lbl">{repairCount > 0 ? "Need Repair" : "In Good Condition"}</div>
            </div>
            <div className="ma-stat">
              <div className="ma-stat-val" style={{ color: warExpiring > 0 ? "var(--amber-text)" : "var(--page-title)" }}>
                {warExpiring}
              </div>
              <div className="ma-stat-lbl">Warranty Alerts</div>
            </div>
          </div>
        )}

        {/* Asset Cards */}
        {loading ? (
          <div className="ma-grid">
            {[1,2,3].map(i => (
              <div key={i} className="ma-skel-card">
                <div className="ma-skel-bar" style={{ width:"40%" }} />
                <div className="ma-skel-bar" style={{ width:"70%" }} />
                <div className="ma-skel-bar" style={{ width:"55%", marginTop:16 }} />
                <div className="ma-skel-bar" style={{ width:"80%" }} />
                <div className="ma-skel-bar" style={{ width:"60%" }} />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="ma-empty">
            <div className="ma-empty-icon"><Package size={48} /></div>
            <div className="ma-empty-txt">No assets are currently assigned to you.</div>
            <button className="ma-btn primary" style={{ margin:"16px auto 0", display:"inline-flex" }}
              onClick={() => navigate("/requests/new?type=ASSET_REQUEST")}>
              Request an Asset
            </button>
          </div>
        ) : (
          <div className="ma-grid">
            {rows.map(asset => (
              <div key={asset.id} className="ma-card">
                <div className="ma-card-hdr">
                  <div>
                    <div className="ma-card-tag">{asset.asset_tag}</div>
                    <div className="ma-card-name">{asset.name}</div>
                    <div className="ma-card-cat">{asset.category || "Uncategorized"}</div>
                  </div>
                  {condBadge(asset.condition)}
                </div>

                <div className="ma-card-body">
                  <div className="ma-card-row">
                    <span className="ma-card-key">Department</span>
                    <span className="ma-card-val">{asset.department_code || "—"}</span>
                  </div>
                  <div className="ma-card-row">
                    <span className="ma-card-key">Location</span>
                    <span className="ma-card-val">{asset.location_name || "—"}</span>
                  </div>
                  <div className="ma-card-row">
                    <span className="ma-card-key">Serial #</span>
                    <span className="ma-card-val" style={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}>
                      {asset.serial_number || "—"}
                    </span>
                  </div>
                  <div className="ma-card-row">
                    <span className="ma-card-key">Purchase Date</span>
                    <span className="ma-card-val">{asset.purchase_date || "—"}</span>
                  </div>
                  <div className="ma-card-row">
                    <span className="ma-card-key">Warranty</span>
                    <span className="ma-card-val">{warBadge(asset.warranty_status, asset.warranty_expiry)}</span>
                  </div>
                </div>

                <div className="ma-card-ftr">
                  <button className="ma-btn warn sm" onClick={() => goReportIssue(asset)}>
                    <AlertTriangle size={12} />Report Issue
                  </button>
                  <button className="ma-btn sm" onClick={() => navigate(`/maintenance?asset=${asset.asset_tag}`)}>
                    <Wrench size={12} />Maintenance
                  </button>
                  <button className="ma-btn sm" onClick={() => goRequestReturn(asset)}>
                    <ArrowLeftRight size={12} />Return
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
