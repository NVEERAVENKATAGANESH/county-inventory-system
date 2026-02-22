import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Toast from "../components/Toast";

export default function Consumables() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Form fields (keep minimal required fields)
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [quantity_on_hand, setQoh] = useState("0");
  const [reorder_level, setReorder] = useState("0");

  // Optional fields (safe defaults)
  const [category, setCategory] = useState("General");
  const [unit, setUnit] = useState("each");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  // Helper: DRF may return {count,next,previous,results} or plain array
  function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  async function load() {
    setError("");
    const res = await api.get("/api/consumables/?ordering=sku");
    setRows(normalizeList(res.data));
  }

  useEffect(() => {
    load().catch(() => setError("Failed to load. Login first at /login or check backend."));
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

      // Reset form (keep some defaults)
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

      setError(
        `Create failed${status ? ` (HTTP ${status})` : ""}. ` +
          (detail || "Check login / department assignment / required fields.")
      );
    }
  }

  function exportCsv() {
    // hits Django directly via proxy; browser downloads
    window.location.href = "/api/consumables/export-csv/";
  }

  async function importCsv(e) {
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
          <p>Create, import/export, and track stock levels</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={exportCsv}>Export CSV</button>

          <label className="btn" style={{ cursor: "pointer" }}>
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={importCsv}
              style={{ display: "none" }}
            />
          </label>

          <button className="btn" onClick={() => load().catch(() => setError("Failed to refresh."))}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="badge warn">{error}</div>}

      {/* Create form */}
      <form onSubmit={create} className="formRow" style={{ marginBottom: 14 }}>
        <input
          className="input"
          placeholder="SKU *"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <input
          className="input"
          placeholder="Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="input"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <input
          className="input"
          placeholder="Supplier"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
        />

        <input
          className="input"
          placeholder="Unit (each/box/etc)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />

        <input
          className="input"
          placeholder="QOH *"
          value={quantity_on_hand}
          onChange={(e) => setQoh(e.target.value)}
        />
        <input
          className="input"
          placeholder="Reorder *"
          value={reorder_level}
          onChange={(e) => setReorder(e.target.value)}
        />

        <input
          className="input"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button className="btn btnPrimary" type="submit" disabled={!isValid}>
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
          {rows.map((r) => {
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
                <td>
                  {isLow ? <span className="badge bad">LOW</span> : <span className="badge ok">OK</span>}
                </td>
                <td>{r.supplier || "-"}</td>
                <td>{r.category || "-"}</td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan="7" style={{ opacity: 0.7 }}>
                No consumables yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Toast message={toast} type="success" onClose={() => setToast("")} />
    </div>
  );
}
