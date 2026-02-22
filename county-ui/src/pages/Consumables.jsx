import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Toast from "../components/Toast";
import { useSearch } from "../context/SearchContext.jsx";

export default function Consumables() {
  const { query } = useSearch();
  const q = query.trim().toLowerCase();

  const role = (localStorage.getItem("actingRole") || "employee").toLowerCase();
  const isAdmin = role === "admin";

  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Form fields
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [quantity_on_hand, setQoh] = useState("0");
  const [reorder_level, setReorder] = useState("0");

  // Optional fields
  const [category, setCategory] = useState("General");
  const [unit, setUnit] = useState("each");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  const filteredRows = useMemo(() => {
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        (r.sku || "").toLowerCase().includes(q) ||
        (r.name || "").toLowerCase().includes(q) ||
        (r.supplier || "").toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q)
      );
    });
  }, [rows, q]);

  async function load() {
    setError("");
    const res = await api.get("/api/consumables/?ordering=sku");
    setRows(normalizeList(res.data));
  }

  useEffect(() => {
    load().catch(() => setError("Failed to load. Check role headers and department code."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValid = useMemo(() => {
    if (!sku.trim()) return false;
    if (!name.trim()) return false;
    if (Number.isNaN(parseInt(quantity_on_hand, 10))) return false;
    if (Number.isNaN(parseInt(reorder_level, 10))) return false;
    return true;
  }, [sku, name, quantity_on_hand, reorder_level]);

  async function create(e) {
    e?.preventDefault?.();
    setError("");

    if (!isAdmin) {
      setError("Employees are read-only. Switch role to admin to create consumables.");
      return;
    }

    if (!isValid) {
      setError("Please fill SKU, Name, and valid numeric QOH/Reorder.");
      return;
    }

    try {
      await api.post("/api/consumables/", {
        sku: sku.trim(),
        name: name.trim(),
        category: category.trim(),
        unit: unit.trim(),
        supplier: supplier.trim(),
        notes: notes.trim(),
        quantity_on_hand: parseInt(quantity_on_hand, 10),
        reorder_level: parseInt(reorder_level, 10),
      });

      setToast("Consumable created ✅");

      setSku("");
      setName("");
      setQoh("0");
      setReorder("0");
      setSupplier("");
      setNotes("");

      await load();
    } catch (err) {
      const status = err?.response?.status;
      const detail =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === "object" ? JSON.stringify(err.response.data) : "");

      setError(`Create failed${status ? ` (HTTP ${status})` : ""}. ${detail || ""}`);
    }
  }

  function exportCsv() {
    if (!isAdmin) {
      setError("Employees cannot export. Switch role to admin.");
      return;
    }
    window.location.href = "/api/consumables/export-csv/";
  }

  async function importCsv(e) {
    if (!isAdmin) {
      setError("Employees cannot import. Switch role to admin.");
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await api.post("/api/consumables/import-csv/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const created = res.data?.created ?? 0;
      const updated = res.data?.updated ?? 0;
      const errors = res.data?.errors?.length ?? 0;

      setToast(`Import done ✅ created=${created} updated=${updated} errors=${errors}`);
      await load();
    } catch (err) {
      const status = err?.response?.status;
      setError(`Import failed${status ? ` (HTTP ${status})` : ""}. Make sure CSV columns match backend.`);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="panel">
      <div className="panelHeader">
        <div>
          <h2>Consumables</h2>
          <p>
            Track stock levels {isAdmin ? "and manage inventory." : "(read-only for employee)."}
            {q ? <span style={{ opacity: 0.7 }}> · Filter: “{query}”</span> : null}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={exportCsv} disabled={!isAdmin}>Export CSV</button>

          <label className="btn" style={{ cursor: isAdmin ? "pointer" : "not-allowed", opacity: isAdmin ? 1 : 0.5 }}>
            Import CSV
            <input type="file" accept=".csv" onChange={importCsv} style={{ display: "none" }} disabled={!isAdmin} />
          </label>

          <button className="btn" onClick={() => load().catch(() => setError("Failed to refresh."))}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="badge warn">{error}</div>}

      {/* Create form */}
      <form onSubmit={create} className="formRow" style={{ marginBottom: 14, opacity: isAdmin ? 1 : 0.5 }}>
        <input className="input" placeholder="SKU *" value={sku} onChange={(e) => setSku(e.target.value)} disabled={!isAdmin} />
        <input className="input" placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
        <input className="input" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!isAdmin} />
        <input className="input" placeholder="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} disabled={!isAdmin} />
        <input className="input" placeholder="Unit (each/box/etc)" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={!isAdmin} />
        <input className="input" placeholder="QOH *" value={quantity_on_hand} onChange={(e) => setQoh(e.target.value)} disabled={!isAdmin} />
        <input className="input" placeholder="Reorder *" value={reorder_level} onChange={(e) => setReorder(e.target.value)} disabled={!isAdmin} />
        <input className="input" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!isAdmin} />

        <button className="btn btnPrimary" type="submit" disabled={!isAdmin || !isValid}>
          Add
        </button>
      </form>

      {/* Table */}
      <table className="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>QOH</th>
            <th>Reorder</th>
            <th>Status</th>
            <th>Supplier</th>
            <th>Category</th>
          </tr>
        </thead>

        <tbody>
          {filteredRows.map((r) => {
            const isLow =
              r.is_low_stock ??
              (typeof r.quantity_on_hand === "number" &&
                typeof r.reorder_level === "number" &&
                r.quantity_on_hand <= r.reorder_level);

            return (
              <tr key={r.id ?? r.sku}>
                <td>{r.sku}</td>
                <td>{r.name}</td>
                <td>{r.quantity_on_hand}</td>
                <td>{r.reorder_level}</td>
                <td>{isLow ? <span className="badge bad">LOW</span> : <span className="badge ok">OK</span>}</td>
                <td>{r.supplier || "-"}</td>
                <td>{r.category || "-"}</td>
              </tr>
            );
          })}

          {!filteredRows.length && (
            <tr>
              <td colSpan="7" style={{ opacity: 0.7 }}>
                {rows.length === 0 ? "No consumables yet." : "No consumables match the search filter."}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Toast message={toast} type="success" onClose={() => setToast("")} />
    </div>
  );
}
