/**
 * Requests.jsx — Inventory request system
 *
 * Employee view:  Submit new requests + see own history
 * Admin view:     Full queue with approve/reject actions + all filters
 *
 * URL params (for /requests/new?type=X&asset=Y&title=Z):
 *   ?type=REPORT_ISSUE|ASSET_REQUEST|CONSUMABLE_RESTOCK|CHECKOUT|RETURN
 *   ?asset=UIMS-001
 *   ?title=<text>
 */
import { useEffect, useState, useCallback, Fragment } from "react";
import { useLocation } from "react-router-dom";
import {
  api, fmtApiError, isAdmin, getUsername, getDept,
} from "../api";
import { useSearch } from "../context/SearchContext.jsx";
import Pagination from "../components/Pagination.jsx";
import {
  Inbox, Check, X, Plus, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, Package, Boxes, ArrowLeftRight, CheckCircle2, Clock,
} from "lucide-react";

const PAGE_SIZE = 50;

const REQ_TYPES = [
  { value:"ASSET_REQUEST",      label:"Asset Request",        icon:Package },
  { value:"CONSUMABLE_RESTOCK", label:"Consumable Restock",   icon:Boxes },
  { value:"REPORT_ISSUE",       label:"Report Issue",         icon:AlertTriangle },
  { value:"CHECKOUT",           label:"Asset Checkout",       icon:ArrowLeftRight },
  { value:"RETURN",             label:"Asset Return",         icon:ArrowLeftRight },
];

const STATUSES = ["PENDING","APPROVED","REJECTED","CLOSED"];

const STATUS_CLS = {
  PENDING:  "rq-bdg pending",
  APPROVED: "rq-bdg approved",
  REJECTED: "rq-bdg rejected",
  CLOSED:   "rq-bdg closed",
};

