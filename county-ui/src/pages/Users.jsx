/**
 * Users.jsx — Professional upgrade
 * - Stats bar: total, active, admin count
 * - Role + status filter bar
 * - Avatar initials in table
 * - Full CRUD (admin only), password reset modal
 */
import { useEffect, useState, useCallback } from "react";
import { api, fmtApiError, isAdmin } from "../api";
import { useSearch } from "../context/SearchContext.jsx";
import Pagination from "../components/Pagination.jsx";
import { Pencil, Trash2, Check, X, Plus, RefreshCw, KeyRound } from "lucide-react";

const PAGE_SIZE = 50;

const ROLES = ["EMPLOYEE", "DEPT_MANAGER", "COUNTY_ADMIN"];
const ROLE_LABELS = { EMPLOYEE: "Employee", DEPT_MANAGER: "Dept Manager", COUNTY_ADMIN: "County Admin" };
const ROLE_COLORS = { EMPLOYEE: "green", DEPT_MANAGER: "blue", COUNTY_ADMIN: "purple" };

const EMPTY_FORM = {
  username: "", email: "", first_name: "", last_name: "",
  role: "EMPLOYEE", department: "", password: "", is_active: true,
};

const css = `
.pg { font-family:'DM Sans',system-ui,sans-serif; color:var(--text); }
.pg-hdr { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
.pg-title { font-size:28px; font-weight:700; color:var(--page-title); letter-spacing:-.5px; margin:0; }
.pg-sub { font-size:15px; color:var(--page-sub); margin:5px 0 0; }
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
/* Stats */
.pg-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
@media(max-width:700px){ .pg-stats { grid-template-columns:repeat(2,1fr); } }
@media(max-width:400px){ .pg-stats { grid-template-columns:1fr; } }
.pg-stat { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:12px; padding:14px 18px; }
.pg-stat-val { font-size:28px; font-weight:700; color:var(--page-title); font-variant-numeric:tabular-nums; }
.pg-stat-val.green  { color:var(--green-text); }
.pg-stat-val.blue   { color:var(--blue-text);  }
.pg-stat-val.purple { color:var(--purple-text);}
.pg-stat-lbl { font-size:11.5px; color:var(--page-sub); margin-top:3px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
/* Filters */
.pg-filters { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.pg-filter-lbl { font-size:13px; color:var(--page-sub); white-space:nowrap; }
.pg-filter-sel { background:var(--page-input-bg); border:1px solid var(--page-card-border); border-radius:8px; padding:7px 11px; color:var(--page-input-text); font-size:13px; font-family:inherit; outline:none; min-width:150px; transition:border-color .15s; }
.pg-filter-sel:focus { border-color:var(--border-focus); }
.pg-filter-sel option { background:var(--page-input-bg); color:var(--page-input-text); }
/* Form */
.pg-form { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:14px; padding:18px 20px; margin-bottom:20px; }
.pg-form-title { font-size:14px; font-weight:600; color:var(--page-sub); margin:0 0 14px; }
.pg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(185px,1fr)); gap:9px; margin-bottom:12px; }
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
.pg-mono { font-family:'DM Mono',monospace; font-size:12px; color:var(--page-td-text); }
.pg-bdg { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; font-family:'DM Mono',monospace; border:1px solid transparent; white-space:nowrap; }
.pg-bdg.green  { background:var(--green-dim);  color:var(--green-text);  border-color:var(--green-dim);  }
.pg-bdg.blue   { background:var(--blue-dim);   color:var(--blue-text);   border-color:var(--blue-dim);   }
.pg-bdg.purple { background:var(--purple-dim,#7c3aed22); color:var(--purple-text); border-color:var(--purple-dim,#7c3aed22); }
.pg-bdg.red    { background:var(--red-dim);    color:var(--red-text);    border-color:var(--red-dim);    }
.pg-edit-actions { display:flex; gap:5px; align-items:center; }
.pg-empty { padding:40px; text-align:center; color:var(--page-empty); font-size:15px; }
.pg-skel td { padding:13px 16px; }
.pg-skel-bar { height:12px; border-radius:4px; background:var(--page-skel); animation:skel 1.5s ease-in-out infinite; }
@keyframes skel{0%,100%{opacity:.45}50%{opacity:.85}}
/* Avatar */
.pg-avatar {
  width:32px; height:32px; border-radius:9px;
  display:inline-flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; flex-shrink:0; text-transform:uppercase;
}
.pg-avatar.green  { background:var(--green-dim);  color:var(--green-text);  }
.pg-avatar.blue   { background:var(--blue-dim);   color:var(--blue-text);   }
.pg-avatar.purple { background:var(--purple-dim,#7c3aed22); color:var(--purple-text); }
.pg-user-cell { display:flex; align-items:center; gap:10px; }
.pg-user-name { font-weight:500; color:var(--page-td-name,var(--text)); }
.pg-user-sub  { font-size:11.5px; color:var(--page-sub); margin-top:1px; }
/* Password modal */
.pg-pw-modal { position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:200; display:flex; align-items:center; justify-content:center; }
.pg-pw-box { background:var(--page-card-bg); border:1px solid var(--page-card-border); border-radius:16px; padding:24px 28px; width:340px; max-width:90vw; }
.pg-pw-title { font-size:16px; font-weight:700; color:var(--page-title); margin:0 0 16px; }
`;

