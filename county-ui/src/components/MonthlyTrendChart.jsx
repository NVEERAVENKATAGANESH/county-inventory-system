import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

function formatMonthLabel(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function mergeTrends(assetTrend = [], consumableTrend = []) {
  const map = new Map();

  for (const a of assetTrend) {
    map.set(a.month, { month: a.month, assets: a.count ?? 0, consumables: 0 });
  }
  for (const c of consumableTrend) {
    const existing = map.get(c.month);
    if (existing) existing.consumables = c.count ?? 0;
    else map.set(c.month, { month: c.month, assets: 0, consumables: c.count ?? 0 });
  }

  const arr = Array.from(map.values());
  arr.sort((x, y) => new Date(x.month) - new Date(y.month));
  return arr;
}

export default function MonthlyTrendChart({ trends }) {
  const data = mergeTrends(trends?.assets || [], trends?.consumables || []);

  if (!data.length) return <div style={{ opacity: 0.7 }}>No trend data available.</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
        <XAxis dataKey="month" tickFormatter={formatMonthLabel} stroke="rgba(255,255,255,0.65)" />
        <YAxis stroke="rgba(255,255,255,0.65)" />
        <Tooltip
          labelFormatter={(v) => formatMonthLabel(v)}
          contentStyle={{
            backgroundColor: "rgba(10,10,10,0.95)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            color: "#fff",
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="assets" stroke="#60a5fa" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="consumables" stroke="#34d399" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}