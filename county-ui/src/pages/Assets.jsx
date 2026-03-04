/**
 * Assets.jsx — Professional upgrade
 * - Sortable columns (▲/▼ indicators)
 * - Category + condition quick filter bar
 * - New columns: Assigned To, Purchase Price, Warranty status badge
 * - Row expand detail panel with Maintenance History link
 * - Edit form: warranty_expiry, purchase_price, assigned_to
 */
import { useEffect, useState, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtApiError, isAdmin,  getDept } from "../api";
import { useSearch } from "../context/SearchContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import Pagination from "../components/Pagination.jsx";
import { Pencil, Trash2, Check, X, Plus, Download, Upload, RefreshCw, ChevronDown, ChevronRight, QrCode, Square, CheckSquare } from "lucide-react";

const PAGE_SIZE = 50;
const CONDITIONS = ["GOOD", "NEEDS_REPAIR", "RETIRED"];
const CATEGORIES = ["IT", "Furniture", "Telecom", "Printer", "Vehicle", "Equipment", "Other"];
const EMPTY_FORM = { tag:"", name:"", cat:"IT", cond:"GOOD", serial:"", date:"", notes:"", warranty_expiry:"", purchase_price:"", assigned_to:"" };

const css = `
@keyframes pg-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.pg { font-family:'DM Sans',system-ui,sans-serif; color:var(--text); animation:pg-in .28s cubic-bezier(.16,1,.3,1); }
.pg-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
.pg-title { font-size:26px; font-weight:700; color:var(--page-title); letter-spacing:-.5px; margin:0; }
.pg-sub { font-size:14px; color:var(--page-sub); margin:4px 0 0; }
.pg-stat-row { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
.pg-stat-chip { display:flex; align-items:center; gap:7px; background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:10px; padding:8px 14px; }
.pg-stat-chip-val { font-size:20px; font-weight:700; color:var(--page-title); font-family:'DM Mono',monospace; letter-spacing:-1px; }
.pg-stat-chip-lbl { font-size:11px; color:var(--page-sub); font-weight:600; text-transform:uppercase; letter-spacing:.4px; }
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
.pg-form { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:18px 20px; margin-bottom:20px; }
.pg-form-title { font-size:14px; font-weight:600; color:var(--page-sub); margin:0 0 14px; }
.pg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(175px,1fr)); gap:9px; margin-bottom:12px; }
.pg-inp, .pg-sel {
  background:var(--page-input-bg); border:1px solid var(--page-card-border);
  border-radius:9px; padding:10px 13px; color:var(--page-input-text);
  font-size:14px; font-family:inherit; outline:none; width:100%; transition:border-color .15s;
}
.pg-inp:focus, .pg-sel:focus { border-color:var(--border-focus); box-shadow:0 0 0 3px var(--accent-glow); }
.pg-inp::placeholder { color:var(--page-input-ph); }
.pg-sel option { background:var(--page-input-bg); color:var(--page-input-text); }
.pg-inp.edit { padding:7px 10px; font-size:13px; border-radius:7px; }
.pg-sel.edit { padding:7px 10px; font-size:13px; border-radius:7px; }
.pg-tbl-wrap { background:var(--page-tbl-bg); border:1px solid var(--page-card-border); border-radius:14px; overflow:hidden; }
.pg-tbl { width:100%; border-collapse:collapse; }
.pg-tbl th {
  text-align:left; padding:13px 16px; font-size:11px; font-weight:700;
  text-transform:uppercase; letter-spacing:.7px; color:var(--page-th-text);
  border-bottom:1px solid var(--page-card-border); background:var(--page-th-bg); white-space:nowrap;
}
.pg-tbl th.sortable { cursor:pointer; user-select:none; }
.pg-tbl th.sortable:hover { color:var(--text); }
.pg-sort-ind { margin-left:4px; font-size:9px; opacity:.65; }
.pg-tbl td { padding:12px 16px; font-size:14px; color:var(--page-td-text); border-bottom:1px solid var(--page-card-border); vertical-align:middle; }
.pg-tbl tr:last-child td { border-bottom:none; }
.pg-tbl tr:hover td { background:var(--bg-hover); color:var(--text); }
.pg-tbl tr.editing td { background:var(--bg-active); }
.pg-tbl tr.expanded > td { background:var(--bg-active); }
.pg-tag  { font-family:'DM Mono',monospace; font-size:12px; color:var(--purple-text); }
.pg-mono { font-family:'DM Mono',monospace; font-size:12px; color:var(--page-td-text); }
.pg-bdg { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; font-family:'DM Mono',monospace; border:1px solid transparent; white-space:nowrap; }
.pg-bdg.good        { background:var(--green-dim); color:var(--green-text); border-color:var(--green-dim); }
.pg-bdg.repair      { background:var(--amber-dim); color:var(--amber-text); border-color:var(--amber-dim); }
.pg-bdg.retired     { background:var(--red-dim);   color:var(--red-text);   border-color:var(--red-dim);   }
.pg-bdg.war-active  { background:var(--green-dim); color:var(--green-text); border-color:var(--green-dim); }
.pg-bdg.war-expiring{ background:var(--amber-dim); color:var(--amber-text); border-color:var(--amber-dim); }
.pg-bdg.war-expired { background:var(--red-dim);   color:var(--red-text);   border-color:var(--red-dim);   }
.pg-bdg.war-na      { color:var(--page-sub); }
.pg-edit-actions { display:flex; gap:5px; align-items:center; }
.pg-hint { font-size:12px; color:var(--amber-text); margin-top:7px; }
.pg-ro { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:12px; padding:13px 16px; margin-bottom:16px; font-size:14px; color:var(--page-sub); }
.pg-del-confirm { background:var(--red-dim); border:1px solid var(--red-dim); border-radius:10px; padding:13px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px; font-size:14px; color:var(--red-text); flex-wrap:wrap; }
.pg-empty { padding:40px; text-align:center; color:var(--page-empty); font-size:15px; }
.pg-skel td { padding:13px 16px; }
.pg-skel-bar { height:12px; border-radius:4px; background:var(--page-skel); animation:skel 1.5s ease-in-out infinite; }
@keyframes skel{0%,100%{opacity:.45}50%{opacity:.85}}
/* Filter bar */
.pg-filters { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.pg-filters-label { font-size:13px; color:var(--page-sub); white-space:nowrap; }
.pg-filter-sel { background:var(--page-input-bg); border:1px solid var(--page-card-border); border-radius:8px; padding:7px 11px; color:var(--page-input-text); font-size:13px; font-family:inherit; outline:none; min-width:140px; transition:border-color .15s; }
.pg-filter-sel:focus { border-color:var(--border-focus); }
.pg-filter-sel option { background:var(--page-input-bg); color:var(--page-input-text); }
/* Row expand */
.pg-name-cell { cursor:pointer; display:inline-flex; align-items:center; gap:5px; }
.pg-name-cell:hover .pg-name-text { color:var(--blue-text); }
.pg-name-text { font-weight:500; color:var(--page-td-name,var(--text)); }
.pg-expand-row td { padding:0 !important; border-bottom:2px solid var(--blue-dim) !important; background:var(--page-card-bg) !important; }
.pg-expand-panel { padding:18px 24px; display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:14px 24px; }
.pg-expand-item { display:flex; flex-direction:column; gap:4px; }
.pg-expand-label { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--page-sub); }
.pg-expand-value { font-size:13.5px; color:var(--page-td-text); }
.pg-expand-notes { grid-column:1/-1; }
.pg-expand-footer { grid-column:1/-1; padding-top:4px; display:flex; gap:8px; }
/* Bulk toolbar */
.pg-bulk-bar {
  background:var(--blue-dim); border:1px solid var(--blue-dim); border-radius:10px;
  padding:10px 16px; margin-bottom:12px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;
  color:var(--blue-text); font-size:14px; font-weight:500;
}
.pg-bulk-sep { width:1px; height:20px; background:var(--blue-text); opacity:.3; }
/* Checkbox */
.pg-chk { width:16px; height:16px; cursor:pointer; accent-color:var(--blue-text); }
/* QR Modal */
.pg-qr-overlay {
  position:fixed; inset:0; z-index:8000; background:rgba(0,0,0,.5);
  backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center;
  animation:qr-fade .15s ease;
}
@keyframes qr-fade{ from{opacity:0} to{opacity:1} }
.pg-qr-modal {
  background:var(--page-card-bg); border:1px solid var(--page-card-border);
  border-radius:18px; padding:28px; width:100%; max-width:360px; text-align:center;
  box-shadow:0 20px 60px rgba(0,0,0,.3); animation:qr-up .18s ease;
}
@keyframes qr-up{ from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
.pg-qr-tag { font-family:'DM Mono',monospace; font-size:22px; font-weight:700; color:var(--purple-text); margin:12px 0 4px; }
.pg-qr-name { font-size:15px; color:var(--page-sub); margin-bottom:16px; }
.pg-qr-img  { border-radius:12px; border:1px solid var(--page-card-border); }
.pg-qr-footer { display:flex; gap:8px; justify-content:center; margin-top:16px; }
`;

