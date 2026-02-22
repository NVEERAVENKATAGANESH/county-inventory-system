import { useEffect, useState } from "react";
import { api } from "../api";

export default function LowStock() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const res = await api.get("/api/consumables/low-stock/");
      setRows(res.data?.results ?? []);
    } catch {
      setError("Low stock endpoint failed.");
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="panel">
      <div className="panelHeader">
        <div>
          <h2>Low Stock</h2>
          <p>Items at or below reorder level</p>
        </div>
        <button className="btn" onClick={load}>Refresh</button>
      </div>

      {error && <div className="badge warn">{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Qty</th>
            <th>Reorder</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.sku}</td>
              <td>{r.name}</td>
              <td><span className="badge bad">{r.quantity_on_hand}</span></td>
              <td>{r.reorder_level}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan="4" style={{ opacity: 0.7 }}>No low stock items 🎉</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
