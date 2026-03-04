/**
 * Maintenance.jsx — Asset maintenance records CRUD page
 * - Filter by asset, type, date range
 * - Stats bar: total records, total cost, unique assets
 * - Full CRUD table with type badges
 * - URL param support: ?asset=UIMS-001 pre-fills filter
 * - Pagination
 */
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { api, fmtApiError, isAdmin } from "../api";
import { useSearch } from "../context/SearchContext.jsx";
import Pagination from "../components/Pagination.jsx";
import { Pencil, Trash2, Check, X, Plus, RefreshCw, Wrench, DollarSign, Package } from "lucide-react";

const PAGE_SIZE = 50;

const MTYPES = ["PREVENTIVE", "CORRECTIVE", "INSPECTION", "CALIBRATION"];

const EMPTY_FORM = {
  asset: "", date: "", maintenance_type: "PREVENTIVE",
  description: "", cost: "", performed_by: "", next_due_date: "", notes: "",
};

const css = `
@keyframes pg-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.pg { font-family:'DM Sans',system-ui,sans-serif; color:var(--text); animation:pg-in .28s cubic-bezier(.16,1,.3,1); }
.pg-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
.pg-title { font-size:26px; font-weight:700; color:var(--page-title); letter-spacing:-.5px; margin:0; display:flex; align-items:center; gap:10px; }
.pg-sub { font-size:14px; color:var(--page-sub); margin:4px 0 0; }
.pg-acts { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.pg-btn {
  padding:9px 16px; border-radius:10px; font-size:14px; font-weight:500;
  font-family:inherit; cursor:pointer; transition:all .13s;
  border:1px solid var(--page-btn-border); background:var(--page-btn-bg); color:var(--page-btn-text);
  display:inline-flex; align-items:center; gap:7px; white-space:nowrap;
}
.pg-btn:hover { border-color:var(--border-md); color:var(--text); background:var(--bg-panel2); }
.pg-btn:disabled { opacity:.4; cursor:not-allowed; }
.pg-btn.primary { background:var(--blue-dim); border-color:var(--blue-dim); color:var(--blue-text); }
.pg-btn.primary:hover { filter:brightness(1.1); }
.pg-btn.danger  { background:var(--red-dim);  border-color:var(--red-dim);  color:var(--red-text); }
.pg-btn.danger:hover  { filter:brightness(1.1); }
.pg-btn.sm   { padding:6px 12px; font-size:12.5px; border-radius:8px; }
.pg-btn.icon { padding:6px; width:30px; height:30px; justify-content:center; }
.pg-err  { background:var(--red-dim);   border:1px solid var(--red-dim);   border-radius:10px; padding:10px 15px; font-size:14px; color:var(--red-text);   margin-bottom:16px; white-space:pre-wrap; word-break:break-all; }
.pg-ok   { background:var(--green-dim); border:1px solid var(--green-dim); border-radius:10px; padding:10px 15px; font-size:14px; color:var(--green-text); margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }
/* Stats bar */
.pg-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
@media(max-width:600px){ .pg-stats { grid-template-columns:1fr; } }
.pg-stat { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:14px 18px; display:flex; align-items:center; gap:12px; }
.pg-stat-ico { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.pg-stat-val { font-size:26px; font-weight:700; color:var(--page-title); font-variant-numeric:tabular-nums; }
.pg-stat-lbl { font-size:12px; color:var(--page-sub); margin-top:2px; font-weight:500; text-transform:uppercase; letter-spacing:.5px; }
/* Filter bar */
.pg-filters { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.pg-filter-lbl { font-size:13px; color:var(--page-sub); white-space:nowrap; }
.pg-filter-sel, .pg-filter-inp {
  background:var(--page-input-bg); border:1px solid var(--page-card-border);
  border-radius:8px; padding:7px 11px; color:var(--page-input-text);
  font-size:13px; font-family:inherit; outline:none; min-width:140px; transition:border-color .15s;
}
.pg-filter-inp { min-width:120px; }
.pg-filter-inp::placeholder { color:var(--page-input-ph); }
.pg-filter-sel:focus, .pg-filter-inp:focus { border-color:var(--border-focus); }
.pg-filter-sel option { background:var(--page-input-bg); color:var(--page-input-text); }
/* Form */
.pg-form { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:18px 20px; margin-bottom:20px; }
.pg-form-title { font-size:14px; font-weight:600; color:var(--page-sub); margin:0 0 14px; }
.pg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(175px,1fr)); gap:9px; margin-bottom:12px; }
.pg-grid-full { grid-column:1/-1; }
.pg-inp, .pg-sel, .pg-ta {
  background:var(--page-input-bg); border:1px solid var(--page-card-border);
  border-radius:9px; padding:10px 13px; color:var(--page-input-text);
  font-size:14px; font-family:inherit; outline:none; width:100%; transition:border-color .15s;
}
.pg-inp:focus, .pg-sel:focus, .pg-ta:focus { border-color:var(--border-focus); box-shadow:0 0 0 3px var(--accent-glow); }
.pg-inp::placeholder, .pg-ta::placeholder { color:var(--page-input-ph); }
.pg-sel option { background:var(--page-input-bg); color:var(--page-input-text); }
.pg-ta { resize:vertical; min-height:64px; }
.pg-inp.edit { padding:7px 10px; font-size:13px; border-radius:7px; }
.pg-sel.edit { padding:7px 10px; font-size:13px; border-radius:7px; }
.pg-ta.edit  { padding:7px 10px; font-size:13px; border-radius:7px; min-height:52px; }
.pg-ro { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:12px; padding:13px 16px; margin-bottom:16px; font-size:14px; color:var(--page-sub); }
.pg-del-confirm { background:var(--red-dim); border:1px solid var(--red-dim); border-radius:10px; padding:13px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px; font-size:14px; color:var(--red-text); flex-wrap:wrap; }
/* Table */
.pg-tbl-wrap { background:var(--page-tbl-bg); border:1px solid var(--page-card-border); border-radius:14px; overflow:hidden; }
.pg-tbl { width:100%; border-collapse:collapse; }
.pg-tbl th {
  text-align:left; padding:13px 16px; font-size:11px; font-weight:700;
  text-transform:uppercase; letter-spacing:.7px; color:var(--page-th-text);
  border-bottom:1px solid var(--page-card-border); background:var(--page-th-bg); white-space:nowrap;
}
.pg-tbl td { padding:12px 16px; font-size:14px; color:var(--page-td-text); border-bottom:1px solid var(--page-card-border); vertical-align:middle; }
.pg-tbl tr:last-child td { border-bottom:none; }
.pg-tbl tr:hover td { background:var(--bg-hover); color:var(--text); }
.pg-tbl tr.editing td { background:var(--bg-active); }
.pg-tag  { font-family:'DM Mono',monospace; font-size:12px; color:var(--purple-text); }
.pg-mono { font-family:'DM Mono',monospace; font-size:12px; color:var(--page-td-text); }
.pg-desc { max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pg-bdg { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; font-family:'DM Mono',monospace; border:1px solid transparent; white-space:nowrap; }
.pg-bdg.prev { background:var(--blue-dim);   color:var(--blue-text);   border-color:var(--blue-dim);   }
.pg-bdg.corr { background:var(--amber-dim);  color:var(--amber-text);  border-color:var(--amber-dim);  }
.pg-bdg.insp { background:var(--green-dim);  color:var(--green-text);  border-color:var(--green-dim);  }
.pg-bdg.calib{ background:var(--purple-dim,#7c3aed22); color:var(--purple-text); border-color:var(--purple-dim,#7c3aed22); }
.pg-edit-actions { display:flex; gap:5px; align-items:center; }
.pg-empty { padding:40px; text-align:center; color:var(--page-empty); font-size:15px; }
.pg-skel td { padding:13px 16px; }
.pg-skel-bar { height:12px; border-radius:4px; background:var(--page-skel); animation:skel 1.5s ease-in-out infinite; }
@keyframes skel{0%,100%{opacity:.45}50%{opacity:.85}}
`;

