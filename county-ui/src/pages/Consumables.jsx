/**
 * Consumables.jsx — Rewritten for full theme support
 * All colors use CSS variables from app.css — works with all 4 themes.
 * Font sizes upgraded throughout.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { api, fmtApiError, isAdmin,  getDept } from "../api";
import { useSearch } from "../context/SearchContext.jsx";
import Pagination from "../components/Pagination.jsx";
import {
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Package,
  TriangleAlert,
  CheckCircle2,
} from "lucide-react";

const PAGE_SIZE = 50;
const EMPTY_FORM = { sku: "", name: "", cat: "Office", unit: "each", supp: "", qoh: "0", reorder: "0", notes: "" };

const css = `
@keyframes pg-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.pg { font-family:'DM Sans',system-ui,sans-serif; color:var(--text); animation:pg-in .28s cubic-bezier(.16,1,.3,1); }
.pg-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
.pg-title { font-size:26px; font-weight:700; color:var(--page-title); letter-spacing:-.5px; margin:0; }
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
.pg-btn.danger  { background:var(--red-dim);  border-color:var(--red-dim);  color:var(--red-text);  }
.pg-btn.danger:hover  { filter:brightness(1.1); }
.pg-btn.sm   { padding:6px 12px; font-size:12.5px; border-radius:8px; }
.pg-btn.icon { padding:6px; width:30px; height:30px; justify-content:center; }
.pg-err  { background:var(--red-dim);   border:1px solid var(--red-dim);   border-radius:10px; padding:10px 15px; font-size:14px; color:var(--red-text);   margin-bottom:16px; white-space:pre-wrap; }
.pg-ok   { background:var(--green-dim); border:1px solid var(--green-dim); border-radius:10px; padding:10px 15px; font-size:14px; color:var(--green-text); margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }
.pg-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
@media(max-width:600px){.pg-stats{grid-template-columns:1fr;}}
.pg-stat { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:14px; }
.pg-stat-ico { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.pg-stat-val { font-size:28px; font-weight:700; color:var(--page-stat-val); font-family:'DM Mono',monospace; letter-spacing:-1px; line-height:1; }
.pg-stat-val.warn { color:var(--red-text); }
.pg-stat-val.good { color:var(--green-text); }
.pg-stat-lbl { font-size:11px; color:var(--page-stat-lbl); margin-top:4px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
.pg-form { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:18px 20px; margin-bottom:20px; }
.pg-form-title { font-size:14px; font-weight:600; color:var(--page-sub); margin:0 0 14px; }
.pg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(165px,1fr)); gap:9px; margin-bottom:12px; }
.pg-inp, .pg-sel {
  background:var(--page-input-bg); border:1px solid var(--page-card-border);
  border-radius:9px; padding:10px 13px; color:var(--page-input-text);
  font-size:14px; font-family:inherit; outline:none; width:100%; transition:border-color .15s;
}
.pg-inp:focus, .pg-sel:focus { border-color:var(--border-focus); box-shadow:0 0 0 3px var(--accent-glow); }
.pg-inp::placeholder { color:var(--page-input-ph); }
.pg-sel option { background:var(--page-input-bg); color:var(--page-input-text); }
.pg-inp.edit { padding:7px 10px; font-size:13px; border-radius:7px; }
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
.pg-sku { font-family:'DM Mono',monospace; font-size:12px; color:var(--purple-text); }
.pg-qty { font-family:'DM Mono',monospace; font-size:15px; font-weight:700; }
.pg-qty.low { color:var(--red-text); }
.pg-qty.ok  { color:var(--green-text); }
.pg-bdg { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; font-family:'DM Mono',monospace; border:1px solid transparent; }
.pg-bdg.low { background:var(--red-dim);   color:var(--red-text);   border-color:var(--red-dim);   }
.pg-bdg.ok  { background:var(--green-dim); color:var(--green-text); border-color:var(--green-dim); }
.pg-edit-actions { display:flex; gap:5px; align-items:center; }
.pg-ro { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:12px; padding:13px 16px; margin-bottom:16px; font-size:14px; color:var(--page-sub); }
.pg-del-confirm { background:var(--red-dim); border:1px solid var(--red-dim); border-radius:10px; padding:13px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px; font-size:14px; color:var(--red-text); flex-wrap:wrap; }
.pg-empty { padding:40px; text-align:center; color:var(--page-empty); font-size:15px; }
.pg-hint { font-size:12px; color:var(--amber-text); margin-top:7px; }
.pg-qty-adj { display:flex; align-items:center; gap:5px; }
.pg-qty-btn {
  width:24px; height:24px; border-radius:6px;
  border:1px solid var(--page-btn-border); background:var(--page-qty-btn-bg); color:var(--page-qty-btn-text);
  cursor:pointer; display:inline-flex; align-items:center; justify-content:center;
  font-size:16px; font-family:monospace; transition:all .1s; line-height:1;
}
.pg-qty-btn:hover { background:var(--bg-panel2); color:var(--text); border-color:var(--border-md); }
.pg-skel td { padding:13px 16px; }
.pg-skel-bar { height:12px; border-radius:4px; background:var(--page-skel); animation:skel 1.5s ease-in-out infinite; }
@keyframes skel{0%,100%{opacity:.45}50%{opacity:.85}}
.pg-filters { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.pg-filter-lbl { font-size:13px; color:var(--page-sub); white-space:nowrap; }
.pg-filter-sel { background:var(--page-input-bg); border:1px solid var(--page-card-border); border-radius:8px; padding:7px 11px; color:var(--page-input-text); font-size:13px; font-family:inherit; outline:none; min-width:160px; transition:border-color .15s; }
.pg-filter-sel:focus { border-color:var(--border-focus); }
.pg-filter-sel option { background:var(--page-input-bg); color:var(--page-input-text); }
`;

export default function Consumables() {
  const { query } = useSearch();
  const q = query.trim().toLowerCase();
  const admin = isAdmin();
  const dept = getDept();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [delConfirm, setDelConfirm] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const setF = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [filterCat, setFilterCat] = useState("");

  // rowsRef keeps current rows accessible in debounced closures (fixes stale closure bug)
  const rowsRef = useRef(rows);
  const adjTimer = useRef(null);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Reset page to 1 whenever search query or filter changes
  useEffect(() => { setPage(1); }, [q, filterCat]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { ordering: "sku", page, page_size: PAGE_SIZE };
      if (q) params.search = q;
      if (filterCat) params.category = filterCat;

      const [listRes, lowRes] = await Promise.all([
        api.get("/api/consumables/", { params }),
        api.get("/api/consumables/low-stock/", { params: { page_size: 1 } }),
      ]);

      const data = listRes.data;
      setRows(Array.isArray(data) ? data : data?.results ?? []);
      setTotal(data?.count ?? (Array.isArray(data) ? data.length : 0));
      setLowCount(lowRes.data?.count ?? (Array.isArray(lowRes.data) ? lowRes.data.length : 0));
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(fmtApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, q, filterCat]);

  // ✅ REQUIRED: actually run load on mount + whenever load changes (page/search/filter)
  useEffect(() => {
    load();
  }, [load]);

  const isValid =
    form.sku.trim() &&
    form.name.trim() &&
    !isNaN(parseInt(form.qoh)) &&
    !isNaN(parseInt(form.reorder));

  async function create(e) {
    e?.preventDefault?.();
    if (!admin) { setError("Admin role required."); return; }
    if (!dept) { setError("No department code — log out and back in with a dept code."); return; }
    if (!isValid) { setError("SKU, Name, QOH, and Reorder Level are required."); return; }
    setError("");
    try {
      await api.post("/api/consumables/", {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.cat,
        unit: form.unit,
        supplier: form.supp.trim(),
        notes: form.notes.trim(),
        quantity_on_hand: parseInt(form.qoh, 10),
        reorder_level: parseInt(form.reorder, 10),
        department_code: dept,
      });
      setToast(`"${form.sku.trim()}" added ✓`);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(fmtApiError(err));
    }
  }

  function startEdit(row) {
    setEditId(row.id);
    setEditData({
      name: row.name,
      category: row.category || "",
      unit: row.unit || "each",
      supplier: row.supplier || "",
      notes: row.notes || "",
      quantity_on_hand: row.quantity_on_hand,
      reorder_level: row.reorder_level,
    });
  }

  async function saveEdit(id) {
    setError("");
    try {
      await api.patch(`/api/consumables/${id}/`, {
        ...editData,
        quantity_on_hand: parseInt(editData.quantity_on_hand, 10),
        reorder_level: parseInt(editData.reorder_level, 10),
      });
      setToast("Consumable updated ✓");
      setEditId(null);
      load();
    } catch (err) {
      setError(fmtApiError(err));
    }
  }

  async function deleteRow(id) {
    setError("");
    try {
      await api.delete(`/api/consumables/${id}/`);
      setToast("Consumable deleted ✓");
      setDelConfirm(null);
      load();
    } catch (err) {
      setError(fmtApiError(err));
    }
  }

  function adjustQty(id, delta) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, quantity_on_hand: Math.max(0, (r.quantity_on_hand || 0) + delta) }
          : r
      )
    );
    clearTimeout(adjTimer.current);
    adjTimer.current = setTimeout(async () => {
      const row = rowsRef.current.find((r) => r.id === id);
      if (!row) return;
      try {
        await api.patch(`/api/consumables/${id}/`, { quantity_on_hand: row.quantity_on_hand });
            } catch (err) { setError(fmtApiError(err)); load(); }
    }, 500);
  }

  async function exportCsv() {
    try {
      const res = await api.get("/api/consumables/export-csv/", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement("a");
      a.href = url; a.download = "consumables.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(fmtApiError(err)); }
  }

  const colCount = admin ? 8 : 7;

  return (
    <>
      <style>{css}</style>
      <div className="pg">
        <div className="pg-hdr">
          <div>
            <h1 className="pg-title">Consumables</h1>
            <p className="pg-sub">
              {total} item{total !== 1 ? "s" : ""}
              {q ? ` matching "${q}"` : ""}{dept ? ` · dept: ${dept}` : ""}
            </p>
          </div>
          <div className="pg-acts">
            <button className="pg-btn" disabled={!admin} onClick={exportCsv}>
              <Download size={14} />Export CSV
            </button>

            <label className="pg-btn" style={{ cursor: admin ? "pointer" : "not-allowed", opacity: admin ? 1 : 0.5 }}>
              <Upload size={14} />Import CSV
              <input
                type="file"
                accept=".csv"
                style={{ display:"none" }}
                disabled={!admin}
                onChange={async (e) => {
                  if (!e.target.files?.[0]) return;
                  const file = e.target.files[0];
                  if (file.size > 2 * 1024 * 1024) {
                    setError("CSV file too large. Maximum allowed size is 2 MB.");
                    e.target.value = "";
                    return;
                  }
                  const fd = new FormData();
                  fd.append("file", file);
                  try {
                    const res = await api.post("/api/consumables/import-csv/", fd, {
                      headers:{ "Content-Type":"multipart/form-data" }
                    });
                    setToast(`Import done — created: ${res.data?.created ?? 0}, updated: ${res.data?.updated ?? 0}`);
                    load();
                  } catch (err) { setError(fmtApiError(err)); }
                  finally { e.target.value = ""; }
                }}
              />
            </label>

            <button className="pg-btn" onClick={load} disabled={loading}>
              <RefreshCw size={13} />Refresh
            </button>
          </div>
        </div>

        <div className="pg-stats">
          <div className="pg-stat">
            <div className="pg-stat-ico" style={{background:"var(--blue-dim)"}}>
              <Package size={18} style={{color:"var(--blue-text)"}}/>
            </div>
            <div>
              <div className="pg-stat-val">{total}</div>
              <div className="pg-stat-lbl">Total Items</div>
            </div>
          </div>

          <div className="pg-stat">
            <div className="pg-stat-ico" style={{background:"var(--red-dim)"}}>
              <TriangleAlert size={18} style={{color:"var(--red-text)"}}/>
            </div>
            <div>
              <div className={`pg-stat-val${lowCount > 0 ? " warn" : ""}`}>{lowCount}</div>
              <div className="pg-stat-lbl">Low Stock</div>
            </div>
          </div>

          <div className="pg-stat">
            <div className="pg-stat-ico" style={{background:"var(--green-dim)"}}>
              <CheckCircle2 size={18} style={{color:"var(--green-text)"}}/>
            </div>
            <div>
              <div className="pg-stat-val good">{total - lowCount}</div>
              <div className="pg-stat-lbl">In Stock OK</div>
            </div>
          </div>
        </div>
        {error  && <div className="pg-err">{error}</div>}
        {toast  && (
          <div className="pg-ok">
            <span>{toast}</span>
            <button className="pg-btn sm" onClick={() => setToast("")}>✕</button>
          </div>
        )}

        {delConfirm && (
          <div className="pg-del-confirm">
            <span>
              Delete <strong>{rows.find((r) => r.id === delConfirm)?.sku}</strong>? This cannot be undone.
            </span>
            <button className="pg-btn danger sm" onClick={() => deleteRow(delConfirm)}>Yes, delete</button>
            <button className="pg-btn sm" onClick={() => setDelConfirm(null)}>Cancel</button>
          </div>
        )}

        {admin ? (
          <div className="pg-form">
            <div className="pg-form-title">+ Add New Consumable</div>
            <form onSubmit={create} noValidate>
              <div className="pg-grid">
                <input className="pg-inp" placeholder="SKU *" value={form.sku} onChange={setF("sku")} />
                <input className="pg-inp" placeholder="Name *" value={form.name} onChange={setF("name")} />
                <input className="pg-inp" placeholder="Category" value={form.cat} onChange={setF("cat")} />
                <input className="pg-inp" placeholder="Supplier" value={form.supp} onChange={setF("supp")} />
                <input className="pg-inp" placeholder="Unit (each/box)" value={form.unit} onChange={setF("unit")} />
                <input className="pg-inp" type="number" placeholder="Qty on Hand *" value={form.qoh} onChange={setF("qoh")} min="0" />
                <input className="pg-inp" type="number" placeholder="Reorder Level *" value={form.reorder} onChange={setF("reorder")} min="0" />
                <input className="pg-inp" placeholder="Notes" value={form.notes} onChange={setF("notes")} />
              </div>

              <button className="pg-btn primary" type="submit" disabled={!isValid}>
                <Plus size={14} />Add Consumable
              </button>

              {!dept && <div className="pg-hint">⚠ No dept code — log out and back in with a dept code.</div>}
            </form>
          </div>
        ) : (
          <div className="pg-ro">
            👁 Read-only — switch to <strong style={{ color:"var(--blue-text)" }}>Admin</strong> to add, edit or adjust stock.
          </div>
        )}

        {/* Category filter bar */}
        <div className="pg-filters">
          <span className="pg-filter-lbl">Category:</span>
          <select
            className="pg-filter-sel"
            value={filterCat}
            onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
          >
            <option value="">All categories</option>
            {["Office","IT","Printer","Hygiene","Cleaning","Safety","Other"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {filterCat && (
            <button className="pg-btn sm" onClick={() => { setFilterCat(""); setPage(1); }}>
              <X size={12} />Clear
            </button>
          )}
        </div>

        <div className="pg-tbl-wrap">
          <table className="pg-tbl">
            <thead>
              <tr>
                <th>SKU</th><th>Name</th><th>Category</th>
                <th>Qty</th><th>Reorder</th><th>Status</th><th>Supplier</th>
                {admin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map((i) => (
                  <tr key={i} className="pg-skel">
                    {Array.from({ length: colCount }).map((_, j) => (
                      <td key={j}><div className="pg-skel-bar" style={{ width: j === 0 ? "60%" : "85%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : rows.map((r) => {
                const isLow     = r.is_low_stock ?? (r.quantity_on_hand <= r.reorder_level);
                const isEditing = editId === r.id;
                return (
                  <tr key={r.id ?? r.sku} className={isEditing ? "editing" : ""}>
                    <td className="pg-sku">{r.sku}</td>

                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" value={editData.name}
                            onChange={(e) => setEditData((p) => ({ ...p, name:e.target.value }))} />
                        : <span style={{ color:"var(--page-td-name)", fontWeight:500 }}>{r.name}</span>
                      }
                    </td>

                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" value={editData.category}
                            onChange={(e) => setEditData((p) => ({ ...p, category:e.target.value }))} />
                        : r.category || "—"
                      }
                    </td>

                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" type="number" min="0" style={{ width:70 }}
                            value={editData.quantity_on_hand}
                            onChange={(e) => setEditData((p) => ({ ...p, quantity_on_hand:e.target.value }))} />
                        : admin
                          ? <div className="pg-qty-adj">
                              <button className="pg-qty-btn" onClick={() => adjustQty(r.id, -1)}>−</button>
                              <span className={`pg-qty ${isLow ? "low" : "ok"}`}>{r.quantity_on_hand}</span>
                              <button className="pg-qty-btn" onClick={() => adjustQty(r.id, +1)}>+</button>
                            </div>
                          : <span className={`pg-qty ${isLow ? "low" : "ok"}`}>{r.quantity_on_hand}</span>
                      }
                    </td>

                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" type="number" min="0" style={{ width:70 }}
                            value={editData.reorder_level}
                            onChange={(e) => setEditData((p) => ({ ...p, reorder_level:e.target.value }))} />
                        : <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13 }}>{r.reorder_level}</span>
                      }
                    </td>

                    <td>
                      <span className={`pg-bdg ${isLow ? "low" : "ok"}`}>{isLow ? "LOW" : "OK"}</span>
                    </td>

                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" value={editData.supplier}
                            onChange={(e) => setEditData((p) => ({ ...p, supplier:e.target.value }))} />
                        : r.supplier || "—"
                      }
                    </td>

                    {admin && (
                      <td>
                        {isEditing ? (
                          <div className="pg-edit-actions">
                            <button className="pg-btn sm primary" onClick={() => saveEdit(r.id)}>
                              <Check size={12} />Save
                            </button>
                            <button className="pg-btn sm" onClick={() => { setEditId(null); setEditData({}); }}>
                              <X size={12} />Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="pg-edit-actions">
                            <button className="pg-btn icon" onClick={() => startEdit(r)}><Pencil size={13} /></button>
                            <button className="pg-btn icon danger" onClick={() => setDelConfirm(r.id)}><Trash2 size={13} /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="pg-empty">
                    {q ? `No results for "${q}".` : "No consumables yet — add one above."}
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