"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { pourcent } from "@/lib/format";
import { useCountUp } from "@/lib/useCountUp";

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
  amount,
  format,
  valueClass,
  evolution,
  sub,
  data,
  dataKey,
  color,
}: {
  label: string;
  amount: number;
  format: (n: number) => string;
  valueClass: string;
  evolution: number | null;
  sub?: React.ReactNode;
  data: object[];
  dataKey: string;
  color: string;
}) {
  const id = `spark-${dataKey}`;
  const shown = useCountUp(amount);
  return (
    <section className="glow-corner flex flex-col rounded-2xl glass p-5 sm:p-6" style={{ ["--glow" as string]: color }}>
      <div className="text-sm font-medium text-muted">{label}</div>
      <div className={`text-glow mt-2 text-[40px] font-bold leading-none tracking-tight ${valueClass}`}>{format(shown)}</div>
      <div className="mt-3 text-sm text-muted">
        <Evolution value={evolution} /> vs la période d&apos;avant, même heure
      </div>
      {sub && <div className="mt-1 text-sm text-muted">{sub}</div>}
      <div className="chart-glow mt-4 h-12 -mx-1" style={{ color }}>
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
