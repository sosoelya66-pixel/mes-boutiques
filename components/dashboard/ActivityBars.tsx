"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { dateLongue } from "@/lib/format";
import type { Point } from "@/lib/stats";
import { tickLabel } from "./DailyChart";

const BLUE = "#4d8af0";
const GREEN = "#4fd18b";

export function ActivityBars({ data, hourly }: { data: Point[]; hourly: boolean }) {
  return (
    <Card
      title={`Fiches créées et commandes par ${hourly ? "heure" : "jour"}`}
      right={
        <span className="flex items-center gap-3">
          <Legend color={BLUE} label="fiches" />
          <Legend color={GREEN} label="commandes" />
        </span>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="#262838" />
            <XAxis
              dataKey="t"
              tickFormatter={(t) => tickLabel(t, hourly)}
              tick={{ fill: "#9a9cb0", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tickMargin={10}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#9a9cb0", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Point;
                const d = new Date(p.t);
                return (
                  <div className="rounded-xl border border-line bg-night/95 px-3 py-2 text-sm">
                    <div className="capitalize text-muted">
                      {hourly ? `${d.getHours()} h` : dateLongue(d)}
                    </div>
                    <div style={{ color: BLUE }}>{p.fiches} fiche{p.fiches > 1 ? "s" : ""}</div>
                    <div style={{ color: GREEN }}>
                      {p.commandes} commande{p.commandes > 1 ? "s" : ""}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="fiches" stackId="a" fill={BLUE} isAnimationActive={false} />
            <Bar dataKey="commandes" stackId="a" fill={GREEN} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
