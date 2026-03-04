import React from "react";

export default function KPICard({ title, value, subtitle }) {
  return (
    <div className="card">
      <div style={{ opacity: 0.7, fontSize: 13 }}>{title}</div>
      <div className="big">{value ?? 0}</div>
      {subtitle ? (
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>{subtitle}</div>
      ) : null}
    </div>
  );
}