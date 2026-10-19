"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export function Spark({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  return (
    <div className="h-12 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" hide />
          <Tooltip
            cursor={{ fill: "rgba(47, 91, 234, 0.08)" }}
            contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
          />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
