"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppState } from "@/components/AppState";
import { ErrorBox } from "@/components/dashboard/Dashboard";
import { Card } from "@/components/ui/Card";
import { exportCsv, exportMonthPdf, monthlyRows, sumRows, type MonthRow } from "@/lib/compta";
import { euros, eurosRond } from "@/lib/format";

export default function ComptaPage() {
  const { sales, shops, allShops, shopId, error } = useAppState();
  const rows = useMemo(() => monthlyRows(sales), [sales]);
  const total = sumRows(rows);
  const [pdfMonth, setPdfMonth] = useState("");
  const month = pdfMonth || rows[0]?.key || "";
  const scope = shopId === "all" ? "Toutes les boutiques" : shops.find((s) => s.id === shopId)?.nom ?? "";
  const chart = rows.slice(0, 12).reverse();

  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" onClick={() => exportCsv(rows, shopId === "all" ? "toutes" : scope)}>
          ⬇ Export CSV
        </button>
        <span className="flex-1" />
        <select className="input w-auto" value={month} onChange={(e) => setPdfMonth(e.target.value)}>
          {rows.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => exportMonthPdf(month, sales, allShops, scope)}>
          ⬇ PDF du mois
        </button>
      </div>

      <Card
        title="CA et bénéfice par mois"
        right={
          <span className="flex items-center gap-3">
            <Legend color="#8b7cf6" label="CA" />
            <Legend color="#4fd18b" label="bénéfice" />
          </span>
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 4, bottom: 0, left: -4 }} barGap={3}>
              <CartesianGrid vertical={false} stroke="#262838" />
              <XAxis
                dataKey="key"
                tickFormatter={(k: string) =>
                  new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1, 1).toLocaleDateString("fr-FR", { month: "short" })
                }
                tick={{ fill: "#9a9cb0", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                tickFormatter={(v) => eurosRond(v)}
                tick={{ fill: "#9a9cb0", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const r = payload[0].payload as MonthRow;
                  return (
                    <div className="rounded-xl border border-line bg-night/95 px-3 py-2 text-sm">
                      <div className="capitalize text-muted">{r.label}</div>
                      <div className="text-revenue">CA {euros(r.ca)}</div>
                      <div className="text-profit">Bénéfice {euros(r.benefice)}</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="ca" fill="#8b7cf6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="benefice" fill="#4fd18b" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title={`Mois par mois · ${scope}`}>
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-5 py-2.5 font-medium sm:px-6">Mois</th>
                <th className="px-3 py-2.5 text-right font-medium">Ventes</th>
                <th className="px-3 py-2.5 text-right font-medium">CA</th>
                <th className="px-3 py-2.5 text-right font-medium">Achats</th>
                <th className="px-3 py-2.5 text-right font-medium">Frais</th>
                <th className="px-5 py-2.5 text-right font-medium sm:px-6">Bénéfice</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={`border-b border-line ${r.ventes ? "" : "text-muted"}`}>
                  <td className="px-5 py-2.5 capitalize sm:px-6">{r.label}</td>
                  <td className="px-3 py-2.5 text-right">{r.ventes}</td>
                  <td className="px-3 py-2.5 text-right">{euros(r.ca)}</td>
                  <td className="px-3 py-2.5 text-right">{euros(r.achats)}</td>
                  <td className="px-3 py-2.5 text-right">{euros(r.frais)}</td>
                  <td className={`px-5 py-2.5 text-right font-semibold sm:px-6 ${r.ventes ? "text-profit" : ""}`}>
                    {euros(r.benefice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="px-5 py-3 sm:px-6">Total</td>
                <td className="px-3 py-3 text-right">{total.ventes}</td>
                <td className="px-3 py-3 text-right text-revenue">{euros(total.ca)}</td>
                <td className="px-3 py-3 text-right">{euros(total.achats)}</td>
                <td className="px-3 py-3 text-right">{euros(total.frais)}</td>
                <td className="px-5 py-3 text-right text-profit sm:px-6">{euros(total.benefice)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
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
