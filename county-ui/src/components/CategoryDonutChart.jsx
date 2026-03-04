import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#fb7185", "#22d3ee"];

function normalizeCategoryData(raw = []) {
  return raw
    .map((x) => ({
      name: x.category?.trim() ? x.category.trim() : "Uncategorized",
      value: x.count ?? 0,
    }))
    .filter((x) => x.value > 0);
}

export default function CategoryDonutChart({ categories }) {
  const data = normalizeCategoryData(categories);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!data.length) return <div style={{ opacity: 0.7 }}>No category data available.</div>;

  return (
    <div style={{ height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(10,10,10,0.95)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              color: "#fff",
            }}
          />
          <Legend />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            stroke="rgba(0,0,0,0)"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>

          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.85)"
            style={{ fontSize: 18, fontWeight: 700 }}
          >
            {total}
          </text>
        </PieChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
        Total assets counted: <b>{total}</b>
      </div>
    </div>
  );
}