const css = `
@keyframes rq-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.rq { font-family:'DM Sans',system-ui,sans-serif; color:var(--text); animation:rq-in .28s cubic-bezier(.16,1,.3,1); }
.rq-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
.rq-title { font-size:26px; font-weight:700; color:var(--page-title); letter-spacing:-.5px; margin:0; display:flex; align-items:center; gap:10px; }
.rq-sub { font-size:14px; color:var(--page-sub); margin:5px 0 0; }
.rq-acts { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.rq-btn {
  padding:9px 16px; border-radius:10px; font-size:14px; font-weight:500;
  font-family:inherit; cursor:pointer; transition:all .13s;
  border:1px solid var(--page-btn-border); background:var(--page-btn-bg); color:var(--page-btn-text);
  display:inline-flex; align-items:center; gap:7px; white-space:nowrap;
}
.rq-btn:hover { border-color:var(--border-md); color:var(--text); background:var(--bg-panel2); }
.rq-btn:disabled { opacity:.4; cursor:not-allowed; }
.rq-btn.primary { background:var(--blue-dim); border-color:var(--blue-dim); color:var(--blue-text); }
.rq-btn.success { background:var(--green-dim); border-color:var(--green-dim); color:var(--green-text); }
.rq-btn.danger  { background:var(--red-dim);  border-color:var(--red-dim);  color:var(--red-text); }
.rq-btn.sm      { padding:6px 12px; font-size:12.5px; border-radius:8px; }
.rq-btn.icon    { padding:6px; width:30px; height:30px; justify-content:center; }
.rq-err { background:var(--red-dim); border:1px solid var(--red-dim); border-radius:10px; padding:10px 15px; font-size:14px; color:var(--red-text); margin-bottom:16px; white-space:pre-wrap; }
.rq-ok  { background:var(--green-dim); border:1px solid var(--green-dim); border-radius:10px; padding:10px 15px; font-size:14px; color:var(--green-text); margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }
/* Stats */
.rq-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
@media(max-width:700px){ .rq-stats { grid-template-columns:repeat(2,1fr); } }
@media(max-width:400px){ .rq-stats { grid-template-columns:1fr; } }
.rq-stat { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:14px 18px; display:flex; align-items:center; gap:12px; }
.rq-stat-ico { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rq-stat-val { font-size:24px; font-weight:700; color:var(--page-title); font-variant-numeric:tabular-nums; }
.rq-stat-lbl { font-size:11px; color:var(--page-sub); margin-top:2px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
/* Filters */
.rq-filters { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.rq-filter-lbl { font-size:13px; color:var(--page-sub); white-space:nowrap; }
.rq-filter-sel {
  background:var(--page-input-bg); border:1px solid var(--page-card-border);
  border-radius:8px; padding:7px 11px; color:var(--page-input-text);
  font-size:13px; font-family:inherit; outline:none; min-width:140px;
}
.rq-filter-sel option { background:var(--page-input-bg); color:var(--page-input-text); }
/* Form */
.rq-form { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:18px 20px; margin-bottom:20px; }
.rq-form-title { font-size:14px; font-weight:600; color:var(--page-sub); margin:0 0 14px; }
.rq-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:9px; margin-bottom:12px; }
.rq-grid-full { grid-column:1/-1; }
.rq-inp, .rq-sel, .rq-ta {
  background:var(--page-input-bg); border:1px solid var(--page-card-border);
  border-radius:9px; padding:10px 13px; color:var(--page-input-text);
  font-size:14px; font-family:inherit; outline:none; width:100%; transition:border-color .15s;
}
.rq-inp:focus, .rq-sel:focus, .rq-ta:focus { border-color:var(--border-focus); box-shadow:0 0 0 3px var(--accent-glow); }
.rq-inp::placeholder, .rq-ta::placeholder { color:var(--page-input-ph); }
.rq-sel option { background:var(--page-input-bg); color:var(--page-input-text); }
.rq-ta { resize:vertical; min-height:72px; }
/* Table */
.rq-tbl-wrap { background:var(--page-tbl-bg); border:1px solid var(--page-card-border); border-radius:14px; overflow:hidden; }
.rq-tbl { width:100%; border-collapse:collapse; }
.rq-tbl th {
  text-align:left; padding:13px 16px; font-size:11px; font-weight:700;
  text-transform:uppercase; letter-spacing:.7px; color:var(--page-th-text);
  border-bottom:1px solid var(--page-card-border); background:var(--page-th-bg); white-space:nowrap;
}
.rq-tbl td { padding:12px 16px; font-size:14px; color:var(--page-td-text); border-bottom:1px solid var(--page-card-border); vertical-align:top; }
.rq-tbl tr:last-child td { border-bottom:none; }
.rq-tbl tr:hover td { background:var(--bg-hover); color:var(--text); }
.rq-tbl tr.expanded-row td { background:var(--bg-active); }
/* Badges */
.rq-bdg { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; font-family:'DM Mono',monospace; border:1px solid transparent; white-space:nowrap; }
.rq-bdg.pending  { background:var(--amber-dim); color:var(--amber-text); border-color:var(--amber-dim); }
.rq-bdg.approved { background:var(--green-dim); color:var(--green-text); border-color:var(--green-dim); }
.rq-bdg.rejected { background:var(--red-dim);   color:var(--red-text);   border-color:var(--red-dim); }
.rq-bdg.closed   { color:var(--page-sub); border-color:var(--page-card-border); }
.rq-type-bdg { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:600; background:var(--blue-dim); color:var(--blue-text); white-space:nowrap; }
/* Expand panel */
.rq-expand { padding:14px 18px; border-top:1px dashed var(--page-card-border); }
.rq-expand-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
.rq-expand-row { display:flex; flex-direction:column; gap:2px; }
.rq-expand-key { font-size:11px; color:var(--page-sub); font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
.rq-expand-val { font-size:14px; color:var(--text); }
.rq-resolve-row { margin-top:14px; display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; }
.rq-notes-inp { flex:1; min-width:200px; }
/* Empty / skel */
.rq-empty { padding:40px; text-align:center; color:var(--page-empty); font-size:15px; }
.rq-skel td { padding:13px 16px; }
.rq-skel-bar { height:12px; border-radius:4px; background:var(--page-skel); animation:skel 1.5s ease-in-out infinite; }
@keyframes skel{0%,100%{opacity:.45}50%{opacity:.85}}
`;