function typeBadge(t) {
  const map = { PREVENTIVE:"prev", CORRECTIVE:"corr", INSPECTION:"insp", CALIBRATION:"calib" };
  return <span className={`pg-bdg ${map[t] || "prev"}`}>{t}</span>;
}

function fmtCost(c) {
  if (c === null || c === undefined || c === "") return "—";
  return "$" + Number(c).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function fmtTotalCost(rows) {
  const sum = rows.reduce((s, r) => s + (r.cost ? Number(r.cost) : 0), 0);
  if (sum === 0) return "$0.00";
  return "$" + sum.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

export default function Maintenance() {
  const location = useLocation();
  const { query } = useSearch();
  const q     = query.trim().toLowerCase();
  const admin = isAdmin();

  // Parse ?asset= URL param to pre-fill filter
  const initAsset = new URLSearchParams(location.search).get("asset") || "";

  const [rows,        setRows]        = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [toast,       setToast]       = useState("");
  const [delConfirm,  setDelConfirm]  = useState(null);
  const [form,        setForm]        = useState({ ...EMPTY_FORM });
  const setF = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const [editId,      setEditId]      = useState(null);
  const [editData,    setEditData]    = useState({});

  // Assets for picker
  const [assets, setAssets] = useState([]);

  // Filters
  const [filterAsset, setFilterAsset] = useState(initAsset);
  const [filterType,  setFilterType]  = useState("");
  const [filterFrom,  setFilterFrom]  = useState("");  // YYYY-MM
  const [filterTo,    setFilterTo]    = useState("");

  useEffect(() => {
    api.get("/api/assets/", { params: { page_size: 500, ordering: "asset_tag" } })
      .then(res => setAssets(res.data?.results ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { setPage(1); }, [q, filterAsset, filterType, filterFrom, filterTo]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { page, page_size: PAGE_SIZE, ordering: "-date" };
      if (q)           params.search        = q;
      if (filterType)  params.maintenance_type = filterType;
      // Filter by asset: use asset tag search or asset id
      if (filterAsset) {
        // Try matching asset id from assets list
        const found = assets.find(a => a.asset_tag === filterAsset);
        if (found) params.asset = found.id;
        else       params.search = (params.search ? params.search + " " : "") + filterAsset;
      }
      if (filterFrom)  params.date__gte = filterFrom + "-01";
      if (filterTo) {
        // last day of month
        const [y, m] = filterTo.split("-").map(Number);
        const last = new Date(y, m, 0).getDate();
        params.date__lte = `${filterTo}-${String(last).padStart(2,"0")}`;
      }
      const res  = await api.get("/api/maintenance/", { params });
      const data = res.data;
      setRows(Array.isArray(data) ? data : data?.results ?? []);
      setTotal(data?.count ?? (Array.isArray(data) ? data.length : 0));
    } catch (err) { setError(fmtApiError(err)); setRows([]); setTotal(0); }
    finally { setLoading(false); }
  }, [page, q, filterAsset, filterType, filterFrom, filterTo, assets]);

  useEffect(() => { load(); }, [load]);

  const isValid = form.asset && form.date && form.maintenance_type;

  async function create(e) {
    e?.preventDefault?.();
    if (!admin)   { setError("Admin role required."); return; }
    if (!isValid) { setError("Asset, Date and Type are required."); return; }
    setError("");
    try {
      await api.post("/api/maintenance/", {
        asset:            Number(form.asset),
        date:             form.date,
        maintenance_type: form.maintenance_type,
        description:      form.description.trim(),
        cost:             form.cost || null,
        performed_by:     form.performed_by.trim(),
        next_due_date:    form.next_due_date || null,
        notes:            form.notes.trim(),
      });
      setToast("Maintenance record added ✓");
      setForm({ ...EMPTY_FORM }); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  function startEdit(row) {
    setEditId(row.id);
    setEditData({
      asset:            row.asset,
      date:             row.date,
      maintenance_type: row.maintenance_type,
      description:      row.description     || "",
      cost:             row.cost != null ? String(row.cost) : "",
      performed_by:     row.performed_by    || "",
      next_due_date:    row.next_due_date   || "",
      notes:            row.notes           || "",
    });
  }

  async function saveEdit(id) {
    setError("");
    try {
      await api.patch(`/api/maintenance/${id}/`, {
        ...editData,
        asset: Number(editData.asset),
        cost:  editData.cost || null,
        next_due_date: editData.next_due_date || null,
      });
      setToast("Record updated ✓"); setEditId(null); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  async function deleteRow(id) {
    setError("");
    try {
      await api.delete(`/api/maintenance/${id}/`);
      setToast("Record deleted ✓"); setDelConfirm(null); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  const uniqueAssets = new Set(rows.map(r => r.asset)).size;
  const colCount = admin ? 10 : 9;

  return (
    <>
      <style>{css}</style>
      <div className="pg">

        {/* Header */}
        <div className="pg-hdr">
          <div>
            <h1 className="pg-title"><Wrench size={24} />Maintenance</h1>
            <p className="pg-sub">
              {total} record{total !== 1 ? "s" : ""}
              {filterAsset ? ` · asset: ${filterAsset}` : ""}
              {q ? ` matching "${q}"` : ""}
            </p>
          </div>
          <div className="pg-acts">
            <button className="pg-btn" onClick={load} disabled={loading}><RefreshCw size={13} />Refresh</button>
          </div>
        </div>

        {/* Alerts */}
        {error     && <div className="pg-err">{error}</div>}
        {toast     && <div className="pg-ok"><span>{toast}</span><button className="pg-btn sm" onClick={() => setToast("")}>✕</button></div>}
        {delConfirm && (
          <div className="pg-del-confirm">
            <span>Delete this record? Cannot be undone.</span>
            <button className="pg-btn danger sm" onClick={() => deleteRow(delConfirm)}>Yes, delete</button>
            <button className="pg-btn sm"        onClick={() => setDelConfirm(null)}>Cancel</button>
          </div>
        )}

        {/* Stats */}
        <div className="pg-stats">
          <div className="pg-stat">
            <div className="pg-stat-ico" style={{ background:"var(--blue-dim)" }}>
              <Wrench size={18} style={{ color:"var(--blue-text)" }} />
            </div>
            <div>
              <div className="pg-stat-val">{total}</div>
              <div className="pg-stat-lbl">Total Records</div>
            </div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-ico" style={{ background:"var(--green-dim)" }}>
              <DollarSign size={18} style={{ color:"var(--green-text)" }} />
            </div>
            <div>
              <div className="pg-stat-val">{fmtTotalCost(rows)}</div>
              <div className="pg-stat-lbl">Cost (current page)</div>
            </div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-ico" style={{ background:"var(--purple-dim,#7c3aed22)" }}>
              <Package size={18} style={{ color:"var(--purple-text)" }} />
            </div>
            <div>
              <div className="pg-stat-val">{uniqueAssets}</div>
              <div className="pg-stat-lbl">Unique Assets</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="pg-filters">
          <span className="pg-filter-lbl">Asset:</span>
          <select className="pg-filter-sel" value={filterAsset} onChange={e => setFilterAsset(e.target.value)}>
            <option value="">All assets</option>
            {assets.map(a => <option key={a.id} value={a.asset_tag}>{a.asset_tag} — {a.name}</option>)}
          </select>

          <span className="pg-filter-lbl">Type:</span>
          <select className="pg-filter-sel" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All types</option>
            {MTYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <span className="pg-filter-lbl">From:</span>
          <input className="pg-filter-inp" type="month" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />

          <span className="pg-filter-lbl">To:</span>
          <input className="pg-filter-inp" type="month" value={filterTo}   onChange={e => setFilterTo(e.target.value)} />

          {(filterAsset || filterType || filterFrom || filterTo) && (
            <button className="pg-btn sm" onClick={() => {
              setFilterAsset(""); setFilterType(""); setFilterFrom(""); setFilterTo(""); setPage(1);
            }}><X size={12} />Clear</button>
          )}
        </div>

        {/* Add form */}
        {admin ? (
          <div className="pg-form">
            <div className="pg-form-title">+ Log Maintenance Record</div>
            <form onSubmit={create} noValidate>
              <div className="pg-grid">
                <select className="pg-sel" value={form.asset} onChange={setF("asset")}>
                  <option value="">— Select asset * —</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.asset_tag} — {a.name}</option>)}
                </select>
                <input  className="pg-inp" type="date"   title="Date *"         value={form.date}             onChange={setF("date")} />
                <select className="pg-sel"               value={form.maintenance_type}                         onChange={setF("maintenance_type")}>
                  {MTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input  className="pg-inp" placeholder="Performed by"           value={form.performed_by}     onChange={setF("performed_by")} />
                <input  className="pg-inp" type="number" step="0.01" min="0" placeholder="Cost ($)" value={form.cost} onChange={setF("cost")} />
                <input  className="pg-inp" type="date"   title="Next Due Date"  value={form.next_due_date}    onChange={setF("next_due_date")} min={form.date || undefined} />
                <textarea className="pg-ta pg-grid-full" placeholder="Description" value={form.description}  onChange={setF("description")} rows={2} />
                <textarea className="pg-ta pg-grid-full" placeholder="Notes"       value={form.notes}        onChange={setF("notes")} rows={2} />
              </div>
              <button className="pg-btn primary" type="submit" disabled={!isValid}><Plus size={14} />Add Record</button>
            </form>
          </div>
        ) : (
          <div className="pg-ro">👁 Read-only — switch to <strong style={{ color:"var(--blue-text)" }}>Admin</strong> to add, edit or delete.</div>
        )}

        {/* Table */}
        <div className="pg-tbl-wrap">
          <table className="pg-tbl">
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Asset Name</th>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Cost</th>
                <th>Performed By</th>
                <th>Next Due</th>
                <th>Logged By</th>
                {admin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="pg-skel">
                    {Array.from({ length: colCount }).map((_, j) => (
                      <td key={j}><div className="pg-skel-bar" style={{ width: j === 0 ? "70%" : "90%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : rows.map(r => {
                const isEditing = editId === r.id;
                return (
                  <tr key={r.id} className={isEditing ? "editing" : ""}>

                    {/* Asset Tag */}
                    <td className="pg-tag">{r.asset_tag || "—"}</td>

                    {/* Asset Name */}
                    <td style={{ fontWeight:500, color:"var(--page-td-name,var(--text))" }}>
                      {r.asset_name || "—"}
                    </td>

                    {/* Date */}
                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" type="date" value={editData.date}
                            onChange={e => setEditData(p => ({ ...p, date:e.target.value }))} />
                        : r.date || "—"
                      }
                    </td>

                    {/* Type */}
                    <td>
                      {isEditing
                        ? <select className="pg-sel edit" value={editData.maintenance_type}
                            onChange={e => setEditData(p => ({ ...p, maintenance_type:e.target.value }))}>
                            {MTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        : typeBadge(r.maintenance_type)
                      }
                    </td>

                    {/* Description */}
                    <td>
                      {isEditing
                        ? <textarea className="pg-ta edit" value={editData.description} rows={2}
                            onChange={e => setEditData(p => ({ ...p, description:e.target.value }))} />
                        : <span className="pg-desc" title={r.description}>{r.description || "—"}</span>
                      }
                    </td>

                    {/* Cost */}
                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" type="number" step="0.01" min="0" placeholder="$0.00"
                            value={editData.cost}
                            onChange={e => setEditData(p => ({ ...p, cost:e.target.value }))} />
                        : fmtCost(r.cost)
                      }
                    </td>

                    {/* Performed By */}
                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" placeholder="Performed by" value={editData.performed_by}
                            onChange={e => setEditData(p => ({ ...p, performed_by:e.target.value }))} />
                        : r.performed_by || "—"
                      }
                    </td>

                    {/* Next Due */}
                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" type="date" value={editData.next_due_date}
                            min={editData.date || undefined}
                            onChange={e => setEditData(p => ({ ...p, next_due_date:e.target.value }))} />
                        : r.next_due_date || "—"
                      }
                    </td>

                    {/* Logged By */}
                    <td><span className="pg-mono">{r.logged_by_username || "—"}</span></td>

                    {/* Actions */}
                    {admin && (
                      <td>
                        {isEditing ? (
                          <div className="pg-edit-actions">
                            <button className="pg-btn sm primary" onClick={() => saveEdit(r.id)}><Check size={12} />Save</button>
                            <button className="pg-btn sm"         onClick={() => { setEditId(null); setEditData({}); }}><X size={12} />Cancel</button>
                          </div>
                        ) : (
                          <div className="pg-edit-actions">
                            <button className="pg-btn icon"        onClick={() => startEdit(r)}><Pencil size={13} /></button>
                            <button className="pg-btn icon danger" onClick={() => setDelConfirm(r.id)}><Trash2 size={13} /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={colCount} className="pg-empty">
                  {filterAsset ? `No maintenance records for asset "${filterAsset}".` : "No records yet — log one above."}
                </td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalCount={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>
    </>
  );
}
