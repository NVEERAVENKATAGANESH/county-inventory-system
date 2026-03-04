/**
 * Departments.jsx — Two-panel: departments list + locations for selected dept.
 * Admin: full CRUD for departments and locations.
 * Employee: read-only.
 */
import { useEffect, useState, useCallback } from "react";
import { api, fmtApiError, isAdmin } from "../api";
import { useSearch } from "../context/SearchContext.jsx";
import { Pencil, Trash2, Check, X, Plus, RefreshCw, Building2, MapPin } from "lucide-react";

const EMPTY_DEPT = { name: "", code: "" };
const EMPTY_LOC  = { name: "", address: "" };

const css = `
.dp { font-family:'DM Sans',system-ui,sans-serif; color:var(--text); }
.dp-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
.dp-title { font-size:28px; font-weight:700; color:var(--page-title); letter-spacing:-.5px; margin:0; }
.dp-sub { font-size:15px; color:var(--page-sub); margin:5px 0 0; }
.dp-acts { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.dp-btn {
  padding:9px 16px; border-radius:10px; font-size:14px; font-weight:500;
  font-family:inherit; cursor:pointer; transition:all .13s;
  border:1px solid var(--page-btn-border); background:var(--page-btn-bg); color:var(--page-btn-text);
  display:inline-flex; align-items:center; gap:7px; white-space:nowrap;
}
.dp-btn:hover { border-color:var(--border-md); color:var(--text); background:var(--bg-panel2); }
.dp-btn:disabled { opacity:.4; cursor:not-allowed; }
.dp-btn.primary { background:var(--blue-dim); border-color:var(--blue-dim); color:var(--blue-text); }
.dp-btn.primary:hover { filter:brightness(1.1); }
.dp-btn.danger  { background:var(--red-dim);  border-color:var(--red-dim);  color:var(--red-text);  }
.dp-btn.danger:hover  { filter:brightness(1.1); }
.dp-btn.sm   { padding:6px 12px; font-size:12.5px; border-radius:8px; }
.dp-btn.icon { padding:6px; width:30px; height:30px; justify-content:center; }
.dp-err  { background:var(--red-dim);   border:1px solid var(--red-dim);   border-radius:10px; padding:10px 15px; font-size:14px; color:var(--red-text);   margin-bottom:16px; white-space:pre-wrap; }
.dp-ok   { background:var(--green-dim); border:1px solid var(--green-dim); border-radius:10px; padding:10px 15px; font-size:14px; color:var(--green-text); margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }
.dp-ro { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:12px; padding:13px 16px; margin-bottom:16px; font-size:14px; color:var(--page-sub); }
.dp-del-confirm { background:var(--red-dim); border:1px solid var(--red-dim); border-radius:10px; padding:13px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px; font-size:14px; color:var(--red-text); flex-wrap:wrap; }
.dp-layout { display:grid; grid-template-columns:360px 1fr; gap:20px; align-items:start; }
@media(max-width:900px) { .dp-layout { grid-template-columns:1fr; } }
.dp-panel { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; overflow:hidden; }
.dp-panel-hdr {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px; border-bottom:1px solid var(--page-card-border);
  background:var(--page-th-bg);
}
.dp-panel-title { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:var(--page-th-text); display:flex; align-items:center; gap:7px; }
.dp-dept-list { max-height:calc(100vh - 280px); overflow-y:auto; }
.dp-dept-row {
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:14px 18px; border-bottom:1px solid var(--page-card-border);
  cursor:pointer; transition:background .12s;
}
.dp-dept-row:last-child { border-bottom:none; }
.dp-dept-row:hover { background:var(--bg-hover); }
.dp-dept-row.selected { background:var(--blue-dim); border-left:3px solid var(--blue-text); }
.dp-dept-name { font-size:15px; font-weight:600; color:var(--page-td-name); }
.dp-dept-code { font-family:'DM Mono',monospace; font-size:12px; color:var(--page-sub); margin-top:2px; }
.dp-dept-counts { display:flex; gap:8px; }
.dp-count { font-size:12px; color:var(--page-sub); background:var(--bg-panel2); border:1px solid var(--border); border-radius:6px; padding:2px 7px; font-family:'DM Mono',monospace; }
.dp-dept-actions { display:flex; gap:4px; flex-shrink:0; }
.dp-tbl { width:100%; border-collapse:collapse; }
.dp-tbl th {
  text-align:left; padding:12px 18px; font-size:11px; font-weight:700;
  text-transform:uppercase; letter-spacing:.7px; color:var(--page-th-text);
  border-bottom:1px solid var(--page-card-border); background:var(--page-th-bg); white-space:nowrap;
}
.dp-tbl td { padding:12px 18px; font-size:14px; color:var(--page-td-text); border-bottom:1px solid var(--page-card-border); vertical-align:middle; }
.dp-tbl tr:last-child td { border-bottom:none; }
.dp-tbl tr:hover td { background:var(--bg-hover); }
.dp-tbl tr.editing td { background:var(--bg-active); }
.dp-inp {
  background:var(--page-input-bg); border:1px solid var(--page-card-border);
  border-radius:9px; padding:10px 13px; color:var(--page-input-text);
  font-size:14px; font-family:inherit; outline:none; width:100%; transition:border-color .15s;
}
.dp-inp:focus { border-color:var(--border-focus); box-shadow:0 0 0 3px var(--accent-glow); }
.dp-inp::placeholder { color:var(--page-input-ph); }
.dp-inp.sm { padding:7px 10px; font-size:13px; border-radius:7px; }
.dp-add-form { padding:14px 18px; border-top:1px solid var(--page-card-border); background:var(--bg-panel2); display:flex; gap:8px; flex-wrap:wrap; }
.dp-edit-actions { display:flex; gap:5px; }
.dp-empty { padding:40px; text-align:center; color:var(--page-empty); font-size:14px; }
.dp-select-hint { padding:60px 20px; text-align:center; color:var(--page-empty); font-size:15px; }
.dp-skel { height:56px; background:var(--page-skel); animation:skel 1.5s ease-in-out infinite; margin:2px 0; }
@keyframes skel{0%,100%{opacity:.45}50%{opacity:.85}}
`;

