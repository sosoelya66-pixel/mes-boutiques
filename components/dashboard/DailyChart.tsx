"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { dateLongue, euros, eurosRond, jourMois } from "@/lib/format";
import type { Point } from "@/lib/stats";

export const tickLabel = (t: number, hourly: boolean) =>
  hourly ? `${new Date(t).getHours()} h` : jourMois(new Date(t));

export function DailyChart({
  title,
  data,
  dataKey,
  color,
  hourly,
}: {
  title: string;
  data: Point[];
  dataKey: "benefice" | "ca";
  color: string;
  hourly: boolean;
}) {
  const values = data.map((d) => d[dataKey]);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = data.length ? total / data.length : 0;
  const maxIdx = values.length ? values.indexOf(Math.max(...values)) : -1;
  const max = maxIdx >= 0 ? data[maxIdx] : null;
  const unit = hourly ? "heure" : "jour";
  const gid = `fill-${dataKey}`;

  return (
    <Card
      title={title}
      right={
        <span className="flex items-center gap-2">
          <span className="inline-block w-5 border-t border-dashed border-muted" />
          moyenne {euros(avg)} / {unit}
        </span>
      }
    >
      <div className="chart-glow h-64 sm:h-72" style={{ color }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 28, right: 12, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v) => eurosRond(v)}
              tick={{ fill: "#9a9cb0", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ stroke: "#9a9cb0", strokeOpacity: 0.3 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Point;
                const d = new Date(p.t);
                return (
                  <div className="rounded-xl border border-line bg-night/95 px-3 py-2 text-sm">
                    <div className="capitalize text-muted">
                      {hourly ? `${dateLongue(d)} · ${d.getHours()} h` : dateLongue(d)}
                    </div>
                    <div className="mt-0.5 font-semibold" style={{ color }}>
                      {euros(p[dataKey])}
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={avg} stroke="#9a9cb0" strokeOpacity={0.7} strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gid})`}
              dot={data.length <= 45 ? { r: 3, fill: color, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: color, stroke: "#12131f", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {max && max[dataKey] > 0 && (
              <ReferenceDot
                x={max.t}
                y={max[dataKey]}
                r={0}
                label={{
                  value: euros(max[dataKey]),
                  position: "top",
                  offset: 12,
                  fill: color,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