export default function Requests() {
  const location  = useLocation();
  const { query } = useSearch();
  const q         = query.trim().toLowerCase();
  const admin     = isAdmin();
  const username  = getUsername();

  // Parse URL params for pre-filling new request form
  const sp          = new URLSearchParams(location.search);
  const urlType     = sp.get("type") || "ASSET_REQUEST";
  const urlAssetTag = sp.get("asset") || "";
  const urlTitle    = sp.get("title") || "";

  const [rows,         setRows]         = useState([]);
  const [total,        setTotal]        = useState(0);
  const [statusCounts, setStatusCounts] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [toast,        setToast]        = useState("");
  const [expandedId,   setExpandedId]   = useState(null);
  const [adminNotes,   setAdminNotes]   = useState({});

  // Filters (admin only)
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType,   setFilterType]   = useState("");

  // New request form
  const [showForm, setShowForm] = useState(location.search.includes("type="));
  const [form, setForm] = useState({
    request_type: urlType,
    title:        urlTitle,
    description:  "",
    quantity:     "1",
    asset_tag:    urlAssetTag,
  });
  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { setPage(1); }, [q, filterStatus, filterType]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (q)            params.search = q;
      if (filterStatus) params.status = filterStatus;
      if (filterType)   params.request_type = filterType;
      const res  = await api.get("/api/requests/", { params });
      const data = res.data;
      setRows(data?.results ?? []);
      setTotal(data?.count ?? 0);
    } catch (err) { setError(fmtApiError(err)); }
    finally { setLoading(false); }
  }, [page, q, filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  // Fetch real status counts from server (not just current page)
  useEffect(() => {
    if (!admin) return;
    Promise.all([
      api.get("/api/requests/", { params: { status: "PENDING",  page_size: 1 } }),
      api.get("/api/requests/", { params: { status: "APPROVED", page_size: 1 } }),
      api.get("/api/requests/", { params: { status: "REJECTED", page_size: 1 } }),
    ]).then(([p, a, r]) => {
      setStatusCounts({
        PENDING:  p.data.count ?? 0,
        APPROVED: a.data.count ?? 0,
        REJECTED: r.data.count ?? 0,
      });
    }).catch(() => {});
  }, [admin, toast]); // refresh after approve/reject (toast changes)

  async function submitRequest(e) {
    e?.preventDefault?.();
    if (!form.title.trim()) { setError("Title is required."); return; }
    setError(""); setSaving(true);
    try {
      const dept = getDept();
      const body = {
        request_type: form.request_type,
        title:        form.title.trim(),
        description:  form.description.trim(),
        quantity:     Number(form.quantity) || 1,
      };
      if (form.asset_tag) body.asset_tag = form.asset_tag.trim();
      await api.post("/api/requests/", body, {
        headers: {
          "X-Username": username,
          ...(dept ? { "X-Dept-Code": dept } : {}),
        }
      });
      setToast("Request submitted ✓");
      setForm({ request_type:"ASSET_REQUEST", title:"", description:"", quantity:"1", asset_tag:"" });
      setShowForm(false);
      load();
    } catch (err) { setError(fmtApiError(err)); }
    finally { setSaving(false); }
  }

  async function resolveRequest(id, action) {
    const notes = adminNotes[id] || "";
    setSaving(true);
    try {
      await api.post(`/api/requests/${id}/${action}/`, { admin_notes: notes });
      setToast(`Request ${action === "approve" ? "approved" : "rejected"} ✓`);
      setAdminNotes(p => ({ ...p, [id]: "" }));
      setExpandedId(null);
      load();
    } catch (err) { setError(fmtApiError(err)); }
    finally { setSaving(false); }
  }

  const pendingCount   = statusCounts.PENDING;
  const approvedCount  = statusCounts.APPROVED;
  const rejectedCount  = statusCounts.REJECTED;

  const colCount = admin ? 8 : 6;

  return (
    <>
      <style>{css}</style>
      <div className="rq">
        {/* Header */}
        <div className="rq-hdr">
          <div>
            <h1 className="rq-title"><Inbox size={24} />{admin ? "Request Queue" : "My Requests"}</h1>
            <p className="rq-sub">
              {total} request{total !== 1 ? "s" : ""}
              {admin ? "" : ` · logged in as ${username}`}
            </p>
          </div>
          <div className="rq-acts">
            <button className="rq-btn" onClick={load} disabled={loading}><RefreshCw size={13} />Refresh</button>
            {!showForm && (
              <button className="rq-btn primary" onClick={() => setShowForm(true)}>
                <Plus size={14} />New Request
              </button>
            )}
          </div>
        </div>

        {error && <div className="rq-err">{error}</div>}
        {toast && <div className="rq-ok"><span>{toast}</span><button className="rq-btn sm" onClick={() => setToast("")}>✕</button></div>}

        {/* Stats (admin) */}
        {admin && (
          <div className="rq-stats">
            <div className="rq-stat">
              <div className="rq-stat-ico" style={{ background:"var(--blue-dim)" }}>
                <Inbox size={18} style={{ color:"var(--blue-text)" }} />
              </div>
              <div>
                <div className="rq-stat-val">{total}</div>
                <div className="rq-stat-lbl">Total</div>
              </div>
            </div>
            <div className="rq-stat">
              <div className="rq-stat-ico" style={{ background:"var(--amber-dim)" }}>
                <Clock size={18} style={{ color:"var(--amber-text)" }} />
              </div>
              <div>
                <div className="rq-stat-val" style={{ color:"var(--amber-text)" }}>{pendingCount}</div>
                <div className="rq-stat-lbl">Pending</div>
              </div>
            </div>
            <div className="rq-stat">
              <div className="rq-stat-ico" style={{ background:"var(--green-dim)" }}>
                <CheckCircle2 size={18} style={{ color:"var(--green-text)" }} />
              </div>
              <div>
                <div className="rq-stat-val" style={{ color:"var(--green-text)" }}>{approvedCount}</div>
                <div className="rq-stat-lbl">Approved</div>
              </div>
            </div>
            <div className="rq-stat">
              <div className="rq-stat-ico" style={{ background:"var(--red-dim)" }}>
                <X size={18} style={{ color:"var(--red-text)" }} />
              </div>
              <div>
                <div className="rq-stat-val" style={{ color:"var(--red-text)" }}>{rejectedCount}</div>
                <div className="rq-stat-lbl">Rejected</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters (admin) */}
        {admin && (
          <div className="rq-filters">
            <span className="rq-filter-lbl">Status:</span>
            <select className="rq-filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <span className="rq-filter-lbl">Type:</span>
            <select className="rq-filter-sel" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {REQ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            {(filterStatus || filterType) && (
              <button className="rq-btn sm" onClick={() => { setFilterStatus(""); setFilterType(""); }}>
                <X size={12} />Clear
              </button>
            )}
          </div>
        )}

        {/* New Request Form */}
        {showForm && (
          <div className="rq-form">
            <div className="rq-form-title">+ Submit New Request</div>
            <form onSubmit={submitRequest} noValidate>
              <div className="rq-grid">
                <select className="rq-sel" value={form.request_type} onChange={setF("request_type")}>
                  {REQ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input className="rq-inp" placeholder="Title *" value={form.title} onChange={setF("title")} />
                <input className="rq-inp" type="number" min="1" placeholder="Quantity" value={form.quantity} onChange={setF("quantity")} />
                {urlAssetTag && (
                  <input className="rq-inp" readOnly value={`Asset: ${urlAssetTag}`}
                    style={{ color:"var(--page-sub)", cursor:"default" }} />
                )}
                <textarea className="rq-ta rq-grid-full" placeholder="Description / details…" rows={3}
                  value={form.description} onChange={setF("description")} />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="rq-btn primary" type="submit" disabled={!form.title.trim() || saving}>
                  <Plus size={14} />{saving ? "Submitting…" : "Submit Request"}
                </button>
                <button className="rq-btn" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="rq-tbl-wrap">
          <table className="rq-tbl">
            <thead>
              <tr>
                <th style={{ width:32 }} />
                <th>Type</th>
                <th>Title</th>
                {admin && <th>Requested By</th>}
                {admin && <th>Department</th>}
                <th>Status</th>
                <th>Submitted</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="rq-skel">
                    {Array.from({ length: colCount }).map((_, j) => (
                      <td key={j}><div className="rq-skel-bar" style={{ width: j===0?"40%":"80%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : rows.map(r => {
                const isExpanded = expandedId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className={isExpanded ? "expanded-row" : ""}
                      style={{ cursor:"pointer" }}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                      <td style={{ padding:"12px 8px 12px 16px", color:"var(--page-sub)" }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                      <td><span className="rq-type-bdg">{REQ_TYPES.find(t=>t.value===r.request_type)?.label ?? r.request_type}</span></td>
                      <td style={{ fontWeight:500, color:"var(--text)", maxWidth:240 }}>{r.title}</td>
                      {admin && <td style={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}>{r.requested_by_username || "—"}</td>}
                      {admin && <td>{r.department_code || "—"}</td>}
                      <td><span className={STATUS_CLS[r.status] || "rq-bdg"}>{r.status}</span></td>
                      <td style={{ fontSize:12, color:"var(--page-sub)" }}>{r.created_at?.slice(0,10) || "—"}</td>
                      <td style={{ fontSize:12, color:"var(--page-sub)" }}>{r.resolved_at?.slice(0,10) || "—"}</td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={colCount}>
                          <div className="rq-expand">
                            <div className="rq-expand-grid">
                              <div className="rq-expand-row">
                                <div className="rq-expand-key">Description</div>
                                <div className="rq-expand-val">{r.description || "—"}</div>
                              </div>
                              <div className="rq-expand-row">
                                <div className="rq-expand-key">Quantity</div>
                                <div className="rq-expand-val">{r.quantity}</div>
                              </div>
                              {r.asset_tag && (
                                <div className="rq-expand-row">
                                  <div className="rq-expand-key">Asset Tag</div>
                                  <div className="rq-expand-val" style={{ fontFamily:"'DM Mono',monospace" }}>{r.asset_tag}</div>
                                </div>
                              )}
                              {r.admin_notes && (
                                <div className="rq-expand-row">
                                  <div className="rq-expand-key">Admin Notes</div>
                                  <div className="rq-expand-val">{r.admin_notes}</div>
                                </div>
                              )}
                              {r.resolved_by_username && (
                                <div className="rq-expand-row">
                                  <div className="rq-expand-key">Resolved By</div>
                                  <div className="rq-expand-val">{r.resolved_by_username}</div>
                                </div>
                              )}
                            </div>

                            {/* Admin approve/reject controls */}
                            {admin && r.status === "PENDING" && (
                              <div className="rq-resolve-row" onClick={e => e.stopPropagation()}>
                                <input
                                  className="rq-inp rq-notes-inp"
                                  placeholder="Admin notes (optional)…"
                                  value={adminNotes[r.id] || ""}
                                  onChange={e => setAdminNotes(p => ({ ...p, [r.id]: e.target.value }))}
                                />
                                <button className="rq-btn success sm" onClick={() => resolveRequest(r.id, "approve")} disabled={saving}>
                                  <Check size={13} />Approve
                                </button>
                                <button className="rq-btn danger sm" onClick={() => resolveRequest(r.id, "reject")} disabled={saving}>
                                  <X size={13} />Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="rq-empty">
                    {admin ? "No requests found." : "You haven't submitted any requests yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalCount={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>
    </>
  );
}
