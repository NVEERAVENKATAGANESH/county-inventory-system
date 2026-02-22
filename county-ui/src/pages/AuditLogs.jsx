import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function AuditLogs() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState(""); // ASSET / CONSUMABLE
  const [action, setAction] = useState(""); // CREATE/UPDATE/DELETE

  const [rows, setRows] = useState([]);

  const params = useMemo(() => {
    const p = { ordering: "-timestamp" };
    if (search.trim()) p.search = search.trim();
    if (entityType) p.entity_type = entityType;
    if (action) p.action = action;
    return p;
  }, [search, entityType, action]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");

    api
      .get("/api/auditlogs/", { params })
      .then((res) => {
        if (!alive) return;
        // DRF pagination may return {results: []} or plain []
        const data = Array.isArray(res.data) ? res.data : res.data.results;
        setRows(data || []);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.response?.data?.detail || e.message || "Failed");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [params]);

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>Audit Logs</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          style={{ width: 360, padding: 10, borderRadius: 8 }}
          placeholder="Search (summary, entity_id, user, dept)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          style={{ padding: 10, borderRadius: 8 }}
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          <option value="">All Entities</option>
          <option value="ASSET">ASSET</option>
          <option value="CONSUMABLE">CONSUMABLE</option>
        </select>

        <select
          style={{ padding: 10, borderRadius: 8 }}
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>

        <button
          style={{ padding: "10px 14px", borderRadius: 8 }}
          onClick={() => {
            setSearch("");
            setEntityType("");
            setAction("");
          }}
        >
          Clear
        </button>
      </div>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: "salmon" }}>{err}</div>}

      {!loading && !err && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #333" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#222" }}>
              <tr>
                <th style={th}>Time</th>
                <th style={th}>Entity</th>
                <th style={th}>Action</th>
                <th style={th}>Entity ID</th>
                <th style={th}>Summary</th>
                <th style={th}>User</th>
                <th style={th}>Dept</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #333" }}>
                  <td style={td}>{new Date(r.timestamp).toLocaleString()}</td>
                  <td style={td}>{r.entity_type}</td>
                  <td style={td}>{r.action}</td>
                  <td style={td}>{r.entity_id}</td>
                  <td style={td}>{r.summary}</td>
                  <td style={td}>{r.changed_by_username || "-"}</td>
                  <td style={td}>{r.department_code || "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td style={td} colSpan={7}>
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: "left", padding: 12, fontWeight: 600 };
const td = { padding: 12 };
