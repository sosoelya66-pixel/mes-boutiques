"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { pourcent } from "@/lib/format";

export function Evolution({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">nouveau</span>;
  if (Math.round(value) === 0) return <span className="text-muted">= 0 %</span>;
  const up = value > 0;
  return (
    <span className={`font-semibold ${up ? "text-up" : "text-down"}`}>
      {up ? "▲" : "▼"} {pourcent(value)}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  valueClass,
  evolution,
  sub,
  data,
  dataKey,
  color,
}: {
  label: string;
  value: string;
  valueClass: string;
  evolution: number | null;
  sub?: React.ReactNode;
  data: object[];
  dataKey: string;
  color: string;
}) {
  const id = `spark-${dataKey}`;
  return (
    <section className="flex flex-col rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className={`mt-2 text-[40px] font-bold leading-none tracking-tight ${valueClass}`}>{value}</div>
      <div className="mt-3 text-sm text-muted">
        <Evolution value={evolution} /> vs la période d&apos;avant, même heure
      </div>
      {sub && <div className="mt-1 text-sm text-muted">{sub}</div>}
      <div className="mt-4 h-12 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, "dataMax"]} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${id})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
