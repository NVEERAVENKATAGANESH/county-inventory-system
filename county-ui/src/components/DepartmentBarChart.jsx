import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export default function DepartmentBarChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ opacity: 0.7 }}>No department data available.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.65)" />
        <YAxis stroke="rgba(255,255,255,0.65)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(10,10,10,0.95)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            color: "#fff",
          }}
        />
        <Legend />
        <Bar dataKey="asset_count" fill="#60a5fa" radius={[8, 8, 0, 0]} />
        <Bar dataKey="consumable_count" fill="#34d399" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}