function condBadge(c = "") {
  const lc  = (c || "").toLowerCase();
  const cls = lc.includes("repair") ? "repair" : lc === "retired" ? "retired" : "good";
  const lbl = lc.includes("repair") ? "NEEDS REPAIR" : c || "—";
  return <span className={`pg-bdg ${cls}`}>{lbl}</span>;
}

function warBadge(status) {
  if (!status || status === "N/A") return <span className="pg-bdg war-na">N/A</span>;
  const cls = { ACTIVE:"war-active", EXPIRING:"war-expiring", EXPIRED:"war-expired" }[status] || "war-na";
  return <span className={`pg-bdg ${cls}`}>{status}</span>;
}

function fmtPrice(p) {
  if (p === null || p === undefined || p === "") return "—";
  return "$" + Number(p).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function SortTh({ field, sortBy, sortDir, onSort, children }) {
  const active = sortBy === field;
  return (
    <th className="sortable" onClick={() => onSort(field)}>
      {children}<span className="pg-sort-ind">{active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </th>
  );
}

export default function Assets() {
  const navigate = useNavigate();
  const { query } = useSearch();
  const confirm   = useConfirm();
  const q     = query.trim().toLowerCase();
  const admin = isAdmin();
  const dept  = getDept();

  const [rows,       setRows]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [toast,      setToast]      = useState("");
  const [delConfirm, setDelConfirm] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const setF = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const [editId,     setEditId]     = useState(null);
  const [editData,   setEditData]   = useState({});
  const [expandedId, setExpandedId] = useState(null);

  // Bulk selection
  const [selected, setSelected] = useState(new Set());
  const [bulkCond, setBulkCond] = useState("");

  // QR modal
  const [qrAsset, setQrAsset] = useState(null);

  // Sorting
  const [sortBy,  setSortBy]  = useState("asset_tag");
  const [sortDir, setSortDir] = useState("asc");

  // Quick filters
  const [filterCat,  setFilterCat]  = useState("");
  const [filterCond, setFilterCond] = useState("");

  // Users for assigned_to picker
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("/api/users/", { params: { page_size: 500, ordering: "username" } })
      .then(res => setUsers(res.data?.results ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { setPage(1); }, [q, filterCat, filterCond]);

  function handleSort(field) {
    if (field === sortBy) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const ordering = sortDir === "asc" ? sortBy : "-" + sortBy;
      const params = { ordering, page, page_size: PAGE_SIZE };
      if (q)          params.search    = q;
      if (filterCat)  params.category  = filterCat;
      if (filterCond) params.condition = filterCond;
      const res  = await api.get("/api/assets/", { params });
      const data = res.data;
      setRows(Array.isArray(data) ? data : data?.results ?? []);
      setTotal(data?.count ?? (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      setRows([]); setTotal(0);
      setError(fmtApiError(err));
    }
    finally  { setLoading(false); }
  }, [page, q, sortBy, sortDir, filterCat, filterCond]);

  useEffect(() => { load(); }, [load]);

  const isValid = form.tag.trim() && form.name.trim();

  async function create(e) {
    e?.preventDefault?.();
    if (!admin)   { setError("Admin role required."); return; }
    if (!dept)    { setError("No department code — log out and back in with a dept code."); return; }
    if (!isValid) { setError("Asset Tag and Name are required."); return; }
    setError("");
    try {
      await api.post("/api/assets/", {
        asset_tag:       form.tag.trim(),
        name:            form.name.trim(),
        category:        form.cat,
        condition:       form.cond,
        serial_number:   form.serial.trim(),
        purchase_date:   form.date            || null,
        notes:           form.notes.trim(),
        department_code: dept,
        warranty_expiry: form.warranty_expiry || null,
        purchase_price:  form.purchase_price  || null,
        assigned_to:     form.assigned_to     || null,
      });
      setToast(`Asset "${form.tag.trim()}" created ✓`);
      setForm(EMPTY_FORM); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  function startEdit(row) {
    setEditId(row.id);
    setEditData({
      name:            row.name,
      category:        row.category,
      condition:       row.condition,
      serial_number:   row.serial_number   || "",
      purchase_date:   row.purchase_date   || "",
      notes:           row.notes           || "",
      warranty_expiry: row.warranty_expiry || "",
      purchase_price:  row.purchase_price  != null ? String(row.purchase_price) : "",
      assigned_to:     row.assigned_to     ?? "",
    });
  }

  async function saveEdit(id) {
    setError("");
    try {
      await api.patch(`/api/assets/${id}/`, {
        ...editData,
        warranty_expiry: editData.warranty_expiry || null,
        purchase_price:  editData.purchase_price  || null,
        assigned_to:     editData.assigned_to     || null,
      });
      setToast("Asset updated ✓"); setEditId(null); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  async function deleteRow(id) {
    setError("");
    try {
      await api.delete(`/api/assets/${id}/`);
      setToast("Asset deleted ✓"); setDelConfirm(null); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  // Bulk selection helpers
  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  }
  async function bulkDelete() {
    const ok = await confirm({
      title:        `Delete ${selected.size} asset${selected.size !== 1 ? "s" : ""}?`,
      message:      "This action cannot be undone. All selected assets will be permanently removed.",
      variant:      "danger",
      confirmLabel: `Delete ${selected.size} asset${selected.size !== 1 ? "s" : ""}`,
    });
    if (!ok) return;
    setError("");
    try {
      await Promise.all([...selected].map(id => api.delete(`/api/assets/${id}/`)));
      setToast(`${selected.size} asset(s) deleted ✓`);
      setSelected(new Set()); load();
    } catch (err) { setError(fmtApiError(err)); }
  }
  async function bulkUpdateCondition() {
    if (!bulkCond) { setError("Select a condition first."); return; }
    setError("");
    try {
      await Promise.all([...selected].map(id => api.patch(`/api/assets/${id}/`, { condition: bulkCond })));
      setToast(`${selected.size} asset(s) updated to "${bulkCond}" ✓`);
      setSelected(new Set()); setBulkCond(""); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  async function exportCsv() {
    try {
      const res = await api.get("/api/assets/export-csv/", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement("a");
      a.href = url; a.download = "assets.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(fmtApiError(err)); }
  }

  // checkbox, tag, name, cat, cond, dept, serial, purch-date, assigned, price, warranty, [actions]
  const colCount = admin ? 13 : 11;
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const so = { sortBy, sortDir, onSort: handleSort };

  return (
    <>
      <style>{css}</style>
      <div className="pg">

        {/* Header */}
        <div className="pg-hdr">
          <div>
            <h1 className="pg-title">Assets</h1>
            <p className="pg-sub">
              {total} record{total !== 1 ? "s" : ""}
              {q ? ` matching "${q}"` : ""}{dept ? ` · dept: ${dept}` : ""}
            </p>
          </div>
          <div className="pg-acts">
            <button className="pg-btn" disabled={!admin} onClick={exportCsv}><Download size={14} />Export CSV</button>
            <label className="pg-btn" style={{ cursor: admin ? "pointer" : "not-allowed", opacity: admin ? 1 : 0.5 }}>
              <Upload size={14} />Import CSV
              <input type="file" accept=".csv" style={{ display:"none" }} disabled={!admin}
                onChange={async (e) => {
                  if (!e.target.files?.[0]) return;
                  const file = e.target.files[0];
                  if (file.size > 2 * 1024 * 1024) {
                    setError("CSV file too large. Maximum allowed size is 2 MB.");
                    e.target.value = "";
                    return;
                  }
                  const fd = new FormData(); fd.append("file", file);
                  try {
                    const res = await api.post("/api/assets/import-csv/", fd, { headers:{ "Content-Type":"multipart/form-data" } });
                    setToast(`Import done — created:${res.data?.created??0}, updated:${res.data?.updated??0}, errors:${res.data?.errors?.length??0}`);
                    load();
                  } catch (err) { setError(fmtApiError(err)); }
                  finally { e.target.value = ""; }
                }}
              />
            </label>
            <button className="pg-btn" onClick={load} disabled={loading}><RefreshCw size={13} />Refresh</button>
          </div>
        </div>

        {/* Stat chips */}
        <div className="pg-stat-row">
          <div className="pg-stat-chip">
            <div>
              <div className="pg-stat-chip-val">{total}</div>
              <div className="pg-stat-chip-lbl">Total Assets</div>
            </div>
          </div>
          {filterCat  && <div className="pg-stat-chip"><div><div className="pg-stat-chip-val" style={{color:"var(--blue-text)"}}>{rows.length}</div><div className="pg-stat-chip-lbl">Filtered</div></div></div>}
          {filterCond === "NEEDS_REPAIR" && <div className="pg-stat-chip"><div><div className="pg-stat-chip-val" style={{color:"var(--amber-text)"}}>{total}</div><div className="pg-stat-chip-lbl">Needs Repair</div></div></div>}
        </div>

        {/* Alerts */}
        {error      && <div className="pg-err">{error}</div>}
        {toast      && <div className="pg-ok"><span>{toast}</span><button className="pg-btn sm" onClick={() => setToast("")}>✕</button></div>}
        {delConfirm && (
          <div className="pg-del-confirm">
            <span>Delete <strong>{rows.find((r) => r.id === delConfirm)?.asset_tag}</strong>? Cannot be undone.</span>
            <button className="pg-btn danger sm" onClick={() => deleteRow(delConfirm)}>Yes, delete</button>
            <button className="pg-btn sm"        onClick={() => setDelConfirm(null)}>Cancel</button>
          </div>
        )}

        {/* Bulk action toolbar */}
        {admin && selected.size > 0 && (
          <div className="pg-bulk-bar">
            <span>{selected.size} selected</span>
            <div className="pg-bulk-sep" />
            <button className="pg-btn danger sm" onClick={bulkDelete}>
              <Trash2 size={13} />Delete Selected
            </button>
            <div className="pg-bulk-sep" />
            <select className="pg-filter-sel" value={bulkCond} onChange={e => setBulkCond(e.target.value)}
              style={{ minWidth:140 }}>
              <option value="">Set condition…</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="pg-btn sm primary" onClick={bulkUpdateCondition} disabled={!bulkCond}>
              <Check size={13} />Apply
            </button>
            <button className="pg-btn sm" style={{ marginLeft:"auto" }} onClick={() => setSelected(new Set())}>
              <X size={12} />Clear selection
            </button>
          </div>
        )}

        {/* Quick filter bar */}
        <div className="pg-filters">
          <span className="pg-filters-label">Filter:</span>
          <select className="pg-filter-sel" value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="pg-filter-sel" value={filterCond} onChange={e => { setFilterCond(e.target.value); setPage(1); }}>
            <option value="">All conditions</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(filterCat || filterCond) && (
            <button className="pg-btn sm" onClick={() => { setFilterCat(""); setFilterCond(""); setPage(1); }}>
              <X size={12} />Clear
            </button>
          )}
        </div>

        {/* Add form */}
        {admin ? (
          <div className="pg-form">
            <div className="pg-form-title">+ Add New Asset</div>
            <form onSubmit={create} noValidate>
              <div className="pg-grid">
                <input  className="pg-inp" placeholder="Asset Tag *"           value={form.tag}             onChange={setF("tag")} />
                <input  className="pg-inp" placeholder="Name *"                value={form.name}            onChange={setF("name")} />
                <select className="pg-sel" value={form.cat}                    onChange={setF("cat")}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                <select className="pg-sel" value={form.cond}                   onChange={setF("cond")}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select>
                <input  className="pg-inp" placeholder="Serial #"              value={form.serial}          onChange={setF("serial")} />
                <input  className="pg-inp" type="date" title="Purchase Date"   value={form.date}            onChange={setF("date")} />
                <input  className="pg-inp" type="date" title="Warranty Expiry" value={form.warranty_expiry} onChange={setF("warranty_expiry")} />
                <input  className="pg-inp" type="number" step="0.01" min="0" placeholder="Purchase Price ($)" value={form.purchase_price} onChange={setF("purchase_price")} />
                <select className="pg-sel" value={form.assigned_to}            onChange={setF("assigned_to")}>
                  <option value="">— Unassigned —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
                <input  className="pg-inp" placeholder="Notes"                 value={form.notes}           onChange={setF("notes")} />
              </div>
              <button className="pg-btn primary" type="submit" disabled={!isValid}><Plus size={14} />Add Asset</button>
              {!dept && <div className="pg-hint">⚠ No dept code — log out and back in to create records.</div>}
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
                {admin && (
                  <th style={{ width:40, padding:"13px 8px 13px 16px", cursor:"pointer" }} onClick={toggleSelectAll}>
                    {allSelected
                      ? <CheckSquare size={15} style={{ color:"var(--blue-text)" }} />
                      : <Square size={15} style={{ opacity:.4 }} />}
                  </th>
                )}
                <SortTh field="asset_tag"      {...so}>Asset Tag</SortTh>
                <SortTh field="name"           {...so}>Name</SortTh>
                <SortTh field="category"       {...so}>Category</SortTh>
                <SortTh field="condition"      {...so}>Condition</SortTh>
                <th>Dept</th>
                <th>Serial #</th>
                <SortTh field="purchase_date"  {...so}>Purch. Date</SortTh>
                <th>Assigned To</th>
                <SortTh field="purchase_price" {...so}>Price</SortTh>
                <SortTh field="warranty_expiry"{...so}>Warranty</SortTh>
                {admin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map((i) => (
                  <tr key={i} className="pg-skel">
                    {Array.from({ length: colCount }).map((_, j) => (
                      <td key={j}><div className="pg-skel-bar" style={{ width: j === 0 ? "70%" : "90%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : rows.map((r) => {
                const isEditing  = editId === r.id;
                const isExpanded = expandedId === r.id && !isEditing;
                return (
                  <Fragment key={r.id ?? r.asset_tag}>
                    <tr className={isEditing ? "editing" : isExpanded ? "expanded" : ""}>

                      {/* Checkbox */}
                      {admin && (
                        <td style={{ padding:"12px 8px 12px 16px" }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="pg-chk"
                            checked={selected.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                          />
                        </td>
                      )}

                      {/* Asset Tag */}
                      <td className="pg-tag">{r.asset_tag}</td>

                      {/* Name — click to expand */}
                      <td>
                        {isEditing ? (
                          <input className="pg-inp edit" value={editData.name}
                            onChange={e => setEditData(p => ({ ...p, name:e.target.value }))} />
                        ) : (
                          <div className="pg-name-cell" onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                            {isExpanded
                              ? <ChevronDown  size={13} style={{ opacity:.6, flexShrink:0 }} />
                              : <ChevronRight size={13} style={{ opacity:.35, flexShrink:0 }} />}
                            <span className="pg-name-text">{r.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td>
                        {isEditing
                          ? <select className="pg-sel edit" value={editData.category}
                              onChange={e => setEditData(p => ({ ...p, category:e.target.value }))}>
                              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                          : r.category || "—"
                        }
                      </td>

                      {/* Condition */}
                      <td>
                        {isEditing
                          ? <select className="pg-sel edit" value={editData.condition}
                              onChange={e => setEditData(p => ({ ...p, condition:e.target.value }))}>
                              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                            </select>
                          : condBadge(r.condition)
                        }
                      </td>

                      {/* Dept */}
                      <td><span className="pg-mono">{r.department_code || "—"}</span></td>

                      {/* Serial */}
                      <td>
                        {isEditing
                          ? <input className="pg-inp edit" placeholder="Serial #" value={editData.serial_number}
                              onChange={e => setEditData(p => ({ ...p, serial_number:e.target.value }))} />
                          : <span className="pg-mono">{r.serial_number || "—"}</span>
                        }
                      </td>

                      {/* Purchase Date */}
                      <td>
                        {isEditing
                          ? <input className="pg-inp edit" type="date" value={editData.purchase_date}
                              onChange={e => setEditData(p => ({ ...p, purchase_date:e.target.value }))} />
                          : r.purchase_date || "—"
                        }
                      </td>

                      {/* Assigned To */}
                      <td>
                        {isEditing ? (
                          <select className="pg-sel edit" value={editData.assigned_to ?? ""}
                            onChange={e => setEditData(p => ({ ...p, assigned_to:e.target.value }))}>
                            <option value="">— Unassigned —</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                          </select>
                        ) : (
                          <span className="pg-mono">{r.assigned_to_username || "—"}</span>
                        )}
                      </td>

                      {/* Purchase Price */}
                      <td>
                        {isEditing
                          ? <input className="pg-inp edit" type="number" step="0.01" min="0" placeholder="$0.00"
                              value={editData.purchase_price}
                              onChange={e => setEditData(p => ({ ...p, purchase_price:e.target.value }))} />
                          : fmtPrice(r.purchase_price)
                        }
                      </td>

                      {/* Warranty */}
                      <td>
                        {isEditing
                          ? <input className="pg-inp edit" type="date" value={editData.warranty_expiry}
                              onChange={e => setEditData(p => ({ ...p, warranty_expiry:e.target.value }))} />
                          : warBadge(r.warranty_status)
                        }
                      </td>

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

                    {/* Row expand detail */}
                    {isExpanded && (
                      <tr className="pg-expand-row">
                        <td colSpan={colCount}>
                          <div className="pg-expand-panel">
                            <div className="pg-expand-item">
                              <span className="pg-expand-label">Location</span>
                              <span className="pg-expand-value">{r.location_name || "—"}</span>
                            </div>
                            <div className="pg-expand-item">
                              <span className="pg-expand-label">Warranty Expiry</span>
                              <span className="pg-expand-value">{r.warranty_expiry || "—"}</span>
                            </div>
                            <div className="pg-expand-item">
                              <span className="pg-expand-label">Purchase Price</span>
                              <span className="pg-expand-value">{fmtPrice(r.purchase_price)}</span>
                            </div>
                            {r.depreciation_estimate != null && (
                              <div className="pg-expand-item">
                                <span className="pg-expand-label">Est. Current Value</span>
                                <span className="pg-expand-value" style={{ color:"var(--green-text)" }}>
                                  {fmtPrice(r.depreciation_estimate)}
                                  <span style={{ fontSize:10, color:"var(--page-sub)", marginLeft:5 }}>20%/yr</span>
                                </span>
                              </div>
                            )}
                            <div className="pg-expand-item">
                              <span className="pg-expand-label">Assigned To</span>
                              <span className="pg-expand-value">{r.assigned_to_username || "Unassigned"}</span>
                            </div>
                            <div className="pg-expand-item">
                              <span className="pg-expand-label">Created</span>
                              <span className="pg-expand-value">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</span>
                            </div>
                            {r.notes && (
                              <div className="pg-expand-item pg-expand-notes">
                                <span className="pg-expand-label">Notes</span>
                                <span className="pg-expand-value">{r.notes}</span>
                              </div>
                            )}
                            <div className="pg-expand-footer">
                              <button className="pg-btn sm" onClick={() => navigate(`/maintenance?asset=${r.asset_tag}`)}>
                                Maintenance History →
                              </button>
                              <button className="pg-btn sm" onClick={() => setQrAsset(r)}>
                                <QrCode size={13} />QR Code
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={colCount} className="pg-empty">
                  {q ? `No results for "${q}".` : "No assets yet — add one above."}
                </td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalCount={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>

      {/* QR Code Modal */}
      {qrAsset && (
        <div className="pg-qr-overlay" onClick={() => setQrAsset(null)}>
          <div className="pg-qr-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:13, color:"var(--page-sub)", fontWeight:600, textTransform:"uppercase", letterSpacing:".5px" }}>
              Asset QR Code
            </div>
            <div className="pg-qr-tag">{qrAsset.asset_tag}</div>
            <div className="pg-qr-name">{qrAsset.name}</div>
            <img
              className="pg-qr-img"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrAsset.asset_tag)}&margin=10`}
              alt={`QR code for ${qrAsset.asset_tag}`}
              width={200}
              height={200}
            />
            <div className="pg-qr-footer">
              <button className="pg-btn sm primary" onClick={() => window.print()}>
                Print
              </button>
              <button className="pg-btn sm" onClick={() => setQrAsset(null)}>
                <X size={12} />Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
