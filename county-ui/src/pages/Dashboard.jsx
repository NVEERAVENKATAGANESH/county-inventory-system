import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useSearch } from "../context/SearchContext.jsx";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function pillStyle(bg) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: bg || "rgba(255,255,255,0.06)",
    fontSize: 12,
    color: "#fff",
  };
}

function getErrMsg(err) {
  // axios style: err.response?.status, err.response?.data?.detail
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;
  if (status && detail) return `${status}: ${detail}`;
  if (status) return `${status}: Request failed`;
  return err?.message || "Request failed";
}

export default function Dashboard() {
  const { query } = useSearch();
  const q = query.trim().toLowerCase();

  const role = (localStorage.getItem("actingRole") || "employee").toLowerCase();
  const isAdmin = role === "admin";

  // ✅ normalize to lowercase to match DB (you confirmed dept code is 'it')
  const deptCode = (localStorage.getItem("deptCode") || "").trim().toLowerCase();

  const username = localStorage.getItem("username") || "User";

  const [stats, setStats] = useState({
    assets: 0,
    consumables: 0,
    lowStock: 0,
    audits: 0,
  });

  const [lowPreview, setLowPreview] = useState([]);
  const [recent, setRecent] = useState([]);

  // ✅ allow multiple warnings instead of 1 generic error
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const didLoadRef = useRef(false);

  async function load() {
    setLoading(true);
    setWarnings([]);

    // If employee but dept not set, don't spam backend.
    if (!isAdmin && !deptCode) {
      setLowPreview([]);
      setRecent([]);
      setStats({ assets: 0, consumables: 0, lowStock: 0, audits: 0 });
      setWarnings([
        "Dept code is not set. Please login again and select a valid department.",
      ]);
      setLoading(false);
      return;
    }

    // ✅ run everything independently so one failure doesn't kill everything
    const [assetsRes, consumablesRes, lowRes, auditsRes] = await Promise.allSettled([
      api.get("/api/assets/?page_size=1"),
      api.get("/api/consumables/?page_size=1"),
      api.get("/api/consumables/low-stock/"),
      api.get("/api/auditlogs/?ordering=-timestamp&page_size=15"),
    ]);

    const newWarnings = [];

    // Assets
    let assetsCount = 0;
    if (assetsRes.status === "fulfilled") {
      const a = assetsRes.value.data;
      assetsCount = a?.count ?? a?.length ?? 0;
    } else {
      newWarnings.push(`Assets summary failed: ${getErrMsg(assetsRes.reason)}`);
    }

    // Consumables
    let consumablesCount = 0;
    if (consumablesRes.status === "fulfilled") {
      const c = consumablesRes.value.data;
      consumablesCount = c?.count ?? c?.length ?? 0;
    } else {
      newWarnings.push(`Consumables summary failed: ${getErrMsg(consumablesRes.reason)}`);
    }

    // Low stock preview
    let lowStockCount = 0;
    let lowList = [];
    if (lowRes.status === "fulfilled") {
      const low = lowRes.value.data;
      lowList = low?.results ?? normalizeList(low) ?? [];
      lowStockCount = low?.count ?? lowList.length ?? 0;
      setLowPreview(lowList.slice(0, 8));
    } else {
      setLowPreview([]);
      newWarnings.push(`Low-stock preview failed: ${getErrMsg(lowRes.reason)}`);
    }

    // Audits (recent activity)
    let auditsCount = 0;
    let auditsList = [];
    if (auditsRes.status === "fulfilled") {
      const al = auditsRes.value.data;
      auditsList = normalizeList(al);
      auditsCount = al?.count ?? auditsList.length ?? 0;
      setRecent(auditsList);
    } else {
      setRecent([]);
      newWarnings.push(`Audit logs failed: ${getErrMsg(auditsRes.reason)}`);
    }

    setStats({
      assets: assetsCount,
      consumables: consumablesCount,
      lowStock: lowStockCount,
      audits: auditsCount,
    });

    setWarnings(newWarnings);
    setLoading(false);
  }

useEffect(() => {
  if (didLoadRef.current) return;   // prevents second StrictMode call
  didLoadRef.current = true;
  load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  // Global search affects dashboard lists (low stock + recent)
  const filteredLowPreview = useMemo(() => {
    if (!q) return lowPreview;
    return lowPreview.filter((x) => {
      return (
        String(x.sku || "").toLowerCase().includes(q) ||
        String(x.name || "").toLowerCase().includes(q) ||
        String(x.supplier || "").toLowerCase().includes(q) ||
        String(x.category || "").toLowerCase().includes(q)
      );
    });
  }, [lowPreview, q]);

  const filteredRecent = useMemo(() => {
    if (!q) return recent;
    return recent.filter((x) => {
      return (
        String(x.summary || "").toLowerCase().includes(q) ||
        String(x.entity_id || "").toLowerCase().includes(q) ||
        String(x.action || "").toLowerCase().includes(q) ||
        String(x.entity_type || "").toLowerCase().includes(q) ||
        String(x.changed_by_username || "").toLowerCase().includes(q)
      );
    });
  }, [recent, q]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header strip */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Welcome, {username}</div>
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
            {isAdmin ? "Admin has full control across departments." : "Employee view is department-scoped and read-only."}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={pillStyle("rgba(80,160,255,0.12)")}>
            Role: <b>{role}</b>
          </span>
          {deptCode ? (
            <span style={pillStyle("rgba(130,255,160,0.10)")}>
              Dept: <b>{deptCode}</b>
            </span>
          ) : (
            <span style={pillStyle("rgba(255,180,80,0.10)")}>
              Dept: <b>not set</b>
            </span>
          )}

          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ✅ show detailed warnings instead of one generic error */}
      {warnings.length > 0 && (
        <div className="badge warn" style={{ display: "grid", gap: 6 }}>
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="card">
          <div style={{ opacity: 0.7, fontSize: 13 }}>Total Assets</div>
          <div className="big">{loading ? "…" : stats.assets}</div>
        </div>

        <div className="card">
          <div style={{ opacity: 0.7, fontSize: 13 }}>Total Consumables</div>
          <div className="big">{loading ? "…" : stats.consumables}</div>
        </div>

        <div className="card">
          <div style={{ opacity: 0.7, fontSize: 13 }}>Low Stock</div>
          <div className="big">{loading ? "…" : stats.lowStock}</div>
          <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
            Items at or below reorder level
          </div>
        </div>

        <div className="card">
          <div style={{ opacity: 0.7, fontSize: 13 }}>Audit Records</div>
          <div className="big">{loading ? "…" : stats.audits}</div>
          <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
            {stats.audits ? "Recent tracking enabled" : "Audit endpoint not available"}
          </div>
        </div>
      </div>

      {/* Low stock preview */}
      <div className="panel">
        <div className="panelHeader">
          <div>
            <h2>Low Stock Preview</h2>
            <p>{q ? <>Filtered by: <b>{query}</b></> : "Top items needing attention"}</p>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>QOH</th>
              <th>Reorder</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLowPreview.map((r) => (
              <tr key={r.id ?? r.sku}>
                <td>{r.sku}</td>
                <td>{r.name}</td>
                <td>{r.quantity_on_hand}</td>
                <td>{r.reorder_level}</td>
                <td>
                  <span className="badge bad">LOW</span>
                </td>
              </tr>
            ))}

            {!filteredLowPreview.length && (
              <tr>
                <td colSpan="5" style={{ opacity: 0.7 }}>
                  {lowPreview.length === 0
                    ? "No low stock items."
                    : "No low stock items match your search filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent activity */}
      <div className="panel">
        <div className="panelHeader">
          <div>
            <h2>Recent Activity</h2>
            <p>{q ? <>Filtered by: <b>{query}</b></> : "Last actions from audit logs (if enabled)"}</p>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecent.slice(0, 12).map((r) => (
              <tr key={r.id ?? `${r.entity_id}-${r.timestamp}`}>
                <td>{r.timestamp ?? "-"}</td>
                <td>
                  <span className="badge ok">{r.action ?? "-"}</span>
                </td>
                <td>{(r.entity_type || "-") + " · " + (r.entity_id ?? "-")}</td>
                <td>{r.summary ?? "-"}</td>
              </tr>
            ))}

            {filteredRecent.length === 0 && (
              <tr>
                <td colSpan="4" style={{ opacity: 0.7 }}>
                  {recent.length === 0
                    ? "No audit records (or audit endpoint not ready)."
                    : "No recent activity matches your search filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