function initials(u) {
  return (u || "?").slice(0, 2).toUpperCase();
}

export default function Users() {
  const { query } = useSearch();
  const q     = query.trim().toLowerCase();
  const admin = isAdmin();

  const [rows,       setRows]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [depts,      setDepts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [toast,      setToast]      = useState("");
  const [delConfirm, setDelConfirm] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const setF = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({});
  const [pwModal,  setPwModal]  = useState(null);
  const [newPw,    setNewPw]    = useState("");

  // Filters
  const [filterRole,   setFilterRole]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { setPage(1); }, [q, filterRole, filterStatus]);

  useEffect(() => {
    api.get("/api/departments/?page_size=200")
      .then(r => setDepts(Array.isArray(r.data) ? r.data : r.data?.results ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { page, page_size: PAGE_SIZE, ordering: "username" };
      if (q)            params.search    = q;
      if (filterRole)   params.role      = filterRole;
      if (filterStatus) params.is_active = filterStatus === "active" ? "true" : "false";
      const res  = await api.get("/api/users/", { params });
      const data = res.data;
      setRows(Array.isArray(data) ? data : data?.results ?? []);
      setTotal(data?.count ?? (Array.isArray(data) ? data.length : 0));
    } catch (err) { setError(fmtApiError(err)); }
    finally { setLoading(false); }
  }, [page, q, filterRole, filterStatus]);

  useEffect(() => { load(); }, [load]);

  // Derived stats from current page (approximate for large sets)
  const activeCount  = rows.filter(r => r.is_active).length;
  const adminCount   = rows.filter(r => r.role === "COUNTY_ADMIN").length;
  const managerCount = rows.filter(r => r.role === "DEPT_MANAGER").length;

  const isValid = form.username.trim() && form.email.trim();

  async function create(e) {
    e?.preventDefault?.();
    if (!admin)   { setError("Admin role required."); return; }
    if (!isValid) { setError("Username and Email are required."); return; }
    setError("");
    try {
      await api.post("/api/users/", {
        username:   form.username.trim(),
        email:      form.email.trim(),
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        role:       form.role,
        department: form.department || null,
        password:   form.password || undefined,
        is_active:  form.is_active,
      });
      setToast(`User "${form.username.trim()}" created ✓`);
      setForm(EMPTY_FORM); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  function startEdit(row) {
    setEditId(row.id);
    setEditData({
      email:      row.email      || "",
      first_name: row.first_name || "",
      last_name:  row.last_name  || "",
      role:       row.role       || "EMPLOYEE",
      department: row.department ?? "",
      is_active:  row.is_active,
    });
  }

  async function saveEdit(id) {
    setError("");
    try {
      await api.patch(`/api/users/${id}/`, {
        ...editData,
        department: editData.department || null,
      });
      setToast("User updated ✓"); setEditId(null); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  async function deleteRow(id) {
    setError("");
    try {
      await api.delete(`/api/users/${id}/`);
      setToast("User deleted ✓"); setDelConfirm(null); load();
    } catch (err) { setError(fmtApiError(err)); }
  }

  async function setPassword() {
    if (!newPw.trim()) return;
    try {
      await api.post(`/api/users/${pwModal.id}/set-password/`, { password: newPw });
      setToast(`Password updated for ${pwModal.username} ✓`);
      setPwModal(null); setNewPw("");
    } catch (err) { setError(fmtApiError(err)); }
  }

  const colCount = admin ? 7 : 6;

  return (
    <>
      <style>{css}</style>
      <div className="pg">

        {/* Header */}
        <div className="pg-hdr">
          <div>
            <h1 className="pg-title">Users</h1>
            <p className="pg-sub">
              {total} user{total !== 1 ? "s" : ""}
              {q ? ` matching "${q}"` : ""}
            </p>
          </div>
          <div className="pg-acts">
            <button className="pg-btn" onClick={load} disabled={loading}><RefreshCw size={13} />Refresh</button>
          </div>
        </div>

        {/* Stats */}
        <div className="pg-stats">
          <div className="pg-stat">
            <div className="pg-stat-val">{total}</div>
            <div className="pg-stat-lbl">Total users</div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-val green">{activeCount}</div>
            <div className="pg-stat-lbl">Active (this page)</div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-val purple">{adminCount}</div>
            <div className="pg-stat-lbl">County Admins</div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-val blue">{managerCount}</div>
            <div className="pg-stat-lbl">Dept Managers</div>
          </div>
        </div>

        {/* Alerts */}
        {error && <div className="pg-err">{error}</div>}
        {toast && <div className="pg-ok"><span>{toast}</span><button className="pg-btn sm" onClick={() => setToast("")}>✕</button></div>}
        {delConfirm && (
          <div className="pg-del-confirm">
            <span>Delete <strong>{rows.find(r => r.id === delConfirm)?.username}</strong>? Cannot be undone.</span>
            <button className="pg-btn danger sm" onClick={() => deleteRow(delConfirm)}>Yes, delete</button>
            <button className="pg-btn sm"        onClick={() => setDelConfirm(null)}>Cancel</button>
          </div>
        )}

        {/* Filter bar */}
        <div className="pg-filters">
          <span className="pg-filter-lbl">Role:</span>
          <select className="pg-filter-sel" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <span className="pg-filter-lbl">Status:</span>
          <select className="pg-filter-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(filterRole || filterStatus) && (
            <button className="pg-btn sm" onClick={() => { setFilterRole(""); setFilterStatus(""); setPage(1); }}>
              <X size={12} />Clear
            </button>
          )}
        </div>

        {/* Add form */}
        {admin ? (
          <div className="pg-form">
            <div className="pg-form-title">+ Add New User</div>
            <form onSubmit={create} noValidate>
              <div className="pg-grid">
                <input className="pg-inp" placeholder="Username *"   value={form.username}   onChange={setF("username")} />
                <input className="pg-inp" placeholder="Email *"      value={form.email}      onChange={setF("email")} type="email" />
                <input className="pg-inp" placeholder="First name"   value={form.first_name} onChange={setF("first_name")} />
                <input className="pg-inp" placeholder="Last name"    value={form.last_name}  onChange={setF("last_name")} />
                <input className="pg-inp" placeholder="Password"     value={form.password}   onChange={setF("password")} type="password" />
                <select className="pg-sel" value={form.role} onChange={setF("role")}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <select className="pg-sel" value={form.department} onChange={setF("department")}>
                  <option value="">— No department —</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </div>
              <button className="pg-btn primary" type="submit" disabled={!isValid}><Plus size={14} />Add User</button>
            </form>
          </div>
        ) : (
          <div className="pg-ro">👁 Read-only — switch to <strong style={{ color:"var(--blue-text)" }}>Admin</strong> to add, edit or delete users.</div>
        )}

        {/* Table */}
        <div className="pg-tbl-wrap">
          <table className="pg-tbl">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Assigned Assets</th>
                <th>Status</th>
                {admin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="pg-skel">
                    {Array.from({ length: colCount }).map((_, j) => (
                      <td key={j}><div className="pg-skel-bar" style={{ width: j === 0 ? "60%" : "85%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : rows.map(r => {
                const isEditing  = editId === r.id;
                const roleColor  = ROLE_COLORS[r.role] || "green";
                const displayName = [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username;
                return (
                  <tr key={r.id} className={isEditing ? "editing" : ""}>

                    {/* User cell — avatar + name + username */}
                    <td>
                      <div className="pg-user-cell">
                        <div className={`pg-avatar ${roleColor}`}>{initials(r.username)}</div>
                        <div>
                          {isEditing ? (
                            <div style={{ display:"flex", gap:6 }}>
                              <input className="pg-inp edit" placeholder="First" style={{ width:90 }}
                                value={editData.first_name} onChange={e => setEditData(p => ({ ...p, first_name:e.target.value }))} />
                              <input className="pg-inp edit" placeholder="Last"  style={{ width:90 }}
                                value={editData.last_name}  onChange={e => setEditData(p => ({ ...p, last_name:e.target.value }))} />
                            </div>
                          ) : (
                            <>
                              <div className="pg-user-name">{displayName}</div>
                              <div className="pg-user-sub pg-mono">{r.username}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td>
                      {isEditing
                        ? <input className="pg-inp edit" type="email" value={editData.email}
                            onChange={e => setEditData(p => ({ ...p, email:e.target.value }))} />
                        : r.email || "—"
                      }
                    </td>

                    {/* Role */}
                    <td>
                      {isEditing ? (
                        <select className="pg-sel edit" value={editData.role}
                          onChange={e => setEditData(p => ({ ...p, role:e.target.value }))}>
                          {ROLES.map(ro => <option key={ro} value={ro}>{ROLE_LABELS[ro]}</option>)}
                        </select>
                      ) : (
                        <span className={`pg-bdg ${roleColor}`}>{ROLE_LABELS[r.role] || r.role}</span>
                      )}
                    </td>

                    {/* Department */}
                    <td>
                      {isEditing ? (
                        <select className="pg-sel edit" value={editData.department ?? ""}
                          onChange={e => setEditData(p => ({ ...p, department:e.target.value }))}>
                          <option value="">— None —</option>
                          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      ) : (
                        <span className="pg-mono">{r.department_code || "—"}</span>
                      )}
                    </td>

                    {/* Assigned Assets count */}
                    <td>
                      <span className="pg-mono" style={{ color: r.assigned_assets_count > 0 ? "var(--blue-text)" : undefined }}>
                        {r.assigned_assets_count ?? "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      {isEditing ? (
                        <select className="pg-sel edit" value={editData.is_active ? "true" : "false"}
                          onChange={e => setEditData(p => ({ ...p, is_active:e.target.value === "true" }))}>
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <span className={`pg-bdg ${r.is_active ? "green" : "red"}`}>
                          {r.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
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
                            <button className="pg-btn icon"        title="Edit"         onClick={() => startEdit(r)}><Pencil size={13} /></button>
                            <button className="pg-btn icon"        title="Set password" onClick={() => { setPwModal({ id:r.id, username:r.username }); setNewPw(""); }}><KeyRound size={13} /></button>
                            <button className="pg-btn icon danger" title="Delete"       onClick={() => setDelConfirm(r.id)}><Trash2 size={13} /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={colCount} className="pg-empty">
                  {q ? `No users matching "${q}".` : "No users yet — add one above."}
                </td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalCount={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>

      {/* Set password modal */}
      {pwModal && (
        <div className="pg-pw-modal" onClick={e => { if (e.target === e.currentTarget) { setPwModal(null); setNewPw(""); } }}>
          <div className="pg-pw-box">
            <div className="pg-pw-title">Set password — {pwModal.username}</div>
            <input
              className="pg-inp" type="password" placeholder="New password"
              value={newPw} onChange={e => setNewPw(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") setPassword(); if (e.key === "Escape") { setPwModal(null); setNewPw(""); } }}
            />
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button className="pg-btn primary" onClick={setPassword} disabled={!newPw.trim()}>Update password</button>
              <button className="pg-btn"         onClick={() => { setPwModal(null); setNewPw(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
