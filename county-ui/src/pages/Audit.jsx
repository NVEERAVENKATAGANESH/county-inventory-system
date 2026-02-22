import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useSearch } from "../context/SearchContext.jsx";

export default function Audit() {
  const { query } = useSearch();
  const globalNeedle = query.trim().toLowerCase();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  // local filters (extra narrowing)
  const [entityType, setEntityType] = useState(""); // ASSET / CONSUMABLE
  const [action, setAction] = useState(""); // CREATE / UPDATE / DELETE
  const [expandedKey, setExpandedKey] = useState(null);

  const pretty = (obj) => {
    if (!obj) return "";
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const normalizeList = (data) => {
    const list = data?.results ?? data ?? [];
    if (!Array.isArray(list)) return [];
    return list.map((x, idx) => ({
      ...x,
      __key:
        x.id ??
        `${x.entity_type ?? "?"}-${x.entity_id ?? "?"}-${x.timestamp ?? x.created_at ?? "?"}-${idx}`,
    }));
  };

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/api/auditlogs/?ordering=-timestamp");
      setItems(normalizeList(res.data));
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to load audit logs";
      setErr(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = globalNeedle;

    return items.filter((x) => {
      const okType = !entityType || x.entity_type === entityType;
      const okAction = !action || x.action === action;

      const okGlobal =
        !needle ||
        String(x.summary || "").toLowerCase().includes(needle) ||
        String(x.entity_id || "").toLowerCase().includes(needle) ||
        String(x.changed_by_username || "").toLowerCase().includes(needle) ||
        String(x.action || "").toLowerCase().includes(needle) ||
        String(x.entity_type || "").toLowerCase().includes(needle);

      return okType && okAction && okGlobal;
    });
  }, [items, entityType, action, globalNeedle]);

  return (
    <div className="panel">
      <div className="panelHeader">
        <div>
          <h2>Audit Logs</h2>
          <p>
            Global search comes from the navbar.
            {query ? (
              <span style={{ opacity: 0.75 }}>
                {" "}
                · Filter: <b>{query}</b>
              </span>
            ) : null}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            className="btn"
            onClick={() => {
              setEntityType("");
              setAction("");
              setExpandedKey(null);
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="formRow" style={{ marginBottom: 14 }}>
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">All entity types</option>
          <option value="ASSET">ASSET</option>
          <option value="CONSUMABLE">CONSUMABLE</option>
        </select>

        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {loading && (
        <div style={{ display: "grid", gap: 10 }}>
          <div className="card"><div style={{ opacity: 0.75 }}>Loading audit logs…</div></div>
          <div className="card"><div style={{ opacity: 0.75 }}>Loading audit logs…</div></div>
          <div className="card"><div style={{ opacity: 0.75 }}>Loading audit logs…</div></div>
        </div>
      )}

      {!loading && err && (
        <div className="badge warn" style={{ marginBottom: 12 }}>
          {err}
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={load}>Try again</button>
          </div>
        </div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div className="badge" style={{ opacity: 0.85 }}>
          No audit logs found for the current filters/search.
        </div>
      )}

      {!loading && !err && filtered.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((x) => {
            const isOpen = expandedKey === x.__key;

            const when = x.timestamp || x.created_at || "-";
            const who = x.changed_by_username || "system";
            const summary = x.summary || "(no summary)";
            const actionLabel = x.action || "-";
            const typeLabel = x.entity_type || "-";
            const entityId = x.entity_id ?? "-";

            return (
              <div key={x.__key} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      <span className="badge ok">{actionLabel}</span>{" "}
                      <span style={{ opacity: 0.8 }}>·</span>{" "}
                      <b>{typeLabel}</b>{" "}
                      <span style={{ opacity: 0.8 }}>·</span>{" "}
                      entity_id: <b>{entityId}</b>
                    </div>

                    <div style={{ marginTop: 6, fontSize: 15 }}>{summary}</div>

                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                      {when} · by {who}
                    </div>
                  </div>

                  <button
                    className="btn"
                    onClick={() => setExpandedKey(isOpen ? null : x.__key)}
                    style={{ alignSelf: "start" }}
                  >
                    {isOpen ? "Hide details" : "View details"}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Before</div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 12,
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(0,0,0,0.25)",
                          overflow: "auto",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {pretty(x.before) || "(empty)"}
                      </pre>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>After</div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 12,
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(0,0,0,0.25)",
                          overflow: "auto",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {pretty(x.after) || "(empty)"}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
