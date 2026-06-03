"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { HistoryEntry } from "@/lib/server/onchain";

export function TrendChart({ history }: { history: HistoryEntry[] }) {
  if (!history.length) {
    return (
      <div className="grid h-64 place-items-center rounded-xl border border-dashed border-border bg-card text-sm text-accent">
        No history yet — once you have an AI evaluation, it'll show here.
      </div>
    );
  }
  const data = [...history]
    .sort((a, b) => a.created_at - b.created_at)
    .map((h) => ({
      ts: new Date(h.created_at * 1000).toLocaleDateString(),
      score: h.score,
    }));
  return (
    <div className="h-64 w-full rounded-xl border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(220 19% 17%)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="hsl(220 19% 17%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(35 12% 80% / 0.6)" strokeDasharray="3 3" />
          <XAxis
            dataKey="ts"
            tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(35 12% 80%)" }}
          />
          <YAxis
            domain={[0, 1000]}
            tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(35 12% 80%)" }}
            width={32}
          />
          <Tooltip
            contentStyle={{
              border: "1px solid hsl(35 12% 80%)",
              borderRadius: 8,
              fontSize: 12,
              background: "hsl(0 0% 100%)",
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(220 19% 17%)"
            strokeWidth={2}
            fill="url(#scoreFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