export default function Departments() {
  const { query } = useSearch();
  const q     = query.trim().toLowerCase();
  const admin = isAdmin();

  const [depts,      setDepts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [locs,       setLocs]       = useState([]);
  const [locsLoading,setLocsLoading]= useState(false);
  const [locsErr,    setLocsErr]    = useState("");
  const [selected,   setSelected]   = useState(null); // selected dept id
  const [error,      setError]      = useState("");
  const [toast,      setToast]      = useState("");
  const [delDept,    setDelDept]    = useState(null);
  const [delLoc,     setDelLoc]     = useState(null);
  const [deptForm,   setDeptForm]   = useState(EMPTY_DEPT);
  const [locForm,    setLocForm]    = useState(EMPTY_LOC);
  const [editDept,   setEditDept]   = useState(null);
  const [editDeptData, setEditDeptData] = useState({});
  const [editLoc,    setEditLoc]    = useState(null);
  const [editLocData,  setEditLocData]  = useState({});

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadDepts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await api.get("/api/departments/?page_size=200&ordering=name");
      const data = res.data;
      setDepts(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) { setError(fmtApiError(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDepts(); }, [loadDepts]);

  const loadLocs = useCallback(async (deptId) => {
    if (!deptId) { setLocs([]); setLocsErr(""); return; }
    setLocsLoading(true); setLocsErr("");
    try {
      const res  = await api.get(`/api/locations/?department=${deptId}&page_size=200&ordering=name`);
      const data = res.data;
      setLocs(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) { setLocs([]); setLocsErr(fmtApiError(err)); }
    finally { setLocsLoading(false); }
  }, []);

  useEffect(() => { loadLocs(selected); }, [selected, loadLocs]);

  const filteredDepts = q
    ? depts.filter(d => [d.name, d.code].some(v => (v || "").toLowerCase().includes(q)))
    : depts;

  const selectedDept = depts.find(d => d.id === selected);

  // — Department CRUD —
  async function createDept(e) {
    e?.preventDefault?.();
    if (!deptForm.name.trim() || !deptForm.code.trim()) { setError("Name and Code are required."); return; }
    setError("");
    try {
      await api.post("/api/departments/", { name: deptForm.name.trim(), code: deptForm.code.trim().toUpperCase() });
      setToast(`Department "${deptForm.name.trim()}" created ✓`);
      setDeptForm(EMPTY_DEPT);
      loadDepts();
    } catch (err) { setError(fmtApiError(err)); }
  }

  async function saveDept(id) {
    setError("");
    try {
      await api.patch(`/api/departments/${id}/`, editDeptData);
      setToast("Department updated ✓");
      setEditDept(null);
      loadDepts();
    } catch (err) { setError(fmtApiError(err)); }
  }

  async function deleteDept(id) {
    setError("");
    try {
      await api.delete(`/api/departments/${id}/`);
      setToast("Department deleted ✓");
      setDelDept(null);
      if (selected === id) setSelected(null);
      loadDepts();
    } catch (err) { setError(fmtApiError(err)); }
  }

  // — Location CRUD —
  async function createLoc(e) {
    e?.preventDefault?.();
    if (!locForm.name.trim()) { setError("Location name is required."); return; }
    setError("");
    try {
      await api.post("/api/locations/", { name: locForm.name.trim(), address: locForm.address.trim(), department: selected });
      setToast(`Location "${locForm.name.trim()}" added ✓`);
      setLocForm(EMPTY_LOC);
      loadLocs(selected);
    } catch (err) { setError(fmtApiError(err)); }
  }

  async function saveLoc(id) {
    setError("");
    try {
      await api.patch(`/api/locations/${id}/`, editLocData);
      setToast("Location updated ✓");
      setEditLoc(null);
      loadLocs(selected);
    } catch (err) { setError(fmtApiError(err)); }
  }

  async function deleteLoc(id) {
    setError("");
    try {
      await api.delete(`/api/locations/${id}/`);
      setToast("Location deleted ✓");
      setDelLoc(null);
      loadLocs(selected);
    } catch (err) { setError(fmtApiError(err)); }
  }

  return (
    <>
      <style>{css}</style>
      <div className="dp">
        <div className="dp-hdr">
          <div>
            <h1 className="dp-title">Departments</h1>
            <p className="dp-sub">
              {filteredDepts.length} department{filteredDepts.length !== 1 ? "s" : ""}
              {q ? ` matching "${q}"` : ""}
              {selectedDept ? ` · viewing: ${selectedDept.name}` : " · click a row to view locations"}
            </p>
          </div>
          <div className="dp-acts">
            <button className="dp-btn" onClick={loadDepts} disabled={loading}><RefreshCw size={13} />Refresh</button>
          </div>
        </div>

        {error && <div className="dp-err">{error}</div>}
        {toast && <div className="dp-ok"><span>{toast}</span><button className="dp-btn sm" onClick={() => setToast("")}>✕</button></div>}

        {(delDept || delLoc) && (
          <div className="dp-del-confirm">
            <span>
              Delete <strong>{delDept ? depts.find(d => d.id === delDept)?.name : locs.find(l => l.id === delLoc)?.name}</strong>? Cannot be undone.
            </span>
            <button className="dp-btn danger sm" onClick={() => delDept ? deleteDept(delDept) : deleteLoc(delLoc)}>Yes, delete</button>
            <button className="dp-btn sm"        onClick={() => { setDelDept(null); setDelLoc(null); }}>Cancel</button>
          </div>
        )}

        {!admin && <div className="dp-ro">👁 Read-only — switch to <strong style={{ color:"var(--blue-text)" }}>Admin</strong> to add, edit or delete.</div>}

        <div className="dp-layout">
          {/* Left: departments list */}
          <div className="dp-panel">
            <div className="dp-panel-hdr">
              <span className="dp-panel-title"><Building2 size={14} />Departments</span>
              <span style={{ fontSize:12, color:"var(--page-sub)" }}>{filteredDepts.length} total</span>
            </div>

            <div className="dp-dept-list">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="dp-skel" />)
              ) : filteredDepts.length === 0 ? (
                <div className="dp-empty">{q ? `No departments matching "${q}".` : "No departments yet."}</div>
              ) : filteredDepts.map(d => {
                const isEditing = editDept === d.id;
                return (
                  <div key={d.id}
                    className={`dp-dept-row${selected === d.id ? " selected" : ""}`}
                    onClick={() => { if (!isEditing) setSelected(d.id === selected ? null : d.id); }}
                  >
                    {isEditing ? (
                      <div style={{ flex:1, display:"flex", gap:7, flexWrap:"wrap" }} onClick={e => e.stopPropagation()}>
                        <input className="dp-inp sm" placeholder="Name" value={editDeptData.name} onChange={e => setEditDeptData(p => ({ ...p, name: e.target.value }))} style={{ flex:2, minWidth:100 }} />
                        <input className="dp-inp sm" placeholder="Code" value={editDeptData.code} onChange={e => setEditDeptData(p => ({ ...p, code: e.target.value.toUpperCase() }))} style={{ flex:1, minWidth:60 }} />
                        <button className="dp-btn sm primary" onClick={() => saveDept(d.id)}><Check size={12} />Save</button>
                        <button className="dp-btn sm"         onClick={() => setEditDept(null)}><X size={12} /></button>
                      </div>
                    ) : (
                      <>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="dp-dept-name">{d.name}</div>
                          <div className="dp-dept-code">{d.code}</div>
                        </div>
                        <div className="dp-dept-counts">
                          <span className="dp-count" title="Assets">{d.asset_count ?? 0} assets</span>
                          <span className="dp-count" title="Consumables">{d.consumable_count ?? 0} cons.</span>
                        </div>
                        {admin && (
                          <div className="dp-dept-actions" onClick={e => e.stopPropagation()}>
                            <button className="dp-btn icon" title="Edit" onClick={() => { setEditDept(d.id); setEditDeptData({ name: d.name, code: d.code }); }}><Pencil size={13} /></button>
                            <button className="dp-btn icon danger" title="Delete" onClick={() => setDelDept(d.id)}><Trash2 size={13} /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {admin && (
              <form className="dp-add-form" onSubmit={createDept}>
                <input className="dp-inp" placeholder="Department name *" value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} style={{ flex:2, minWidth:120 }} />
                <input className="dp-inp" placeholder="Code *"            value={deptForm.code} onChange={e => setDeptForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} style={{ flex:1, minWidth:70 }} />
                <button className="dp-btn primary" type="submit" disabled={!deptForm.name.trim() || !deptForm.code.trim()}><Plus size={14} />Add</button>
              </form>
            )}
          </div>

          {/* Right: locations for selected dept */}
          <div className="dp-panel">
            <div className="dp-panel-hdr">
              <span className="dp-panel-title"><MapPin size={14} />Locations {selectedDept ? `— ${selectedDept.name}` : ""}</span>
              {selected && <span style={{ fontSize:12, color:"var(--page-sub)" }}>{locs.length} location{locs.length !== 1 ? "s" : ""}</span>}
            </div>

            {!selected ? (
              <div className="dp-select-hint">← Select a department to view its locations</div>
            ) : locsLoading ? (
              <div className="dp-empty">Loading…</div>
            ) : locsErr ? (
              <div className="dp-err" style={{ margin:"16px 18px" }}>{locsErr}</div>
            ) : (
              <>
                <table className="dp-tbl">
                  <thead>
                    <tr><th>Name</th><th>Address</th>{admin && <th>Actions</th>}</tr>
                  </thead>
                  <tbody>
                    {locs.length === 0 ? (
                      <tr><td colSpan={admin ? 3 : 2} className="dp-empty">No locations yet — add one below.</td></tr>
                    ) : locs.map(l => {
                      const isEditing = editLoc === l.id;
                      return (
                        <tr key={l.id} className={isEditing ? "editing" : ""}>
                          <td>
                            {isEditing
                              ? <input className="dp-inp sm" value={editLocData.name} onChange={e => setEditLocData(p => ({ ...p, name: e.target.value }))} />
                              : <span style={{ fontWeight:500, color:"var(--page-td-name)" }}>{l.name}</span>
                            }
                          </td>
                          <td>
                            {isEditing
                              ? <input className="dp-inp sm" value={editLocData.address} onChange={e => setEditLocData(p => ({ ...p, address: e.target.value }))} placeholder="Address" />
                              : l.address || <span style={{ color:"var(--page-empty)" }}>—</span>
                            }
                          </td>
                          {admin && (
                            <td>
                              {isEditing ? (
                                <div className="dp-edit-actions">
                                  <button className="dp-btn sm primary" onClick={() => saveLoc(l.id)}><Check size={12} />Save</button>
                                  <button className="dp-btn sm"         onClick={() => setEditLoc(null)}><X size={12} />Cancel</button>
                                </div>
                              ) : (
                                <div className="dp-edit-actions">
                                  <button className="dp-btn icon" onClick={() => { setEditLoc(l.id); setEditLocData({ name: l.name, address: l.address || "" }); }}><Pencil size={13} /></button>
                                  <button className="dp-btn icon danger" onClick={() => setDelLoc(l.id)}><Trash2 size={13} /></button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {admin && (
                  <form className="dp-add-form" onSubmit={createLoc}>
                    <input className="dp-inp" placeholder="Location name *" value={locForm.name}    onChange={e => setLocForm(p => ({ ...p, name: e.target.value }))}    style={{ flex:2, minWidth:130 }} />
                    <input className="dp-inp" placeholder="Address"          value={locForm.address} onChange={e => setLocForm(p => ({ ...p, address: e.target.value }))} style={{ flex:3, minWidth:160 }} />
                    <button className="dp-btn primary" type="submit" disabled={!locForm.name.trim()}><Plus size={14} />Add</button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
